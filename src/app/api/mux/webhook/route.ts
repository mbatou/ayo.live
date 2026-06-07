import { type NextRequest, NextResponse } from "next/server";
import { mux } from "@/lib/mux";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

// POST /api/mux/webhook — Mux server-to-server stream lifecycle events.
//
// Hardening per the spec (mirrors /api/paystack/webhook):
//
//   1. SIGNATURE: mux.webhooks.unwrap(body, headers, secret) does HMAC
//      verification and JSON parse in one call. A bad signature throws,
//      we return 401, and the request is dropped.
//
//   2. FAIL LOUD ON MISS: when active/idle arrives, we look up the event
//      by mux_stream_id and assert exactly one row updated. If 0 rows
//      change — DB drift, wrong env, race with a delete — we return 500
//      so Mux retries. A 200 with no DB change disarms Mux's only safety
//      net; that's the worst outcome and we refuse to be that handler.
//
//   3. IDEMPOTENT: status filters mean active→active and idle→idle are
//      structural no-ops (the .in/.eq predicate stops matching once the
//      first flip lands). We treat 0-row updates as miss only on the
//      FIRST seen-by-us event; the row-count distinction is "did this
//      lifecycle change land somewhere it should have" rather than "did
//      anything happen at all". Duplicate deliveries no-op naturally.
//
//   4. UNRELATED EVENT TYPES: return 200 with received:true. We don't
//      want Mux retrying things we deliberately ignore.
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

  // Branch by Mux event type. Everything we don't handle is acknowledged
  // so Mux doesn't retry.
  if (
    event.type !== "video.live_stream.active" &&
    event.type !== "video.live_stream.idle"
  ) {
    return NextResponse.json({ received: true });
  }

  const muxStreamId = event.data.id;
  if (typeof muxStreamId !== "string") {
    console.error("[mux/webhook] event missing data.id");
    return NextResponse.json({ received: true });
  }

  const service = createServiceClient();

  if (event.type === "video.live_stream.active") {
    // draft|published -> live. Already-live, ended, or cancelled events
    // are intentional no-ops (row doesn't match the .in filter).
    const { data: updated, error } = await service
      .from("events")
      .update({ status: "live" })
      .eq("mux_stream_id", muxStreamId)
      .in("status", ["draft", "published"])
      .select("id, status");

    if (error) {
      console.error("[mux/webhook] live update DB error:", error);
      return NextResponse.json(
        { error: "Database error" },
        { status: 500 },
      );
    }

    // Distinguish "already live / already ended" (idempotent no-op) from
    // "no event with this mux_stream_id" (fail loud).
    if ((updated?.length ?? 0) === 0) {
      const { data: exists } = await service
        .from("events")
        .select("id, status")
        .eq("mux_stream_id", muxStreamId)
        .maybeSingle();
      if (!exists) {
        console.error(
          "[mux/webhook] no event matches mux_stream_id:",
          muxStreamId,
        );
        return NextResponse.json(
          { error: "Unknown stream" },
          { status: 500 },
        );
      }
      // Event exists but status wasn't draft|published (e.g. already
      // live from a previous webhook delivery). Idempotent no-op.
      return NextResponse.json({ received: true, noop: true });
    }

    return NextResponse.json({ received: true, flipped: "live" });
  }

  // video.live_stream.idle → ended. Only live events transition; if
  // we're already ended (duplicate delivery) we no-op.
  const { data: updated, error } = await service
    .from("events")
    .update({ status: "ended" })
    .eq("mux_stream_id", muxStreamId)
    .eq("status", "live")
    .select("id, status");

  if (error) {
    console.error("[mux/webhook] idle update DB error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  if ((updated?.length ?? 0) === 0) {
    const { data: exists } = await service
      .from("events")
      .select("id, status")
      .eq("mux_stream_id", muxStreamId)
      .maybeSingle();
    if (!exists) {
      console.error(
        "[mux/webhook] no event matches mux_stream_id:",
        muxStreamId,
      );
      return NextResponse.json(
        { error: "Unknown stream" },
        { status: 500 },
      );
    }
    return NextResponse.json({ received: true, noop: true });
  }

  return NextResponse.json({ received: true, flipped: "ended" });
}
