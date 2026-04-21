-- =============================================================================
-- Migration 016: Atomic PIN-reset RPC + tower_admin_actions CHECK extension
-- =============================================================================
-- Sprint I, Session 23 (2026-04-21)
--
-- Closes:
--   R21-8  — atomic PIN-reset (removes Session 21 Mode-2 partial-
--            failure path; both UPDATEs now in a single transaction)
--   R21-6  — forward-capacity for 'unauthorized_admin_attempt' audit
--            action (no worker write path yet; slot reserved for
--            Session 24+ audit-log expansion)
--
-- This migration:
--
--   1. public.complete_pin_reset(p_user_id uuid, p_new_pin_config jsonb)
--      SECURITY DEFINER RPC. Called only by worker service_role after
--      the worker's first-line fail-closed gates pass. Re-verifies all
--      3 gates defensively (belt-and-braces) and then atomically
--      UPDATEs profiles.pin_config + clears user_recovery_state.pin_reset_*
--      in a single transaction. Returns structured jsonb { ok, error? }.
--
--      Design choice: RPC returns structured errors via RETURN (not
--      RAISE EXCEPTION) so PostgREST surfaces a clean 200 JSON response
--      and the worker can http-code-map based on the error slug.
--      Unexpected DB errors (e.g. trigger exceptions) still fall
--      through as PostgREST 500 — worker catches + maps to db_error.
--      Atomicity guaranteed by PostgREST's implicit transaction.
--
--   2. tower_admin_actions.action_type CHECK constraint extension to
--      include 'unauthorized_admin_attempt'. Migration 014 defined
--      the CHECK inline (auto-generated name); this migration
--      introspects + drops + re-adds with an explicit name for
--      future maintainability.
--
-- Apply: Select-All in Supabase SQL Editor, then Run
--        (Rule 19 + Session 17 lesson — partial apply is silent).
--
-- Rollback (emergency only — paste into SQL Editor):
--
--   DROP FUNCTION IF EXISTS public.complete_pin_reset(uuid, jsonb);
--   ALTER TABLE public.tower_admin_actions
--     DROP CONSTRAINT IF EXISTS tower_admin_actions_action_type_check;
--   ALTER TABLE public.tower_admin_actions
--     ADD CONSTRAINT tower_admin_actions_action_type_check
--     CHECK (action_type in (
--       'approve_password_reset',
--       'approve_pin_reset',
--       'view_transactions'
--     ));
-- =============================================================================


-- =============================================================================
-- SECTION 1 — complete_pin_reset RPC
-- =============================================================================

create or replace function public.complete_pin_reset(
  p_user_id        uuid,
  p_new_pin_config jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state public.user_recovery_state%rowtype;
begin
  -- Gate 1: recovery record exists
  select * into v_state
  from public.user_recovery_state
  where user_id = p_user_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_requested');
  end if;

  -- Gate 2: PIN reset approved
  if v_state.pin_reset_approved_at is null then
    return jsonb_build_object('ok', false, 'error', 'not_approved');
  end if;

  -- Gate 2b: approval not expired (uses stored pin_reset_expires_at —
  -- more robust than computing from approved_at + 30min interval,
  -- because worker is authoritative on window duration)
  if v_state.pin_reset_expires_at is not null
     and v_state.pin_reset_expires_at < now() then
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;

  -- Gate 3: required flag still true (idempotency — a second call
  -- after a successful completion lands here instead of double-
  -- writing the profile)
  if not coalesce(v_state.pin_reset_required, false) then
    return jsonb_build_object('ok', false, 'error', 'already_completed');
  end if;

  -- ── Atomic mutation (profiles first, then recovery state) ──
  --    Both UPDATEs inside the caller's (PostgREST) transaction,
  --    so a failure in either aborts both.
  update public.profiles
  set pin_config = p_new_pin_config,
      updated_at = now()
  where id = p_user_id;

  update public.user_recovery_state
  set pin_reset_required     = false,
      pin_reset_approved_at  = null,
      pin_reset_requested_at = null,
      pin_reset_expires_at   = null,
      updated_at             = now()
  where user_id = p_user_id;

  -- NOTE: approved_by + last_action_metadata intentionally preserved
  -- for the audit trail of the most recent approval. Session 21
  -- Migration 014 established that these stay sticky across reset
  -- cycles (cleared only on next approval).

  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.complete_pin_reset(uuid, jsonb) from public;
grant  execute on function public.complete_pin_reset(uuid, jsonb) to service_role;


-- =============================================================================
-- SECTION 2 — tower_admin_actions.action_type CHECK extension
-- =============================================================================
--
-- Migration 014 defined the CHECK inline (no explicit constraint name),
-- so Postgres auto-generated a name. We introspect via pg_constraint
-- to find it, DROP, then re-ADD with an explicit name + extended
-- value list. Idempotent regardless of the auto-generated name.

do $$
declare
  v_check_name text;
begin
  select conname
    into v_check_name
  from pg_constraint
  where conrelid = 'public.tower_admin_actions'::regclass
    and contype  = 'c'
    and pg_get_constraintdef(oid) ilike '%action_type%';

  if v_check_name is not null then
    execute format(
      'alter table public.tower_admin_actions drop constraint %I',
      v_check_name
    );
  end if;
end $$;

alter table public.tower_admin_actions
  add constraint tower_admin_actions_action_type_check
  check (action_type in (
    'approve_password_reset',
    'approve_pin_reset',
    'view_transactions',
    'unauthorized_admin_attempt'
  ));


-- === END DDL ===


-- =============================================================================
-- POSTFLIGHT VERIFICATION (non-executable — read only; do NOT run)
-- =============================================================================
-- After Select-All + Run above, these queries can be pasted SEPARATELY
-- into the SQL Editor to verify state. DO NOT include in the same Run
-- as the DDL above (Session 17 lesson — comment blocks can be silently
-- mis-applied as DDL).
--
-- 1. complete_pin_reset RPC exists with SECURITY DEFINER:
--
--    select proname, prosecdef, pronargs
--    from pg_proc
--    where proname = 'complete_pin_reset'
--      and pronamespace = 'public'::regnamespace;
--    -- Expected: 1 row, prosecdef = t, pronargs = 2
--
-- 2. service_role has EXECUTE on the function:
--
--    select has_function_privilege('service_role',
--      'public.complete_pin_reset(uuid,jsonb)', 'execute');
--    -- Expected: t
--
-- 3. public does NOT have EXECUTE (revoke took):
--
--    select has_function_privilege('public',
--      'public.complete_pin_reset(uuid,jsonb)', 'execute');
--    -- Expected: f
--
-- 4. CHECK constraint now includes 'unauthorized_admin_attempt':
--
--    select conname, pg_get_constraintdef(oid)
--    from pg_constraint
--    where conrelid = 'public.tower_admin_actions'::regclass
--      and contype = 'c'
--      and conname = 'tower_admin_actions_action_type_check';
--    -- Expected: 1 row, definition lists all 4 values including
--    --           'unauthorized_admin_attempt'
--
-- 5. Insert smoke for the new value (optional — INSERT then DELETE):
--
--    insert into public.tower_admin_actions
--      (admin_user_id, action_type, result, metadata)
--    values
--      (null, 'unauthorized_admin_attempt', 'success', '{}'::jsonb)
--    returning id;
--    -- Expected: returns a uuid, no CHECK violation
--
--    delete from public.tower_admin_actions
--    where action_type = 'unauthorized_admin_attempt'
--      and admin_user_id is null
--      and result = 'success';
--    -- Expected: removes test row.
-- =============================================================================
