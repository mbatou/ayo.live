import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

type ArtistJoin = {
  display_name: string | null;
  location: string | null;
} | null;

type EventJoin = {
  id: string;
  title: string;
  scheduled_at: string;
  status: string;
  profiles: ArtistJoin;
} | null;

type TicketWithEvent = {
  id: string;
  token: string;
  amount_paid: number;
  created_at: string;
  events: EventJoin;
};

type PublicEvent = {
  id: string;
  title: string;
  scheduled_at: string;
  ticket_price: number;
  profiles: ArtistJoin;
};

function isUpcoming(ev: NonNullable<EventJoin>) {
  return ev.status === "live" || new Date(ev.scheduled_at) > new Date();
}

export default async function FanHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const service = createServiceClient();

  const { data: rawTickets } = await service
    .from("tickets")
    .select(
      "id, token, amount_paid, created_at, events(id, title, scheduled_at, status, profiles(display_name, location))",
    )
    .eq("fan_id", user.id)
    .eq("status", "confirmed")
    .order("created_at", { ascending: false });

  const tickets = (rawTickets ?? []) as unknown as TicketWithEvent[];

  const upcoming = tickets.filter(
    (t): t is TicketWithEvent & { events: NonNullable<EventJoin> } =>
      t.events != null && isUpcoming(t.events),
  );
  const past = tickets.filter(
    (t): t is TicketWithEvent & { events: NonNullable<EventJoin> } =>
      t.events != null && !isUpcoming(t.events),
  );
  const liveTicket = upcoming.find((t) => t.events.status === "live");

  const { data: rawPublic } = await service
    .from("events")
    .select(
      "id, title, scheduled_at, ticket_price, profiles(display_name, location)",
    )
    .in("status", ["published", "live"])
    .gt("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(4);

  const publicEvents = (rawPublic ?? []) as unknown as PublicEvent[];

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-5 pb-0 border-b border-border-subtle flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-white mb-1">
            My shows
          </h1>
          <p className="text-[12px] text-text-muted mb-3.5">
            {upcoming.length} upcoming · {past.length} past
          </p>
        </div>
        <Link
          href="/"
          className="mb-4 bg-ayo-gold hover:bg-ayo-gold-hover text-stage-black text-xs font-bold rounded-btn px-4 py-2.5 transition-colors"
        >
          Browse shows
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {liveTicket && (
          <LiveBanner ticket={liveTicket} />
        )}

        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[12px] font-medium text-text-secondary uppercase tracking-[0.5px]">
              Your tickets
            </p>
            <Link
              href="/fan/tickets"
              className="text-[11px] text-ayo-gold hover:underline"
            >
              See all
            </Link>
          </div>

          {tickets.length === 0 ? (
            <div className="bg-[#111] border border-border-subtle rounded-card p-6 text-center">
              <p className="text-text-muted text-sm mb-3">No tickets yet</p>
              <Link
                href="/"
                className="text-ayo-gold text-sm hover:underline"
              >
                Browse upcoming shows →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {[...upcoming, ...past].slice(0, 4).map((ticket) => {
                const ev = ticket.events;
                if (!ev) return null;
                const isUp = isUpcoming(ev);
                const isLive = ev.status === "live";
                return (
                  <div
                    key={ticket.id}
                    className="bg-[#111] border border-border-subtle rounded-[10px] p-3.5 flex items-center gap-3.5"
                  >
                    <div
                      className={`w-0.5 h-11 rounded-full flex-shrink-0 ${isUp ? "bg-ayo-gold" : "bg-border-subtle"}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-white truncate">
                        {ev.title}
                      </p>
                      <p className="text-[11px] text-text-muted truncate">
                        {ev.profiles?.display_name ?? "Artist"} ·{" "}
                        {new Date(ev.scheduled_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p
                        className={`text-[13px] font-semibold ${isUp ? "text-ayo-gold" : "text-text-muted"}`}
                      >
                        ${Number(ticket.amount_paid).toFixed(0)}
                      </p>
                      <span
                        className={`text-[10px] rounded px-1.5 py-0.5 mt-1 inline-block ${
                          isUp
                            ? "bg-ayo-gold/10 text-ayo-gold"
                            : "bg-border-subtle text-text-muted"
                        }`}
                      >
                        {isLive ? "Live now" : isUp ? "Upcoming" : "Attended"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {publicEvents.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12px] font-medium text-text-secondary uppercase tracking-[0.5px]">
                Coming up on Ayo
              </p>
              <Link href="/" className="text-[11px] text-ayo-gold hover:underline">
                Browse all
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {publicEvents.map((event) => {
                const initials = (
                  event.profiles?.display_name ?? "AY"
                )
                  .slice(0, 2)
                  .toUpperCase();
                return (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="bg-[#111] border border-border-subtle rounded-[10px] overflow-hidden hover:border-ayo-gold/20 transition-colors"
                  >
                    <div className="h-11 flex items-center justify-center bg-[#0A0D1A] text-sm font-bold text-white/20 tracking-wider">
                      {initials}
                    </div>
                    <div className="p-2.5">
                      <p className="text-[12px] font-medium text-white truncate mb-0.5">
                        {event.title}
                      </p>
                      <p className="text-[10px] text-text-muted mb-2 truncate">
                        {event.profiles?.display_name ?? "Artist"} ·{" "}
                        {new Date(event.scheduled_at).toLocaleDateString(
                          "en-GB",
                          { day: "numeric", month: "short" },
                        )}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-semibold text-ayo-gold">
                          ${Number(event.ticket_price).toFixed(0)}
                        </span>
                        <span className="text-[10px] text-text-muted border border-border-subtle rounded px-1.5 py-0.5">
                          Get ticket
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function LiveBanner({
  ticket,
}: {
  ticket: TicketWithEvent & { events: NonNullable<EventJoin> };
}) {
  const ev = ticket.events;
  const initials = (ev.profiles?.display_name ?? "LV").slice(0, 2).toUpperCase();
  return (
    <div className="bg-[#1A0000] border border-[#3A0000] rounded-card p-4 flex items-center gap-4">
      <div className="w-[72px] h-[54px] bg-[#0A0000] rounded-lg flex items-center justify-center text-lg font-bold text-white/20 relative flex-shrink-0">
        {initials}
        <div className="absolute top-1 left-1 flex items-center gap-0.5 bg-live-red rounded px-1.5 py-0.5 text-[9px] font-bold text-white">
          <span className="w-1 h-1 rounded-full bg-white" />
          LIVE
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-live-red uppercase tracking-[1.5px] mb-0.5">
          Happening now
        </p>
        <p className="text-sm font-semibold text-white truncate">{ev.title}</p>
        <p className="text-xs text-text-muted truncate">
          {ev.profiles?.display_name ?? "Artist"}
          {ev.profiles?.location ? ` · ${ev.profiles.location}` : ""}
        </p>
      </div>
      <Link
        href={`/watch/${ticket.token}`}
        className="bg-live-red text-white text-xs font-bold rounded-md px-3.5 py-2 flex-shrink-0 hover:opacity-90 transition-opacity"
      >
        Watch now
      </Link>
    </div>
  );
}
