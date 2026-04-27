import { LiveBadge } from "@/components/ui/LiveBadge";
import { GroupBadge } from "@/components/ui/GroupBadge";
import { GENRE_TINTS } from "@/lib/placeholder-data";
import type { Event } from "@/types";

type Props = { event: Event };

export function EventCard({ event }: Props) {
  const tint = GENRE_TINTS[event.genre] ?? GENRE_TINTS.default;
  const pct = Math.min(
    100,
    Math.round((event.ticketsSold / event.ticketsTotal) * 100),
  );

  return (
    <a
      href={`#${event.slug}`}
      className="group block bg-surface rounded-card overflow-hidden border border-border-subtle hover:border-text-muted hover:scale-[1.02] transition-all duration-200"
    >
      <div
        className="relative aspect-[16/9] flex items-center justify-center"
        style={{
          background: `repeating-linear-gradient(-45deg, ${tint}, ${tint} 10px, transparent 10px, transparent 20px), ${tint}`,
        }}
      >
        <span className="font-display font-bold text-6xl md:text-7xl text-text-primary/15 tracking-tighter">
          {event.artistInitials}
        </span>
        {event.isLive && (
          <div className="absolute top-3 left-3">
            <LiveBadge />
          </div>
        )}
        {event.isGroup && (
          <div className="absolute top-3 right-3">
            <GroupBadge />
          </div>
        )}
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] tracking-[0.16em] text-text-muted uppercase">
            {event.date} · {event.time} · {event.genre}
          </p>
          <span className="font-display font-bold text-ayo-gold text-base shrink-0">
            ${event.price}
          </span>
        </div>

        <h3 className="font-display font-semibold text-text-primary text-lg leading-snug">
          {event.title}
        </h3>

        <p className="text-sm text-text-secondary">
          {event.artist} · {event.location}
        </p>

        <div className="space-y-1.5 pt-1">
          <div className="h-1 w-full bg-stage-black rounded-full overflow-hidden">
            <div
              className="h-full bg-ayo-gold"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-[11px] tracking-[0.14em] text-text-muted uppercase">
            {event.ticketsSold.toLocaleString()} going · {pct}%
          </p>
        </div>
      </div>
    </a>
  );
}
