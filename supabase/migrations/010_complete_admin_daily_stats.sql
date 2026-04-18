-- Migration 010 — Complete admin_daily_stats wrapper view
-- (Sprint F, Session 17)
-- Created: 2026-04-20
--
-- Migration 009 §3 was intended to create public.admin_daily_stats
-- as an admin-gated wrapper view over ai_daily_stats matview.
-- During apply, §3 silently errored because a pre-existing view
-- with the same name already existed in production — undocumented
-- drift from direct SQL Editor changes pre-Session 14 (not
-- referenced anywhere in the Phajot codebase; owner postgres;
-- definition aggregated app_events by date with columns
-- date/active_users/total_events/transactions_logged/app_opens).
-- CREATE OR REPLACE VIEW requires matching column signatures, and
-- Migration 009's intended signature was entirely different, so
-- the §3 CREATE failed. §1 (admin policy on ai_call_log) and §2
-- (REVOKE matview grants) applied cleanly because they are
-- independent statements.
--
-- Impact until this migration: Tower Room 3 queries against
-- admin_daily_stats resolved to the drift view, which has no
-- 'day' column — hence "column admin_daily_stats.day does not
-- exist" error in the Room 3 UI.
--
-- This migration:
--   1. DROPS the drift view (unused by Phajot code; grep verified
--      no callers in frontend, worker, Tower, or migrations).
--   2. Recreates admin_daily_stats as the admin-gated wrapper
--      view that Migration 009 §3 originally defined.
--   3. Grants SELECT on the new view to authenticated.
--
-- Scope boundary: this migration corrects Migration 009's
-- incomplete apply ONLY. No other changes. Drift audit for other
-- pre-Session-14 direct-SQL objects is Session 18 backlog.

-- =============================================================
-- 1. Drop the drift view
-- =============================================================
-- The pre-existing admin_daily_stats (app_events aggregation)
-- is unreferenced in Phajot codebase (grep verified Session 17).
-- CASCADE for safety in case anything else is transitively
-- dependent (unlikely given the grep, but cheap defense).

drop view if exists public.admin_daily_stats cascade;

-- =============================================================
-- 2. Recreate admin_daily_stats as Migration 009 §3 intended
-- =============================================================
-- Definer semantics via security_invoker = false (Postgres 15+;
-- production verified 17.6 in Session 17) so the view can read
-- the underlying ai_daily_stats matview even after Migration 009
-- revoked authenticated SELECT on the matview. Inline is_admin
-- check returns empty set for non-admins (not permission error).

create view public.admin_daily_stats
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
   receive empty set. Originally intended in Migration 009 §3
   but that apply silently failed due to pre-existing drift view
   name collision — Migration 010 completes the intent.';

grant select on public.admin_daily_stats to authenticated;

-- =============================================================
-- Postflight verification (run each separately in SQL Editor)
-- =============================================================
-- Semantic identity check — verifies the view is OUR view, not
-- drift. Must return ai_daily_stats reference and is_admin check.
--
--   select definition from pg_views
--     where schemaname='public' and viewname='admin_daily_stats';
--   -- Expected: SELECT ... FROM ai_daily_stats ... WHERE EXISTS
--   --           (... profiles ... is_admin = true)
--
-- Column signature check — verifies the view exposes the matview
-- columns (day, endpoint, provider, etc.), not the drift view's
-- (date, active_users, etc.).
--
--   select column_name from information_schema.columns
--     where table_schema='public' and table_name='admin_daily_stats'
--     order by ordinal_position;
--   -- Expected: day, endpoint, provider, plan_tier, call_count,
--   --           success_count, error_count, tokens_in_total,
--   --           tokens_out_total, cost_usd_total, avg_duration_ms,
--   --           p50_duration_ms, p95_duration_ms
--
-- Grant check — authenticated has SELECT.
--
--   select has_table_privilege('authenticated',
--          'public.admin_daily_stats', 'SELECT');
--   -- Expected: true
--
-- Row count check — confirms view returns data (Speaker's
-- is_admin = true should satisfy inline gate, rows flow through).
--
--   select count(*) from public.admin_daily_stats;
--   -- Expected: > 0 (matches ai_daily_stats count after matview refresh)
