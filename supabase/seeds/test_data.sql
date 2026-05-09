-- ============================================
-- Ayo test seed data
-- ============================================
-- This is NOT a numbered migration on purpose: it depends on
-- specific auth.users rows existing first, which `supabase db push`
-- can't create. Run it manually after seeding the test accounts.
--
-- Step 1 — In Supabase Dashboard → Authentication → Users → Add user,
-- create two accounts with "Confirm user" checked:
--
--   artist@ayo.live   password: AyoTest2026!
--   fan@ayo.live      password: AyoTest2026!
--
-- Step 2 — In SQL editor, run this whole file. It is idempotent:
--   - profiles use upsert
--   - events check the title isn't already there
--   - the fan ticket only inserts if no ticket already links the
--     fan to that event
--
-- Re-running it will leave the test world in the same shape as the
-- first run.
-- ============================================

DO $$
DECLARE
  artist_uid uuid;
  fan_uid    uuid;
  hero_event_id uuid;
BEGIN
  SELECT id INTO artist_uid FROM auth.users WHERE email = 'artist@ayo.live';
  SELECT id INTO fan_uid    FROM auth.users WHERE email = 'fan@ayo.live';

  IF artist_uid IS NULL OR fan_uid IS NULL THEN
    RAISE EXCEPTION 'Create artist@ayo.live and fan@ayo.live in Supabase Auth first, then re-run this seed.';
  END IF;

  -- Profiles (post-0009: no auto-trigger, so we upsert directly)
  INSERT INTO public.profiles (id, role, display_name, location)
  VALUES (artist_uid, 'artist', 'Nkyinkyim Collective', 'Accra, GH')
  ON CONFLICT (id) DO UPDATE SET
    role          = EXCLUDED.role,
    display_name  = EXCLUDED.display_name,
    location      = EXCLUDED.location;

  INSERT INTO public.profiles (id, role, display_name, location)
  VALUES (fan_uid, 'fan', 'Augusta Addy', 'Accra, GH')
  ON CONFLICT (id) DO UPDATE SET
    role          = EXCLUDED.role,
    display_name  = EXCLUDED.display_name,
    location      = EXCLUDED.location;

  -- Hero published event
  INSERT INTO public.events (
    artist_id, title, description, genre,
    scheduled_at, ticket_price, ticket_limit, status, is_group
  )
  SELECT
    artist_uid,
    'Ɔdɔ Ne Asomdwoeɛ',
    'A live highlife concert from Jamestown, Accra. 8 performers, 90 minutes of pure joy.',
    'Highlife',
    NOW() + INTERVAL '13 days',
    10.00, 2000, 'published', true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.events
    WHERE artist_id = artist_uid AND title = 'Ɔdɔ Ne Asomdwoeɛ'
  );

  -- Second published event
  INSERT INTO public.events (
    artist_id, title, description, genre,
    scheduled_at, ticket_price, ticket_limit, status, is_group
  )
  SELECT
    artist_uid,
    'Highlife After Hours',
    'Late night session. Acoustic set. Just the band and you.',
    'Highlife',
    NOW() + INTERVAL '36 days',
    8.00, 1000, 'published', true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.events
    WHERE artist_id = artist_uid AND title = 'Highlife After Hours'
  );

  -- Private draft event
  INSERT INTO public.events (
    artist_id, title, description, genre,
    scheduled_at, ticket_price, ticket_limit, status, is_group
  )
  SELECT
    artist_uid,
    'Rehearsal Session — Members Only',
    'Private rehearsal stream for band members.',
    'Highlife',
    NOW() + INTERVAL '5 days',
    0.00, 50, 'draft', true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.events
    WHERE artist_id = artist_uid AND title = 'Rehearsal Session — Members Only'
  );

  -- Ticket: fan owns 1 confirmed ticket for the hero event
  SELECT id INTO hero_event_id
  FROM public.events
  WHERE artist_id = artist_uid AND title = 'Ɔdɔ Ne Asomdwoeɛ'
  LIMIT 1;

  IF hero_event_id IS NOT NULL THEN
    INSERT INTO public.tickets (
      event_id, fan_id, amount_paid, currency, status, paystack_reference
    )
    SELECT
      hero_event_id, fan_uid, 10.00, 'USD', 'confirmed', 'test_seed_001'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.tickets
      WHERE event_id = hero_event_id AND fan_id = fan_uid
    );
  END IF;
END $$;
