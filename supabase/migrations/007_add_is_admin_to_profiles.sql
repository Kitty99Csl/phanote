-- 007_add_is_admin_to_profiles.sql
-- Session 16, Sprint F Item 2 — Migration 007 of 2 for admin gate work.
-- Partner: 008_backfill_phantom_tables.sql (housekeeping, ships next).
--
-- WHAT: Adds is_admin BOOLEAN column to profiles. Tower operator
--       surface reads this via user's own session (RLS policy
--       profiles_user_access allows it).
--
-- WHY SPLIT FROM 008: Auth-path migrations deserve minimal change
--       surface. Phantom table backfill is pure housekeeping and
--       should not block admin gate deployment if it hits an
--       edge case.
--
-- RLS CONTEXT (from migration 004):
--   - RLS is enabled on profiles.
--   - Canonical policy profiles_user_access: FOR ALL,
--     USING (auth.uid() = id), WITH CHECK (auth.uid() = id).
--   - No new policy needed — users reading their own is_admin
--     is already permitted by this policy.
--
-- TRIGGER CONTEXT (from migration 001):
--   - handle_new_user trigger inserts new profile rows.
--   - INSERT statement uses explicit column list without is_admin.
--   - DEFAULT FALSE ensures new profiles still insert correctly.
--   - No trigger modification required.
--
-- POST-MIGRATION: Speaker manually sets is_admin = true on own
--       profile row via Supabase SQL editor:
--
--       UPDATE public.profiles
--          SET is_admin = true
--        WHERE id = '<speaker-auth-user-id>';
--
-- Rolls back: ALTER TABLE profiles DROP COLUMN is_admin;

-- Preflight: verify expected state before making changes.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'profiles' AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'profiles table does not have RLS enabled. Expected state after migration 004. Aborting.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_user_access'
  ) THEN
    RAISE EXCEPTION 'profiles_user_access policy not found. Expected state after migration 004. Aborting.';
  END IF;
END $$;

-- Verify handle_new_user trigger exists (closes docs/RISKS.md LOW item).
-- Non-blocking — warn only, don't fail the migration.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    RAISE WARNING 'handle_new_user trigger (on_auth_user_created) not found. New signups may not auto-provision profile rows. Not blocking this migration, but investigate before public launch.';
  END IF;
END $$;

-- Actual schema change.

ALTER TABLE public.profiles
  ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.profiles.is_admin IS
  'Admin flag. Grants access to Tower operator surface (tower.phajot.com). Set to true only for trusted operators. See Migration 007 (Session 16, Sprint F Item 2).';
