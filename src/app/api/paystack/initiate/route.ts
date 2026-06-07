import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { PAYSTACK_BASE_URL } from "@/lib/paystack";

// POST /api/paystack/initiate — two paths:
//  - Paid show (ticket_price > 0): create the ticket pending, hit
//    Paystack, return the hosted-checkout URL. If Paystack rejects,
//    the pending ticket is deleted in the same request so it can't
//    accumulate as dead inventory.
//  - Free show (ticket_price === 0): skip Paystack entirely, issue a
//    confirmed ticket directly, return the watch token. One ticket
//    per fan per free event — a free show shouldn't let one fan mint
//    unlimited tokens.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  if (!user.email) {
    return NextResponse.json(
      { error: "Account is missing an email" },
      { status: 400 },
    );
  }

  const { event_id } = await req.json();
  if (!event_id) {
    return NextResponse.json({ error: "Missing event_id" }, { status: 400 });
  }

  const { data: event } = await supabase
    .from("events")
    .select("id, title, ticket_price, ticket_limit, status")
    .eq("id", event_id)
    .in("status", ["published", "live"])
    .single();

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const service = createServiceClient();

  if (event.ticket_limit) {
    const { count } = await service
      .from("tickets")
      .select("*", { count: "exact", head: true })
      .eq("event_id", event_id)
      .eq("status", "confirmed");

    if ((count ?? 0) >= event.ticket_limit) {
      return NextResponse.json({ error: "Sold out" }, { status: 400 });
    }
  }

  // ─── Free path ────────────────────────────────────────────────────────
  if (Number(event.ticket_price) === 0) {
    const { data: existing } = await service
      .from("tickets")
      .select("id, token")
      .eq("event_id", event_id)
      .eq("fan_id", user.id)
      .eq("status", "confirmed")
      .maybeSingle();
    if (existing?.token) {
      // Idempotent: same fan re-clicks → same watch token.
      return NextResponse.json({
        free: true,
        ticket_id: existing.id,
        watch_url: `/watch/${existing.token}`,
      });
    }

    const { data: ticket, error: insertErr } = await service
      .from("tickets")
      .insert({
        event_id,
        fan_id: user.id,
        amount_paid: 0,
        currency: "GHS",
        status: "confirmed",
        paystack_reference: `free_${Date.now()}`,
      })
      .select("id, token")
      .single();

    if (insertErr || !ticket) {
      console.error("[initiate] free ticket insert failed:", insertErr);
      return NextResponse.json(
        { error: "Could not issue ticket" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      free: true,
      ticket_id: ticket.id,
      watch_url: `/watch/${ticket.token}`,
    });
  }

  // ─── Paid path ────────────────────────────────────────────────────────
  const { data: ticket, error: ticketError } = await service
    .from("tickets")
    .insert({
      event_id,
      fan_id: user.id,
      amount_paid: event.ticket_price,
      currency: "GHS",
      status: "pending",
    })
    .select()
    .single();

  if (ticketError || !ticket) {
    return NextResponse.json(
      { error: "Could not create ticket" },
      { status: 500 },
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  let paystackData: {
    status?: boolean;
    message?: string;
    data?: { authorization_url?: string; reference?: string };
  };
  try {
    const paystackRes = await fetch(
      `${PAYSTACK_BASE_URL}/transaction/initialize`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.email,
          // Ayo is GHS-only. ticket_price is GHS major units (e.g. 150
          // means GH₵150.00); *100 yields pesewas. No FX anywhere.
          amount: Math.round(event.ticket_price * 100),
          currency: "GHS",
          reference: ticket.id,
          metadata: {
            event_id,
            ticket_id: ticket.id,
            fan_id: user.id,
            event_title: event.title,
          },
          callback_url: `${appUrl}/api/paystack/verify?ticket_id=${ticket.id}`,
        }),
      },
    );
    paystackData = await paystackRes.json();
  } catch (err) {
    // Paystack unreachable — drop the orphan and surface the error.
    await service.from("tickets").delete().eq("id", ticket.id);
    console.error("[initiate] paystack fetch failed:", err);
    return NextResponse.json(
      { error: "Could not reach Paystack" },
      { status: 502 },
    );
  }

  if (!paystackData.status || !paystackData.data?.authorization_url) {
    // Paystack rejected init — drop the orphan pending ticket so it
    // doesn't accumulate as dead inventory.
    await service.from("tickets").delete().eq("id", ticket.id);
    return NextResponse.json(
      { error: `Paystack error: ${paystackData.message ?? "unknown"}` },
      { status: 500 },
    );
  }

  await service
    .from("tickets")
    .update({ paystack_reference: paystackData.data.reference })
    .eq("id", ticket.id);

  return NextResponse.json({
    authorization_url: paystackData.data.authorization_url,
    reference: paystackData.data.reference,
  });
}
