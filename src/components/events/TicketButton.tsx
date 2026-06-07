"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatGHS } from "@/lib/currency";

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
      router.push(`/auth/signin?role=fan&next=/events/${eventId}`);
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

    // Free path: no Paystack, route straight to the watch token.
    if (data.free && typeof data.watch_url === "string") {
      window.location.href = data.watch_url;
      return;
    }
    window.location.href = data.authorization_url;
  }

  const isFree = price === 0;
  return (
    <button
      onClick={handleBuy}
      disabled={loading}
      className="bg-ayo-gold hover:bg-ayo-gold-hover text-stage-black font-semibold rounded-btn px-6 py-3 text-sm transition-colors disabled:opacity-50 whitespace-nowrap"
    >
      {loading
        ? "Loading…"
        : isFree
          ? "Get free ticket"
          : `Get ticket — ${formatGHS(price)}`}
    </button>
  );
}
