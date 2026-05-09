import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { StatCard } from "@/components/dashboard/StatCard";
import { EventStatusPill } from "@/components/dashboard/EventStatusPill";
import type { EventStatus } from "@/types";

type EventRow = {
  id: string;
  title: string;
  scheduled_at: string;
  status: EventStatus;
  ticket_price: number;
  ticket_limit: number | null;
};

type TicketRow = {
  event_id: string;
  fan_id: string | null;
  status: string;
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function relativeTime(iso: string) {
  const target = new Date(iso).getTime();
  const now = Date.now();
  const diff = target - now;
  const day = 24 * 60 * 60 * 1000;
  if (diff < 0) return "in the past";
  if (diff < day) return "today";
  if (diff < 2 * day) return "tomorrow";
  const days = Math.round(diff / day);
  return `in ${days} days`;
}

export default async function DashboardOverview() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // user is non-null due to layout's redirect.
  const userId = user!.id;

  const service = createServiceClient();
  const { data: rawEvents } = await service
    .from("events")
    .select("id, title, scheduled_at, status, ticket_price, ticket_limit")
    .eq("artist_id", userId)
    .order("scheduled_at", { ascending: true });

  const events = (rawEvents ?? []) as EventRow[];
  const now = Date.now();

  const upcoming = events.filter(
    (e) =>
      (e.status === "published" || e.status === "live") &&
      new Date(e.scheduled_at).getTime() >= now,
  );
  const drafts = events.filter((e) => e.status === "draft");

  const eventIds = events.map((e) => e.id);
  let totalTickets = 0;
  let uniqueFans = 0;
  const ticketsByEvent: Record<string, number> = {};

  if (eventIds.length > 0) {
    const { data: tickets } = await service
      .from("tickets")
      .select("event_id, fan_id, status")
      .in("event_id", eventIds)
      .eq("status", "confirmed");

    const rows = (tickets ?? []) as TicketRow[];
    totalTickets = rows.length;
    uniqueFans = new Set(
      rows.map((t) => t.fan_id).filter((id): id is string => Boolean(id)),
    ).size;
    for (const t of rows) {
      ticketsByEvent[t.event_id] = (ticketsByEvent[t.event_id] ?? 0) + 1;
    }
  }

  const nextShow = upcoming[0];
  const totalEvents = events.length;

  return (
    <div className="px-6 lg:px-10 py-8 lg:py-10 max-w-5xl">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">
            Overview
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Welcome back, {user!.email}.
          </p>
        </div>
        <Link
          href="/dashboard/events/new"
          className="bg-ayo-gold hover:bg-ayo-gold-hover text-stage-black font-semibold rounded-btn px-4 py-2 text-sm transition-colors shrink-0"
        >
          Create event
        </Link>
      </div>

      {totalEvents === 0 ? (
        <div className="bg-surface border border-border-subtle rounded-card p-10 text-center">
          <p className="font-display text-xl text-white mb-2">
            No shows yet.
          </p>
          <p className="text-text-secondary text-sm mb-6 max-w-sm mx-auto">
            Schedule your first ticketed live stream. 90% of every ticket
            goes to you.
          </p>
          <Link
            href="/dashboard/events/new"
            className="inline-block bg-ayo-gold hover:bg-ayo-gold-hover text-stage-black font-semibold rounded-btn px-5 py-2.5 text-sm transition-colors"
          >
            Create your first event
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            <StatCard
              label="Upcoming"
              value={upcoming.length}
              hint={
                nextShow
                  ? `Next: ${nextShow.title} · ${relativeTime(nextShow.scheduled_at)}`
                  : drafts.length > 0
                    ? `${drafts.length} draft${drafts.length === 1 ? "" : "s"} unpublished`
                    : "Schedule a show to see it here"
              }
            />
            <StatCard
              label="Tickets sold"
              value={totalTickets}
              hint={
                nextShow
                  ? `${ticketsByEvent[nextShow.id] ?? 0} for next show`
                  : "Across all your events"
              }
            />
            <StatCard
              label="Unique fans"
              value={uniqueFans}
              hint={
                uniqueFans === 0
                  ? "No buyers yet"
                  : `${uniqueFans === 1 ? "fan has" : "fans have"} bought a ticket`
              }
            />
          </div>

          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg font-bold text-white">
                Upcoming shows
              </h2>
              <Link
                href="/dashboard/events"
                className="text-text-muted hover:text-white text-xs"
              >
                View all →
              </Link>
            </div>
            {upcoming.length === 0 ? (
              <div className="bg-surface border border-border-subtle rounded-card p-6 text-center">
                <p className="text-text-secondary text-sm">
                  Nothing scheduled.
                  {drafts.length > 0
                    ? ` You have ${drafts.length} draft${drafts.length === 1 ? "" : "s"} — `
                    : " "}
                  <Link
                    href={
                      drafts.length > 0
                        ? "/dashboard/events"
                        : "/dashboard/events/new"
                    }
                    className="text-ayo-gold hover:underline"
                  >
                    {drafts.length > 0 ? "publish a draft" : "create one"}
                  </Link>
                  .
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {upcoming.slice(0, 5).map((event) => (
                  <li key={event.id}>
                    <Link
                      href={`/dashboard/events/${event.id}`}
                      className="flex items-center gap-4 bg-surface border border-border-subtle hover:border-ayo-gold/40 rounded-card p-4 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">
                          {event.title}
                        </p>
                        <p className="text-text-muted text-xs mt-0.5">
                          {formatDateTime(event.scheduled_at)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-white text-sm">
                          {ticketsByEvent[event.id] ?? 0}
                          {event.ticket_limit ? ` / ${event.ticket_limit}` : ""}
                        </p>
                        <p className="text-text-muted text-xs">tickets</p>
                      </div>
                      <EventStatusPill status={event.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
