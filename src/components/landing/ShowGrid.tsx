"use client";

import { useMemo, useState } from "react";
import { EventCard } from "./EventCard";
import { GenreFilter } from "./GenreFilter";
import { PLACEHOLDER_EVENTS } from "@/lib/placeholder-data";

export function ShowGrid() {
  const [active, setActive] = useState("All");

  const events = useMemo(() => {
    if (active === "All") return PLACEHOLDER_EVENTS;
    return PLACEHOLDER_EVENTS.filter((e) => e.genre === active);
  }, [active]);

  const countries = useMemo(() => {
    const set = new Set(
      PLACEHOLDER_EVENTS.map((e) => e.location.split(",").pop()?.trim()),
    );
    return set.size;
  }, []);

  return (
    <section id="shows" className="border-b border-border-subtle">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-20">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
          <h2 className="font-display font-semibold text-text-primary text-2xl md:text-[28px] tracking-tight">
            This week on Ayo
          </h2>
          <p className="text-[11px] tracking-[0.18em] text-text-muted uppercase">
            {PLACEHOLDER_EVENTS.length} upcoming · {countries} countries
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
