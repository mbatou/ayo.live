"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Props {
  eventId: string;
  price: number;
}

export function TicketButton({ eventId, price }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleBuy() {
    setLoading(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push(`/auth/signin?next=/events/${eventId}`);
      return;
    }

    const res = await fetch("/api/paystack/initiate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: eventId }),
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "Could not start checkout");
      setLoading(false);
      return;
    }

    window.location.href = data.authorization_url;
  }

  return (
    <button
      onClick={handleBuy}
      disabled={loading}
      className="bg-ayo-gold hover:bg-ayo-gold-hover text-stage-black font-semibold rounded-btn px-6 py-3 text-sm transition-colors disabled:opacity-50 whitespace-nowrap"
    >
      {loading ? "Loading…" : `Get ticket — $${price}`}
    </button>
  );
}
