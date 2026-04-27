"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

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

type Form = {
  title: string;
  description: string;
  genre: string;
  scheduled_at: string;
  ticket_price: string;
  ticket_limit: string;
  is_group: boolean;
};

export default function NewEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Form>({
    title: "",
    description: "",
    genre: "",
    scheduled_at: "",
    ticket_price: "",
    ticket_limit: "",
    is_group: false,
  });

  function set<K extends keyof Form>(field: K, value: Form[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth/signin?next=/dashboard/events/new");
      return;
    }

    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        description: form.description || null,
        genre: form.genre,
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        ticket_price: parseFloat(form.ticket_price),
        ticket_limit: form.ticket_limit ? parseInt(form.ticket_limit) : null,
        is_group: form.is_group,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      setLoading(false);
      return;
    }

    router.push(`/dashboard/events/${data.event.id}?created=1`);
  }

  const inputClass =
    "w-full bg-stage-black border border-border-subtle rounded-btn px-3 py-2.5 text-white placeholder:text-text-muted focus:outline-none focus:border-ayo-gold text-sm";
  const labelClass = "block text-sm text-text-secondary mb-1.5";

  return (
    <main className="max-w-xl mx-auto px-4 py-10">
      <h1 className="font-display text-2xl font-bold text-white mb-1">
        Create an event
      </h1>
      <p className="text-text-secondary text-sm mb-8">
        Fill in the details and go live when you&apos;re ready.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className={labelClass}>Event title *</label>
          <input
            className={inputClass}
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="e.g. Ɔdɔ Ne Asomdwoeɛ"
            required
          />
        </div>

        <div>
          <label className={labelClass}>Description</label>
          <textarea
            className={cn(inputClass, "resize-none h-24")}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Tell fans what to expect..."
          />
        </div>

        <div>
          <label className={labelClass}>Genre *</label>
          <select
            className={cn(inputClass, "appearance-none")}
            value={form.genre}
            onChange={(e) => set("genre", e.target.value)}
            required
          >
            <option value="">Select genre</option>
            {GENRES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Date &amp; time *</label>
          <input
            type="datetime-local"
            className={inputClass}
            value={form.scheduled_at}
            onChange={(e) => set("scheduled_at", e.target.value)}
            required
          />
        </div>

        <div>
          <label className={labelClass}>Ticket price (USD) *</label>
          <input
            type="number"
            min="1"
            step="0.01"
            className={inputClass}
            value={form.ticket_price}
            onChange={(e) => set("ticket_price", e.target.value)}
            placeholder="10.00"
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
            placeholder="Leave blank for unlimited"
          />
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

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-ayo-gold hover:bg-ayo-gold-hover text-stage-black font-semibold rounded-btn py-3 text-sm transition-colors disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create event"}
        </button>
      </form>
    </main>
  );
}
