-- AYO-012 / Sprint 2 — Events

CREATE TYPE event_status AS ENUM ('draft', 'published', 'live', 'ended', 'cancelled');

CREATE TABLE public.events (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id       uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title           text NOT NULL,
  description     text,
  genre           text,
  scheduled_at    timestamptz NOT NULL,
  ticket_price    numeric(10,2) NOT NULL DEFAULT 0,
  ticket_limit    integer,
  status          event_status NOT NULL DEFAULT 'draft',
  cover_url       text,
  mux_stream_id   text,
  mux_stream_key  text,
  mux_playback_id text,
  is_group        boolean DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published events are public"
  ON public.events FOR SELECT
  USING (status IN ('published', 'live', 'ended'));

CREATE POLICY "Artists can read own events"
  ON public.events FOR SELECT
  USING (auth.uid() = artist_id);

CREATE POLICY "Artists can create events"
  ON public.events FOR INSERT
  WITH CHECK (auth.uid() = artist_id);

CREATE POLICY "Artists can update own events"
  ON public.events FOR UPDATE
  USING (auth.uid() = artist_id);
