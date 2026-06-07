#!/usr/bin/env node
/**
 * Ayo · Smoke Test 1 — Payout amount correctness
 * --------------------------------------------------------------------------
 * Ayo is single-currency GHS. Tickets are priced and paid in GHS major
 * units; payouts go out in GHS pesewas with no FX multiplier anywhere.
 * This test asserts the exact integer the /api/events/[id]/action
 * payout endpoint sends to Paystack matches:
 *
 *     Math.round(TICKET_PRICE_GHS * TICKETS_CONFIRMED * ARTIST_SHARE * 100)
 *
 * with currency 'GHS'. No FX_USD_TO_GHS, no conversion.
 *
 * EXPECTED RESULT today: ✅ PASS with factor ~1.00×.
 *
 * RUN:   npm run smoke:payout
 *
 * PRECONDITIONS:
 * 1. .env.local has NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 *    SUPABASE_SERVICE_ROLE_KEY, and `PAYSTACK_BASE_URL=http://localhost:4242`.
 * 2. Dev server running: `npm run dev` (also reads PAYSTACK_BASE_URL).
 * 3. Seeded artist exists: `npm run seed:test`.
 */

import http from "node:http";
import { createClient } from "@supabase/supabase-js";

// ─── CONFIG ────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
const INTERCEPT_PORT = Number(process.env.SMOKE_PORT ?? 4242);

const ARTIST_EMAIL = process.env.ARTIST_EMAIL ?? "artist@ayo.live";
const ARTIST_PASSWORD = process.env.ARTIST_PASSWORD ?? "AyoTest2026!";
const AUTH_COOKIE = process.env.AUTH_COOKIE ?? null;

// Economics. Set on purpose — these drive the expected number.
// Match TICKET_PRICE_GHS to the seeded hero event's ticket_price.
const TICKET_PRICE_GHS = 150;
const TICKETS_CONFIRMED = 1;
const ARTIST_SHARE = 0.9; // matches `gross * 0.9` in /api/events/[id]/action
const EXPECTED_CURRENCY = "GHS";
// ───────────────────────────────────────────────────────────────────────────

function die(msg) {
  console.error(`\n❌  ${msg}\n`);
  process.exit(1);
}

if (!SUPABASE_URL || !SERVICE_KEY) {
  die(
    "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.",
  );
}
if (process.env.PAYSTACK_BASE_URL !== `http://localhost:${INTERCEPT_PORT}`) {
  console.warn(
    `⚠  PAYSTACK_BASE_URL is "${process.env.PAYSTACK_BASE_URL ?? "<unset>"}" — ` +
      `the dev server must read http://localhost:${INTERCEPT_PORT} or the ` +
      `transfer call will go to real Paystack and this test reports nothing useful.`,
  );
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0];

// ─── Fake Paystack interceptor ─────────────────────────────────────────────
let captured = null;
const interceptor = http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    res.setHeader("Content-Type", "application/json");
    const url = req.url ?? "";
    if (req.method === "POST" && url.includes("/transferrecipient")) {
      return res.end(
        JSON.stringify({
          status: true,
          data: { recipient_code: "RCP_smoke" },
        }),
      );
    }
    if (req.method === "POST" && url.includes("/transfer")) {
      try {
        captured = JSON.parse(body || "{}");
      } catch {
        captured = { _raw: body };
      }
      return res.end(
        JSON.stringify({
          status: true,
          message: "mock",
          data: {
            transfer_code: "TRF_smoke",
            id: 999,
            status: "success",
            currency: captured?.currency,
            amount: captured?.amount,
            reference: "smoke",
          },
        }),
      );
    }
    res.end(JSON.stringify({ status: true, data: {} }));
  });
});

