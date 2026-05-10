import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/types/database";

type Body = {
  display_name?: string;
  location?: string;
  bank_code?: string;
  bank_account_number?: string;
  account_name?: string;
};

type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

function isMobileMoneyCode(code: string): boolean {
  return (
    code.startsWith("MTN") ||
    code.startsWith("VODAFONE") ||
    code.startsWith("AIRTEL")
  );
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = (await req.json()) as Body;
  const service = createServiceClient();

  // Profile fields are always saved (they're independent of payout setup).
  const profileUpdate: ProfileUpdate = {};
  if (typeof body.display_name === "string") {
    profileUpdate.display_name = body.display_name.trim() || null;
  }
  if (typeof body.location === "string") {
    profileUpdate.location = body.location.trim() || null;
  }
  if (Object.keys(profileUpdate).length > 0) {
    const { error: profileErr } = await service
      .from("profiles")
      .update(profileUpdate)
      .eq("id", user.id);
    if (profileErr) {
      console.error("[payout-setup] profile update failed:", profileErr);
      return NextResponse.json(
        { error: "Could not save profile" },
        { status: 500 },
      );
    }
  }

  const bankCode = body.bank_code?.trim();
  const accountNumber = body.bank_account_number?.trim();
  const accountName = body.account_name?.trim();

  // If payout fields aren't filled, we're done — they only updated profile.
  if (!bankCode || !accountNumber || !accountName) {
    return NextResponse.json({
      success: true,
      paystackRecipientCreated: false,
    });
  }

  if (!process.env.PAYSTACK_SECRET_KEY) {
    return NextResponse.json(
      { error: "Paystack is not configured on the server" },
      { status: 500 },
    );
  }

  const recipientType = isMobileMoneyCode(bankCode)
    ? "mobile_money"
    : "ghipss";

  let recipientData: {
    status?: boolean;
    message?: string;
    data?: { recipient_code?: string };
  };
  try {
    const res = await fetch("https://api.paystack.co/transferrecipient", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: recipientType,
        name: accountName,
        account_number: accountNumber,
        bank_code: bankCode,
        currency: "GHS",
      }),
    });
    recipientData = await res.json();
  } catch (err) {
    console.error("[payout-setup] paystack call failed:", err);
    return NextResponse.json(
      { error: "Could not reach Paystack" },
      { status: 502 },
    );
  }

  const recipientCode = recipientData.data?.recipient_code;
  if (!recipientData.status || !recipientCode) {
    return NextResponse.json(
      {
        error:
          recipientData.message ??
          "Paystack rejected the recipient details — check the bank code and account number.",
      },
      { status: 400 },
    );
  }

  const { error: updateErr } = await service
    .from("profiles")
    .update({ paystack_id: recipientCode })
    .eq("id", user.id);

  if (updateErr) {
    console.error("[payout-setup] profile paystack_id write failed:", updateErr);
    return NextResponse.json(
      { error: "Created Paystack recipient but couldn't save it" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    paystackRecipientCreated: true,
    recipientCode,
  });
}
