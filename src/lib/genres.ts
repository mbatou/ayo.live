// Canonical genre list for event creation. Single source of truth: the
// /api/events POST/PATCH validators check against this; the create form
// renders it as <option>s. The landing-page GenreFilter still derives
// its pills from genres in use on real DB events (not from this list),
// so adding a genre here doesn't pollute the filter until at least one
// event uses it.
export const ALLOWED_GENRES = [
  "Afrobeats",
  "Highlife",
  "Soul",
  "Dub",
  "Spoken Word",
  "Yoruba Pop",
  "Talk",
  "R&B",
  "Reggae",
  "Jazz",
  "Gospel",
] as const;

export type Genre = (typeof ALLOWED_GENRES)[number];

export function isAllowedGenre(value: unknown): value is Genre {
  return (
    typeof value === "string" &&
    (ALLOWED_GENRES as readonly string[]).includes(value)
  );
}
