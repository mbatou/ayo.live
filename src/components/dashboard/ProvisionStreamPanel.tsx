"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  eventId: string;
  status: string;
}

export function ProvisionStreamPanel({ eventId, status }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function provision() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/events/${eventId}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "provision_mux" }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Could not set up streaming");
      return;
    }
    router.refresh();
  }

  const inconsistent = status === "live";

  return (
    <div className="bg-[#1A1200] border border-[#3A2A00] rounded-card p-5 mb-6">
      <div className="flex items-start gap-3">
        <i
          className="ti ti-alert-triangle text-ayo-gold text-lg mt-0.5"
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-medium text-white mb-1">
            Streaming setup needed
          </h2>
          <p className="text-text-secondary text-xs leading-relaxed">
            This event has no RTMP credentials. That usually means Mux wasn&apos;t
            configured when the event was created.{" "}
            {inconsistent && (
              <span className="text-ayo-gold">
                The event is currently marked live, but with no actual stream —
                we&apos;ll drop it back to <em>published</em> when you set up
                streaming.
              </span>
            )}{" "}
            Make sure MUX_TOKEN_ID and MUX_TOKEN_SECRET are set on Vercel,
            then click below.
          </p>

          {error && (
            <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-btn px-3 py-2 mt-3">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={provision}
            disabled={loading}
            className="mt-4 bg-ayo-gold hover:bg-ayo-gold-hover text-stage-black font-semibold rounded-btn px-4 py-2 text-xs transition-colors disabled:opacity-50"
          >
            {loading ? "Setting up…" : "Set up streaming"}
          </button>
        </div>
      </div>
    </div>
  );
}
