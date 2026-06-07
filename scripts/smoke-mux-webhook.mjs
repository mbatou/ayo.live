#!/usr/bin/env node
/**
 * Ayo · Smoke Test 4 — Mux webhook (signature, fail-loud, flip)
 * --------------------------------------------------------------------------
 * REPLAY MODE (Path B). Forges Mux-shaped signed webhook deliveries and
 * fires them at /api/mux/webhook on the deployed app. Asserts:
 *
 *   FLIP:   active payload for a known mux_stream_id -> 200 flipped:'live'
 *           idle   payload for that same mux_stream_id -> 200 flipped:'ended'
 *           DB events row is observed transitioning live -> ended.
 *
 *   MISS:   active payload for an UNKNOWN mux_stream_id -> 5xx
 *           (handler must fail loud so Mux retries; a 200 here means it
 *            silently disarmed Mux's only safety net).
 *
 *   FORGE:  payload with a bad/missing signature -> 401.
 *
 * GAP: this DOES NOT verify the Mux→Vercel delivery leg. Mux genuinely
 * pushing webhooks on real `video.live_stream.active` events can only be
 * verified by you pushing from OBS to a real Mux stream with keys
 * configured. Don't call streaming "verified" on this script alone.
 *
 * RUN:   npm run smoke:mux-webhook
 *
 * PRECONDITIONS:
 * 1. NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local.
 * 2. MUX_WEBHOOK_SECRET in .env.local — MUST match the secret on the
 *    deployed app. Without it the signature check on the server side
 *    rejects everything 401 and the FLIP assertion can't run.
 * 3. APP_URL (defaults to http://localhost:3000) points at a deploy
 *    that has the same MUX_WEBHOOK_SECRET set.
 * 4. At least one event in the DB with a non-null mux_stream_id (the
 *    seeded test events don't have one until /api/events POST runs the
 *    Mux provisioning step; for a clean replay we just inject a
 *    temporary mux_stream_id onto the seeded hero event and remove it
 *    on cleanup).
 */

import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MUX_WEBHOOK_SECRET = process.env.MUX_WEBHOOK_SECRET;
const ARTIST_EMAIL = process.env.ARTIST_EMAIL ?? "artist@ayo.live";

