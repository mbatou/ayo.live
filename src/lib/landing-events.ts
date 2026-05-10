import { createServiceClient } from "@/lib/supabase/service";
import type { PlaceholderEvent } from "@/lib/placeholder-data";

type ProfileJoin = {
  display_name: string | null;
  location: string | null;
} | null;

type DbEventWithJoin = {
  id: string;
  title: string;
  genre: string | null;
  scheduled_at: string;
  ticket_price: number;
  ticket_limit: number | null;
  status: string;
  is_group: boolean;
  profiles: ProfileJoin;
};

function initialsFor(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return ((parts[0][0] ?? "") + (parts[1][0] ?? "")).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const day = d
    .toLocaleDateString("en-GB", { weekday: "short" })
    .toUpperCase();
  const dom = d.getDate().toString().padStart(2, "0");
  const mon = d
    .toLocaleDateString("en-GB", { month: "short" })
    .toUpperCase();
  return `${day} ${dom} ${mon}`;
}

function formatTime(iso: string): string {
  // Render in viewer's locale; we don't carry a per-event timezone yet,
  // so a label like "GMT" would be misleading for non-UTC viewers.
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function toLanding(
  ev: DbEventWithJoin,
  ticketsSold: number,
): PlaceholderEvent {
  const profile = ev.profiles;
  const artistName = profile?.display_name?.trim() || "Artist";
  return {
    id: ev.id,
    slug: ev.id,
    title: ev.title,
    artist: artistName,
    artistInitials: initialsFor(artistName),
    location: profile?.location ?? "",
    genre: ev.genre ?? "Other",
    date: formatDate(ev.scheduled_at),
    time: formatTime(ev.scheduled_at),
    price: Number(ev.ticket_price),
    ticketsSold,
    // ticket_limit is nullable on the DB (unlimited capacity). Keep
    // the bar showing useful progress by using sold itself when no
    // cap is set, so pct is always 100% rather than NaN/0.
    ticketsTotal: ev.ticket_limit ?? Math.max(ticketsSold, 1),
    isLive: ev.status === "live",
    isGroup: !!ev.is_group,
    dbEventId: ev.id,
  };
}

// Loads published+live events scheduled in the future from the DB and
// returns them in the landing-card shape. On any error or empty state
// returns []; the landing components fall back to placeholder data so
// the page never looks empty during dev or before the seed has run.
export async function loadLandingEvents(): Promise<PlaceholderEvent[]> {
  try {
    const service = createServiceClient();
    const { data: rawEvents, error } = await service
      .from("events")
      .select(
        "id, title, genre, scheduled_at, ticket_price, ticket_limit, status, is_group, profiles(display_name, location)",
      )
      .in("status", ["published", "live"])
      .gt("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(12);

    if (error) {
      console.error("[landing-events] fetch error:", error.message);
      return [];
    }

    const events = (rawEvents ?? []) as unknown as DbEventWithJoin[];
    if (events.length === 0) return [];

    const ids = events.map((e) => e.id);
    const { data: rawTickets } = await service
      .from("tickets")
      .select("event_id")
      .in("event_id", ids)
      .eq("status", "confirmed");

    const counts: Record<string, number> = {};
    for (const t of (rawTickets ?? []) as { event_id: string }[]) {
      counts[t.event_id] = (counts[t.event_id] ?? 0) + 1;
    }

    return events.map((e) => toLanding(e, counts[e.id] ?? 0));
  } catch (err) {
    console.error("[landing-events] failed:", err);
    return [];
  }
}
