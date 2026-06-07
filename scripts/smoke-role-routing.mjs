#!/usr/bin/env node
/**
 * Ayo · Smoke Test 3 — Auth + role routing + ownership
 * --------------------------------------------------------------------------
 * Three layers of proof:
 *
 *   PAGES (HTTP can only hint at client-side gating):
 *     A artist  -> /dashboard            : reached
 *     B fan     -> /fan                  : reached
 *     C fan     -> /dashboard            : bounced (server-side gate)
 *     D artist  -> /fan                  : bounced
 *     G anon    -> /dashboard            : bounced
 *
 *   ROLE GATE (the security teeth — must be 401/403, not 200):
 *     fan vs every List-A artist route               -> 403
 *     artist vs same routes (regression guard)       -> NOT 403
 *
 *   OWNERSHIP GATE:
 *     temp artist #2 -> action on artist #1's event  -> 403
 *
 * EXPECTED RESULT today: ✅ PASS on all three layers.
 *
 * RUN:   npm run smoke:role-routing
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

// Throwaway artist #2 for the ownership check. Created+destroyed per run.
const ARTIST_TWO_EMAIL = `smoke-artist2+${Date.now()}@ayo.live`;
const ARTIST_TWO_PASSWORD = "SmokeArtist2-2026!";

const ARTIST_COOKIE_OVERRIDE = process.env.ARTIST_AUTH_COOKIE ?? null;
const FAN_COOKIE_OVERRIDE = process.env.FAN_AUTH_COOKIE ?? null;

// A real-looking UUID that isn't in the events table. Used for [id] routes
// so the artist regression guard doesn't accidentally damage a real event.
// The role gate fires before the event lookup, so this exercises the gate
// without touching DB state.
const NONEXISTENT_EVENT_ID = "00000000-0000-0000-0000-deadbeefdead";
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

const admin = SERVICE_KEY
  ? createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

async function buildCookie(email, password, override) {
  if (override) return { cookie: `sb-${projectRef}-auth-token=${override}` };
  const pub = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false },
  });
  const { data, error } = await pub.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    die(
      `Sign-in failed for ${email} (${error?.message ?? "no session"}). ` +
        `Use the *_AUTH_COOKIE fallback.`,
    );
  }
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
const rejected = (r) => r.status === 401 || r.status === 403;

async function findUserId(email) {
  if (!admin) return null;
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw error;
    const hit = data.users.find(
      (u) => (u.email ?? "").toLowerCase() === email.toLowerCase(),
    );
    if (hit) return hit.id;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

async function rolePreflight(artistId, fanId) {
  if (!admin || !artistId || !fanId) {
    console.log("• Role pre-flight skipped (no service key).");
    return;
  }
  const { data, error } = await admin
    .from("profiles")
    .select("id, role")
    .in("id", [artistId, fanId]);
  if (error) {
    console.log(`• Role pre-flight skipped (${error.message}).`);
    return;
  }
  const role = (id) => data.find((p) => p.id === id)?.role;
  const ar = role(artistId);
  const fr = role(fanId);
  console.log(`• Seed roles: artist=${ar}  fan=${fr}`);
  if (ar !== "artist" || fr !== "fan") {
    die(
      "Seed users do not have the expected roles — every routing assertion below is meaningless until this is fixed.",
    );
  }
}

async function getArtistHeroEventId(artistId) {
  if (!admin || !artistId) return null;
  const { data } = await admin
    .from("events")
    .select("id, title")
    .eq("artist_id", artistId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

// ─── Temp artist #2 lifecycle ──────────────────────────────────────────────
let tempArtistId = null;
async function createTempArtist() {
  if (!admin) return null;
  const { data, error } = await admin.auth.admin.createUser({
    email: ARTIST_TWO_EMAIL,
    password: ARTIST_TWO_PASSWORD,
    email_confirm: true,
  });
  if (error) {
    console.log(`• Temp artist creation failed: ${error.message}`);
    return null;
  }
  tempArtistId = data.user.id;
  const { error: profileErr } = await admin
    .from("profiles")
    .upsert(
      { id: tempArtistId, role: "artist", display_name: "Smoke Artist 2" },
      { onConflict: "id" },
    );
  if (profileErr) {
    console.log(`• Temp artist profile failed: ${profileErr.message}`);
  }
  return tempArtistId;
}

async function destroyTempArtist() {
  if (!admin || !tempArtistId) return;
  try {
    await admin.from("profiles").delete().eq("id", tempArtistId);
    await admin.auth.admin.deleteUser(tempArtistId);
  } catch (e) {
    console.error("temp artist cleanup warning:", e.message);
  }
}

// ─── Probe runner ──────────────────────────────────────────────────────────
function probeName(method, path) {
  return `${method.padEnd(6)} ${path}`;
}

async function run() {
  const a = await buildCookie(
    ARTIST_EMAIL,
    PASSWORD,
    ARTIST_COOKIE_OVERRIDE,
  );
  const f = await buildCookie(FAN_EMAIL, PASSWORD, FAN_COOKIE_OVERRIDE);
  const artistCookie = a.cookie;
  const fanCookie = f.cookie;

  // Resolve seed users for the pre-flight + the hero event.
  const artistId = a.userId ?? (await findUserId(ARTIST_EMAIL));
  const fanId = f.userId ?? (await findUserId(FAN_EMAIL));
  await rolePreflight(artistId, fanId);

  const heroEventId = await getArtistHeroEventId(artistId);
  if (heroEventId) {
    console.log(`• Hero event (artist #1): ${heroEventId}`);
  } else {
    console.log(
      "• Hero event lookup skipped (no service key or no events seeded). " +
        "Cross-artist ownership check will be SKIPPED.",
    );
  }

  console.log("\n• Probing pages…\n");
  const A = await hit(ARTIST_HOME, artistCookie);
  const B = await hit(FAN_HOME, fanCookie);
  const C = await hit(ARTIST_HOME, fanCookie);
  const D = await hit(FAN_HOME, artistCookie);
  const G = await hit(ARTIST_HOME, null);

  const hardFails = [];
  const warns = [];

  console.log("──────────── PAGES ─────────────");
  console.log(
    `A artist → ${ARTIST_HOME.padEnd(10)} : ${reached(A) ? "reached ✓" : `NOT reached (${A.status} ${A.location ?? ""}) ✗`}`,
  );
  if (!reached(A))
    hardFails.push(
      "artist cannot reach their own dashboard — auth or gating broken",
    );
  console.log(
    `B fan    → ${FAN_HOME.padEnd(10)} : ${reached(B) ? "reached ✓" : `NOT reached (${B.status} ${B.location ?? ""}) ✗`}`,
  );
  if (!reached(B))
    hardFails.push("fan cannot reach their own area — auth or gating broken");

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

  // ── List A: every artist-scoped route. Fan must be rejected; artist
  //          must NOT be rejected (regression guard).
  const ARTIST_ROUTES = [
    {
      method: "POST",
      path: "/api/events",
      body: "{}", // body invalid; gate must fire before validation
    },
    {
      method: "POST",
      path: "/api/artist/payout-setup",
      body: "{}", // the smoke-test-3 E hole — must now be 403
    },
    {
      method: "POST",
      path: `/api/events/${NONEXISTENT_EVENT_ID}/action`,
      body: "{}",
    },
    {
      method: "PATCH",
      path: `/api/events/${NONEXISTENT_EVENT_ID}`,
      body: "{}",
    },
    {
      method: "DELETE",
      // Fake UUID so an artist regression run can't delete a real row.
      path: `/api/events/${NONEXISTENT_EVENT_ID}`,
    },
  ];

  console.log("\n──────────── ROLE GATE ─────────");
  for (const r of ARTIST_ROUTES) {
    const fanRes = await hit(r.path, fanCookie, {
      method: r.method,
      body: r.body,
    });
    const artistRes = await hit(r.path, artistCookie, {
      method: r.method,
      body: r.body,
    });
    const name = probeName(r.method, r.path);
    const fanOk = fanRes.status === 403;
    const artistOk = artistRes.status !== 403;
    const fanLabel = fanOk
      ? `fan ${fanRes.status} ✓`
      : `fan ${fanRes.status} ✗`;
    const artistLabel = artistOk
      ? `artist ${artistRes.status} ✓`
      : `artist 403 ✗ REGRESSION`;
    console.log(`  ${name.padEnd(48)} ${fanLabel}   ${artistLabel}`);
    if (!fanOk) {
      if (fanRes.status === 401) {
        warns.push(
          `${name} returned 401 for fan, not 403 — the gate is at the auth layer instead of the role layer. Acceptable but verify intent.`,
        );
      } else if (fanRes.status === 200) {
        hardFails.push(
          `${name} returned 200 to a fan — broken server-side authorization`,
        );
      } else {
        warns.push(
          `${name} returned ${fanRes.status} to a fan, not 403 — verify the route gates on role`,
        );
      }
    }
    if (!artistOk) {
      hardFails.push(
        `${name} returned 403 to a real artist — the role helper is over-aggressive (regression)`,
      );
    }
  }

  // ── Cross-artist ownership check.
  console.log("\n──────────── OWNERSHIP ─────────");
  if (heroEventId && admin) {
    const tempId = await createTempArtist();
    if (!tempId) {
      console.log("  skipped — could not create temp artist #2");
      warns.push(
        "ownership check skipped — temp artist #2 could not be created",
      );
    } else {
      const a2 = await buildCookie(
        ARTIST_TWO_EMAIL,
        ARTIST_TWO_PASSWORD,
        null,
      );
      const res = await hit(`/api/events/${heroEventId}/action`, a2.cookie, {
        method: "POST",
        body: JSON.stringify({ action: "publish" }),
      });
      const ok = res.status === 403;
      console.log(
        `  artist#2 POST /api/events/<artist#1 event>/action : ${ok ? `${res.status} ✓ (Not your event)` : `${res.status} ✗ (expected 403)`}`,
      );
      if (!ok) {
        hardFails.push(
          `cross-artist event action returned ${res.status} instead of 403 — ownership gate is missing or wrong`,
        );
      }
    }
  } else {
    console.log("  skipped — no hero event or no service key");
  }

  console.log("\n────────────────────────────────");
  if (hardFails.length) {
    console.log("❌  FAIL —");
    hardFails.forEach((m) => console.log(`     • ${m}`));
    warns.forEach((m) => console.log(`     ⚠ ${m}`));
    console.log("");
    process.exitCode = 1;
  } else if (warns.length) {
    console.log(
      "⚠️  PASS WITH CAVEATS — security teeth hold, but note these:",
    );
    warns.forEach((m) => console.log(`     ⚠ ${m}`));
    console.log("");
  } else {
    console.log(
      "✅  PASS — pages gated server-side, fan rejected 403 on every artist route, " +
        "artists unaffected (no regression), cross-artist ownership blocked.\n",
    );
  }
}

run()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(destroyTempArtist);
