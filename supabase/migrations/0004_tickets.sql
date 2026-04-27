-- AYO-012 / Sprint 2 — Tickets

CREATE TABLE public.tickets (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id            uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  fan_id              uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  token               uuid DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  device_fingerprint  text,
  paystack_reference  text UNIQUE,
  stripe_payment_id   text UNIQUE,
  amount_paid         numeric(10,2) NOT NULL,
  currency            text NOT NULL DEFAULT 'USD',
  status              text CHECK (status IN ('pending', 'confirmed', 'refunded')) DEFAULT 'pending',
  used_at             timestamptz,
  created_at          timestamptz DEFAULT now()
);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fans can read own tickets"
  ON public.tickets FOR SELECT
  USING (auth.uid() = fan_id);

CREATE POLICY "Artists can read event tickets"
  ON public.tickets FOR SELECT
  USING (
    auth.uid() IN (
      SELECT artist_id FROM public.events WHERE id = event_id
    )
  );

-- Inserts/updates only via service role (server-side after payment)
