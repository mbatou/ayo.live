-- AYO-012 / Sprint 2 — Profiles
-- Run in Supabase SQL editor for project ayo-production

CREATE TYPE user_role AS ENUM ('artist', 'fan', 'admin');

CREATE TABLE public.profiles (
  id              uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role            user_role NOT NULL DEFAULT 'fan',
  display_name    text,
  bio             text,
  avatar_url      text,
  location        text,
  paystack_id     text,
  stripe_id       text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are publicly readable"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, role, display_name)
  VALUES (
    new.id,
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'fan'),
    COALESCE(new.raw_user_meta_data->>'display_name', new.email)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
