import { type NextRequest, NextResponse } from "next/server";
import { mux } from "@/lib/mux";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.text();

  let event;
  try {
    event = await mux.webhooks.unwrap(
      body,
      req.headers,
      process.env.MUX_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error("[mux/webhook] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const service = createServiceClient();

  // Stream went active — artist's encoder connected and Mux is broadcasting.
  if (event.type === "video.live_stream.active") {
    const muxStreamId = event.data.id;
    if (typeof muxStreamId === "string") {
      await service
        .from("events")
        .update({ status: "live" })
        .eq("mux_stream_id", muxStreamId)
        // Don't reanimate ended/cancelled events.
        .in("status", ["draft", "published"]);
    }
  }

  // Stream went idle — encoder disconnected; treat as ended.
  if (event.type === "video.live_stream.idle") {
    const muxStreamId = event.data.id;
    if (typeof muxStreamId === "string") {
      await service
        .from("events")
        .update({ status: "ended" })
        .eq("mux_stream_id", muxStreamId)
        .eq("status", "live");
    }
  }

  return NextResponse.json({ received: true });
}
