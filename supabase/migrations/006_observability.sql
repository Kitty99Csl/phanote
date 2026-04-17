-- Migration 006 — Observability floor (Sprint E, Session 14)
-- Created: 2026-04-17
--
-- BACKFILL MIGRATION. The observability schema below was applied
-- directly via Supabase SQL Editor during a prior session (exact
-- provenance unclear — drift discovered Session 14). This file
-- documents the production reality so fresh environments can
-- reproduce it, AND adds 3 check constraints that the original
-- ad-hoc application missed (plan_tier, status, error_class).
--
-- All statements are idempotent (IF NOT EXISTS / DO guards).
-- Running this on current production is a no-op for the existing
-- objects; only the ALTER TABLE ADD CONSTRAINT statements change
-- state.
--
-- Going forward: Rule 19 prohibits direct SQL Editor schema
-- changes without a corresponding migration file. This migration
-- is the corrective backfill that Rule 19 requires for this drift.
--
-- Scope:
--   1. ai_call_log        — one row per AI call from worker
--   2. ai_daily_stats     — nightly-refreshed aggregate matview
--   3. tower_admin_reads  — Rule 17 audit trail (viewer, not writer)
--   4. pg_cron jobs       — 90-day retention + nightly refresh
--   5. Schema drift diagnostic (phantom tables from recon)
--
-- RLS: users see own ai_call_log rows only. Worker writes via
-- service role. tower_admin_reads has no user policy (service only).

-- =============================================================
-- 1. ai_call_log
-- =============================================================

create table if not exists public.ai_call_log (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references public.profiles(id) on delete cascade,
  plan_tier       text not null,
  endpoint        text not null,
  provider        text not null,
  model           text not null,
  status          text not null,
  duration_ms     integer not null,
  tokens_in       integer,
  tokens_out      integer,
  cost_usd        numeric(10, 6),
  error_class     text,
  error_message   text,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

-- Indexes (match production exactly — no change on existing DB)
create index if not exists ai_call_log_user_created_idx
  on public.ai_call_log (user_id, created_at desc);
create index if not exists ai_call_log_endpoint_created_idx
  on public.ai_call_log (endpoint, created_at desc);
create index if not exists ai_call_log_errors_idx
  on public.ai_call_log (created_at desc)
  where status != 'success';
create index if not exists ai_call_log_tier_idx
  on public.ai_call_log (plan_tier, created_at desc);

-- RLS
alter table public.ai_call_log enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ai_call_log'
      and policyname = 'users see own ai calls'
  ) then
    create policy "users see own ai calls"
      on public.ai_call_log
      for select
      using (auth.uid() = user_id);
  end if;
end $$;

comment on table public.ai_call_log is
  'Every AI call from the worker logs one row. Powers Tower OCR Reliability Room (Sprint I), Osiris quality monitoring, Sentinel error feed. 90-day retention via pg_cron.';

-- =============================================================
-- 1b. NEW — Check constraints (the actual state change this migration makes)
-- =============================================================

-- plan_tier enumeration (free / trial / pro)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.ai_call_log'::regclass
      and conname = 'ai_call_log_plan_tier_check'
  ) then
    alter table public.ai_call_log
      add constraint ai_call_log_plan_tier_check
      check (plan_tier in ('free', 'trial', 'pro'));
  end if;
end $$;

-- status enumeration (success / error / timeout)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.ai_call_log'::regclass
      and conname = 'ai_call_log_status_check'
  ) then
    alter table public.ai_call_log
      add constraint ai_call_log_status_check
      check (status in ('success', 'error', 'timeout'));
  end if;
end $$;

-- error_class enumeration (NULL ok on success rows)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.ai_call_log'::regclass
      and conname = 'ai_call_log_error_class_check'
  ) then
    alter table public.ai_call_log
      add constraint ai_call_log_error_class_check
      check (error_class is null or error_class in (
        'rate_limit', 'timeout', 'parse_fail',
        'provider_4xx', 'provider_5xx', 'network', 'other'
      ));
  end if;
end $$;

-- =============================================================
-- 2. ai_daily_stats (materialized view)
-- =============================================================

