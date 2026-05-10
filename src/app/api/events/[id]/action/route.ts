import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

type RouteParams = { params: Promise<{ id: string }> };
type Action = "publish" | "go_live" | "end" | "payout";

const ACTIONS: ReadonlyArray<Action> = [
  "publish",
  "go_live",
  "end",
  "payout",
] as const;

function isAction(value: unknown): value is Action {
  return typeof value === "string" && (ACTIONS as readonly string[]).includes(value);
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const action = body?.action;
  if (!isAction(action)) {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const service = createServiceClient();

  const { data: event, error: eventErr } = await service
    .from("events")
    .select("*")
    .eq("id", id)
    .eq("artist_id", user.id)
    .single();

  if (eventErr || !event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  if (action === "publish") {
    if (event.status !== "draft") {
      return NextResponse.json(
        { error: "Event is not a draft" },
        { status: 400 },
      );
    }
    const { error } = await service
      .from("events")
      .update({ status: "published" })
      .eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({
      message: "Event published — fans can now buy tickets",
    });
  }

  if (action === "go_live") {
    if (event.status !== "published") {
      return NextResponse.json(
        { error: "Event must be published first" },
        { status: 400 },
      );
    }
    const { error } = await service
      .from("events")
      .update({ status: "live" })
      .eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({
      message: "You are live — fans with tickets can now watch",
    });
  }

  if (action === "end") {
    if (event.status !== "live") {
      return NextResponse.json(
        { error: "Event is not live" },
        { status: 400 },
      );
    }
    const { error } = await service
      .from("events")
      .update({ status: "ended" })
      .eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({
      message: "Show ended — request your payout below",
    });
  }

  // Payout
  if (event.status !== "ended") {
    return NextResponse.json(
      { error: "Event must be ended first" },
      { status: 400 },
    );
  }

  // Idempotency: don't initiate twice for the same event.
  const { data: existing } = await service
    .from("payouts")
    .select("id")
    .eq("event_id", id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: "Payout already initiated" },
      { status: 400 },
    );
  }

  const { data: tickets } = await service
    .from("tickets")
    .select("amount_paid")
    .eq("event_id", id)
    .eq("status", "confirmed");

  const gross = (tickets ?? []).reduce(
    (sum: number, t: { amount_paid: number }) => sum + Number(t.amount_paid),
    0,
  );
  const platformFee = gross * 0.1;
  const net = gross * 0.9;

  if (net <= 0) {
    return NextResponse.json(
      { error: "No earnings to pay out" },
      { status: 400 },
    );
  }

  const { data: profile } = await service
    .from("profiles")
    .select("paystack_id")
    .eq("id", user.id)
    .single();

  if (!profile?.paystack_id) {
    return NextResponse.json(
      {
        error:
          "No payout account set up. Go to Settings to add your bank or Mobile Money.",
      },
      { status: 400 },
    );
  }

  if (!process.env.PAYSTACK_SECRET_KEY) {
    return NextResponse.json(
      { error: "Paystack is not configured on the server" },
      { status: 500 },
    );
  }

  // Create the payout row first so we have a stable reference for the
  // Paystack transfer; if Paystack fails we mark the row failed.
  const { data: payout, error: insertErr } = await service
    .from("payouts")
    .insert({
      artist_id: user.id,
      event_id: id,
      gross_amount: gross,
      platform_fee: platformFee,
      net_amount: net,
      status: "processing",
    })
    .select()
    .single();

  if (insertErr || !payout) {
    return NextResponse.json(
      { error: insertErr?.message ?? "Could not record payout" },
      { status: 500 },
    );
  }

  let transferData: {
    status?: boolean;
    message?: string;
    data?: { transfer_code?: string };
  };
  try {
    const res = await fetch("https://api.paystack.co/transfer", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: "balance",
        // amount is in the minor unit of the recipient's currency. The
        // recipient was created with currency: 'GHS', so this is
        // pesewas. NOTE: net is computed from amount_paid (USD on
        // ticket rows today) — needs FX conversion or GHS-priced
        // tickets before real money flows.
        amount: Math.round(net * 100),
        recipient: profile.paystack_id,
        reason: `Ayo payout — ${event.title}`,
        reference: payout.id,
        currency: "GHS",
      }),
    });
    transferData = await res.json();
  } catch (err) {
    console.error("[payout] paystack call failed:", err);
    await service
      .from("payouts")
      .update({ status: "failed" })
      .eq("id", payout.id);
    return NextResponse.json(
      { error: "Could not reach Paystack" },
      { status: 502 },
    );
  }

  if (!transferData.status || !transferData.data?.transfer_code) {
    await service
      .from("payouts")
      .update({ status: "failed" })
      .eq("id", payout.id);
    return NextResponse.json(
      {
        error: `Paystack transfer failed: ${transferData.message ?? "unknown error"}`,
      },
      { status: 500 },
    );
  }

  await service
    .from("payouts")
    .update({
      paystack_transfer_id: transferData.data.transfer_code,
      initiated_at: new Date().toISOString(),
    })
    .eq("id", payout.id);

  return NextResponse.json({
    message: `Payout of $${net.toFixed(2)} initiated — arrives within 24 hours`,
  });
}
