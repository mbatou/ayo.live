import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { EventStatusPill } from "@/components/dashboard/EventStatusPill";
import type { EventStatus } from "@/types";

type EventRow = {
  id: string;
  title: string;
  scheduled_at: string;
  status: EventStatus;
  ticket_price: number;
  ticket_limit: number | null;
  genre: string | null;
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function ArtistEventsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user!.id;

  const service = createServiceClient();
  const { data: rawEvents } = await service
    .from("events")
    .select(
      "id, title, scheduled_at, status, ticket_price, ticket_limit, genre",
    )
    .eq("artist_id", userId)
    .order("scheduled_at", { ascending: false });

  const events = (rawEvents ?? []) as EventRow[];

  const eventIds = events.map((e) => e.id);
  const ticketsByEvent: Record<string, number> = {};
  if (eventIds.length > 0) {
    const { data: tickets } = await service
      .from("tickets")
      .select("event_id")
      .in("event_id", eventIds)
      .eq("status", "confirmed");
    for (const t of (tickets ?? []) as { event_id: string }[]) {
      ticketsByEvent[t.event_id] = (ticketsByEvent[t.event_id] ?? 0) + 1;
    }
  }

  return (
    <div className="px-6 lg:px-10 py-8 lg:py-10 max-w-5xl">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">
            Your events
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            All shows you&apos;ve created — drafts, scheduled, and past.
          </p>
        </div>
        <Link
          href="/dashboard/events/new"
          className="bg-ayo-gold hover:bg-ayo-gold-hover text-stage-black font-semibold rounded-btn px-4 py-2 text-sm transition-colors shrink-0"
        >
          Create event
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="bg-surface border border-border-subtle rounded-card p-10 text-center">
          <p className="font-display text-xl text-white mb-2">
            No events yet.
          </p>
          <p className="text-text-secondary text-sm mb-6 max-w-sm mx-auto">
            Create your first show — set a date, set a price, and publish
            when you&apos;re ready.
          </p>
          <Link
            href="/dashboard/events/new"
            className="inline-block bg-ayo-gold hover:bg-ayo-gold-hover text-stage-black font-semibold rounded-btn px-5 py-2.5 text-sm transition-colors"
          >
            Create your first event
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {events.map((event) => (
            <li key={event.id}>
              <Link
                href={`/dashboard/events/${event.id}`}
                className="flex items-center gap-4 bg-surface border border-border-subtle hover:border-ayo-gold/40 rounded-card p-4 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-white font-medium truncate">
                      {event.title}
                    </p>
                    <EventStatusPill status={event.status} />
                  </div>
                  <p className="text-text-muted text-xs">
                    {formatDateTime(event.scheduled_at)}
                    {event.genre ? ` · ${event.genre}` : ""}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-white text-sm">
                    {ticketsByEvent[event.id] ?? 0}
                    {event.ticket_limit ? ` / ${event.ticket_limit}` : ""}
                  </p>
                  <p className="text-text-muted text-xs">
                    {event.ticket_price === 0
                      ? "free"
                      : `$${event.ticket_price.toFixed(2)}`}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
