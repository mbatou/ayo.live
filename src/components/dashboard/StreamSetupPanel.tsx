"use client";

import { useState } from "react";

interface Props {
  streamKey: string;
  status: string;
}

const RTMP_SERVER = "rtmps://global-live.mux.com:443/app";

export function StreamSetupPanel({ streamKey, status }: Props) {
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
        <span className="ml-auto text-[10px] text-text-muted border border-border-subtle rounded px-2 py-0.5">
          OBS / Streamlabs
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-[11px] text-text-muted mb-1.5 uppercase tracking-wide">
            1. Set stream server (RTMP URL)
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
            2. Set stream key
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

        <div className="pt-3 border-t border-border-subtle">
          <p className="text-[11px] text-text-muted">
            3. Start streaming in OBS, then click{" "}
            <span className="text-ayo-gold">Go live</span> below to open the
            show to ticketholders.
          </p>
        </div>
      </div>
    </div>
  );
}
