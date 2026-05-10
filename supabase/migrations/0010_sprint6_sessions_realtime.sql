-- Sprint 6: Mux + watch flow
-- 1. sessions.ticket_id needs to be unique so /api/watch/token can upsert
-- 2. events needs to be in supabase_realtime publication so the WatchClient
--    can subscribe to status changes

ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_ticket_id_unique UNIQUE (ticket_id);

-- ALTER PUBLICATION is idempotent enough for our purposes; if events is
-- already published this errors and you can ignore it.
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
