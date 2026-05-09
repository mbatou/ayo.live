import Link from "next/link";
import { LiveBadge } from "@/components/ui/LiveBadge";
import { ProtectedBadge } from "@/components/ui/ProtectedBadge";
import { FEATURED_EVENT, GENRE_TINTS } from "@/lib/placeholder-data";

export function HeroSection() {
  const event = FEATURED_EVENT;
  const tint = GENRE_TINTS[event.genre] ?? GENRE_TINTS.default;
  const ticketHref = event.dbEventId ? `/events/${event.dbEventId}` : "/#shows";

  return (
    <section id="live" className="border-b border-border-subtle">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-24 grid grid-cols-1 lg:grid-cols-5 gap-12 items-center">
        <div className="lg:col-span-3 space-y-6">
          <p className="text-xs tracking-[0.2em] text-text-muted uppercase">
            Joy · Live
          </p>
          <h1 className="font-display font-bold text-text-primary text-4xl sm:text-5xl md:text-[56px] leading-[1.05] tracking-tight">
            The stage is dark.
            <br />
            The spotlight is{" "}
            <span className="text-ayo-gold">gold.</span>
          </h1>
          <p className="text-text-secondary text-base md:text-lg max-w-xl leading-relaxed">
            Ticketed live streams for African artists, live bands, and creative
            groups. One ticket, one device — every show is yours.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/#shows"
              className="inline-flex items-center justify-center text-sm font-semibold text-stage-black bg-ayo-gold hover:bg-ayo-gold-hover px-5 py-3 rounded-btn transition-colors"
            >
              Browse shows
            </Link>
            <Link
              href="/auth/signin?role=artist"
              className="inline-flex items-center justify-center text-sm font-semibold text-text-primary border border-border-subtle hover:border-text-secondary px-5 py-3 rounded-btn transition-colors"
            >
              For artists →
            </Link>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-surface rounded-card border border-border-subtle overflow-hidden">
            <div
              className="relative aspect-[16/10] flex items-center justify-center"
              style={{
                background: `repeating-linear-gradient(-45deg, ${tint}, ${tint} 10px, transparent 10px, transparent 20px), ${tint}`,
              }}
            >
              <span className="font-display font-bold text-7xl md:text-8xl text-text-primary/20 tracking-tighter">
                {event.artistInitials}
              </span>
              <div className="absolute top-3 left-3">
                <LiveBadge />
              </div>
              <div className="absolute top-3 right-3 text-[11px] font-medium text-text-primary bg-stage-black/70 backdrop-blur px-2 py-1 rounded-badge">
                {event.ticketsSold.toLocaleString()} watching
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <p className="text-[11px] tracking-[0.18em] text-text-muted uppercase mb-1">
                  Happening now · {event.location}
                </p>
                <h3 className="font-display font-semibold text-text-primary text-xl leading-snug">
                  {event.title}
                </h3>
                <p className="text-sm text-text-secondary mt-1">
                  {event.artist} · 7 performers
                </p>
              </div>
              <Link
                href={ticketHref}
                className="block w-full text-center text-sm font-semibold text-stage-black bg-ayo-gold hover:bg-ayo-gold-hover py-3 rounded-btn transition-colors"
              >
                Get ticket — ${event.price}
              </Link>
              <div className="flex justify-center">
                <ProtectedBadge />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
