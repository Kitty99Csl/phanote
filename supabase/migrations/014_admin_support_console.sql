-- =============================================================================
-- Migration 014: Admin Support Console — Recovery State + Admin Read Paths
-- =============================================================================
-- Sprint I, Session 21 (2026-04-20)
--
-- Auth-gap resolution: Option B+placeholder (Session 21 DECISIONS)
--   - PIN recovery fully wired end-to-end this session
--   - Password recovery schema ready + admin approval endpoint built
--     (Session 22/23 will add user-side request + complete flow)
--
-- This migration creates:
--
--   1. public.user_recovery_state — per-user recovery workflow state.
--      PK = user_id (1:1 with profiles). Holds requested/approved/
--      required/expires timestamps for both password and PIN resets,
--      plus approved_by + last_action_metadata for audit joins.
--
--   2. public.tower_admin_actions — audit log for admin approvals
--      and privacy-sensitive admin reads. Distinct from
--      tower_admin_reads (Migration 006) which logs simple reads.
--      action_type is CHECK-constrained to prevent scope creep
--      (no force_relogin — deferred per Session 21 scope lock).
--
--   3. Additive "admins see all" SELECT policies on profiles,
--      transactions, and app_events. OR-combined with the existing
--      *_user_access FOR ALL policies. Pattern established in
--      Migration 009 §1 (ai_call_log).
--
-- Architecture decision (documented per Session 21 plan):
--
--   user_recovery_state carries SELECT policies only (user reads own,
--   admin reads all). NO user-side INSERT/UPDATE policy. All writes
--   go through workers/phanote-api-worker.js using
--   SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS entirely. This is
--   Rule-17-consistent (Tower = viewer, worker = writer) and avoids
--   the awkwardness of column-level restrictions in RLS or a
--   SECURITY DEFINER function wrapper. If a malicious client
--   attempts a direct Supabase INSERT to approve their own reset,
--   RLS rejects it because no INSERT policy matches.
--
-- Rollback (emergency only — paste into SQL Editor):
--
--   DROP TABLE IF EXISTS public.user_recovery_state CASCADE;
--   DROP TABLE IF EXISTS public.tower_admin_actions CASCADE;
--   DROP POLICY IF EXISTS "admins see all profiles"     ON public.profiles;
--   DROP POLICY IF EXISTS "admins see all transactions" ON public.transactions;
--   DROP POLICY IF EXISTS "admins see all app events"   ON public.app_events;
--   DROP FUNCTION IF EXISTS public.set_user_recovery_state_updated_at();
--
-- Apply: Select-All in Supabase SQL Editor, then Run
--        (Rule 19 + Session 17 lesson — partial apply is silent).
-- =============================================================================


-- =============================================================================
-- SECTION 1 — user_recovery_state
-- =============================================================================

create table if not exists public.user_recovery_state (
  user_id uuid primary key references public.profiles(id) on delete cascade,

  -- Password reset workflow
  -- (schema ready this session; user-side request/complete deferred
  --  to Session 22/23. Admin approval endpoint ships Session 21.)
  password_reset_requested_at timestamptz,
  password_reset_approved_at  timestamptz,
  password_reset_required     boolean not null default false,
  password_reset_expires_at   timestamptz,

  -- PIN reset workflow (fully wired Session 21)
  pin_reset_requested_at timestamptz,
  pin_reset_approved_at  timestamptz,
  pin_reset_required     boolean not null default false,
  pin_reset_expires_at   timestamptz,

  -- Audit
  approved_by uuid references public.profiles(id) on delete set null,
  last_action_metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.user_recovery_state is
  'Per-user recovery workflow state. PK=user_id (1:1 with profiles).
   Admin approves a reset → worker flips *_required=true + expires_at.
   User logs in → worker /recovery/status returns state → app routes
   to <SetNewPin> (or <SetNewPassword> in Session 22/23). All writes
   via service-role only — no user INSERT/UPDATE policy.';

-- Auto-maintain updated_at on any UPDATE
create or replace function public.set_user_recovery_state_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_user_recovery_state_updated_at
  on public.user_recovery_state;

create trigger trg_user_recovery_state_updated_at
  before update on public.user_recovery_state
  for each row execute function public.set_user_recovery_state_updated_at();

-- Partial index — "pending requests queue" for Tower Room 6 operator
-- workflow (Session 22). Matches rows where the user has an unapproved
-- request on either flow. Ordered by updated_at desc so the most
-- recent pending requests surface first. Cheap because only pending
-- rows are indexed — cleared rows drop out.
create index if not exists user_recovery_state_pending_idx
  on public.user_recovery_state (updated_at desc)
  where (pin_reset_requested_at is not null and pin_reset_approved_at is null)
     or (password_reset_requested_at is not null and password_reset_approved_at is null);

-- RLS
alter table public.user_recovery_state enable row level security;

-- Users can read their own recovery state
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'user_recovery_state'
      and policyname = 'users read own recovery state'
  ) then
    create policy "users read own recovery state"
      on public.user_recovery_state
      for select
      using (auth.uid() = user_id);
  end if;
