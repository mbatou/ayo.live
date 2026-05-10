"use client";

type Props = {
  active: string;
  onChange: (genre: string) => void;
  genres: string[]; // does NOT include the leading "All" pill
};

export function GenreFilter({ active, onChange, genres }: Props) {
  const all = ["All", ...genres];
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
      {all.map((genre) => {
        const isActive = genre === active;
        return (
          <button
            key={genre}
            type="button"
            onClick={() => onChange(genre)}
            className={
              "shrink-0 rounded-full px-4 py-1.5 text-sm transition-colors " +
              (isActive
                ? "bg-ayo-gold text-stage-black font-semibold"
                : "bg-surface text-text-secondary border border-border-subtle hover:text-text-primary")
            }
          >
            {genre}
          </button>
        );
      })}
    </div>
  );
}
