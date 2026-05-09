// One-command test seed for Ayo. Creates the artist + fan auth users
// (idempotent), then upserts profiles, three events, and the seed
// ticket. Safe to re-run.
//
// Usage:
//   npm run seed:test
//
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in
// .env.local. The npm script wires --env-file=.env.local so you don't
// need to export anything by hand.

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PASSWORD = "AyoTest2026!";

const ARTIST = {
  email: "artist@ayo.live",
  display_name: "Nkyinkyim Collective",
  location: "Accra, GH",
  role: "artist",
};

const FAN = {
  email: "fan@ayo.live",
  display_name: "Augusta Addy",
  location: "Accra, GH",
  role: "fan",
};

function daysFromNow(days) {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

const EVENTS = [
  {
    title: "Ɔdɔ Ne Asomdwoeɛ",
    description:
      "A live highlife concert from Jamestown, Accra. 8 performers, 90 minutes of pure joy.",
    genre: "Highlife",
    scheduled_at: daysFromNow(13),
    ticket_price: 10.0,
    ticket_limit: 2000,
    status: "published",
    is_group: true,
  },
  {
    title: "Highlife After Hours",
    description: "Late night session. Acoustic set. Just the band and you.",
    genre: "Highlife",
    scheduled_at: daysFromNow(36),
    ticket_price: 8.0,
    ticket_limit: 1000,
    status: "published",
    is_group: true,
  },
  {
    title: "Rehearsal Session — Members Only",
    description: "Private rehearsal stream for band members.",
    genre: "Highlife",
    scheduled_at: daysFromNow(5),
    ticket_price: 0.0,
    ticket_limit: 50,
    status: "draft",
    is_group: true,
  },
];

async function findUserByEmail(email) {
  // listUsers paginates; iterate until we find the email or run out.
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw error;
    const found = data.users.find(
      (u) => (u.email ?? "").toLowerCase() === email.toLowerCase(),
    );
    if (found) return found;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

async function ensureUser(spec) {
  const existing = await findUserByEmail(spec.email);
  if (existing) {
    console.log(`✓ ${spec.email} already in auth.users (${existing.id})`);
    return existing.id;
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email: spec.email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) throw new Error(`createUser ${spec.email}: ${error.message}`);
  console.log(`+ created ${spec.email} (${data.user.id})`);
  return data.user.id;
}

async function ensureProfile(userId, spec) {
  const { error } = await supabase.from("profiles").upsert(
    {
      id: userId,
      role: spec.role,
      display_name: spec.display_name,
      location: spec.location,
    },
    { onConflict: "id" },
  );
  if (error) throw new Error(`profile ${spec.email}: ${error.message}`);
  console.log(`✓ profile ${spec.email} (role=${spec.role})`);
}

async function ensureEvent(artistId, ev) {
  const { data: existing, error: lookupErr } = await supabase
    .from("events")
    .select("id")
    .eq("artist_id", artistId)
    .eq("title", ev.title)
    .maybeSingle();
  if (lookupErr) throw lookupErr;
  if (existing) {
    console.log(`✓ event "${ev.title}" already exists (${existing.id})`);
    return existing.id;
  }
  const { data, error } = await supabase
    .from("events")
    .insert({ ...ev, artist_id: artistId })
    .select("id")
    .single();
  if (error) throw new Error(`event ${ev.title}: ${error.message}`);
  console.log(`+ created event "${ev.title}" (${data.id})`);
  return data.id;
}

async function ensureTicket(eventId, fanId) {
  const { data: existing } = await supabase
    .from("tickets")
    .select("id")
    .eq("event_id", eventId)
    .eq("fan_id", fanId)
    .maybeSingle();
  if (existing) {
    console.log(`✓ seed ticket already exists (${existing.id})`);
    return;
  }
  const { error } = await supabase.from("tickets").insert({
    event_id: eventId,
    fan_id: fanId,
    amount_paid: 10.0,
    currency: "USD",
    status: "confirmed",
    paystack_reference: "test_seed_001",
  });
  if (error) throw new Error(`ticket: ${error.message}`);
  console.log("+ created seed ticket for fan@ayo.live");
}

async function main() {
  console.log(`Seeding ${url}\n`);

  const artistId = await ensureUser(ARTIST);
  await ensureProfile(artistId, ARTIST);

  const fanId = await ensureUser(FAN);
  await ensureProfile(fanId, FAN);

  let heroEventId;
  for (const ev of EVENTS) {
    const id = await ensureEvent(artistId, ev);
    if (ev.title === "Ɔdɔ Ne Asomdwoeɛ") heroEventId = id;
  }

  if (heroEventId) {
    await ensureTicket(heroEventId, fanId);
  }

  console.log("\n✓ Done. Sign in:");
  console.log(`  artist@ayo.live / ${PASSWORD}  →  /dashboard`);
  console.log(`  fan@ayo.live    / ${PASSWORD}  →  /fan`);
}

main().catch((err) => {
  console.error("\n✗ Seed failed:", err.message ?? err);
  process.exit(1);
});