function die(m) {
  console.error(`\n❌  ${m}\n`);
  process.exit(1);
}
if (!SUPABASE_URL || !SERVICE_KEY) {
  die("Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local.");
}
if (!MUX_WEBHOOK_SECRET) {
  die(
    "Set MUX_WEBHOOK_SECRET in .env.local — must match the secret on the deployed app.",
  );
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Build a Mux-signed webhook delivery. Mux's header format:
//   mux-signature: t=<unix_ts>,v1=<hex(HMAC_SHA256(secret, `${ts}.${body}`))>
function sign(body, secret) {
  const ts = Math.floor(Date.now() / 1000).toString();
  const v1 = crypto
    .createHmac("sha256", secret)
    .update(`${ts}.${body}`)
    .digest("hex");
  return `t=${ts},v1=${v1}`;
}

function makePayload(type, muxStreamId) {
  return JSON.stringify({
    type,
    object: { type: "live_stream", id: muxStreamId },
    id: `webhook_${crypto.randomBytes(8).toString("hex")}`,
    environment: { name: "Development" },
    data: {
      id: muxStreamId,
      status: type.endsWith(".active") ? "active" : "idle",
    },
    created_at: new Date().toISOString(),
  });
}

async function post(body, sig) {
  const headers = { "Content-Type": "application/json" };
  if (sig != null) headers["mux-signature"] = sig;
  const res = await fetch(`${APP_URL}/api/mux/webhook`, {
    method: "POST",
    headers,
    body,
  });
  const text = await res.text();
  return { status: res.status, body: text };
}

// ─── Test artist lookup ────────────────────────────────────────────────────
async function findArtistId() {
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

async function pickEvent(artistId) {
  // Use the seeded hero (or first available) so we test against real data
  // shape. Status doesn't have to be draft|published yet — we set it
  // below so the active transition has somewhere to come from.
  const { data } = await admin
    .from("events")
    .select("id, mux_stream_id, status")
    .eq("artist_id", artistId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

// ─── State for cleanup ─────────────────────────────────────────────────────
let event = null;
let originalMuxStreamId = null;
let originalStatus = null;
const TEST_MUX_ID = `smoke_stream_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
const UNKNOWN_MUX_ID = `smoke_unknown_${crypto.randomBytes(8).toString("hex")}`;

async function setup() {
  const artistId = await findArtistId();
  if (!artistId) die(`No artist ${ARTIST_EMAIL}. Run: npm run seed:test`);
  event = await pickEvent(artistId);
  if (!event) die(`No events for ${ARTIST_EMAIL}. Run: npm run seed:test`);

  // Snapshot original state so we can restore.
  originalMuxStreamId = event.mux_stream_id;
  originalStatus = event.status;

  // Park the event in published with our synthetic mux_stream_id so
  // active → live can land.
  const { error } = await admin
    .from("events")
    .update({ mux_stream_id: TEST_MUX_ID, status: "published" })
    .eq("id", event.id);
  if (error) die(`Could not prep event: ${error.message}`);
  console.log(
    `• Prepped event ${event.id}: mux_stream_id=${TEST_MUX_ID} status=published`,
  );
}

async function cleanup() {
  if (!event) return;
  try {
    await admin
      .from("events")
      .update({
        mux_stream_id: originalMuxStreamId,
        status: originalStatus,
      })
      .eq("id", event.id);
  } catch (e) {
    console.error("cleanup warning:", e.message);
  }
}

// ─── Probes ────────────────────────────────────────────────────────────────
async function probeForgery() {
  // No signature header at all.
  const noSigBody = makePayload("video.live_stream.active", TEST_MUX_ID);
  const noSig = await post(noSigBody, null);

  // Garbage signature.
  const badSig = await post(noSigBody, "t=0,v1=deadbeef");

  return { noSig, badSig };
}

async function probeFlipActive() {
  const body = makePayload("video.live_stream.active", TEST_MUX_ID);
  const sig = sign(body, MUX_WEBHOOK_SECRET);
  return post(body, sig);
}

async function probeFlipIdle() {
  const body = makePayload("video.live_stream.idle", TEST_MUX_ID);
  const sig = sign(body, MUX_WEBHOOK_SECRET);
  return post(body, sig);
}

async function probeUnknownStreamId() {
  const body = makePayload("video.live_stream.active", UNKNOWN_MUX_ID);
  const sig = sign(body, MUX_WEBHOOK_SECRET);
  return post(body, sig);
}

async function probeIgnoredType() {
  const body = makePayload("video.live_stream.recording", TEST_MUX_ID);
  const sig = sign(body, MUX_WEBHOOK_SECRET);
  return post(body, sig);
}

async function dbStatus() {
  const { data } = await admin
    .from("events")
    .select("status")
    .eq("id", event.id)
    .maybeSingle();
  return data?.status ?? "?";
}

// ─── Main ──────────────────────────────────────────────────────────────────
async function run() {
  await setup();

  console.log("\n• Forgery (signature) assertions:");
  const f = await probeForgery();
  const noSigOk = f.noSig.status === 401;
  const badSigOk = f.badSig.status === 401;
  console.log(
    `   no signature       -> HTTP ${f.noSig.status}  ${noSigOk ? "✓ rejected 401" : "✗ expected 401"}`,
  );
  console.log(
    `   bad signature      -> HTTP ${f.badSig.status}  ${badSigOk ? "✓ rejected 401" : "✗ expected 401"}`,
  );

  console.log("\n• Fail-loud miss assertion:");
  const miss = await probeUnknownStreamId();
  const missOk = miss.status >= 500 && miss.status < 600;
  console.log(
    `   unknown stream_id  -> HTTP ${miss.status}  ${missOk ? "✓ fails loud (Mux will retry)" : "✗ expected 5xx — 200 here would disarm Mux retries"}`,
  );

  console.log("\n• Ignored-type assertion:");
  const ignored = await probeIgnoredType();
  const ignoredOk = ignored.status === 200;
  console.log(
    `   unrelated type     -> HTTP ${ignored.status}  ${ignoredOk ? "✓ 200 (no retry)" : "✗ expected 200"}`,
  );

  console.log("\n• Flip assertions:");
  const before = await dbStatus();
  const active = await probeFlipActive();
  const afterActive = await dbStatus();
  console.log(
    `   active payload     -> HTTP ${active.status}  ${active.status === 200 ? "✓" : "✗"}    db: ${before} -> ${afterActive}`,
  );
  const activeOk = active.status === 200 && afterActive === "live";

  // Re-fire the same active payload; idempotency check.
  const activeAgain = await probeFlipActive();
  const afterActiveAgain = await dbStatus();
  const idempotentOk =
    activeAgain.status === 200 && afterActiveAgain === "live";
  console.log(
    `   active replay      -> HTTP ${activeAgain.status}  ${idempotentOk ? "✓ idempotent (no double-flip)" : "✗ expected 200 with status still live"}    db: ${afterActiveAgain}`,
  );

  const idle = await probeFlipIdle();
  const afterIdle = await dbStatus();
  const idleOk = idle.status === 200 && afterIdle === "ended";
  console.log(
    `   idle payload       -> HTTP ${idle.status}  ${idleOk ? "✓" : "✗"}    db: ${afterActive} -> ${afterIdle}`,
  );

  // ── Verdict
  const all = [
    noSigOk,
    badSigOk,
    missOk,
    ignoredOk,
    activeOk,
    idempotentOk,
    idleOk,
  ];
  console.log("\n────────────────────────────────");
  if (all.every(Boolean)) {
    console.log("✅  PASS — handler signature/fail-loud/flip teeth all hold.");
    console.log(
      "    GAP: this replay does NOT verify Mux → Vercel webhook delivery, " +
        "nor real RTMP ingest. Push from OBS to a live stream to verify the rest.\n",
    );
  } else {
    console.log("❌  FAIL —");
    if (!noSigOk || !badSigOk)
      console.log("     • signature gate is missing or wrong");
    if (!missOk)
      console.log(
        "     • UNKNOWN stream_id was accepted (200) instead of fail-loud (5xx). Mux retries are disarmed.",
      );
    if (!ignoredOk)
      console.log("     • unrelated event types weren't acknowledged 200");
    if (!activeOk) console.log("     • active payload did not flip to 'live'");
    if (!idempotentOk)
      console.log(
        "     • idempotency broken — replaying active did not no-op cleanly",
      );
    if (!idleOk) console.log("     • idle payload did not flip to 'ended'");
    console.log("");
    process.exitCode = 1;
  }
}

run()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(cleanup);
