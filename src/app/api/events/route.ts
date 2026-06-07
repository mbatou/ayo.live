import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createMuxLiveStream } from "@/lib/mux";
import { requireArtist } from "@/lib/auth/guards";
import {
  validateEventCreate,
  validationErrorResponse,
} from "@/lib/validation/event";

export const runtime = "nodejs";

// GET /api/events — public list of published + live events.
export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("*, profiles(id, display_name, location, avatar_url)")
    .in("status", ["published", "live"])
    .order("scheduled_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ events: data });
}

// POST /api/events — artist creates a draft event.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const guard = await requireArtist(supabase);
  if (guard instanceof Response) return guard;
  const { user } = guard;

  const validation = validateEventCreate(await req.json().catch(() => ({})));
  if (!validation.ok) return validationErrorResponse(validation.errors);
  const v = validation.value;

  const { data: event, error } = await supabase
    .from("events")
    .insert({
      artist_id: user.id,
      title: v.title,
      description: v.description,
      genre: v.genre,
      scheduled_at: v.scheduled_at,
      ticket_price: v.ticket_price,
      ticket_limit: v.ticket_limit,
      is_group: v.is_group,
      status: "draft",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Provision a Mux live stream for this event. If Mux is unreachable
  // the event still exists as a draft — artist can retry later.
  try {
    const muxData = await createMuxLiveStream();
    const service = createServiceClient();
    const { data: updated } = await service
      .from("events")
      .update(muxData)
      .eq("id", event.id)
      .select()
      .single();
    return NextResponse.json({ event: updated ?? { ...event, ...muxData } }, {
      status: 201,
    });
  } catch (muxError) {
    console.error("[Mux] stream creation failed:", muxError);
    return NextResponse.json(
      {
        event,
        mux_error:
          "Stream setup failed — open this event later to retry, or contact support.",
      },
      { status: 201 },
    );
  }
}
