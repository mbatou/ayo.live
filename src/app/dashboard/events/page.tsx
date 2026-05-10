import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { EventStatus } from "@/types";

const STATUS_STYLES: Record<EventStatus, string> = {
  draft: "bg-ayo-gold/10 text-ayo-gold",
  published: "bg-protected/10 text-protected",
  live: "bg-live-red/10 text-live-red",
  ended: "bg-border-subtle text-text-muted",
  cancelled: "bg-border-subtle text-text-muted",
};

export default async function EventsListPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/signin");

  const service = createServiceClient();
  const { data: events } = await service
    .from("events")
    .select("id, title, scheduled_at, ticket_price, status")
    .eq("artist_id", user.id)
    .order("scheduled_at", { ascending: false });

  const list = events ?? [];

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-xl font-semibold text-white">
            My events
          </h1>
          <p className="text-text-muted text-sm mt-0.5">
            {list.length} {list.length === 1 ? "event" : "events"} total
          </p>
        </div>
        <Link
          href="/dashboard/events/new"
          className="bg-ayo-gold hover:bg-ayo-gold-hover text-stage-black text-xs font-bold rounded-btn px-4 py-2.5 transition-colors"
        >
          + New event
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="bg-[#111] border border-border-subtle rounded-card p-10 text-center">
          <p className="text-text-muted text-sm mb-4">No events yet</p>
          <Link
            href="/dashboard/events/new"
            className="inline-flex bg-ayo-gold text-stage-black text-xs font-bold rounded-btn px-4 py-2 hover:bg-ayo-gold-hover transition-colors"
          >
            Create your first event
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((event) => {
            const status = (event.status as EventStatus) ?? "draft";
            return (
              <Link
                key={event.id}
                href={`/dashboard/events/${event.id}`}
                className="flex items-center gap-4 bg-[#111] border border-border-subtle rounded-[10px] px-4 py-3.5 hover:border-ayo-gold/20 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate group-hover:text-ayo-gold transition-colors">
                    {event.title}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {new Date(event.scheduled_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    · ${Number(event.ticket_price).toFixed(2)}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded uppercase tracking-wide flex-shrink-0 ${STATUS_STYLES[status] ?? STATUS_STYLES.draft}`}
                >
                  {status}
                </span>
                <i
                  className="ti ti-chevron-right text-text-muted text-base flex-shrink-0"
                  aria-hidden="true"
                />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
