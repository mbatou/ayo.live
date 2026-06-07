// Authorization guards for artist-scoped API routes.
//
// Pattern lifted verbatim from /api/events POST (the only route that had
// the right shape pre-refactor). Two gates, both following the
// return-a-Response convention so handlers stay flat:
//
//     const a = await requireArtist(supabase);
//     if (a instanceof Response) return a;
//     // ...use a.user from here
//
// JWT upgrade (follow-up): when Supabase access-token hook starts setting
// app_metadata.role, requireArtist short-circuits on the claim and skips
// the profiles read. That's a one-file change here, no call-site edits.

import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/types/database";

type ServerClient = SupabaseClient<Database>;
type EventRow = Database["public"]["Tables"]["events"]["Row"];

export type ArtistContext = { user: User };
export type EventOwnerContext = { user: User; event: EventRow };

function unauthorised() {
  return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
}

function notArtist() {
  return NextResponse.json(
    { error: "Artist account required" },
    { status: 403 },
  );
}

function notFound() {
  return NextResponse.json({ error: "Event not found" }, { status: 404 });
}

function notOwner() {
  return NextResponse.json({ error: "Not your event" }, { status: 403 });
}

export async function requireArtist(
  supabase: ServerClient,
): Promise<ArtistContext | Response> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorised();

  // Prefer the JWT claim if a future Supabase access-token hook is
  // setting one. Until that ships, fall back to the single profiles
  // read — same pattern /api/events POST already runs.
  const claimedRole =
    (user.app_metadata as { role?: string } | null)?.role ?? null;
  if (claimedRole === "artist") return { user };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "artist") return notArtist();
  return { user };
}

export async function requireEventOwner(
  supabase: ServerClient,
  eventId: string,
): Promise<EventOwnerContext | Response> {
  const artist = await requireArtist(supabase);
  if (artist instanceof Response) return artist;

  // Service client so RLS variance (public can read published, artists
  // can read their own drafts, etc.) doesn't turn cross-artist access
  // into a misleading 404 — we want a deterministic 403 when the
  // ownership doesn't match.
  const service = createServiceClient();
  const { data: event } = await service
    .from("events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();

  if (!event) return notFound();
  if (event.artist_id !== artist.user.id) return notOwner();

  return { user: artist.user, event };
}