create materialized view if not exists public.ai_daily_stats as
select
  date_trunc('day', created_at)::date            as day,
  endpoint,
  provider,
  plan_tier,
  count(*)                                        as call_count,
  count(*) filter (where status = 'success')      as success_count,
  count(*) filter (where status != 'success')     as error_count,
  sum(tokens_in)                                  as tokens_in_total,
  sum(tokens_out)                                 as tokens_out_total,
  sum(cost_usd)                                   as cost_usd_total,
  avg(duration_ms)::integer                       as avg_duration_ms,
  percentile_cont(0.50) within group (order by duration_ms)::integer as p50_duration_ms,
  percentile_cont(0.95) within group (order by duration_ms)::integer as p95_duration_ms
from public.ai_call_log
group by 1, 2, 3, 4
with no data;

-- Required for concurrent refresh
create unique index if not exists ai_daily_stats_pk
  on public.ai_daily_stats (day, endpoint, provider, plan_tier);

comment on materialized view public.ai_daily_stats is
  'Nightly aggregate of ai_call_log for Tower reads. Refreshes 02:00 UTC via pg_cron ai_daily_stats_refresh job.';

-- =============================================================
-- 3. tower_admin_reads (Rule 17 audit)
-- =============================================================

create table if not exists public.tower_admin_reads (
  id            uuid primary key default gen_random_uuid(),
  admin_user_id uuid references public.profiles(id) on delete set null,
  table_name    text not null,
  row_count     integer,
  query_hash    text,
  accessed_at   timestamptz not null default now()
);

create index if not exists tower_admin_reads_accessed_idx
  on public.tower_admin_reads (accessed_at desc);
create index if not exists tower_admin_reads_admin_idx
  on public.tower_admin_reads (admin_user_id, accessed_at desc);

alter table public.tower_admin_reads enable row level security;

-- No user policies. Service role only.

comment on table public.tower_admin_reads is
  'Rule 17 audit trail: Tower is a viewer, not a writer. Service role writes admin-read events here. No user policy.';

-- =============================================================
-- 4. pg_cron jobs (retention + refresh)
-- =============================================================

-- Ensure extension
create extension if not exists pg_cron with schema extensions;

-- 4a. 90-day retention on ai_call_log
do $$
begin
  if not exists (
    select 1 from cron.job where jobname = 'ai_call_log_retention'
  ) then
    perform cron.schedule(
      'ai_call_log_retention',
      '0 3 * * *',
      $cron$
        delete from public.ai_call_log
        where created_at < now() - interval '90 days';
      $cron$
    );
  end if;
end $$;

-- 4b. Nightly matview refresh
do $$
begin
  if not exists (
    select 1 from cron.job where jobname = 'ai_daily_stats_refresh'
  ) then
    perform cron.schedule(
      'ai_daily_stats_refresh',
      '0 2 * * *',
      $cron$
        refresh materialized view concurrently public.ai_daily_stats;
      $cron$
    );
  end if;
end $$;

-- =============================================================
-- 5. Schema drift diagnostic (informational)
-- =============================================================

-- Phantom tables flagged during Session 14 recon: user_sessions,
-- user_feedback, admin_logs appear in CLAUDE.md but have no
-- migration files. This block reports whether they exist in the
-- live DB without blocking the migration. Output via RAISE NOTICE
-- is visible in Supabase SQL Editor + wrangler logs.

do $$
declare
  drift_report text := '';
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'user_sessions'
  ) then
    drift_report := drift_report || 'DRIFT: user_sessions exists (no migration); ';
  end if;
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'user_feedback'
  ) then
    drift_report := drift_report || 'DRIFT: user_feedback exists (no migration); ';
  end if;
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'admin_logs'
  ) then
    drift_report := drift_report || 'DRIFT: admin_logs exists (no migration); ';
  end if;
  if drift_report != '' then
    raise notice '%', drift_report;
  else
    raise notice 'Schema drift check: clean (no phantom tables)';
  end if;
end $$;

-- =============================================================
-- End of migration 006
-- =============================================================
