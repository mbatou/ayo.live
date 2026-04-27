import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// POST /api/paystack/initiate — creates a pending ticket and returns the
// Paystack hosted-checkout URL for the fan to complete payment.
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

  if (event.ticket_limit) {
    const { count } = await supabase
      .from("tickets")
      .select("*", { count: "exact", head: true })
      .eq("event_id", event_id)
      .eq("status", "confirmed");

    if ((count ?? 0) >= event.ticket_limit) {
      return NextResponse.json({ error: "Sold out" }, { status: 400 });
    }
  }

  // Insert via service role — RLS has no INSERT policy on tickets.
  const service = createServiceClient();
  const { data: ticket, error: ticketError } = await service
    .from("tickets")
    .insert({
      event_id,
      fan_id: user.id,
      amount_paid: event.ticket_price,
      currency: "USD",
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

  const paystackRes = await fetch(
    "https://api.paystack.co/transaction/initialize",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        // Paystack expects the sub-unit (kobo / pesewas).
        amount: Math.round(event.ticket_price * 100),
        // Sprint-3 placeholder: charge ticket_price in GHS without FX.
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

  const paystackData = await paystackRes.json();

  if (!paystackData.status) {
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
