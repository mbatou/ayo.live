-- AYO-005 / Stage 0 — Waitlist
-- Already applied to ayo-production.

CREATE TABLE IF NOT EXISTS public.waitlist (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email       text NOT NULL,
  role        text CHECK (role IN ('artist', 'fan')) NOT NULL,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert" ON public.waitlist
  FOR INSERT TO anon
  WITH CHECK (true);
