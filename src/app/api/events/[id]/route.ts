import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type { EventStatus } from "@/types";

type RouteParams = { params: Promise<{ id: string }> };
type EventUpdate = Database["public"]["Tables"]["events"]["Update"];

const UPDATABLE_FIELDS = [
  "title",
  "description",
  "genre",
  "scheduled_at",
  "ticket_price",
  "ticket_limit",
  "is_group",
  "cover_url",
  "status",
] as const satisfies ReadonlyArray<keyof EventUpdate>;

const ALLOWED_STATUSES: EventStatus[] = [
  "draft",
  "published",
  "live",
  "ended",
  "cancelled",
];

async function loadOwnedEvent(supabase: Awaited<ReturnType<typeof createClient>>, id: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorised" as const, status: 401 };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "artist") {
    return { error: "Artist account required" as const, status: 403 };
  }

  const { data: event, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !event) {
    return { error: "Event not found" as const, status: 404 };
  }
  if (event.artist_id !== user.id) {
    return { error: "Not your event" as const, status: 403 };
  }

  return { user, event };
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const result = await loadOwnedEvent(supabase, id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ event: result.event });
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const result = await loadOwnedEvent(supabase, id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const body = await req.json();
  const patch: EventUpdate = {};
  for (const field of UPDATABLE_FIELDS) {
    if (field in body) {
      // Field-by-field assignment; trust the runtime check on `status` below
      // and let Supabase's column types handle the rest at the DB layer.
      (patch as Record<string, unknown>)[field] = body[field];
    }
  }

  if (
    typeof patch.status === "string" &&
    !ALLOWED_STATUSES.includes(patch.status)
  ) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });
  }

  const { data: event, error } = await supabase
    .from("events")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ event });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const result = await loadOwnedEvent(supabase, id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
