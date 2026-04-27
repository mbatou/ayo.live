import { NextResponse } from "next/server";

// POST /api/tickets — issued server-side after payment confirmation.
// Real implementation lands in Sprint 3 (AYO-017) once Paystack is wired up.
export async function POST() {
  return NextResponse.json(
    { error: "Not implemented — see AYO-017 / Sprint 3" },
    { status: 501 },
  );
}
