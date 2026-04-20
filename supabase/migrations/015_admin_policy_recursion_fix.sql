-- =============================================================================
-- Migration 015: Admin policy recursion fix
-- =============================================================================
-- Sprint I, Session 21 (2026-04-20)
--
-- Fixes a critical bug introduced in Migration 014: the inline EXISTS
-- subquery in admin-read policies caused infinite recursion once any
-- admin policy was applied ON profiles itself. Specifically:
--
--   CREATE POLICY "admins see all profiles"
--     ON public.profiles FOR SELECT
--     USING (EXISTS (SELECT 1 FROM public.profiles p
--                    WHERE p.id = auth.uid() AND p.is_admin = true));
--
-- When a client queries profiles, PostgreSQL evaluates this policy's
-- USING clause. The subquery re-accesses profiles, which re-applies
-- the same policy, ad infinitum. Error code: 42P17.
--
-- Transitive impact: the `transactions`, `app_events`, and
-- `user_recovery_state` admin policies from Migration 014 also
-- EXISTS-subquery into profiles, so they inherited the recursion
-- through the profiles policy. ai_call_log's admin policy
-- (Migration 009 §1) was transitively broken during the M014→M015
-- window for the same reason — not fixed here because, once the
-- profiles policy is de-recursed in this migration, its own inline
-- EXISTS subquery on profiles no longer explodes. ai_call_log can
-- be migrated to public.is_admin() later for stylistic consistency
-- but is not broken post-Migration-015.
--
-- Migration 009 §1 did not hit the bug when it shipped because
-- profiles carried no admin-read policy at the time. Migration 014
-- was the first to place an admin-read pattern ON profiles itself,
-- exposing the antipattern.
--
-- Discovery: Session 21 adversarial test of Migration 014.
--   Probe (a) — INSERT rejection — passed (RLS enforced before SELECT
--     planning, so recursion never evaluated).
--   Probes (b) + (c) — SELECT from user_recovery_state under User B
--     session — failed with 42P17. The admin-see-all-recovery policy's
--     EXISTS subquery on profiles triggered profiles' own recursing
--     admin policy.
--
-- Fix: replace the inline EXISTS subquery with a SECURITY DEFINER
-- helper function public.is_admin(). SECURITY DEFINER means the
-- function executes as its owner (postgres), bypassing RLS on its
-- internal read of profiles. The policy's USING clause references
-- only the returned boolean — no nested SELECT on an RLS-gated table.
--
-- Scope boundary — this migration ONLY fixes the 4 Migration 014
-- admin policies + introduces is_admin(). Does NOT touch:
--   - Migration 009 §1 (ai_call_log "admins see all ai calls") — not
--     itself self-referential, unbroken post-015. Future consistency
--     cleanup is backlog, not this migration.
--   - Migrations 009 §3 / 010 admin_daily_stats view — not a policy,
--     uses its own EXISTS expression inside the view definition.
--     Works via the security_invoker=false wrapper idiom; not
--     affected by this bug class.
--
-- Application protocol: apply Migration 015 immediately after 014.
-- Do NOT commit Migration 014 to git without 015 bundled — production
-- is in a partially-broken state (all 4 admin reads fail with 42P17)
-- between the two applies. Session 21 plan: commit 014 + 015 as a
-- single "admin read paths" unit so git history shows the correct
-- pattern from the start.
--
-- Apply: Select-All in Supabase SQL Editor, then Run.
-- =============================================================================


-- =============================================================================
-- SECTION 1 — public.is_admin() SECURITY DEFINER helper
-- =============================================================================
-- SECURITY DEFINER: function executes as its owner (postgres), so the
--   internal SELECT from profiles bypasses RLS. The function can be
--   safely called from an RLS USING clause on profiles itself without
--   recursing.
-- STABLE: the result is consistent within a single statement, so the
--   query planner can inline/cache and avoid redundant evaluations.
-- SET search_path = public: SECURITY DEFINER best practice — prevents
--   a malicious caller from placing a shadowing "profiles" table in
--   their session search_path to hijack the internal lookup.

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

comment on function public.is_admin() is
  'Returns true iff the caller (auth.uid()) has profiles.is_admin=true.
   SECURITY DEFINER + STABLE + fixed search_path. Created Session 21
   Migration 015 to break the infinite-recursion loop in Migration 014
   admin-read policies on profiles and the tables that subquery it.
   Callable from any RLS USING clause without triggering recursion.';

-- Lock down execute: by default CREATE FUNCTION grants EXECUTE to
-- PUBLIC. Revoke that and grant only to authenticated. anon never
-- has is_admin=true (no profiles row for auth.uid() IS NULL), but
-- principle-of-least-privilege: unauthenticated sessions shouldn't
-- be able to call the function at all.
revoke execute on function public.is_admin() from public;
grant  execute on function public.is_admin() to authenticated;


