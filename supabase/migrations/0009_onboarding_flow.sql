-- Sprint 3.1 — onboarding flow.
--
-- The handle_new_user trigger from 0002_profiles.sql auto-creates a
-- profiles row on signup with the default role 'fan'. That makes the
-- "if (!profile) -> /onboarding" check in the auth callback impossible
-- to ever satisfy — every new user has a profile and gets routed
-- straight to / as a fan, with no chance to pick artist.
--
-- This migration switches us to "profile created during onboarding":
--
--   1. Drop the auto-profile trigger so signup leaves auth.users only.
--   2. Add an INSERT RLS policy on profiles so the cookie-bound client
--      on the /onboarding page can upsert the user's own row.
--      (RLS already covers SELECT and UPDATE.)
--
-- Existing users who already have a profile keep theirs untouched —
-- they bypass onboarding via the existing-profile branch in /auth/callback.
-- Users created from this point on land on /onboarding to pick a role.
--
-- The handle_new_user() function itself is left in place; harmless and
-- avoids breaking anything that references it.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE POLICY "Users can create own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
