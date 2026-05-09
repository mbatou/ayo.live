import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { EventEditForm } from "@/components/dashboard/EventEditForm";
import { EventStatusPill } from "@/components/dashboard/EventStatusPill";
import { StatCard } from "@/components/dashboard/StatCard";
import type { Event } from "@/types";

type Params = Promise<{ id: string }>;

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function EditEventPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const { created } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user!.id;

  const service = createServiceClient();
  const { data: event } = await service
    .from("events")
    .select("*")
    .eq("id", id)
    .single();

  if (!event || event.artist_id !== userId) {
    notFound();
  }

  const typedEvent = event as Event;

  const { data: tickets } = await service
    .from("tickets")
    .select("id, fan_id, amount_paid, currency, status, created_at")
    .eq("event_id", id)
    .order("created_at", { ascending: false });

  const confirmed = (tickets ?? []).filter((t) => t.status === "confirmed");
  const ticketsSold = confirmed.length;
  const uniqueFans = new Set(
    confirmed.map((t) => t.fan_id).filter((id): id is string => Boolean(id)),
  ).size;
  const remaining =
    typedEvent.ticket_limit != null
      ? Math.max(0, typedEvent.ticket_limit - ticketsSold)
      : null;

  return (
    <div className="px-6 lg:px-10 py-8 lg:py-10 max-w-3xl">
      <Link
        href="/dashboard/events"
        className="text-text-muted hover:text-white text-xs mb-4 inline-block"
      >
        ← All events
      </Link>

      {created === "1" && (
        <div className="mb-6 bg-ayo-gold/10 border border-ayo-gold/20 text-ayo-gold rounded-card px-4 py-3 text-sm">
          Event created. Publish it when you&apos;re ready for fans to buy
          tickets.
        </div>
      )}

      <div className="flex items-start justify-between gap-4 mb-2">
        <h1 className="font-display text-3xl font-bold text-white">
          {typedEvent.title}
        </h1>
        <EventStatusPill status={typedEvent.status} className="mt-2" />
      </div>
      <p className="text-text-secondary text-sm mb-8">
        {formatDateTime(typedEvent.scheduled_at)}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <StatCard
          label="Tickets sold"
          value={ticketsSold}
          hint={
            remaining != null
              ? `${remaining} remaining`
              : "Unlimited capacity"
          }
        />
        <StatCard
          label="Unique fans"
          value={uniqueFans}
          hint={
            uniqueFans === 0
              ? "No buyers yet"
              : `${uniqueFans === 1 ? "fan has" : "fans have"} bought`
          }
        />
        <StatCard
          label="Ticket price"
          value={
            typedEvent.ticket_price === 0
              ? "Free"
              : `$${typedEvent.ticket_price.toFixed(2)}`
          }
          hint="90% goes to you"
        />
      </div>

      <EventEditForm event={typedEvent} />
    </div>
  );
}
