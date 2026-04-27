-- AYO-012 / Sprint 2 — Sessions (stream viewer tracking)

CREATE TABLE public.sessions (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id   uuid REFERENCES public.tickets(id) ON DELETE CASCADE NOT NULL,
  ip_hash     text,
  user_agent  text,
  last_seen   timestamptz DEFAULT now(),
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
-- Sessions managed server-side only — no public policies
