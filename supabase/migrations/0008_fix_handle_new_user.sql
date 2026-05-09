-- Hotfix for "Database error saving new user" on /auth/signin.
--
-- Two problems with the original handle_new_user() in 0002_profiles.sql:
--
--   1. SECURITY DEFINER without an explicit search_path. When the trigger
--      fires from the auth context the resolver can fail to find the
--      user_role enum or the public.profiles table, and the whole signup
--      is rolled back.
--
--   2. The role cast was unguarded — a stray `raw_user_meta_data->>'role'`
--      value that isn't 'artist' / 'fan' / 'admin' raises invalid_text_
--      representation and tanks signup the same way.
--
-- This idempotently replaces the function with a hardened version. Run it
-- once in the Supabase SQL editor.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_role public.user_role;
BEGIN
  BEGIN
    resolved_role := COALESCE(
      (NEW.raw_user_meta_data->>'role')::public.user_role,
      'fan'::public.user_role
    );
  EXCEPTION WHEN OTHERS THEN
    resolved_role := 'fan'::public.user_role;
  END;

  INSERT INTO public.profiles (id, role, display_name)
  VALUES (
    NEW.id,
    resolved_role,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
  );

  RETURN NEW;
END;
$$;
