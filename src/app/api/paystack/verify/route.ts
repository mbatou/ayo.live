import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendTicketEmail } from "@/lib/email/ticket";
import { PAYSTACK_BASE_URL } from "@/lib/paystack";

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
//
// Hard rule: once the fan has paid, they get redirected. Email failures,
// Resend mis-config, Supabase RLS surprises — none of these may leave a
// paid fan staring at a 500. The whole body runs inside one try/catch
// and any unexpected throw becomes a /?error=verify_failed redirect.
export async function GET(req: NextRequest) {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    new URL(req.url).origin; // last-resort fallback if env is unset

  try {
    const { searchParams } = new URL(req.url);
    const ticketId = searchParams.get("ticket_id");
    // Paystack appends `?reference=...&trxref=...`.
    const reference =
      searchParams.get("reference") ?? searchParams.get("trxref");

    if (!ticketId || !reference) {
      return NextResponse.redirect(`${appUrl}/?error=invalid`);
    }

    const verifyRes = await fetch(
      `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      },
    );
    const verifyData = await verifyRes.json().catch(() => ({}));

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
        .select(
          "id, token, events(title, scheduled_at, profiles(display_name))",
        )
        .eq("id", ticketId)
        .eq("paystack_reference", reference)
        .eq("status", "confirmed")
        .single<ConfirmedTicket>();
      ticket = existing;
    }

    if (!ticket) {
      return NextResponse.redirect(`${appUrl}/?error=ticket_error`);
    }

    // Email only if we won the race. Fan email comes from Paystack's
    // verified customer record so we don't depend on session cookies
    // (Paystack redirects are top-level navigations and may arrive
    // without our cookie). Email failures DO NOT block the redirect —
    // the ticket is real, the fan paid, get them to the watch link.
    if (justConfirmed && ticket.events) {
      const fanEmail =
        verifyData.data?.customer?.email ??
        verifyData.data?.customer_email;
      if (fanEmail) {
        try {
          await sendTicketEmail({
            to: fanEmail,
            ticketToken: ticket.token,
            eventTitle: ticket.events.title,
            artistName: ticket.events.profiles?.display_name ?? "The artist",
            scheduledAt: ticket.events.scheduled_at,
            watchUrl: `${appUrl}/watch/${ticket.token}`,
          });
        } catch (emailErr) {
          // Resend mis-config, DNS not verified, network blip — all
          // recoverable later (fan dashboard shows the ticket; we can
          // re-send from an admin tool). Log and continue.
          console.error(
            "[verify] ticket email failed (ticket still confirmed):",
            emailErr,
          );
        }
      }
    }

    return NextResponse.redirect(
      `${appUrl}/tickets/${ticket.token}?success=1`,
    );
  } catch (err) {
    console.error("[verify] unexpected error:", err);
    return NextResponse.redirect(`${appUrl}/?error=verify_failed`);
  }
}
