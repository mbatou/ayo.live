import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TicketButton } from "@/components/events/TicketButton";
import { LiveBadge } from "@/components/ui/LiveBadge";
import { ProtectedBadge } from "@/components/ui/ProtectedBadge";
import type { Event } from "@/types";

type Params = { id: string };

type ArtistJoin = {
  id: string;
  display_name: string | null;
  location: string | null;
  avatar_url: string | null;
} | null;

type EventWithArtist = Event & { profiles: ArtistJoin };

const INCLUDED = [
  {
    icon: "🎫",
    title: "One-time access",
    desc: "Live performance + 24h replay",
  },
  {
    icon: "🛡",
    title: "Protected stream",
    desc: "One ticket, one device. Sharing breaks the link.",
  },
  {
    icon: "💬",
    title: "Live chat",
    desc: "Talk back during the show",
  },
];

export default async function EventPage({ params }: { params: Params }) {
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("*, profiles(id, display_name, location, avatar_url)")
    .eq("id", params.id)
    .in("status", ["published", "live"])
    .single<EventWithArtist>();

  if (!event) notFound();

  const { count: ticketsSold } = await supabase
    .from("tickets")
    .select("*", { count: "exact", head: true })
    .eq("event_id", event.id)
    .eq("status", "confirmed");

  const soldCount = ticketsSold ?? 0;
  const pct = event.ticket_limit
    ? Math.min(100, Math.round((soldCount / event.ticket_limit) * 100))
    : null;
  const artist = event.profiles;
  const initials = (artist?.display_name ?? "AY").slice(0, 2).toUpperCase();
  const isLive = event.status === "live";

  const formattedDate = new Date(event.scheduled_at).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

  return (
    <main className="bg-stage-black min-h-screen">
      <div
        className="relative w-full h-56 md:h-72 flex items-center justify-center"
        style={{ background: "#111", borderBottom: "1px solid #2A2A2A" }}
      >
        <span className="font-display text-5xl font-bold text-white/20">
          {initials}
        </span>
        <div className="absolute top-4 left-4 flex gap-2">
          {isLive && <LiveBadge />}
          {event.is_group && (
            <span className="bg-surface-raised border border-border-subtle text-text-secondary px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wide">
              Group
            </span>
          )}
        </div>
        {isLive && (
          <div className="absolute top-4 right-4 text-text-secondary text-xs">
            {soldCount.toLocaleString()} watching
          </div>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div>
          <p className="text-text-muted text-xs uppercase tracking-widest mb-2">
            {[artist?.location, event.genre].filter(Boolean).join(" · ")}
          </p>
          <h1 className="font-display text-3xl font-bold text-white mb-1">
            {event.title}
          </h1>
          <p className="text-text-secondary text-sm">
            {artist?.display_name ?? "Unknown artist"} · {formattedDate}
          </p>
        </div>

        {event.ticket_limit && (
          <div>
            <div className="flex justify-between text-xs text-text-muted mb-1.5">
              <span>
                {soldCount.toLocaleString()} /{" "}
                {event.ticket_limit.toLocaleString()} tickets sold
              </span>
              <span>{pct}%</span>
            </div>
            <div className="h-1 bg-surface rounded-full overflow-hidden">
              <div
                className="h-full bg-ayo-gold rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        <div className="bg-surface rounded-card p-5 space-y-3">
          <h2 className="text-white font-medium text-sm">What&apos;s included</h2>
          {INCLUDED.map((item) => (
            <div key={item.title} className="flex gap-3">
              <span className="text-lg leading-none mt-0.5">{item.icon}</span>
              <div>
                <p className="text-white text-sm font-medium">{item.title}</p>
                <p className="text-text-muted text-xs">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {event.description && (
          <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-line">
            {event.description}
          </p>
        )}

        <div className="sticky bottom-4">
          <div className="bg-surface-raised border border-border-subtle rounded-card p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-ayo-gold font-display font-bold text-xl">
                ${event.ticket_price}
              </p>
              <p className="text-text-muted text-xs">per ticket</p>
            </div>
            <TicketButton eventId={event.id} price={event.ticket_price} />
          </div>
          <div className="mt-2 flex justify-center">
            <ProtectedBadge />
          </div>
        </div>
      </div>
    </main>
  );
}
