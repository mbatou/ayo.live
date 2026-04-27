import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "artist") {
    return NextResponse.json(
      { error: "Artist account required" },
      { status: 403 },
    );
  }

  const body = await req.json();
  const {
    title,
    description,
    genre,
    scheduled_at,
    ticket_price,
    ticket_limit,
    is_group,
  } = body;

  if (!title || !scheduled_at || ticket_price == null) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  const { data: event, error } = await supabase
    .from("events")
    .insert({
      artist_id: user.id,
      title,
      description: description ?? null,
      genre: genre ?? null,
      scheduled_at,
      ticket_price,
      ticket_limit: ticket_limit ?? null,
      is_group: is_group ?? false,
      status: "draft",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ event }, { status: 201 });
}