// ─── Helpers ───────────────────────────────────────────────────────────────
async function findArtistAuthId() {
  // profiles has no email column; resolve via auth.users.
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw error;
    const hit = data.users.find(
      (u) => (u.email ?? "").toLowerCase() === ARTIST_EMAIL.toLowerCase(),
    );
    if (hit) return hit.id;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

async function buildCookie() {
  if (AUTH_COOKIE) return `sb-${projectRef}-auth-token=${AUTH_COOKIE}`;
  if (!SUPABASE_ANON) {
    die("Need NEXT_PUBLIC_SUPABASE_ANON_KEY to sign in, or set AUTH_COOKIE.");
  }
  const pub = createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await pub.auth.signInWithPassword({
    email: ARTIST_EMAIL,
    password: ARTIST_PASSWORD,
  });
  if (error || !data.session) {
    die(
      `Sign-in failed (${error?.message ?? "no session"}). ` +
        `Set AUTH_COOKIE from your browser as a fallback.`,
    );
  }
  // @supabase/ssr session cookie shape: base64-<b64(JSON([access, refresh, ...]))>
  const s = data.session;
  const json = JSON.stringify([
    s.access_token,
    s.refresh_token,
    null,
    null,
    null,
  ]);
  const val = "base64-" + Buffer.from(json).toString("base64");
  return `sb-${projectRef}-auth-token=${val}`;
}

// ─── State for cleanup ─────────────────────────────────────────────────────
let createdEventId = null;
let createdTicketIds = [];
let createdPayoutIds = [];
let injectedRecipient = false;
let artistId = null;

async function run() {
  await new Promise((r) => interceptor.listen(INTERCEPT_PORT, r));
  console.log(`• Interceptor up on http://localhost:${INTERCEPT_PORT}`);

  artistId = await findArtistAuthId();
  if (!artistId) {
    die(`Artist ${ARTIST_EMAIL} not in auth.users. Run: npm run seed:test`);
  }

  // Ensure profile + paystack_id (so the payout action gets past its check).
  const { data: profile } = await admin
    .from("profiles")
    .select("paystack_id, role")
    .eq("id", artistId)
    .single();
  if (!profile) {
    die(
      `Profile row missing for ${ARTIST_EMAIL}. Run: npm run seed:test`,
    );
  }
  if (profile.role !== "artist") {
    die(`Profile role is "${profile.role}", expected "artist".`);
  }
  if (!profile.paystack_id) {
    await admin
      .from("profiles")
      .update({ paystack_id: "RCP_smoke" })
      .eq("id", artistId);
    injectedRecipient = true;
  }

  // Fresh ended event so idempotency can't short-circuit the transfer.
  const inTenMin = new Date(Date.now() + 10 * 60_000).toISOString();
  const { data: ev, error: eerr } = await admin
    .from("events")
    .insert({
      artist_id: artistId,
      title: "SMOKE — payout test",
      genre: "Highlife",
      scheduled_at: inTenMin,
      ticket_price: TICKET_PRICE_GHS,
      status: "ended",
      is_group: false,
    })
    .select("id")
    .single();
  if (eerr) die(`Could not insert test event: ${eerr.message}`);
  createdEventId = ev.id;
  console.log(
    `• Created ended event ${createdEventId} @ GH₵${TICKET_PRICE_GHS}`,
  );

  // Seed confirmed tickets so the payout has gross revenue to compute.
  const ticketRows = Array.from({ length: TICKETS_CONFIRMED }, () => ({
    event_id: createdEventId,
    amount_paid: TICKET_PRICE_GHS,
    currency: "GHS",
    status: "confirmed",
  }));
  const { data: tix, error: terr } = await admin
    .from("tickets")
    .insert(ticketRows)
    .select("id");
  if (terr) die(`Could not seed tickets: ${terr.message}`);
  createdTicketIds = (tix ?? []).map((t) => t.id);
  console.log(`• Seeded ${createdTicketIds.length} confirmed ticket(s)`);

  // Fire payout through the real route.
  const cookie = await buildCookie();
  const resp = await fetch(
    `${APP_URL}/api/events/${createdEventId}/action`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ action: "payout" }),
    },
  );
  const text = await resp.text();
  console.log(`• Payout endpoint -> HTTP ${resp.status}`);
  if (resp.status === 401 || resp.status === 403) {
    die(
      `Auth rejected. Use the AUTH_COOKIE fallback (copy from browser DevTools).\n` +
        `   Endpoint said: ${text.slice(0, 300)}`,
    );
  }

  // Track any payout row the route created so cleanup can drop it.
  const { data: createdPayouts } = await admin
    .from("payouts")
    .select("id")
    .eq("event_id", createdEventId);
  createdPayoutIds = (createdPayouts ?? []).map((p) => p.id);

  console.log("\n──────────── RESULT ────────────");
  if (!captured) {
    die(
      `Transfer NEVER reached the interceptor.\n` +
        `   Either PAYSTACK_BASE_URL isn't set on the dev server, or the\n` +
        `   payout call failed before reaching Paystack.\n` +
        `   Endpoint said: ${text.slice(0, 300)}`,
    );
  }

  const sentAmount = Number(captured.amount);
  const sentCurrency = captured.currency;
  const grossGhs = TICKET_PRICE_GHS * TICKETS_CONFIRMED;
  const artistGhs = grossGhs * ARTIST_SHARE;
  const expected = Math.round(artistGhs * 100);

  console.log(`sent.amount     : ${sentAmount}`);
  console.log(`sent.currency   : ${sentCurrency}`);
  console.log(
    `expected.amount : ${expected}  (pesewas = GH₵${artistGhs} × 100)`,
  );
  console.log(
    `underpay factor : ${(expected / (sentAmount || 1)).toFixed(2)}×`,
  );
  console.log("────────────────────────────────");

  const currencyOk = sentCurrency === EXPECTED_CURRENCY;
  const amountOk = Math.abs(sentAmount - expected) <= 1;
  if (amountOk && currencyOk) {
    console.log(
      "✅  PASS — Paystack receives the correct GHS pesewa amount.\n",
    );
  } else {
    console.log("❌  FAIL —");
    if (!currencyOk) {
      console.log(
        `     currency is "${sentCurrency}", expected "${EXPECTED_CURRENCY}".`,
      );
    }
    if (!amountOk) {
      console.log(
        `     amount off by ${(expected / (sentAmount || 1)).toFixed(2)}× — ` +
          `the ×100 subunit step is missing, or amount_paid is being read ` +
          `from the wrong column. Ayo is GHS-only; no FX should appear.`,
      );
    }
    console.log("");
    process.exitCode = 1;
  }
}

async function cleanup() {
  try {
    if (createdPayoutIds.length) {
      await admin.from("payouts").delete().in("id", createdPayoutIds);
    }
    if (createdTicketIds.length) {
      await admin.from("tickets").delete().in("id", createdTicketIds);
    }
    if (createdEventId) {
      await admin.from("events").delete().eq("id", createdEventId);
    }
    if (injectedRecipient && artistId) {
      await admin
        .from("profiles")
        .update({ paystack_id: null })
        .eq("id", artistId);
    }
  } catch (e) {
    console.error("cleanup warning:", e.message);
  }
  interceptor.close();
}

run()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(cleanup);
