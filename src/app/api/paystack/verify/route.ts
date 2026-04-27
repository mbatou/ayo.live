import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendTicketEmail } from "@/lib/email/ticket";

type ConfirmedTicket = {
  id: string;
  token: string;
  events: {
    title: string;
    scheduled_at: string;
    profiles: { display_name: string | null } | null;
  } | null;
};

// GET /api/paystack/verify — Paystack redirects the fan here after payment.
// We re-verify with Paystack, idempotently confirm the ticket, send the
// email if we're the path that flipped the status, then redirect to the
// confirmation page.
export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const { searchParams } = new URL(req.url);
  const ticketId = searchParams.get("ticket_id");
  // Paystack appends `?reference=...&trxref=...`.
  const reference = searchParams.get("reference") ?? searchParams.get("trxref");

  if (!ticketId || !reference) {
    return NextResponse.redirect(`${appUrl}/?error=invalid`);
  }

  const verifyRes = await fetch(
    `https://api.paystack.co/transaction/verify/${reference}`,
    {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    },
  );
  const verifyData = await verifyRes.json();

  if (!verifyData.status || verifyData.data?.status !== "success") {
    return NextResponse.redirect(`${appUrl}/?error=payment_failed`);
  }

  // Service role: RLS has no UPDATE policy on tickets.
  const service = createServiceClient();

  // Idempotent confirm — only the path that actually flips pending→confirmed
  // gets a row back, so only that path sends the email. The webhook uses
  // the same guard, so whichever lands first wins.
  const { data: justConfirmed } = await service
    .from("tickets")
    .update({ status: "confirmed" })
    .eq("id", ticketId)
    .eq("paystack_reference", reference)
    .eq("status", "pending")
    .select("id, token, events(title, scheduled_at, profiles(display_name))")
    .single<ConfirmedTicket>();

  // If the webhook already confirmed it, fetch the row so we can still
  // redirect the user to /tickets/[token].
  let ticket: ConfirmedTicket | null = justConfirmed;
  if (!ticket) {
    const { data: existing } = await service
      .from("tickets")
      .select("id, token, events(title, scheduled_at, profiles(display_name))")
      .eq("id", ticketId)
      .eq("paystack_reference", reference)
      .eq("status", "confirmed")
      .single<ConfirmedTicket>();
    ticket = existing;
  }

  if (!ticket) {
    return NextResponse.redirect(`${appUrl}/?error=ticket_error`);
  }

  // Email only if we won the race. Fan email comes from Paystack's verified
  // customer record so we don't depend on session cookies (Paystack redirects
  // are top-level navigations and may arrive without our cookie).
  if (justConfirmed && ticket.events) {
    const fanEmail =
      verifyData.data?.customer?.email ?? verifyData.data?.customer_email;
    if (fanEmail) {
      await sendTicketEmail({
        to: fanEmail,
        ticketToken: ticket.token,
        eventTitle: ticket.events.title,
        artistName: ticket.events.profiles?.display_name ?? "The artist",
        scheduledAt: ticket.events.scheduled_at,
        watchUrl: `${appUrl}/watch/${ticket.token}`,
      });
    }
  }

  return NextResponse.redirect(`${appUrl}/tickets/${ticket.token}?success=1`);
}