end $$;

-- Admins can read all recovery states
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'user_recovery_state'
      and policyname = 'admins read all recovery'
  ) then
    create policy "admins read all recovery"
      on public.user_recovery_state
      for select
      using (
        exists (
          select 1 from public.profiles
          where id = auth.uid() and is_admin = true
        )
      );
  end if;
end $$;

-- Deliberately NO user-side INSERT/UPDATE policy. See header comment.


-- =============================================================================
-- SECTION 2 — tower_admin_actions (audit log)
-- =============================================================================

create table if not exists public.tower_admin_actions (
  id             uuid primary key default gen_random_uuid(),
  admin_user_id  uuid references public.profiles(id) on delete set null,
  target_user_id uuid references public.profiles(id) on delete set null,
  action_type    text not null
    check (action_type in (
      'approve_password_reset',
      'approve_pin_reset',
      'view_transactions'
    )),
  result         text not null
    check (result in ('success', 'failed')),
  error_message  text,
  metadata       jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);

create index if not exists tower_admin_actions_admin_idx
  on public.tower_admin_actions (admin_user_id, created_at desc);
create index if not exists tower_admin_actions_target_idx
  on public.tower_admin_actions (target_user_id, created_at desc);
create index if not exists tower_admin_actions_type_idx
  on public.tower_admin_actions (action_type, created_at desc);

alter table public.tower_admin_actions enable row level security;

-- No user policies. Service role only. (Same pattern as tower_admin_reads.)

comment on table public.tower_admin_actions is
  'Audit log for admin approvals and privacy-sensitive reads.
   Distinct from tower_admin_reads (simple read audit): this table
   also captures result/error for approval actions. Service role
   writes only; no user policy. action_type is CHECK-constrained
   (no force_relogin — deferred from Session 21 scope).';


-- =============================================================================
-- SECTION 3 — Additive admin-read SELECT policies
-- =============================================================================
-- Pattern: OR-combined with existing *_user_access FOR ALL policy.
-- A SELECT passes if EITHER policy's USING evaluates true.
-- Pattern established Migration 009 §1 (ai_call_log).

-- 3a. profiles
--     The inner subquery aliases profiles as `p` to disambiguate
--     from the outer-level `profiles` row being checked.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'profiles'
      and policyname = 'admins see all profiles'
  ) then
    create policy "admins see all profiles"
      on public.profiles
      for select
      using (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.is_admin = true
        )
      );
  end if;
end $$;

-- 3b. transactions
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'transactions'
      and policyname = 'admins see all transactions'
  ) then
    create policy "admins see all transactions"
      on public.transactions
      for select
      using (
        exists (
          select 1 from public.profiles
          where id = auth.uid() and is_admin = true
        )
      );
  end if;
end $$;

-- 3c. app_events
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'app_events'
      and policyname = 'admins see all app events'
  ) then
    create policy "admins see all app events"
      on public.app_events
      for select
      using (
        exists (
          select 1 from public.profiles
          where id = auth.uid() and is_admin = true
        )
      );
  end if;
end $$;


