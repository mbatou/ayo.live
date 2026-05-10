"use client";

import { useMemo, useState } from "react";
import { EventCard } from "./EventCard";
import { GenreFilter } from "./GenreFilter";
import {
  PLACEHOLDER_EVENTS,
  type PlaceholderEvent,
} from "@/lib/placeholder-data";

interface Props {
  events?: PlaceholderEvent[];
}

export function ShowGrid({ events: incoming }: Props = {}) {
  // If the DB returned nothing (empty table, fetch failure, dev with no
  // seed), fall back to the placeholder set so the page still feels
  // populated. When real events are present they take over.
  const allEvents =
    incoming && incoming.length > 0 ? incoming : PLACEHOLDER_EVENTS;

  const [active, setActive] = useState("All");

  const events = useMemo(() => {
    if (active === "All") return allEvents;
    return allEvents.filter((e) => e.genre === active);
  }, [active, allEvents]);

  const countries = useMemo(() => {
    const set = new Set(
      allEvents
        .map((e) => e.location.split(",").pop()?.trim())
        .filter((s): s is string => Boolean(s)),
    );
    return set.size;
  }, [allEvents]);

  return (
    <section id="shows" className="border-b border-border-subtle">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-20">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
          <h2 className="font-display font-semibold text-text-primary text-2xl md:text-[28px] tracking-tight">
            This week on Ayo
          </h2>
          <p className="text-[11px] tracking-[0.18em] text-text-muted uppercase">
            {allEvents.length} upcoming · {countries}{" "}
            {countries === 1 ? "country" : "countries"}
          </p>
        </div>

        <div className="mb-8">
          <GenreFilter active={active} onChange={setActive} />
        </div>

        {events.length === 0 ? (
          <p className="text-text-muted text-sm py-12 text-center">
            No shows in this genre yet — check back soon.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
