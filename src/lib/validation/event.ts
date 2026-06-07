// Server-side validation for /api/events POST and PATCH bodies.
// Client form mirrors these checks for UX but the server is authoritative.
// All validators return either a normalized value or a per-field error
// string; the caller composes them into a single 400 response.

import { isAllowedGenre } from "@/lib/genres";

// Minimum lead time between creation and event start, so an event
// can't be scheduled already-past or so close it can't be promoted.
// Expressed once here.
export const MIN_LEAD_MINUTES = 60;

export const MAX_TITLE_LENGTH = 120;
export const MAX_DESCRIPTION_LENGTH = 2000;
// GH₵1,000,000 ceiling — guards fat-fingered "1000000000" inputs.
export const MAX_TICKET_PRICE_GHS = 1_000_000;
export const MAX_TICKET_LIMIT = 1_000_000;

export type EventValidationErrors = Record<string, string>;

export type ValidatedEventCreate = {
  title: string;
  description: string | null;
  genre: string;
  scheduled_at: string;
  ticket_price: number;
  ticket_limit: number | null;
  is_group: boolean;
};

export type ValidatedEventPatch = Partial<ValidatedEventCreate>;

function validateTitle(
  input: unknown,
  errors: EventValidationErrors,
): string | null {
  if (typeof input !== "string") {
    errors.title = "Title is required.";
    return null;
  }
  const trimmed = input.trim();
  if (trimmed.length < 1) {
    errors.title = "Title is required.";
    return null;
  }
  if (trimmed.length > MAX_TITLE_LENGTH) {
    errors.title = `Title must be ${MAX_TITLE_LENGTH} characters or fewer.`;
    return null;
  }
  return trimmed;
}

function validateDescription(
  input: unknown,
  errors: EventValidationErrors,
): string | null {
  if (input == null || input === "") return null;
  if (typeof input !== "string") {
    errors.description = "Description must be text.";
    return null;
  }
  const trimmed = input.trim();
  if (trimmed.length > MAX_DESCRIPTION_LENGTH) {
    errors.description = `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.`;
    return null;
  }
  return trimmed || null;
}

function validateGenre(
  input: unknown,
  errors: EventValidationErrors,
): string | null {
  if (!isAllowedGenre(input)) {
    errors.genre = "Pick one of the listed genres.";
    return null;
  }
  return input;
}

function validateScheduledAt(
  input: unknown,
  errors: EventValidationErrors,
  { now = Date.now() } = {},
): string | null {
  if (typeof input !== "string") {
    errors.scheduled_at = "Date and time are required.";
    return null;
  }
  const parsed = Date.parse(input);
  if (Number.isNaN(parsed)) {
    errors.scheduled_at = "Date and time are not a valid timestamp.";
    return null;
  }
  const minStart = now + MIN_LEAD_MINUTES * 60_000;
  if (parsed < minStart) {
    errors.scheduled_at = `Schedule the event at least ${MIN_LEAD_MINUTES} minutes from now.`;
    return null;
  }
  return new Date(parsed).toISOString();
}

function validateTicketPrice(
  input: unknown,
  errors: EventValidationErrors,
): number | null {
  if (input == null || input === "") {
    errors.ticket_price = "Ticket price is required (use 0 for a free show).";
    return null;
  }
  const num = typeof input === "number" ? input : Number(input);
  if (!Number.isFinite(num)) {
    errors.ticket_price = "Ticket price must be a number.";
    return null;
  }
  if (num < 0) {
    errors.ticket_price = "Ticket price can't be negative.";
    return null;
  }
  if (num > MAX_TICKET_PRICE_GHS) {
    errors.ticket_price = `Ticket price can't exceed GH₵${MAX_TICKET_PRICE_GHS.toLocaleString()}.`;
    return null;
  }
  // Snap to 2dp to match the DB column (numeric(10,2)).
  return Math.round(num * 100) / 100;
}

function validateTicketLimit(
  input: unknown,
  errors: EventValidationErrors,
): number | null {
  if (input == null || input === "") return null;
  const num = typeof input === "number" ? input : Number(input);
  if (!Number.isFinite(num) || !Number.isInteger(num)) {
    errors.ticket_limit = "Ticket limit must be a whole number.";
    return null;
  }
  if (num < 1) {
    errors.ticket_limit = "Ticket limit must be at least 1 (omit for unlimited).";
    return null;
  }
  if (num > MAX_TICKET_LIMIT) {
    errors.ticket_limit = `Ticket limit can't exceed ${MAX_TICKET_LIMIT.toLocaleString()}.`;
    return null;
  }
  return num;
}

function validateIsGroup(input: unknown): boolean {
  return typeof input === "boolean" ? input : false;
}

export function validateEventCreate(
  body: unknown,
):
  | { ok: true; value: ValidatedEventCreate }
  | { ok: false; errors: EventValidationErrors } {
  const errors: EventValidationErrors = {};
  const b = (body ?? {}) as Record<string, unknown>;

  const title = validateTitle(b.title, errors);
  const description = validateDescription(b.description, errors);
  const genre = validateGenre(b.genre, errors);
  const scheduled_at = validateScheduledAt(b.scheduled_at, errors);
  const ticket_price = validateTicketPrice(b.ticket_price, errors);
  const ticket_limit = validateTicketLimit(b.ticket_limit, errors);
  const is_group = validateIsGroup(b.is_group);

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      title: title!,
      description,
      genre: genre!,
      scheduled_at: scheduled_at!,
      ticket_price: ticket_price!,
      ticket_limit,
      is_group,
    },
  };
}

// PATCH validation: every field is optional, but if a key is present
// it must validate. Returns only the keys the caller sent.
export function validateEventPatch(
  body: unknown,
):
  | { ok: true; value: ValidatedEventPatch }
  | { ok: false; errors: EventValidationErrors } {
  const errors: EventValidationErrors = {};
  const b = (body ?? {}) as Record<string, unknown>;
  const out: ValidatedEventPatch = {};

  if ("title" in b) {
    const v = validateTitle(b.title, errors);
    if (v != null) out.title = v;
  }
  if ("description" in b) {
    out.description = validateDescription(b.description, errors);
  }
  if ("genre" in b) {
    const v = validateGenre(b.genre, errors);
    if (v != null) out.genre = v;
  }
  if ("scheduled_at" in b) {
    const v = validateScheduledAt(b.scheduled_at, errors);
    if (v != null) out.scheduled_at = v;
  }
  if ("ticket_price" in b) {
    const v = validateTicketPrice(b.ticket_price, errors);
    if (v != null) out.ticket_price = v;
  }
  if ("ticket_limit" in b) {
    out.ticket_limit = validateTicketLimit(b.ticket_limit, errors);
  }
  if ("is_group" in b) {
    out.is_group = validateIsGroup(b.is_group);
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, value: out };
}

// Helper for route handlers — turn a validation failure into a 400 JSON
// response with a flat `error` string for backwards compat and a
// `fields` object for granular form display.
export function validationErrorResponse(errors: EventValidationErrors) {
  const first = Object.values(errors)[0] ?? "Invalid input";
  return Response.json(
    { error: first, fields: errors },
    { status: 400 },
  );
}
