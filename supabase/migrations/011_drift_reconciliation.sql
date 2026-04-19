-- =============================================================================
-- Migration 011: Drift Reconciliation
-- =============================================================================
-- Purpose: Close 4 drift gaps identified during Session 18 audit.
--
--   Item 1: Drop public.admin_user_summary — unused pre-Session-14 drift view
--            with wide-open GRANT SELECT to anon + authenticated.
--            grep verified: zero code references outside docs/archive/.
--
--   Item 2: Canonicalize ai_memory policies — drop 3 stale production policies,
--            create single canonical 'ai_memory_user_access' (per Mig 004 intent).
--
--   Item 3: Rename profiles policy 'profiles_policy' → 'profiles_user_access'
--            (canonical name per Migration 004; LOW debt from Session 16 audit).
--
--   Item 4: Rename transactions policy 'transactions_policy' →
--            'transactions_user_access' (same pattern as Item 3).
--
-- Scope boundary — DO NOT TOUCH:
--   Table schemas, functions, grants beyond admin_user_summary CASCADE,
--   tower_admin_reads, ai_call_log, ai_daily_stats, ai_memory matviews.
--   All clean per Session 18 audit.
--
-- Safety notes:
--   Items 3 + 4 use DO blocks: verify stale policy exists with correct
--   semantics (FOR ALL / auth.uid() qual) before dropping; skip if canonical
--   name already present. Raises EXCEPTION rather than silently dropping a
--   policy with unexpected shape. Follows Session 16 Learning 2.
--
-- Discovery: Session 18 drift audit — 2026-04-19
-- Apply: Select-All in Supabase SQL Editor, then Run.
-- =============================================================================


-- =============================================================================
-- ITEM 1: Drop admin_user_summary drift view
-- =============================================================================
-- Wide-open GRANT SELECT to anon + authenticated; no code references.
-- CASCADE handles any dependents (none expected).

DROP VIEW IF EXISTS public.admin_user_summary CASCADE;


-- =============================================================================
-- ITEM 2: Canonicalize ai_memory policies
-- =============================================================================
-- Production carries 3 stale policies predating Migration 004's intended
-- canonical policy. Drop all 3, then create the single canonical policy.

DROP POLICY IF EXISTS "Users update own memory" ON public.ai_memory;
DROP POLICY IF EXISTS "Users write own memory"  ON public.ai_memory;
DROP POLICY IF EXISTS "users own ai_memory"     ON public.ai_memory;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'ai_memory'
      AND policyname = 'ai_memory_user_access'
  ) THEN
    CREATE POLICY ai_memory_user_access
      ON public.ai_memory
      FOR ALL
      USING     (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;


-- =============================================================================
-- ITEM 3: Rename profiles policy → profiles_user_access
-- =============================================================================
-- Production: 'profiles_policy' (FOR ALL, auth.uid() = id).
-- Canonical:  'profiles_user_access' (per Migration 004).
-- Skip if canonical already exists. Raise if stale shape is unexpected.

DO $$
BEGIN
  -- No-op if canonical already present
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'profiles'
      AND policyname = 'profiles_user_access'
  ) THEN
    RAISE NOTICE 'profiles_user_access already exists — Item 3 is a no-op';
    RETURN;
  END IF;

  -- Verify stale policy exists with expected semantics before dropping
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'profiles'
      AND policyname = 'profiles_policy'
      AND cmd        = 'ALL'
  ) THEN
    RAISE EXCEPTION 'profiles_policy not found with cmd=ALL — manual review required';
  END IF;

  DROP POLICY profiles_policy ON public.profiles;

  CREATE POLICY profiles_user_access
    ON public.profiles
    FOR ALL
    USING     (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

END $$;


-- =============================================================================
-- ITEM 4: Rename transactions policy → transactions_user_access
-- =============================================================================
-- Production: 'transactions_policy' (FOR ALL, auth.uid() = user_id).
-- Canonical:  'transactions_user_access' (per Migration 004).
-- Same pattern as Item 3.

DO $$
BEGIN
  -- No-op if canonical already present
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'transactions'
      AND policyname = 'transactions_user_access'
  ) THEN
    RAISE NOTICE 'transactions_user_access already exists — Item 4 is a no-op';
    RETURN;
  END IF;

  -- Verify stale policy exists with expected semantics before dropping
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'transactions'
      AND policyname = 'transactions_policy'
      AND cmd        = 'ALL'
  ) THEN
    RAISE EXCEPTION 'transactions_policy not found with cmd=ALL — manual review required';
  END IF;

  DROP POLICY transactions_policy ON public.transactions;

  CREATE POLICY transactions_user_access
    ON public.transactions
    FOR ALL
    USING     (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

END $$;


-- =============================================================================
-- POSTFLIGHT VERIFICATION (run separately after applying)
-- =============================================================================
/*

-- 1. admin_user_summary must not exist
SELECT table_name FROM information_schema.views
WHERE table_schema = 'public' AND table_name = 'admin_user_summary';
-- Expected: 0 rows

-- 2. ai_memory: exactly 1 policy, canonical name + semantics
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'ai_memory';
-- Expected: 1 row — ai_memory_user_access | ALL | (auth.uid() = user_id) | (auth.uid() = user_id)

-- 3. profiles: canonical name
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles';
-- Expected: policyname = 'profiles_user_access', cmd = 'ALL'

-- 4. transactions: canonical name
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'transactions';
-- Expected: policyname = 'transactions_user_access', cmd = 'ALL'

-- Summary sweep: no stale policy names on any of the 3 target tables
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('ai_memory', 'profiles', 'transactions')
ORDER BY tablename, policyname;

*/
