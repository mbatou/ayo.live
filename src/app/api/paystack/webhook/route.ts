import { NextResponse } from "next/server";

// POST /api/paystack/webhook — verifies signature, then issues a ticket.
// Real implementation lands in Sprint 3 (AYO-017).
export async function POST() {
  return NextResponse.json(
    { error: "Not implemented — see AYO-017 / Sprint 3" },
    { status: 501 },
  );
}
