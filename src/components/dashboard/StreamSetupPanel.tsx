"use client";

import { useState } from "react";

interface Props {
  streamKey: string;
  status: string;
}

const RTMP_SERVER = "rtmps://global-live.mux.com:443/app";

type Tab = "obs" | "phone";

export function StreamSetupPanel({ streamKey, status }: Props) {
  const [tab, setTab] = useState<Tab>("obs");
  const [keyCopied, setKeyCopied] = useState(false);
  const [serverCopied, setServerCopied] = useState(false);

  async function copy(text: string, setter: (v: boolean) => void) {
    try {
      await navigator.clipboard.writeText(text);
      setter(true);
      setTimeout(() => setter(false), 2000);
    } catch {
      // Clipboard can fail in insecure contexts; ignore.
    }
  }

  if (status === "ended" || status === "cancelled") return null;

  return (
    <div className="bg-[#111] border border-border-subtle rounded-card p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <i
          className="ti ti-broadcast text-ayo-gold text-base"
          aria-hidden="true"
        />
        <h2 className="text-sm font-medium text-white">Stream setup</h2>
      </div>

      <div className="space-y-3 mb-5">
        <div>
          <p className="text-[11px] text-text-muted mb-1.5 uppercase tracking-wide">
            Stream server (RTMP URL)
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-stage-black border border-border-subtle rounded px-3 py-2 text-xs text-text-secondary truncate">
              {RTMP_SERVER}
            </code>
            <button
              type="button"
              onClick={() => copy(RTMP_SERVER, setServerCopied)}
              className="flex-shrink-0 text-xs border border-border-subtle rounded px-3 py-2 text-text-muted hover:text-white transition-colors"
            >
              {serverCopied ? "✓ Copied" : "Copy"}
            </button>
          </div>
        </div>

        <div>
          <p className="text-[11px] text-text-muted mb-1.5 uppercase tracking-wide">
            Stream key{" "}
            <span className="text-red-400/80 normal-case tracking-normal">
              (keep secret)
            </span>
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-stage-black border border-border-subtle rounded px-3 py-2 text-xs text-ayo-gold truncate font-mono">
              {streamKey}
            </code>
            <button
              type="button"
              onClick={() => copy(streamKey, setKeyCopied)}
              className="flex-shrink-0 text-xs border border-border-subtle rounded px-3 py-2 text-text-muted hover:text-white transition-colors"
            >
              {keyCopied ? "✓ Copied" : "Copy"}
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-1 mb-3 bg-stage-black border border-border-subtle rounded-btn p-1">
        <button
          type="button"
          onClick={() => setTab("obs")}
          className={
            "flex-1 text-[12px] font-medium py-1.5 rounded transition-colors " +
            (tab === "obs"
              ? "bg-ayo-gold text-stage-black"
              : "text-text-secondary hover:text-white")
          }
        >
          Laptop (OBS)
          <span className="ml-1 text-[9px] opacity-70">recommended</span>
        </button>
        <button
          type="button"
          onClick={() => setTab("phone")}
          className={
            "flex-1 text-[12px] font-medium py-1.5 rounded transition-colors " +
            (tab === "phone"
              ? "bg-ayo-gold text-stage-black"
              : "text-text-secondary hover:text-white")
          }
        >
          Phone (Larix / Streamlabs)
        </button>
      </div>

      {tab === "obs" ? (
        <ol className="text-[11px] text-text-secondary space-y-1.5 list-decimal list-inside">
          <li>
            Download <span className="text-white">OBS Studio</span> (free,
            obsproject.com) — works on Mac, Windows, Linux.
          </li>
          <li>
            Open OBS → <span className="text-white">Settings → Stream</span>{" "}
            → Service: <span className="text-white">Custom...</span>.
          </li>
          <li>
            Paste the RTMP URL above as the{" "}
            <span className="text-white">Server</span>, and the stream key as
            the <span className="text-white">Stream Key</span>.
          </li>
          <li>
            Output settings:{" "}
            <span className="text-white">
              1080p / 30fps / 4500–6000 kbps
            </span>{" "}
            video, <span className="text-white">128 kbps AAC</span> audio.
          </li>
          <li>
            Click <span className="text-white">Start Streaming</span>. Wait
            ~15s — the event flips to{" "}
            <span className="text-ayo-gold">Live</span> for fans automatically.
          </li>
        </ol>
      ) : (
        <ol className="text-[11px] text-text-secondary space-y-1.5 list-decimal list-inside">
          <li>
            Install <span className="text-white">Larix Broadcaster</span>{" "}
            (iOS / Android, free) or{" "}
            <span className="text-white">Streamlabs</span>.
          </li>
          <li>
            In the app → <span className="text-white">Connections → New</span>
            . Name it &quot;Ayo&quot;.
          </li>
          <li>
            URL: paste{" "}
            <code className="bg-stage-black px-1 rounded">
              {RTMP_SERVER}/{"<stream-key>"}
            </code>{" "}
            (RTMP URL + slash + your stream key). Larix puts both into one
            field.
          </li>
          <li>
            Video:{" "}
            <span className="text-white">1080p / 30fps / 4500 kbps</span>.
            Audio: <span className="text-white">128 kbps AAC</span>.
          </li>
          <li>
            Tap the red record button. Same ~15s warm-up. Hold the phone
            horizontal — fans see the 16:9 frame Mux delivers.
          </li>
        </ol>
      )}

      <p className="text-[10px] text-text-muted mt-4 pt-3 border-t border-border-subtle">
        Max output capped at 1080p · 4h continuous · 60s reconnect window.
        Click <span className="text-ayo-gold">End show</span> after the
        encoder stops; Mux also flips it automatically when the upload
        idles.
      </p>
    </div>
  );
}
