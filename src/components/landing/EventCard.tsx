import Link from "next/link";
import { LiveBadge } from "@/components/ui/LiveBadge";
import { GroupBadge } from "@/components/ui/GroupBadge";
import { GENRE_TINTS, type PlaceholderEvent } from "@/lib/placeholder-data";

type Props = { event: PlaceholderEvent };

export function EventCard({ event }: Props) {
  const tint = GENRE_TINTS[event.genre] ?? GENRE_TINTS.default;
  const pct = Math.min(
    100,
    Math.round((event.ticketsSold / event.ticketsTotal) * 100),
  );
  const href = event.dbEventId ? `/events/${event.dbEventId}` : null;

  const inner = (
    <div
      className={
        "block bg-surface rounded-card overflow-hidden border border-border-subtle transition-all duration-200 group " +
        (href
          ? "hover:border-text-muted hover:scale-[1.02] cursor-pointer"
          : "opacity-95")
      }
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
            <div className="h-full bg-ayo-gold" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-[11px] tracking-[0.14em] text-text-muted uppercase">
            {event.ticketsSold.toLocaleString()} going · {pct}%
          </p>
        </div>

        {!href && (
          <span className="inline-block text-[10px] text-text-muted border border-border-subtle rounded px-2 py-0.5 mt-1">
            Launching soon
          </span>
        )}
      </div>
    </div>
  );

  if (!href) return inner;
  return <Link href={href}>{inner}</Link>;
}
