#!/usr/bin/env node
/**
 * Ayo · Smoke Test 3 — Auth + role routing
 * --------------------------------------------------------------------------
 * Shipped as-is from the user-supplied template; every CONFIG default
 * already matches Ayo's actual routes + seed accounts. No adaptation
 * needed beyond making it discoverable via npm script.
 *
 * WHAT THIS PROVES (reliably, server-side):
 *   • each role can reach its own authed area
 *   • a FAN's session is rejected by an artist-only API (the security teeth)
 *   • an UNAUTHENTICATED request to the artist area is bounced
 * WHAT IT CAN ONLY HINT AT (HTTP can't see client-side redirects):
 *   • cross-role PAGE gating. A 200 on /dashboard with a fan cookie is
 *     INCONCLUSIVE — it's either an authz hole OR a client-side-only gate.
 *     Confirm those in a real browser (or a Playwright version — ask me).
 *
 * The API check is the load-bearing assertion. Page redirects are UX.
 *
 * EXPECTED RESULT today: ❌ FAIL on E.
 * /api/artist/payout-setup only checks if (!user); there is no
 * profile.role === 'artist' gate. A fan's cookie + {} body returns 200.
 * Until that route adds a role check, the smoke test fails. Once it
 * does, the test starts passing.
 *
 * RUN:   npm run smoke:role-routing   (needs the dev server up)
 *
 * PRECONDITIONS:
 * 1. Dev server on APP_URL.
 * 2. Seeded users exist (npm run seed:test): artist@ayo.live + fan@ayo.live.
 * 3. NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY in env (sign-in).
 *    SUPABASE_SERVICE_ROLE_KEY optional — enables the role pre-flight check.
 */

import { createClient } from "@supabase/supabase-js";

// ─── CONFIG ────────────────────────────────────────────────────────────────
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? null;

const ARTIST_EMAIL = "artist@ayo.live";
const FAN_EMAIL = "fan@ayo.live";
const PASSWORD = process.env.AYO_TEST_PASSWORD ?? "AyoTest2026!";

const ARTIST_HOME = "/dashboard";
const FAN_HOME = "/fan";

const ARTIST_API = "/api/artist/payout-setup";
const ARTIST_API_METHOD = "POST";
const ARTIST_API_BODY = "{}";

const ARTIST_COOKIE_OVERRIDE = process.env.ARTIST_AUTH_COOKIE ?? null;
const FAN_COOKIE_OVERRIDE = process.env.FAN_AUTH_COOKIE ?? null;
// ───────────────────────────────────────────────────────────────────────────

function die(m) {
  console.error(`\n❌  ${m}\n`);
  process.exit(1);
}
if (!SUPABASE_URL || !ANON_KEY) {
  die(
    "Need NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY (or paste cookie overrides).",
  );
}
const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0];

async function buildCookie(email, override) {
  if (override) return `sb-${projectRef}-auth-token=${override}`;
  const pub = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false },
  });
  const { data, error } = await pub.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (error || !data.session) {
    die(
      `Sign-in failed for ${email} (${error?.message}). Use the *_AUTH_COOKIE fallback.`,
    );
  }
  // Same format that already passed auth in smoke-payout — proven on this stack.
  const s = data.session;
  const json = JSON.stringify([
    s.access_token,
    s.refresh_token,
    null,
    null,
    null,
  ]);
  return {
    cookie: `sb-${projectRef}-auth-token=base64-${Buffer.from(json).toString("base64")}`,
    userId: data.user.id,
  };
}

async function hit(path, cookie, { method = "GET", body } = {}) {
  const headers = {};
  if (cookie) headers.cookie = cookie;
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch(`${APP_URL}${path}`, {
    method,
    headers,
    body,
    redirect: "manual",
  });
  return { status: res.status, location: res.headers.get("location") };
}

const reached = (r) => r.status === 200;
const bounced = (r) => r.status >= 300 && r.status < 400;

async function rolePreflight(artistId, fanId) {
  if (!SERVICE_KEY || !artistId || !fanId) {
    console.log("• Role pre-flight skipped (no service key).");
    return;
  }
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });
  const { data, error } = await admin
    .from("profiles")
    .select("id, role")
    .in("id", [artistId, fanId]);
  if (error) {
    console.log(`• Role pre-flight skipped (${error.message}).`);
    return;
  }
  const role = (id) => data.find((p) => p.id === id)?.role;
  const ar = role(artistId),
    fr = role(fanId);
  console.log(`• Seed roles: artist=${ar}  fan=${fr}`);
  if (ar !== "artist" || fr !== "fan") {
    die(
      "Seed users do not have the expected roles — every routing assertion below is meaningless until this is fixed.",
    );
  }
}

