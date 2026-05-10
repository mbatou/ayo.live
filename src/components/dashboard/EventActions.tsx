"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Action = "publish" | "go_live" | "end" | "payout";

interface Props {
  event: { id: string; status: string; title: string };
  ticketsSold: number;
  net: number;
}

export function EventActions({ event, ticketsSold, net }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<Action | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function doAction(action: Action) {
    setLoading(action);
    setMessage(null);
    setError(null);

    const res = await fetch(`/api/events/${event.id}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });

    const data = await res.json().catch(() => ({}));
    setLoading(null);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      return;
    }
    setMessage(data.message ?? "Done");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {message && (
        <p className="text-sm text-protected bg-protected/10 border border-protected/20 rounded-btn px-3 py-2">
          {message}
        </p>
      )}
      {error && (
        <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-btn px-3 py-2">
          {error}
        </p>
      )}

      {event.status === "draft" && (
        <button
          onClick={() => doAction("publish")}
          disabled={loading === "publish"}
          className="w-full bg-ayo-gold hover:bg-ayo-gold-hover text-stage-black font-semibold rounded-btn py-3 text-sm transition-colors disabled:opacity-50"
        >
          {loading === "publish" ? "Publishing…" : "Publish event"}
        </button>
      )}

      {event.status === "published" && (
        <button
          onClick={() => doAction("go_live")}
          disabled={loading === "go_live"}
          className="w-full bg-live-red hover:opacity-90 text-white font-semibold rounded-btn py-3 text-sm transition-colors disabled:opacity-50"
        >
          {loading === "go_live" ? "Going live…" : "⬤ Go live"}
        </button>
      )}

      {event.status === "live" && (
        <button
          onClick={() => doAction("end")}
          disabled={loading === "end"}
          className="w-full bg-surface border border-border-subtle hover:border-live-red text-white font-semibold rounded-btn py-3 text-sm transition-colors disabled:opacity-50"
        >
          {loading === "end" ? "Ending show…" : "End show"}
        </button>
      )}

      {event.status === "ended" && ticketsSold > 0 && (
        <button
          onClick={() => doAction("payout")}
          disabled={loading === "payout"}
          className="w-full bg-ayo-gold hover:bg-ayo-gold-hover text-stage-black font-semibold rounded-btn py-3 text-sm transition-colors disabled:opacity-50"
        >
          {loading === "payout"
            ? "Initiating payout…"
            : `Request payout — $${net.toFixed(2)}`}
        </button>
      )}

      {event.status === "ended" && ticketsSold === 0 && (
        <p className="text-center text-text-muted text-sm py-3">
          No tickets sold — no payout to initiate.
        </p>
      )}

      {event.status === "cancelled" && (
        <p className="text-center text-text-muted text-sm py-3">
          This event was cancelled.
        </p>
      )}
    </div>
  );
}