-- =============================================================================
-- SECTION 2 — Replace the 4 Migration 014 admin-read policies
-- =============================================================================
-- Drop the broken inline-EXISTS versions and recreate them with
-- public.is_admin() in the USING clause. DROP IF EXISTS is idempotent,
-- so re-running this migration is safe.

-- 2a. profiles
drop policy if exists "admins see all profiles" on public.profiles;
create policy "admins see all profiles"
  on public.profiles
  for select
  using (public.is_admin());

-- 2b. transactions
drop policy if exists "admins see all transactions" on public.transactions;
create policy "admins see all transactions"
  on public.transactions
  for select
  using (public.is_admin());

-- 2c. app_events
drop policy if exists "admins see all app events" on public.app_events;
create policy "admins see all app events"
  on public.app_events
  for select
  using (public.is_admin());

-- 2d. user_recovery_state
drop policy if exists "admins read all recovery" on public.user_recovery_state;
create policy "admins read all recovery"
  on public.user_recovery_state
  for select
  using (public.is_admin());


-- =============================================================================
-- POSTFLIGHT VERIFICATION (run each block separately in SQL Editor)
-- =============================================================================
/*

-- 1. is_admin() function exists with correct attributes
select
  proname,
  prosecdef      as security_definer,      -- t
  provolatile    as volatility,            -- 's' = STABLE
  proconfig,                               -- should include search_path=public
  pg_get_function_result(oid) as returns   -- boolean
from pg_proc
where proname = 'is_admin'
  and pronamespace = 'public'::regnamespace;
-- Expected: 1 row — is_admin | t | s | {search_path=public} | boolean

-- 2. is_admin() execute grants
select grantee, privilege_type
from information_schema.role_routine_grants
where routine_schema = 'public' and routine_name = 'is_admin'
order by grantee;
-- Expected: authenticated has EXECUTE; owner (postgres) has EXECUTE.
--           NO row for PUBLIC, anon (they were revoked / never granted).

-- 3. All 4 policies now reference is_admin() instead of EXISTS
select tablename, policyname, qual
from pg_policies
where schemaname = 'public'
  and policyname in (
    'admins see all profiles',
    'admins see all transactions',
    'admins see all app events',
    'admins read all recovery'
  )
order by tablename, policyname;
-- Expected: 4 rows. Each `qual` column reads approximately `is_admin()`
--           (no EXISTS subquery, no SELECT keyword in the expression).

-- 4. ADVERSARIAL RE-RUN — User B (5e3629a1-aa60-4c25-a013-11bf40b8e6b9)
--    All probes must succeed without 42P17 recursion error.

begin;
  set local role = 'authenticated';
  set local request.jwt.claims =
    '{"sub":"5e3629a1-aa60-4c25-a013-11bf40b8e6b9","role":"authenticated"}';

  -- (b) User B reads other users' recovery state — blocked
  select count(*) from public.user_recovery_state
  where user_id <> '5e3629a1-aa60-4c25-a013-11bf40b8e6b9';
  -- EXPECTED: 0 (user-own policy filters; is_admin()=false so admin
  --             branch OR-contributes nothing)

  -- (c) User B reads own recovery state — allowed
  select count(*) from public.user_recovery_state
  where user_id = '5e3629a1-aa60-4c25-a013-11bf40b8e6b9';
  -- EXPECTED: 0 or 1 (whichever reflects current row state)

  -- (d) User B reads own profile — allowed via profiles_user_access
  select count(*) from public.profiles where id = auth.uid();
  -- EXPECTED: 1

  -- (e) User B reads OTHER users' profiles — blocked
  select count(*) from public.profiles
  where id <> '5e3629a1-aa60-4c25-a013-11bf40b8e6b9';
  -- EXPECTED: 0 (user-own policy filters; is_admin()=false)

  -- (f) User B reads transactions — only own, never others
  select count(*) from public.transactions
  where user_id <> '5e3629a1-aa60-4c25-a013-11bf40b8e6b9';
  -- EXPECTED: 0
rollback;

-- 5. ADMIN SANITY — Speaker can read across tables.
--    Replace <speaker-uuid> with your own user id before running.
--    This confirms the admin OR-branch actually contributes rows
--    (not silently empty due to a typo in the policy).
--
-- begin;
--   set local role = 'authenticated';
--   set local request.jwt.claims =
--     '{"sub":"<speaker-uuid>","role":"authenticated"}';
--
--   select public.is_admin();
--   -- EXPECTED: true
--
--   select count(*) from public.profiles;
--   -- EXPECTED: total user count (admin sees all)
--
--   select count(*) from public.user_recovery_state;
--   -- EXPECTED: N (any rows that exist)
--
--   select count(*) from public.transactions;
--   -- EXPECTED: all transactions across all users
-- rollback;

-- 6. Recursion regression guard — the bug must not come back
--    if anyone re-runs Migration 014 naively. This is the same
--    query that exploded before Migration 015.
select count(*) from public.user_recovery_state;
-- EXPECTED: returns a count (possibly 0). NO 42P17 error.

*/
