import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireEventOwner } from "@/lib/auth/guards";
import {
  validateEventPatch,
  validationErrorResponse,
} from "@/lib/validation/event";
import type { Database } from "@/types/database";
import type { EventStatus } from "@/types";

type RouteParams = { params: Promise<{ id: string }> };
type EventUpdate = Database["public"]["Tables"]["events"]["Update"];

// Status + cover_url are accepted on PATCH but go through their own
// guards rather than validateEventPatch (status has its own enum check
// in /api/events/[id]/action; cover_url is written via /banner upload).
const ALLOWED_STATUSES: EventStatus[] = [
  "draft",
  "published",
  "live",
  "ended",
  "cancelled",
];

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const guard = await requireEventOwner(supabase, id);
  if (guard instanceof Response) return guard;
  return NextResponse.json({ event: guard.event });
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const guard = await requireEventOwner(supabase, id);
  if (guard instanceof Response) return guard;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  // Validate the standard fields. status + cover_url are handled separately
  // so they can pass through without being treated as required.
  const validation = validateEventPatch(body);
  if (!validation.ok) return validationErrorResponse(validation.errors);
  const patch: EventUpdate = { ...validation.value };

  if ("status" in body) {
    const status = body.status;
    if (typeof status !== "string" || !ALLOWED_STATUSES.includes(status as EventStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    patch.status = status as EventStatus;
  }
  if ("cover_url" in body) {
    const cover = body.cover_url;
    if (cover != null && typeof cover !== "string") {
      return NextResponse.json(
        { error: "cover_url must be a string or null" },
        { status: 400 },
      );
    }
    patch.cover_url = (cover as string | null) ?? null;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: "No updatable fields provided" },
      { status: 400 },
    );
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
  const guard = await requireEventOwner(supabase, id);
  if (guard instanceof Response) return guard;

  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
