-- AYO-012 / Sprint 2 — Payouts

CREATE TYPE payout_status AS ENUM ('pending', 'processing', 'paid', 'failed');

CREATE TABLE public.payouts (
  id                   uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id            uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  event_id             uuid REFERENCES public.events(id) ON DELETE SET NULL,
  gross_amount         numeric(10,2) NOT NULL,
  platform_fee         numeric(10,2) NOT NULL,
  net_amount           numeric(10,2) NOT NULL,
  status               payout_status NOT NULL DEFAULT 'pending',
  paystack_transfer_id text,
  initiated_at         timestamptz,
  completed_at         timestamptz,
  created_at           timestamptz DEFAULT now()
);

ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artists can read own payouts"
  ON public.payouts FOR SELECT
  USING (auth.uid() = artist_id);