async function run() {
  const a = await buildCookie(ARTIST_EMAIL, ARTIST_COOKIE_OVERRIDE);
  const f = await buildCookie(FAN_EMAIL, FAN_COOKIE_OVERRIDE);
  const artistCookie = a.cookie ?? a;
  const fanCookie = f.cookie ?? f;
  await rolePreflight(a.userId, f.userId);

  console.log("\n• Probing routes…\n");
  const A = await hit(ARTIST_HOME, artistCookie);
  const B = await hit(FAN_HOME, fanCookie);
  const C = await hit(ARTIST_HOME, fanCookie);
  const D = await hit(FAN_HOME, artistCookie);
  const E = await hit(ARTIST_API, fanCookie, {
    method: ARTIST_API_METHOD,
    body: ARTIST_API_BODY,
  });
  const G = await hit(ARTIST_HOME, null);

  const hardFails = [];
  const warns = [];

  console.log("──────────── RESULT ────────────");
  console.log(
    `A artist → ${ARTIST_HOME.padEnd(10)} : ${reached(A) ? "reached ✓" : `NOT reached (${A.status} ${A.location ?? ""}) ✗`}`,
  );
  if (!reached(A)) {
    hardFails.push(
      "artist cannot reach their own dashboard — auth or gating broken",
    );
  }
  console.log(
    `B fan    → ${FAN_HOME.padEnd(10)} : ${reached(B) ? "reached ✓" : `NOT reached (${B.status} ${B.location ?? ""}) ✗`}`,
  );
  if (!reached(B)) {
    hardFails.push("fan cannot reach their own area — auth or gating broken");
  }

  const crossLine = (label, r) => {
    if (bounced(r))
      return `${label} : bounced ${r.status} → ${r.location ?? "?"} ✓ (server-side gate)`;
    if (reached(r)) {
      warns.push(
        `${label.trim()} returned 200 — authz HOLE or client-side-only gate. Confirm in a browser.`,
      );
      return `${label} : 200 ⚠ inconclusive — see note`;
    }
    return `${label} : ${r.status}`;
  };
  console.log(crossLine(`C fan    → ${ARTIST_HOME.padEnd(10)}`, C));
  console.log(crossLine(`D artist → ${FAN_HOME.padEnd(10)}`, D));

  if (E.status === 401 || E.status === 403) {
    console.log(
      `E fan    → ${ARTIST_API} : rejected ${E.status} ✓ (server-side authz)`,
    );
  } else if (E.status === 200) {
    console.log(
      `E fan    → ${ARTIST_API} : 200 ✗ AUTHZ HOLE — a fan invoked an artist-only API`,
    );
    hardFails.push(
      `fan's session reached ${ARTIST_API} (200) — broken server-side authorization`,
    );
  } else {
    console.log(
      `E fan    → ${ARTIST_API} : ${E.status} ⚠ — not 401/403. Confirm this route is artist-only and rejects at the auth layer (a 400 means it got PAST auth).`,
    );
    warns.push(
      `${ARTIST_API} returned ${E.status}, not 401/403 — verify the route gates on role before processing`,
    );
  }

  if (bounced(G))
    console.log(
      `G anon   → ${ARTIST_HOME.padEnd(10)} : bounced ${G.status} → ${G.location ?? "?"} ✓`,
    );
  else if (reached(G)) {
    console.log(
      `G anon   → ${ARTIST_HOME.padEnd(10)} : 200 ✗ — artist dashboard served with NO session`,
    );
    hardFails.push(
      "unauthenticated request reached the artist dashboard (200)",
    );
  } else {
    console.log(`G anon   → ${ARTIST_HOME.padEnd(10)} : ${G.status}`);
  }

  console.log("────────────────────────────────");
  if (hardFails.length) {
    console.log("❌  FAIL —");
    hardFails.forEach((m) => console.log(`     • ${m}`));
    warns.forEach((m) => console.log(`     ⚠ ${m}`));
    console.log("");
    process.exitCode = 1;
  } else if (warns.length) {
    console.log(
      "⚠️  PASS WITH CAVEATS — server-side teeth hold, but verify these in a browser:",
    );
    warns.forEach((m) => console.log(`     ⚠ ${m}`));
    console.log("");
  } else {
    console.log(
      "✅  PASS — roles reach their own areas, cross-role gates bounce server-side, fan is rejected by the artist API, anon is bounced.\n",
    );
  }
}

run().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
