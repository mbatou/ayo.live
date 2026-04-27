import { type NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
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

// Force Node runtime — Edge runtime lacks the `node:crypto` HMAC API.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.text();

  const expected = crypto
    .createHmac("sha512", process.env.PAYSTACK_WEBHOOK_SECRET!)
    .update(body)
    .digest("hex");
  const signature = req.headers.get("x-paystack-signature");
  if (expected !== signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(body);

  if (event.event !== "charge.success") {
    return NextResponse.json({ received: true });
  }

  const reference: string | undefined = event.data?.reference;
  const metadata = event.data?.metadata ?? {};
  const ticketId: string | undefined = metadata.ticket_id;
  const fanId: string | undefined = metadata.fan_id;

  if (!reference || !ticketId || !fanId) {
    return NextResponse.json({ received: true });
  }

  const supabase = createServiceClient();

  const { data: ticket } = await supabase
    .from("tickets")
    .update({ status: "confirmed" })
    .eq("id", ticketId)
    .eq("paystack_reference", reference)
    .eq("status", "pending")
    .select("id, token, events(title, scheduled_at, profiles(display_name))")
    .single<ConfirmedTicket>();

  // Empty result = verify route already confirmed (and emailed). Skip.
  if (ticket && ticket.events) {
    const { data: userData } = await supabase.auth.admin.getUserById(fanId);
    if (userData?.user?.email) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
      await sendTicketEmail({
        to: userData.user.email,
        ticketToken: ticket.token,
        eventTitle: ticket.events.title,
        artistName: ticket.events.profiles?.display_name ?? "The artist",
        scheduledAt: ticket.events.scheduled_at,
        watchUrl: `${appUrl}/watch/${ticket.token}`,
      });
    }
  }

  return NextResponse.json({ received: true });
}