-- =============================================================================
-- POSTFLIGHT VERIFICATION (run each block separately in SQL Editor)
-- =============================================================================
-- Semantic identity checks per Session 17 lesson — confirm policy
-- qual shape, not just existence.
/*

-- 1. user_recovery_state: columns
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema='public' and table_name='user_recovery_state'
order by ordinal_position;
-- Expected: 11 rows — user_id (uuid,NO), password_reset_requested_at,
--   password_reset_approved_at, password_reset_required (bool,NO,false),
--   password_reset_expires_at, pin_reset_requested_at,
--   pin_reset_approved_at, pin_reset_required (bool,NO,false),
--   pin_reset_expires_at, approved_by, last_action_metadata (jsonb,NO),
--   updated_at (timestamptz,NO,now())

-- 2. user_recovery_state: RLS enabled + policies + partial index
select relrowsecurity from pg_class
where relname='user_recovery_state' and relnamespace='public'::regnamespace;
-- Expected: t

select policyname, cmd, qual
from pg_policies
where schemaname='public' and tablename='user_recovery_state'
order by policyname;
-- Expected: 2 rows
--   admins read all recovery     | SELECT | (EXISTS (... profiles ... is_admin = true))
--   users read own recovery state| SELECT | (auth.uid() = user_id)

select indexname, indexdef from pg_indexes
where schemaname='public' and tablename='user_recovery_state'
order by indexname;
-- Expected: 2 rows —
--   user_recovery_state_pending_idx — partial WHERE ((pin... requested IS NOT NULL ...) OR (password... requested IS NOT NULL ...))
--   user_recovery_state_pkey       — PK on user_id

-- 3. user_recovery_state: trigger
select tgname, tgenabled, tgtype
from pg_trigger
where tgname='trg_user_recovery_state_updated_at';
-- Expected: 1 row, tgenabled='O'

-- 4. tower_admin_actions: columns + indexes + RLS
select column_name, data_type
from information_schema.columns
where table_schema='public' and table_name='tower_admin_actions'
order by ordinal_position;
-- Expected: 8 rows — id, admin_user_id, target_user_id, action_type,
--           result, error_message, metadata, created_at

select indexname from pg_indexes
where schemaname='public' and tablename='tower_admin_actions'
order by indexname;
-- Expected: 4 rows — tower_admin_actions_pkey,
--   tower_admin_actions_admin_idx, tower_admin_actions_target_idx,
--   tower_admin_actions_type_idx

select relrowsecurity from pg_class
where relname='tower_admin_actions' and relnamespace='public'::regnamespace;
-- Expected: t

select policyname from pg_policies
where schemaname='public' and tablename='tower_admin_actions';
-- Expected: 0 rows (service-role only)

-- 5. Admin-read policies — SEMANTIC IDENTITY (Session 17 postflight pattern)
select tablename, policyname, cmd, qual
from pg_policies
where schemaname='public' and policyname like 'admins see all%'
order by tablename, policyname;
-- Expected: 3 rows —
--   app_events   | admins see all app events   | SELECT | EXISTS (... profiles ... is_admin = true)
--   profiles     | admins see all profiles     | SELECT | EXISTS (... profiles p ... p.is_admin = true)
--   transactions | admins see all transactions | SELECT | EXISTS (... profiles ... is_admin = true)

-- 6. Sweep: all admin-read policies OR-combine with existing user-own
select tablename, policyname, cmd
from pg_policies
where schemaname='public'
  and tablename in ('profiles','transactions','app_events','user_recovery_state')
order by tablename, policyname;
-- Expected: 2 rows per table (user-own FOR ALL + admin FOR SELECT),
--           except user_recovery_state which has 2 SELECT policies.

-- 7. ADVERSARIAL TEST — User B
--    (5e3629a1-aa60-4c25-a013-11bf40b8e6b9 per Session 9 precedent)
--
-- Pre-test: as service role, insert a sample recovery row for Speaker
-- (just to have something to query):
--
--   insert into public.user_recovery_state (user_id, pin_reset_requested_at)
--   values ('<speaker-user-id>', now())
--   on conflict (user_id) do nothing;
--
-- Then simulate User B session:

begin;
  set local role = 'authenticated';
  set local request.jwt.claims =
    '{"sub":"5e3629a1-aa60-4c25-a013-11bf40b8e6b9","role":"authenticated"}';

  -- (a) User B can INSERT a request for themselves?
  --     Expected: RLS violation — we intentionally have no INSERT
  --     policy, and service-role-only writes enforce this.
  --     (Skip this probe if it would leave state; shown for doc.)
  -- insert into public.user_recovery_state (user_id, pin_reset_requested_at)
  --   values ('5e3629a1-aa60-4c25-a013-11bf40b8e6b9', now());
  -- EXPECTED: ERROR: new row violates row-level security policy

  -- (b) User B can read others' recovery state?
  select count(*) from public.user_recovery_state
  where user_id <> '5e3629a1-aa60-4c25-a013-11bf40b8e6b9';
  -- EXPECTED: 0 (user policy filters to own row; User B is not admin)

  -- (c) User B can read their own recovery state (even if row absent)?
  select count(*) from public.user_recovery_state
  where user_id = '5e3629a1-aa60-4c25-a013-11bf40b8e6b9';
  -- EXPECTED: 0 or 1 (allowed by policy — returns row only if present)
rollback;

*/
