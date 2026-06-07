#!/usr/bin/env node
/**
 * Ayo · Smoke Test 2 — Device lock ("one ticket, one device")
 * --------------------------------------------------------------------------
 * Adapted from the user-supplied template to Ayo's actual schema:
 *   - /api/watch/token expects body keys `ticket_token` and `fingerprint`
 *     (the template's `token` / `visitorId` are FingerprintJS conventions
 *     that don't match our route)
 *   - The device binding lives on tickets.device_fingerprint, not on a
 *     sessions row. Reset clears the binding via UPDATE, not DELETE.
 *   - If WATCH_TOKEN isn't pasted in, the script auto-resolves the seeded
 *     fan's first confirmed ticket so `npm run smoke:watch-lock` just
 *     works after `npm run seed:test`.
 *
 * WHAT THIS PROVES: a 2nd device (different fingerprint) on the SAME watch
 *                    token is REJECTED (403); the 1st device can re-request
 *                    (signed-URL refresh doesn't self-lock).
 * WHAT IT DOES NOT: the fingerprint is client-supplied — copy device A's
 *                    visitorId and you sail through. This tests the wiring,
 *                    not the threat model.
 *
 * EXPECTED RESULT today: ✅ PASS.
 *
 * RUN:   npm run smoke:watch-lock
 */

import { createClient } from "@supabase/supabase-js";

// ─── CONFIG ────────────────────────────────────────────────────────────────
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Paste a watch token OR leave unset — the script will pick the seeded
// fan's confirmed ticket automatically (requires service-role env).
let WATCH_TOKEN = process.env.WATCH_TOKEN ?? null;

const API_PATH = "/api/watch/token";
const METHOD = "POST";
const TOKEN_FIELD = "ticket_token";
const FP_FIELD = "fingerprint";

const DEVICE_A = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const DEVICE_B = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

// Our /api/watch/token doesn't require an auth cookie — it's an
// unauthenticated endpoint keyed on the ticket token. Leave null.
const FAN_AUTH_COOKIE = process.env.FAN_AUTH_COOKIE ?? null;

const FAN_EMAIL = process.env.FAN_EMAIL ?? "fan@ayo.live";
// ───────────────────────────────────────────────────────────────────────────

function die(m) {
  console.error(`\n❌  ${m}\n`);
  process.exit(1);
}

const projectRef = SUPABASE_URL
  ? new URL(SUPABASE_URL).hostname.split(".")[0]
  : null;

const admin =
  SUPABASE_URL && SERVICE_KEY
    ? createClient(SUPABASE_URL, SERVICE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

async function findFanAuthId() {
  if (!admin) return null;
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw error;
    const hit = data.users.find(
      (u) => (u.email ?? "").toLowerCase() === FAN_EMAIL.toLowerCase(),
    );
    if (hit) return hit.id;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

async function autoResolveWatchToken() {
  if (!admin) {
    die(
      `No WATCH_TOKEN set and SUPABASE_SERVICE_ROLE_KEY missing — ` +
        `can't auto-resolve. Either paste WATCH_TOKEN or add the service key.`,
    );
  }
  const fanId = await findFanAuthId();
  if (!fanId) {
    die(`No WATCH_TOKEN and ${FAN_EMAIL} not found. Run: npm run seed:test`);
  }
  const { data, error } = await admin
    .from("tickets")
    .select("token")
    .eq("fan_id", fanId)
    .eq("status", "confirmed")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) die(`Auto-resolve failed: ${error.message}`);
  if (!data?.token) {
    die(
      `No confirmed ticket for ${FAN_EMAIL}. Run: npm run seed:test`,
    );
  }
  console.log(`• Auto-resolved WATCH_TOKEN from ${FAN_EMAIL} (${data.token})`);
  return data.token;
}

async function resetBinding() {
  if (!admin) {
    console.log(
      "• Reset skipped (no service key) — token must be UNBOUND already.",
    );
    return;
  }
  const { error } = await admin
    .from("tickets")
    .update({ device_fingerprint: null, used_at: null })
    .eq("token", WATCH_TOKEN);
  if (error) {
    die(`Reset failed: ${error.message}`);
  }
  console.log("• Cleared existing binding for this token.");
}

async function watch(label, fp) {
  const headers = { "Content-Type": "application/json" };
  if (FAN_AUTH_COOKIE && projectRef) {
    headers.cookie = `sb-${projectRef}-auth-token=${FAN_AUTH_COOKIE}`;
  }

  let url = `${APP_URL}${API_PATH}`;
  let body;
  if (METHOD === "GET") {
    const q = new URLSearchParams({
      [TOKEN_FIELD]: WATCH_TOKEN,
      [FP_FIELD]: fp,
    });
    url += `?${q.toString()}`;
  } else {
    body = JSON.stringify({ [TOKEN_FIELD]: WATCH_TOKEN, [FP_FIELD]: fp });
  }

  const res = await fetch(url, { method: METHOD, headers, body });
  const text = await res.text();
  console.log(
    `  [${label}] fp=${fp.slice(0, 6)}… -> HTTP ${res.status}  ${text
      .slice(0, 120)
      .replace(/\s+/g, " ")}`,
  );
  return res.status;
}

async function run() {
  if (!WATCH_TOKEN) {
    WATCH_TOKEN = await autoResolveWatchToken();
  }
  await resetBinding();

  console.log("\n• Replaying three watch requests on one token:\n");

  const a1 = await watch("A  first  ", DEVICE_A);
  const b = await watch("B  intruder", DEVICE_B);
  const a2 = await watch("A  refresh ", DEVICE_A);

  const aGotIn = a1 >= 200 && a1 < 300;
  const bRejected = b === 403;
  const aRefresh = a2 >= 200 && a2 < 300;

  console.log("\n──────────── RESULT ────────────");
  console.log(
    `device A first watch   : ${aGotIn ? "allowed ✓" : `BLOCKED (${a1}) ✗`}`,
  );
  console.log(
    `device B intruder      : ${bRejected ? "rejected 403 ✓" : `GOT IN (${b}) ✗`}`,
  );
  console.log(
    `device A refresh       : ${aRefresh ? "allowed ✓" : `self-locked (${a2}) ✗`}`,
  );
  console.log("────────────────────────────────");

  if (aGotIn && bRejected && aRefresh) {
    console.log(
      "✅  PASS — one ticket binds one device; the intruder is shut out.",
    );
    console.log(
      "    (Reminder: this proves the wiring, not spoof-resistance.)\n",
    );
    return;
  }

  console.log("❌  FAIL —");
  if (!aGotIn) {
    console.log(
      `     device A could not get in (${a1}). Token invalid/already bound, ` +
        `or the dev server isn't running, or auth shape is wrong.`,
    );
  }
  if (!bRejected) {
    console.log(
      `     DEVICE LOCK IS DECORATIVE — a different fingerprint got HTTP ${b}, ` +
        `not 403. "One ticket, one device" does not hold.`,
    );
  }
  if (!aRefresh) {
    console.log(
      `     legitimate refresh self-locked (${a2}) — the 12-min signed-URL ` +
        `refresh in WatchClient will boot real viewers.`,
    );
  }
  console.log("");
  process.exitCode = 1;
}

run().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
