import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { WatchClient } from "@/components/watch/WatchClient";

type Params = Promise<{ token: string }>;

type ArtistJoin = {
  display_name: string | null;
  location: string | null;
} | null;

type EventJoin = {
  id: string;
  title: string;
  status: string;
  mux_playback_id: string | null;
  profiles: ArtistJoin;
} | null;

type TicketWithEvent = {
  id: string;
  token: string;
  device_fingerprint: string | null;
  event_id: string;
  status: string;
  events: EventJoin;
};

export default async function WatchPage({ params }: { params: Params }) {
  const { token } = await params;
  const service = createServiceClient();

  const { data: rawTicket } = await service
    .from("tickets")
    .select(
      "id, token, device_fingerprint, event_id, status, events(id, title, status, mux_playback_id, profiles(display_name, location))",
    )
    .eq("token", token)
    .eq("status", "confirmed")
    .single();

  const ticket = rawTicket as unknown as TicketWithEvent | null;
  if (!ticket || !ticket.events) notFound();

  const event = ticket.events;
  // Allow watching during published (warming up), live, and ended (replay) —
  // anything else (draft, cancelled) returns the "not started" screen so
  // ticketholders aren't confused by a 404.
  const accessible =
    event.status === "live" ||
    event.status === "published" ||
    event.status === "ended";

  if (!accessible) {
    return (
      <main className="bg-stage-black min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <p className="text-2xl mb-3">🎫</p>
          <h1 className="font-display text-xl font-semibold text-white mb-2">
            Show not started yet
          </h1>
          <p className="text-text-secondary text-sm">
            {event.title} hasn&apos;t started. Come back when the artist goes
            live.
          </p>
        </div>
      </main>
    );
  }

  return (
    <WatchClient
      ticketToken={ticket.token}
      eventId={event.id}
      eventTitle={event.title}
      eventStatus={event.status}
      playbackReady={!!event.mux_playback_id}
      artistName={event.profiles?.display_name ?? "The artist"}
      artistLocation={event.profiles?.location ?? ""}
    />
  );
}
