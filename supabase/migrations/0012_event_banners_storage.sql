-- Sprint: Event creation v2 — banner pipeline
-- events.cover_url already exists (0003) and is nullable; the API
-- writes a public URL into it after upload + processing. No column
-- change here.
--
-- This migration just provisions the storage bucket + RLS so the
-- upload endpoint can reliably write to event-banners/{artist_id}/...
-- and other artists can't sneak into someone else's folder via the
-- raw storage API.

-- 1. Bucket — public-read so EventCard / HeroSection can <img src=...>
--    directly. Writes are restricted to the path owner by the policies
--    below.
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-banners', 'event-banners', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Per-artist write gates. The path layout is
--    {artist_id}/{event_id}.webp — first folder segment is the artist
--    UUID. storage.foldername(name) splits on '/' so [1] is the artist
--    segment.
--
--    The upload endpoint uses the service client (RLS-bypass) and
--    enforces ownership via requireEventOwner; these policies are
--    defence-in-depth for direct storage API access.

DROP POLICY IF EXISTS "Artists upload own banners" ON storage.objects;
CREATE POLICY "Artists upload own banners"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'event-banners'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Artists update own banners" ON storage.objects;
CREATE POLICY "Artists update own banners"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'event-banners'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Artists delete own banners" ON storage.objects;
CREATE POLICY "Artists delete own banners"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'event-banners'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
