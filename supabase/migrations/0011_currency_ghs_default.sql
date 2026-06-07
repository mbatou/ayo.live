-- Sprint: GHS currency fix
-- Money values in tickets.amount_paid are already GHS magnitudes (the
-- charge path in /api/paystack/initiate already sends pesewas with
-- currency:'GHS'). The currency column was lying — defaulting to 'USD'
-- and persisted as 'USD' on every existing ticket. Fix the label.
--
-- RESEED branch: existing rows are seed-only. Any row whose
-- paystack_reference does not start with 'test_seed_' is a real sale
-- and means we picked the wrong branch — flag it and stop.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.tickets
    WHERE paystack_reference IS NOT NULL
      AND paystack_reference NOT LIKE 'test_seed_%'
  ) THEN
    RAISE EXCEPTION 'Found a ticket whose paystack_reference is not a test_seed_ row. Stop and pick CONVERT instead of RESEED.';
  END IF;
END $$;

ALTER TABLE public.tickets
  ALTER COLUMN currency SET DEFAULT 'GHS';

UPDATE public.tickets
  SET currency = 'GHS'
  WHERE currency = 'USD';
