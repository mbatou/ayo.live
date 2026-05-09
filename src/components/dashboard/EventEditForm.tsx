"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Event, EventStatus } from "@/types";

const GENRES = [
  "Afrobeats",
  "Highlife",
  "Soul",
  "Dub",
  "Spoken Word",
  "Yoruba Pop",
  "Talk",
  "R&B",
  "Reggae",
  "Jazz",
  "Gospel",
];

function toLocalDateTimeInput(iso: string) {
  // <input type="datetime-local"> wants "YYYY-MM-DDTHH:mm" in *local* time.
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EventEditForm({ event }: { event: Event }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMessage, setOkMessage] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: event.title,
    description: event.description ?? "",
    genre: event.genre ?? "",
    scheduled_at: toLocalDateTimeInput(event.scheduled_at),
    ticket_price: event.ticket_price.toString(),
    ticket_limit: event.ticket_limit?.toString() ?? "",
    is_group: event.is_group,
  });

  function set<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setOkMessage(null);

    const res = await fetch(`/api/events/${event.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        description: form.description || null,
        genre: form.genre || null,
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        ticket_price: parseFloat(form.ticket_price),
        ticket_limit: form.ticket_limit ? parseInt(form.ticket_limit, 10) : null,
        is_group: form.is_group,
      }),
    });

    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Could not save changes");
      return;
    }
    setOkMessage("Saved.");
    router.refresh();
  }

  async function handleStatusChange(next: EventStatus) {
    setStatusBusy(true);
    setError(null);
    setOkMessage(null);
    const res = await fetch(`/api/events/${event.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const data = await res.json();
    setStatusBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not update status");
      return;
    }
    router.refresh();
  }

  async function handleDelete() {
    if (
      !window.confirm(
        "Delete this event? This can't be undone. Tickets sold for this event will become invalid.",
      )
    ) {
      return;
    }
    setDeleting(true);
    setError(null);
    const res = await fetch(`/api/events/${event.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not delete event");
      setDeleting(false);
      return;
    }
    router.push("/dashboard/events");
    router.refresh();
  }

  const inputClass =
    "w-full bg-stage-black border border-border-subtle rounded-btn px-3 py-2.5 text-white placeholder:text-text-muted focus:outline-none focus:border-ayo-gold text-sm";
  const labelClass = "block text-sm text-text-secondary mb-1.5";

  const isPublished = event.status === "published" || event.status === "live";
  const isCancelled = event.status === "cancelled";
  const isEnded = event.status === "ended";

  return (
    <div className="space-y-8">
      <section className="bg-surface border border-border-subtle rounded-card p-5">
        <p className="text-text-muted text-xs uppercase tracking-wide mb-3">
          Status
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {event.status === "draft" && (
            <button
              type="button"
              onClick={() => handleStatusChange("published")}
              disabled={statusBusy}
              className="bg-ayo-gold hover:bg-ayo-gold-hover text-stage-black font-semibold rounded-btn px-4 py-2 text-sm transition-colors disabled:opacity-50"
            >
              {statusBusy ? "Publishing…" : "Publish"}
            </button>
          )}
          {isPublished && (
            <button
              type="button"
              onClick={() => handleStatusChange("draft")}
              disabled={statusBusy}
              className="bg-stage-black border border-border-subtle hover:border-text-muted text-white rounded-btn px-4 py-2 text-sm transition-colors disabled:opacity-50"
            >
              {statusBusy ? "Unpublishing…" : "Unpublish (back to draft)"}
            </button>
          )}
          {!isCancelled && !isEnded && (
            <button
              type="button"
              onClick={() => handleStatusChange("cancelled")}
              disabled={statusBusy}
              className="text-red-400 hover:text-red-300 text-sm px-2 py-2 transition-colors disabled:opacity-50"
            >
              Cancel event
            </button>
          )}
          {isCancelled && (
            <button
              type="button"
              onClick={() => handleStatusChange("draft")}
              disabled={statusBusy}
              className="bg-stage-black border border-border-subtle hover:border-text-muted text-white rounded-btn px-4 py-2 text-sm transition-colors disabled:opacity-50"
            >
              {statusBusy ? "Restoring…" : "Restore to draft"}
            </button>
          )}
        </div>
      </section>

      <section>
        <h2 className="font-display text-lg font-bold text-white mb-3">
          Event details
        </h2>
        <form
          onSubmit={handleSave}
          className="bg-surface border border-border-subtle rounded-card p-5 space-y-5"
        >
          <div>
            <label className={labelClass}>Title</label>
            <input
              className={inputClass}
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              required
            />
          </div>

          <div>
            <label className={labelClass}>Description</label>
            <textarea
              className={cn(inputClass, "resize-none h-24")}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Tell fans what to expect…"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Genre</label>
              <select
                className={cn(inputClass, "appearance-none")}
                value={form.genre}
                onChange={(e) => set("genre", e.target.value)}
              >
                <option value="">No genre</option>
                {GENRES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Date &amp; time</label>
              <input
                type="datetime-local"
                className={inputClass}
                value={form.scheduled_at}
                onChange={(e) => set("scheduled_at", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Ticket price (USD)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputClass}
                value={form.ticket_price}
                onChange={(e) => set("ticket_price", e.target.value)}
                required
              />
            </div>
            <div>
              <label className={labelClass}>
                Ticket limit{" "}
                <span className="text-text-muted">(optional)</span>
              </label>
              <input
                type="number"
                min="1"
                className={inputClass}
                value={form.ticket_limit}
                onChange={(e) => set("ticket_limit", e.target.value)}
                placeholder="Unlimited"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_group"
              checked={form.is_group}
              onChange={(e) => set("is_group", e.target.checked)}
              className="w-4 h-4 accent-ayo-gold"
            />
            <label
              htmlFor="is_group"
              className="text-sm text-text-secondary cursor-pointer"
            >
              This is a group / band event
            </label>
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-btn px-3 py-2">
              {error}
            </p>
          )}
          {okMessage && (
            <p className="text-ayo-gold text-sm bg-ayo-gold/10 border border-ayo-gold/20 rounded-btn px-3 py-2">
              {okMessage}
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-ayo-gold hover:bg-ayo-gold-hover text-stage-black font-semibold rounded-btn px-5 py-2.5 text-sm transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </section>

      <section>
        <h2 className="font-display text-lg font-bold text-white mb-3">
          Danger zone
        </h2>
        <div className="bg-surface border border-red-400/20 rounded-card p-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-white text-sm font-medium">Delete event</p>
            <p className="text-text-muted text-xs mt-1">
              Permanently remove this event. Tickets already sold will no
              longer be valid.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="border border-red-400/40 text-red-400 hover:bg-red-400/10 rounded-btn px-4 py-2 text-sm transition-colors disabled:opacity-50 shrink-0"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </section>
    </div>
  );
}
