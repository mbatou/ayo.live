import { type NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";

// Force Node runtime — Edge runtime lacks the `node:crypto` HMAC API.
export const runtime = "nodejs";

// POST /api/paystack/webhook — Paystack server-to-server payment events.
// Idempotent with /api/paystack/verify: both routes flip pending →
// confirmed under the same filter; whichever lands first wins, the other
// no-ops. No emails — Paystack sends its own receipt and the fan
// dashboard surfaces the ticket + watch link.
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

  if (!reference || !ticketId) {
    return NextResponse.json({ received: true });
  }

  const supabase = createServiceClient();
  await supabase
    .from("tickets")
    .update({ status: "confirmed" })
    .eq("id", ticketId)
    .eq("paystack_reference", reference)
    .eq("status", "pending");

  return NextResponse.json({ received: true });
}
