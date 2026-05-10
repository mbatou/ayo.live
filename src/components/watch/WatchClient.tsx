"use client";

import { useEffect, useRef, useState } from "react";
import MuxPlayer from "@mux/mux-player-react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  ticketToken: string;
  eventId: string;
  eventTitle: string;
  eventStatus: string;
  playbackReady: boolean;
  artistName: string;
  artistLocation: string;
}

const REFRESH_INTERVAL_MS = 12 * 60 * 1000; // 12m, well under the 15m JWT TTL

async function getDeviceFingerprint(): Promise<string> {
  try {
    const FingerprintJS = (
      await import("@fingerprintjs/fingerprintjs")
    ).default;
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    return result.visitorId;
  } catch {
    // Fingerprint can fail in privacy modes / locked-down browsers; fall
    // back to a coarse signature so the device-locking still has something
    // to bind against. Same browser on same screen will hash identically.
    return [
      navigator.userAgent,
      screen.width,
      screen.height,
      navigator.language,
    ].join("|");
  }
}

export function WatchClient({
  ticketToken,
  eventId,
  eventTitle,
  eventStatus,
  playbackReady,
  artistName,
  artistLocation,
}: Props) {
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(eventStatus === "live");
  const refreshTimer = useRef<NodeJS.Timeout | null>(null);

  async function fetchSignedUrl() {
    const fingerprint = await getDeviceFingerprint();
    const res = await fetch("/api/watch/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticket_token: ticketToken, fingerprint }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Access denied");
      setLoading(false);
      return;
    }
    setStreamUrl(data.stream_url ?? null);
    setLoading(false);
  }

  useEffect(() => {
    fetchSignedUrl();
    refreshTimer.current = setInterval(fetchSignedUrl, REFRESH_INTERVAL_MS);
    return () => {
      if (refreshTimer.current) clearInterval(refreshTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime: flip the LIVE badge as soon as the artist goes live or ends.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`event-status-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "events",
          filter: `id=eq.${eventId}`,
        },
        (payload) => {
          const next = (payload.new as { status?: string })?.status;
          if (typeof next === "string") setIsLive(next === "live");
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  if (loading) {
    return (
      <main className="bg-stage-black min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-ayo-gold border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-text-muted text-sm">Verifying your ticket…</p>
        </div>
      </main>
    );
  }

  if (error) {
    const isDeviceError = error.toLowerCase().includes("device");
    return (
      <main className="bg-stage-black min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <p className="text-4xl mb-4">🔒</p>
          <h1 className="font-display text-xl font-semibold text-white mb-2">
            Access denied
          </h1>
          <p className="text-text-secondary text-sm mb-2">{error}</p>
          {isDeviceError && (
            <p className="text-text-muted text-xs">
              This ticket was already opened on another device. Each ticket is
              device-locked for security.
            </p>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="bg-stage-black min-h-screen flex flex-col">
      <div className="px-4 py-3 border-b border-border-subtle flex items-center gap-3">
        <span className="font-display text-lg font-bold text-ayo-gold">
          ayọ
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {eventTitle}
          </p>
          <p className="text-xs text-text-muted truncate">
            {artistName}
            {artistLocation ? ` · ${artistLocation}` : ""}
          </p>
        </div>
        {isLive ? (
          <div className="flex items-center gap-1.5 bg-live-red rounded px-2 py-1 flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span className="text-white text-xs font-bold">LIVE</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 border border-border-subtle rounded px-2 py-1 flex-shrink-0">
            <i
              className="ti ti-lock text-protected text-xs"
              aria-hidden="true"
            />
            <span className="text-text-muted text-xs">Protected</span>
          </div>
        )}
      </div>

      <div className="flex-1 flex items-center justify-center bg-black">
        {streamUrl && playbackReady ? (
          <div className="w-full max-w-5xl">
            <MuxPlayer
              streamType="live"
              src={streamUrl}
              autoPlay
              accentColor="#F59E0B"
              style={{ aspectRatio: "16/9", width: "100%" }}
            />
          </div>
        ) : (
          <div className="text-center py-20 px-4">
            <p className="text-4xl mb-4">🎵</p>
            <p className="text-white font-medium">Stream starting soon…</p>
            <p className="text-text-muted text-sm mt-1">
              The artist is setting up. Stay on this page.
            </p>
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-border-subtle">
        <p className="text-xs text-text-muted text-center">
          🔒 Protected stream · Your ticket is device-locked · Sharing this
          link won&apos;t work
        </p>
      </div>
    </main>
  );
}
