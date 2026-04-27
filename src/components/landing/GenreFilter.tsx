"use client";

import { GENRES } from "@/lib/placeholder-data";

type Props = {
  active: string;
  onChange: (genre: string) => void;
};

export function GenreFilter({ active, onChange }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
      {GENRES.map((genre) => {
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
