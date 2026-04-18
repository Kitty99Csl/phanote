-- Migration 009 — Tower admin read paths (Sprint F, Session 17)
-- Created: 2026-04-20
--
-- Adds minimal admin read access for Tower rooms 2 + 3:
--   1. ai_call_log: additive "admins see all" policy (OR-combined
--      with existing "users see own ai calls")
--   2. ai_daily_stats: hardens pre-existing matview leak
--      (authenticated had SELECT with RLS disabled) and creates
--      admin-only wrapper view admin_daily_stats.
--
-- Scope boundary per docs/session-17/DECISIONS.md Q1:
-- MINIMAL admin read path only. No audit tables, no invitation
-- flow, no broader admin infrastructure.
--
-- Pre-existing finding (logged RISKS.md): ai_daily_stats matview
-- was readable by all authenticated users prior to this migration.
-- This migration closes that leak.
--
-- All statements idempotent (IF NOT EXISTS / DO guards / drop-
-- then-create for the view).

-- =============================================================
-- 1. ai_call_log — additive admin-read policy
-- =============================================================

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'ai_call_log'
      and policyname = 'admins see all ai calls'
  ) then
    create policy "admins see all ai calls"
      on public.ai_call_log
      for select
      using (
        exists (
          select 1 from public.profiles
          where id = auth.uid() and is_admin = true
        )
      );
  end if;
end $$;

-- =============================================================
-- 2. ai_daily_stats — close pre-existing leak
-- =============================================================
-- Matview RLS is not supported in stock Postgres. Hardening
-- happens at the grant layer + via a SECURITY DEFINER wrapper
-- view (admin_daily_stats) that Tower queries instead of the
-- raw matview.

revoke select on public.ai_daily_stats from authenticated;
revoke select on public.ai_daily_stats from anon;

-- =============================================================
-- 3. admin_daily_stats — admin-only wrapper view
-- =============================================================
-- Tower queries this view, not the underlying matview. The
-- is_admin check is inline so non-admins get an empty result set
-- (not a permission error — cleaner UX if admin flag is revoked).

create or replace view public.admin_daily_stats
with (security_invoker = false) as
select *
from public.ai_daily_stats
where exists (
  select 1 from public.profiles
  where id = auth.uid() and is_admin = true
);

comment on view public.admin_daily_stats is
  'Admin-only wrapper over ai_daily_stats matview. Returns rows
   only if auth.uid() has profiles.is_admin=true. Non-admins
   receive empty set. Added Session 17 to close pre-existing
   matview leak (authenticated could SELECT ai_daily_stats
   directly before this migration).';

grant select on public.admin_daily_stats to authenticated;

-- =============================================================
-- Preflight / postflight verification (for SQL Editor paste)
-- =============================================================
-- After applying, verify:
--
-- -- ai_call_log has both policies:
-- select policyname from pg_policies
--   where schemaname='public' and tablename='ai_call_log';
-- -- Expected: "users see own ai calls", "admins see all ai calls"
--
-- -- ai_daily_stats is no longer readable by authenticated:
-- select has_table_privilege('authenticated',
--        'public.ai_daily_stats', 'SELECT');
-- -- Expected: false
--
-- -- admin_daily_stats exists and is readable by authenticated:
-- select has_table_privilege('authenticated',
--        'public.admin_daily_stats', 'SELECT');
-- -- Expected: true
