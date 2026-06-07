import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { PAYSTACK_BASE_URL } from "@/lib/paystack";

// GET /api/paystack/verify — Paystack redirects the fan here after payment.
// We re-verify with Paystack, idempotently flip the ticket to 'confirmed',
// then redirect to /fan where the ticket already renders with a watch
// link. Paystack already sends a payment receipt by email; the dashboard
// is the authoritative ticket-recovery surface.
//
// Hard rule: once the fan has paid, the redirect happens. Any unexpected
// throw becomes /?error=verify_failed instead of HTTP 500 so a paying
// fan never sees a Next.js error page.
export async function GET(req: NextRequest) {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;

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

    // Idempotent confirm — whichever of verify/webhook lands first wins;
    // the other no-ops because the status filter no longer matches.
    await service
      .from("tickets")
      .update({ status: "confirmed" })
      .eq("id", ticketId)
      .eq("paystack_reference", reference)
      .eq("status", "pending");

    return NextResponse.redirect(`${appUrl}/fan?success=1`);
  } catch (err) {
    console.error("[verify] unexpected error:", err);
    return NextResponse.redirect(`${appUrl}/?error=verify_failed`);
  }
}
