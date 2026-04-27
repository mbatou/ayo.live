import { notFound } from "next/navigation";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";

type Params = { token: string };

type EventJoin = {
  title: string;
  scheduled_at: string;
  profiles: {
    display_name: string | null;
    location: string | null;
  } | null;
} | null;

type TicketWithEvent = {
  token: string;
  events: EventJoin;
};

// Read via service role: the redirect from Paystack may land before the
// fan's auth cookie is set, and RLS would block the lookup otherwise.
// Token IS the auth here — anyone with a valid confirmed-ticket UUID
// gets the confirmation screen, same as the watch link.
export default async function TicketPage({ params }: { params: Params }) {
  const supabase = createServiceClient();

  const { data: ticket } = await supabase
    .from("tickets")
    .select("token, events(title, scheduled_at, profiles(display_name, location))")
    .eq("token", params.token)
    .eq("status", "confirmed")
    .single<TicketWithEvent>();

  if (!ticket || !ticket.events) notFound();

  const event = ticket.events;
  const formattedDate = new Date(event.scheduled_at).toLocaleString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

  return (
    <main className="bg-stage-black min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="text-4xl mb-4">🎫</div>
        <h1 className="font-display text-2xl font-bold text-white mb-1">
          You&apos;re in.
        </h1>
        <p className="text-text-secondary text-sm mb-8">
          Check your email for your watch link.
        </p>

        <div className="bg-surface rounded-card border border-border-subtle p-6 text-left space-y-3 mb-6">
          <h2 className="font-display text-lg font-bold text-white">
            {event.title}
          </h2>
          <p className="text-text-secondary text-sm">
            {event.profiles?.display_name ?? "Unknown artist"}
          </p>
          <p className="text-text-muted text-xs">{formattedDate}</p>
        </div>

        <Link
          href={`/watch/${ticket.token}`}
          className="block w-full bg-ayo-gold hover:bg-ayo-gold-hover text-stage-black font-semibold rounded-btn py-3 text-sm transition-colors text-center"
        >
          Watch now →
        </Link>
        <Link
          href="/"
          className="block mt-3 text-text-muted text-xs hover:text-text-secondary transition-colors"
        >
          Back to all shows
        </Link>
      </div>
    </main>
  );
}
