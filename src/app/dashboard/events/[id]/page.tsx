import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { EventActions } from "@/components/dashboard/EventActions";
import type { EventStatus } from "@/types";

type Params = Promise<{ id: string }>;

const STATUS_COLORS: Record<EventStatus, string> = {
  draft: "text-ayo-gold",
  published: "text-protected",
  live: "text-live-red",
  ended: "text-text-muted",
  cancelled: "text-text-muted",
};

export default async function ArtistEventPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/signin");

  const service = createServiceClient();
  const { data: event } = await service
    .from("events")
    .select("*")
    .eq("id", id)
    .eq("artist_id", user.id)
    .single();

  if (!event) notFound();

  const { count: ticketsSoldCount } = await service
    .from("tickets")
    .select("*", { count: "exact", head: true })
    .eq("event_id", event.id)
    .eq("status", "confirmed");

  const ticketsSold = ticketsSoldCount ?? 0;
  const gross = ticketsSold * Number(event.ticket_price);
  const net = gross * 0.9;

  const { data: payout } = await service
    .from("payouts")
    .select("status, net_amount, initiated_at")
    .eq("event_id", id)
    .maybeSingle();

  const statusLabel =
    event.status.charAt(0).toUpperCase() + event.status.slice(1);

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <Link
        href="/dashboard/events"
        className="text-text-muted hover:text-white text-xs mb-4 inline-block"
      >
        ← All events
      </Link>

      <div className="mb-6">
        {event.genre && (
          <p className="text-text-muted text-xs uppercase tracking-widest mb-1">
            {event.genre}
          </p>
        )}
        <h1 className="font-display text-2xl font-bold text-white mb-1">
          {event.title}
        </h1>
        <p className="text-text-secondary text-sm">
          {new Date(event.scheduled_at).toLocaleString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
            hour: "2-digit",
            minute: "2-digit",
            timeZoneName: "short",
          })}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Stat label="Tickets sold" value={ticketsSold.toString()} />
        <Stat label="Gross revenue" value={`$${gross.toFixed(2)}`} />
        <Stat label="Your earnings (90%)" value={`$${net.toFixed(2)}`} />
      </div>

      <div className="bg-[#111] border border-border-subtle rounded-card p-5 mb-6 space-y-3">
        <Row label="Status">
          <span className={`font-medium ${STATUS_COLORS[event.status as EventStatus] ?? "text-white"}`}>
            {statusLabel}
          </span>
        </Row>
        <Row label="Ticket price">
          <span className="text-white">
            ${Number(event.ticket_price).toFixed(2)}
          </span>
        </Row>
        {event.ticket_limit && (
          <Row label="Capacity">
            <span className="text-white">
              {ticketsSold} / {event.ticket_limit}
            </span>
          </Row>
        )}
        {event.is_group && (
          <Row label="Type">
            <span className="text-white">Group / band event</span>
          </Row>
        )}
        {event.mux_stream_key && (
          <div className="pt-3 border-t border-border-subtle">
            <p className="text-xs text-text-muted mb-1">
              Stream key (OBS / Streamlabs)
            </p>
            <code className="text-xs text-ayo-gold bg-stage-black rounded px-2 py-1 block truncate">
              {event.mux_stream_key}
            </code>
          </div>
        )}
      </div>

      {payout && (
        <div className="bg-[#111] border border-border-subtle rounded-card p-5 mb-6">
          <p className="text-xs text-text-muted uppercase tracking-widest mb-2">
            Payout
          </p>
          <div className="flex items-center justify-between">
            <span className="text-white text-sm font-medium">
              ${Number(payout.net_amount).toFixed(2)}
            </span>
            <span
              className={`text-xs ${
                payout.status === "paid"
                  ? "text-protected"
                  : payout.status === "failed"
                    ? "text-red-400"
                    : "text-ayo-gold"
              }`}
            >
              {payout.status}
            </span>
          </div>
          {payout.initiated_at && (
            <p className="text-text-muted text-xs mt-1">
              Initiated{" "}
              {new Date(payout.initiated_at).toLocaleString("en-GB", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>
      )}

      {!payout && (
        <EventActions
          event={{ id: event.id, status: event.status, title: event.title }}
          ticketsSold={ticketsSold}
          net={net}
        />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#111] border border-border-subtle rounded-[10px] p-3.5">
      <p className="text-[10px] text-text-muted uppercase tracking-[1px] mb-1.5">
        {label}
      </p>
      <p className="font-display text-lg font-semibold text-ayo-gold">
        {value}
      </p>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-text-muted">{label}</span>
      {children}
    </div>
  );
}
