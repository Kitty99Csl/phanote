-- 008_backfill_phantom_tables.sql
-- Session 16, Sprint F Item 2 — Migration 008 of 2 for admin gate work.
-- Partner: 007_add_is_admin_to_profiles.sql (shipped earlier Session 16).
--
-- PURPOSE: Retroactive Rule 19 backfill. These 3 tables were created
--          via direct SQL in Session 14 for observability and admin
--          work, without backing migration files. This migration
--          documents their current production state so future
--          rebuilds from migration files will reproduce the same
--          schema.
--
-- SHAPE VERIFIED 2026-04-19 (Session 16 Phase 3 Part A):
--   - All 3 tables exist with exact columns + types as below
--   - All 3 have RLS enabled
--   - All 3 have one FOR ALL policy each (see Policy Summary below)
--
-- IDEMPOTENCY: All CREATE TABLE statements use IF NOT EXISTS.
--   All CREATE POLICY statements use DROP IF EXISTS + CREATE so
--   re-running this migration against production is safe.
--
-- NO SCHEMA CHANGE: If this migration runs against current
--   production, it produces zero effective changes. Running against
--   a fresh database produces the exact current production state.
--
-- POLICY SUMMARY:
--   admin_logs      — "Only service role" USING (false)
--                     Anon key cannot read/write. Service role only.
--                     (Correct for admin audit log.)
--   user_feedback   — "Users manage own feedback" USING (auth.uid() = user_id)
--                     Users read/write their own feedback rows.
--   user_sessions   — "Users see own sessions" USING (auth.uid() = user_id)
--                     Users read/write their own session rows.
--
-- WITH CHECK NOTE: All 3 policies have WITH CHECK clause absent.
--   For FOR ALL policies, Postgres defaults WITH CHECK to the USING
--   expression, which makes these semantically equivalent to having
--   WITH CHECK explicitly set. Kept as-is to match production
--   exactly (no drift introduced).

-- =========================================================================
-- admin_logs — audit trail for administrative actions
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.admin_logs (
  id            uuid         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id      uuid         NULL,
  action        text         NOT NULL,
  target_type   text         NULL,
  target_id     uuid         NULL,
  details       jsonb        NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz  NULL DEFAULT now()
);

COMMENT ON TABLE public.admin_logs IS
  'Audit trail of admin actions. Write-only from app layer; reads restricted to service role. Each row = one admin action (action text + optional target + optional details jsonb).';

ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Only service role" ON public.admin_logs;
CREATE POLICY "Only service role" ON public.admin_logs
  FOR ALL
  USING (false);

-- =========================================================================
-- user_feedback — in-app feedback submissions + admin replies
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.user_feedback (
  id             uuid         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        uuid         NULL,
  type           text         NULL,
  message        text         NOT NULL,
  rating         integer      NULL,
  status         text         NULL DEFAULT 'open'::text,
  admin_reply    text         NULL,
  created_at     timestamptz  NULL DEFAULT now(),
  resolved_at    timestamptz  NULL
);

COMMENT ON TABLE public.user_feedback IS
  'User-submitted feedback (bug reports, feature requests, ratings). Users manage their own rows. status in {open, triaged, resolved, closed}.';

ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own feedback" ON public.user_feedback;
CREATE POLICY "Users manage own feedback" ON public.user_feedback
  FOR ALL
  USING (auth.uid() = user_id);

-- =========================================================================
-- user_sessions — user login + session metadata for analytics
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.user_sessions (
  id               uuid         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          uuid         NULL,
  phone            text         NULL,
  country_code     text         NULL,
  device_type      text         NULL,
  browser          text         NULL,
  os               text         NULL,
  ip_country       text         NULL,
  ip_city          text         NULL,
  logged_in_at     timestamptz  NULL DEFAULT now(),
  last_active_at   timestamptz  NULL DEFAULT now(),
  logged_out_at    timestamptz  NULL
);

COMMENT ON TABLE public.user_sessions IS
  'Session-level analytics: one row per login event with device/geo metadata. Users read/write their own rows. last_active_at updated by client heartbeat. logged_out_at set on explicit signout.';

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own sessions" ON public.user_sessions;
CREATE POLICY "Users see own sessions" ON public.user_sessions
  FOR ALL
  USING (auth.uid() = user_id);
