"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";

interface Props {
  eventId: string;
  currentBannerUrl: string | null;
  // Fallback artwork details so the preview matches what fans will see
  // when no banner is set.
  fallbackTint: string;
  fallbackInitials: string;
}

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = ["image/jpeg", "image/png", "image/webp"];

export function BannerUpload({
  eventId,
  currentBannerUrl,
  fallbackTint,
  fallbackInitials,
}: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentBannerUrl);
  const [savedUrl, setSavedUrl] = useState<string | null>(currentBannerUrl);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (!ACCEPT.includes(file.type)) {
      setError("Use a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(`File too large — max ${MAX_BYTES / 1024 / 1024}MB.`);
      return;
    }

    // Local preview while the upload is in flight.
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
    setUploading(true);

    try {
      const fd = new FormData();
      fd.append("banner", file);
      const res = await fetch(`/api/events/${eventId}/banner`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Upload failed");
        setPreviewUrl(savedUrl);
        return;
      }
      setSavedUrl(data.cover_url);
      setPreviewUrl(data.cover_url);
      router.refresh();
    } catch (err) {
      console.error("[banner-upload] failed:", err);
      setError("Could not upload — try again");
      setPreviewUrl(savedUrl);
    } finally {
      setUploading(false);
      URL.revokeObjectURL(localUrl);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemove() {
    if (!savedUrl) return;
    if (!window.confirm("Remove this banner? The generated default will show again.")) {
      return;
    }
    setRemoving(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/banner`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not remove");
        return;
      }
      setSavedUrl(null);
      setPreviewUrl(null);
      router.refresh();
    } finally {
      setRemoving(false);
    }
  }

  function triggerFileInput() {
    fileInputRef.current?.click();
  }

  return (
    <div className="bg-[#111] border border-border-subtle rounded-card p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-medium text-white">Banner</h2>
          <p className="text-text-muted text-xs mt-0.5">
            Optional. 16:9, at least 1280×720, JPEG/PNG/WebP, up to 5MB.
          </p>
        </div>
        {savedUrl && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={removing || uploading}
            className="text-text-muted text-xs hover:text-red-400 disabled:opacity-50"
          >
            {removing ? "Removing…" : "Remove"}
          </button>
        )}
      </div>

      <div className="relative aspect-[16/9] rounded-md overflow-hidden bg-stage-black mb-3">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              background: `repeating-linear-gradient(-45deg, ${fallbackTint}, ${fallbackTint} 10px, transparent 10px, transparent 20px), ${fallbackTint}`,
            }}
          >
            <span className="font-display font-bold text-5xl text-white/20 tracking-tighter">
              {fallbackInitials}
            </span>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-stage-black/60 flex items-center justify-center text-white text-xs">
            Uploading…
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT.join(",")}
        onChange={handleFile}
        className="hidden"
      />
      <button
        type="button"
        onClick={triggerFileInput}
        disabled={uploading}
        className="w-full bg-stage-black border border-border-subtle rounded-btn py-2.5 text-sm text-text-secondary hover:border-ayo-gold/40 hover:text-white transition-colors disabled:opacity-50"
      >
        {savedUrl ? "Replace banner" : "Upload banner"}
      </button>

      {error && (
        <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-btn px-3 py-2 mt-3">
          {error}
        </p>
      )}
    </div>
  );
}
