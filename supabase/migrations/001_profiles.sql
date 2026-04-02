-- 001: Create profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name text,
  language text NOT NULL DEFAULT 'en' CHECK (language IN ('lo', 'th', 'en')),
  base_currency text NOT NULL DEFAULT 'LAK' CHECK (base_currency IN ('LAK', 'THB', 'USD')),
  streak_count int NOT NULL DEFAULT 0,
  streak_last_date date,
  level int NOT NULL DEFAULT 1,
  xp int NOT NULL DEFAULT 0,
  is_pro boolean NOT NULL DEFAULT false,
  pro_expires_at timestamptz,
  referral_code text UNIQUE,
  referred_by uuid REFERENCES profiles(id),
  budget_start_day int NOT NULL DEFAULT 1 CHECK (budget_start_day BETWEEN 1 AND 28),
  onboarding_complete boolean NOT NULL DEFAULT false,
  line_user_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, referral_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    substr(md5(random()::text), 1, 8)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);
