import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { signMuxPlaybackUrl } from "@/lib/mux";

export const runtime = "nodejs"; // signMuxPlaybackUrl uses node crypto

type EventJoin = {
  mux_playback_id: string | null;
  status: string;
} | null;

type TicketRow = {
  id: string;
  device_fingerprint: string | null;
  event_id: string;
  status: string;
  events: EventJoin;
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const ticketToken = typeof body?.ticket_token === "string" ? body.ticket_token : "";
  const fingerprint = typeof body?.fingerprint === "string" ? body.fingerprint : "";

  if (!ticketToken || !fingerprint) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const service = createServiceClient();

  const { data: rawTicket } = await service
    .from("tickets")
    .select(
      "id, device_fingerprint, event_id, status, events(mux_playback_id, status)",
    )
    .eq("token", ticketToken)
    .single();

  const ticket = rawTicket as unknown as TicketRow | null;
  if (!ticket || ticket.status !== "confirmed") {
    return NextResponse.json({ error: "Invalid ticket" }, { status: 401 });
  }

  // Bind on first watch; reject mismatch thereafter.
  if (!ticket.device_fingerprint) {
    const { error: bindErr } = await service
      .from("tickets")
      .update({
        device_fingerprint: fingerprint,
        used_at: new Date().toISOString(),
      })
      .eq("id", ticket.id);
    if (bindErr) {
      console.error("[watch/token] device bind failed:", bindErr);
      return NextResponse.json(
        { error: "Could not register device" },
        { status: 500 },
      );
    }
  } else if (ticket.device_fingerprint !== fingerprint) {
    return NextResponse.json(
      {
        error:
          "This ticket was opened on a different device. Each ticket is locked to one device.",
      },
      { status: 403 },
    );
  }

  // Touch the session row for this ticket. Requires the unique
  // constraint on sessions.ticket_id from migration 0010.
  const { error: sessionErr } = await service.from("sessions").upsert(
    {
      ticket_id: ticket.id,
      last_seen: new Date().toISOString(),
    },
    { onConflict: "ticket_id" },
  );
  if (sessionErr) {
    // Non-fatal; log and continue. The watch flow shouldn't block on a
    // session-touch failure.
    console.error("[watch/token] session upsert failed:", sessionErr);
  }

  if (!ticket.events?.mux_playback_id) {
    return NextResponse.json({
      stream_url: null,
      message: "Stream not ready yet",
    });
  }

  try {
    const stream_url = await signMuxPlaybackUrl(ticket.events.mux_playback_id);
    return NextResponse.json({ stream_url });
  } catch (err) {
    console.error("[watch/token] signing failed:", err);
    return NextResponse.json(
      { error: "Could not generate playback URL" },
      { status: 500 },
    );
  }
}
