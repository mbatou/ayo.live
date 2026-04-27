const STATS = [
  { value: "90%", label: "Goes to the artist" },
  { value: "8", label: "Countries tonight" },
  { value: "SMS+MM", label: "No app, no login" },
];

export function StatsBar() {
  return (
    <section className="border-b border-border-subtle">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 md:py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border-subtle">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center md:items-start gap-1 py-6 md:py-0 md:px-8 first:md:pl-0 last:md:pr-0"
            >
              <span className="font-display font-bold text-ayo-gold text-4xl md:text-5xl tracking-tight">
                {stat.value}
              </span>
              <span className="text-[11px] tracking-[0.18em] text-text-muted uppercase">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
