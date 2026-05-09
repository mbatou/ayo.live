import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

type EventRow = {
  id: string;
  title: string;
  scheduled_at: string;
  status: string;
  ticket_price: number;
  ticket_limit: number | null;
};

type TicketRow = {
  event_id: string;
  amount_paid: number;
  fan_id: string | null;
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const service = createServiceClient();

  const { data: profile } = await service
    .from("profiles")
    .select("display_name, location")
    .eq("id", user.id)
    .single();

  const { data: rawEvents } = await service
    .from("events")
    .select("id, title, scheduled_at, status, ticket_price, ticket_limit")
    .eq("artist_id", user.id)
    .order("scheduled_at", { ascending: true });

  const events = (rawEvents ?? []) as EventRow[];
  const eventIds = events.map((e) => e.id);

  let tickets: TicketRow[] = [];
  if (eventIds.length > 0) {
    const { data } = await service
      .from("tickets")
      .select("event_id, amount_paid, fan_id")
      .in("event_id", eventIds)
      .eq("status", "confirmed");
    tickets = (data ?? []) as TicketRow[];
  }

  const ticketsByEvent: Record<string, { count: number; gross: number }> = {};
  for (const t of tickets) {
    const bucket = ticketsByEvent[t.event_id] ?? { count: 0, gross: 0 };
    bucket.count += 1;
    bucket.gross += Number(t.amount_paid);
    ticketsByEvent[t.event_id] = bucket;
  }

  const totalTickets = tickets.length;
  const totalGross = tickets.reduce((s, t) => s + Number(t.amount_paid), 0);
  const totalNet = totalGross * 0.9;
  const upcomingEvents = events.filter((e) =>
    ["published", "draft"].includes(e.status),
  );
  const liveEvent = events.find((e) => e.status === "live");

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const stats = [
    {
      label: "This month",
      value: `$${(totalNet * 0.3).toFixed(0)}`,
      sub: "net earnings",
    },
    {
      label: "Tickets sold",
      value: totalTickets.toLocaleString(),
      sub: `across ${events.length} ${events.length === 1 ? "event" : "events"}`,
    },
    {
      label: "Upcoming",
      value: upcomingEvents.length.toString(),
      sub: upcomingEvents[0]
        ? `next: ${new Date(upcomingEvents[0].scheduled_at).toLocaleDateString(
            "en-GB",
            { day: "numeric", month: "short" },
          )}`
        : "none scheduled",
    },
    {
      label: "Avg ticket",
      value: totalTickets > 0 ? `$${(totalGross / totalTickets).toFixed(2)}` : "—",
      sub: "per ticket",
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-5 pb-0 border-b border-border-subtle flex items-end justify-between">
        <div>
          <p className="text-[10px] text-text-muted uppercase tracking-[2px] mb-1">
            {today}
          </p>
          <h1 className="font-display text-xl font-semibold text-white mb-3.5">
            Studio
          </h1>
        </div>
        <Link
          href="/dashboard/events/new"
          className="mb-4 flex items-center gap-1.5 bg-ayo-gold hover:bg-ayo-gold-hover text-stage-black text-xs font-bold rounded-btn px-4 py-2.5 transition-colors"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-stage-black" />
          Go live
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        <div
          className="relative rounded-card overflow-hidden border border-[#2A2000] bg-[#1A1200] p-5 flex items-center justify-between"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-45deg,transparent,transparent 20px,rgba(245,158,11,0.03) 20px,rgba(245,158,11,0.03) 21px)",
          }}
        >
          <div className="relative">
            <p className="text-[10px] text-[#92400E] uppercase tracking-[1.5px] mb-1">
              Welcome back
            </p>
            <p className="font-display text-lg font-semibold text-white">
              {profile?.display_name ?? "Artist"}
            </p>
            {liveEvent ? (
              <p className="text-xs text-ayo-gold mt-0.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-ayo-gold animate-pulse" />
                You are live now — {liveEvent.title}
              </p>
            ) : upcomingEvents[0] ? (
              <p className="text-xs text-text-muted mt-0.5">
                Next show:{" "}
                <span className="text-ayo-gold">{upcomingEvents[0].title}</span>
              </p>
            ) : (
              <p className="text-xs text-text-muted mt-0.5">
                No upcoming events —{" "}
                <Link
                  href="/dashboard/events/new"
                  className="text-ayo-gold hover:underline"
                >
                  create one
                </Link>
              </p>
            )}
          </div>
          <div className="relative text-right">
            <p className="text-[11px] text-[#92400E] mb-1">
              {totalTickets.toLocaleString()} tickets sold
            </p>
            <p className="font-display text-2xl font-bold text-ayo-gold">
              ${totalNet.toFixed(0)}
            </p>
            <p className="text-[10px] text-text-muted mt-0.5">
              lifetime earnings
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className="bg-[#111] border border-border-subtle rounded-[10px] p-3.5"
            >
              <p className="text-[10px] text-text-muted uppercase tracking-[1px] mb-1.5">
                {s.label}
              </p>
              <p className="font-display text-xl font-semibold text-ayo-gold">
                {s.value}
              </p>
              <p className="text-[11px] text-text-muted mt-1">{s.sub}</p>
            </div>
          ))}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[12px] font-medium text-text-secondary uppercase tracking-[0.5px]">
              Your events
            </p>
            <Link href="/dashboard/events" className="text-[11px] text-ayo-gold hover:underline">
              See all
            </Link>
          </div>

          {events.length === 0 ? (
            <div className="bg-[#111] border border-border-subtle rounded-card p-8 text-center">
              <p className="text-text-muted text-sm mb-3">No events yet</p>
              <Link
                href="/dashboard/events/new"
                className="inline-flex items-center gap-1.5 bg-ayo-gold text-stage-black text-xs font-bold rounded-btn px-4 py-2 transition-colors hover:bg-ayo-gold-hover"
              >
                Create your first event
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {events.slice(0, 4).map((event) => {
                const stat = ticketsByEvent[event.id] ?? { count: 0, gross: 0 };
                const net = stat.gross * 0.9;
                const pct =
                  event.ticket_limit && event.ticket_limit > 0
                    ? Math.min(
                        100,
                        Math.round((stat.count / event.ticket_limit) * 100),
                      )
                    : null;
                const isLive = event.status === "live";
                const initials = (event.title ?? "EV").slice(0, 2).toUpperCase();
                return (
                  <div
                    key={event.id}
                    className="bg-[#111] border border-border-subtle rounded-[10px] overflow-hidden"
                  >
                    <div
                      className={`h-14 flex items-center justify-center relative ${isLive ? "bg-[#1A0000]" : "bg-[#0A0D1A]"}`}
                    >
                      <span className="text-lg font-bold text-white/20 tracking-wider">
                        {initials}
                      </span>
                      {isLive && (
                        <div className="absolute top-2 left-2 flex items-center gap-1 bg-live-red rounded px-1.5 py-0.5 text-[9px] font-bold text-white">
                          <span className="w-1 h-1 rounded-full bg-white" />
                          LIVE
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-[13px] font-medium text-white truncate mb-0.5">
                        {event.title}
                      </p>
                      <p className="text-[11px] text-text-muted mb-2.5">
                        {new Date(event.scheduled_at).toLocaleDateString(
                          "en-GB",
                          {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </p>
                      {pct !== null && (
                        <div className="mb-2">
                          <div className="flex justify-between text-[10px] text-text-muted mb-1">
                            <span>
                              {stat.count} / {event.ticket_limit} tickets
                            </span>
                            <span>{pct}%</span>
                          </div>
                          <div className="h-0.5 bg-border-subtle rounded-full overflow-hidden">
                            <div
                              className="h-full bg-ayo-gold rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-2.5 border-t border-[#1A1A1A]">
                        <span className="text-xs text-ayo-gold font-semibold">
                          ${net.toFixed(0)} earned
                        </span>
                        <Link
                          href={`/dashboard/events/${event.id}`}
                          className="text-[11px] text-text-muted border border-border-subtle rounded-md px-2.5 py-1 hover:text-text-secondary transition-colors"
                        >
                          Manage
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
