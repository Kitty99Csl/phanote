/**
 * Support Console — admin approval endpoints (Group C).
 *
 * All handlers are requireAdmin-gated. Both endpoints share structure;
 * only the column prefix + action_type literal differ. Factored via
 * buildApproveHandler(type) to avoid two nearly-identical 120-line
 * handlers.
 *
 * Routes:
 *   POST /admin/users/:id/approve-pin-reset
 *   POST /admin/users/:id/approve-password-reset
 *
 * Password-reset approval ships but is DORMANT — no user-side request
 * or complete flow exists yet. The admin endpoint is built ahead so
 * Tower Room 6 UI can wire both flows without needing another worker
 * deploy when user-side password recovery lands.
 *
 * action_type values match the Migration 014 CHECK constraint exactly:
 *   'approve_pin_reset' | 'approve_password_reset'
 *
 * logAdminAction is called AFTER the DB write resolves (either success
 * or failure) — logging before the write would create split-truth if
 * the write fails silently.
 */

import {
  CORS,
  APPROVAL_WINDOW_MS,
  requireAdmin,
  supabaseRest,
  logAdminAction,
} from './helpers.js';


// Factory: builds an approve handler parameterized by reset type.
//   type='pin'      → column prefix 'pin_reset_',      action 'approve_pin_reset'
//   type='password' → column prefix 'password_reset_', action 'approve_password_reset'
function buildApproveHandler(type) {
  const colPrefix = type + '_reset_';
  const actionType = 'approve_' + type + '_reset';

  return async function handleApproveReset(request, env, ctx, targetUserId) {
    const admin = await requireAdmin(request, env);

    // ── Parse body. Optional { reason?: string } — empty body is OK. ──
    // Truncate reason to 500 chars to bound tower_admin_actions.metadata
    // and user_recovery_state.last_action_metadata payload sizes.
    let reason = null;
    try {
      const raw = await request.json();
      if (raw && typeof raw.reason === 'string') {
        reason = raw.reason.slice(0, 500);
      }
    } catch {
      // malformed / empty body — treat as no reason
    }

    // ── Verify the target profile exists. 404 if not. ──
    //    We check BEFORE the upsert because user_recovery_state has
    //    a FK to profiles(id) ON DELETE CASCADE — an INSERT for a
    //    non-existent user would fail the FK constraint, and the
    //    error shape is less actionable for the admin operator.
    //    A direct 404 is cleaner.
    const profRes = await supabaseRest(
      env,
      `/profiles?id=eq.${encodeURIComponent(targetUserId)}&select=id`
    );
    if (!profRes.ok) {
      console.error(
        'approve-' + type + '-reset profile lookup failed:',
        'admin=' + admin.userId,
        'target=' + targetUserId,
        'status=' + profRes.status
      );
      // Not logged to tower_admin_actions — target_user_id FK would
      // fail for the same reason the lookup failed. Console.error is
      // the audit channel for DB-outage paths.
      return Response.json(
        { error: 'db_error', message: 'Could not verify target user' },
        { status: 500, headers: CORS }
      );
    }
    const profRows = await profRes.json().catch(() => null);
    if (!Array.isArray(profRows) || profRows.length === 0) {
      return Response.json(
        { error: 'not_found', message: 'Target user not found' },
        { status: 404, headers: CORS }
      );
    }

    // ── Upsert user_recovery_state with approval fields. ──
    //    merge-duplicates preserves any fields we don't send — so a
    //    prior pin_reset_requested_at timestamp stays intact (useful
    //    for "admin approved a request the user actually made"), and
    //    the opposite flow's columns (e.g. password_*) are untouched
    //    when approving a pin reset.
    const now = Date.now();
    const approvedAt = new Date(now).toISOString();
    const expiresAt = new Date(now + APPROVAL_WINDOW_MS).toISOString();
    const upsertBody = {
      user_id: targetUserId,
      [colPrefix + 'approved_at']: approvedAt,
      [colPrefix + 'required']: true,
      [colPrefix + 'expires_at']: expiresAt,
      approved_by: admin.userId,
      last_action_metadata: { reason, approved_via: 'tower' },
    };

    const upsertRes = await supabaseRest(
      env,
      '/user_recovery_state?on_conflict=user_id',
      {
        method: 'POST',
        headers: {
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify(upsertBody),
      }
    );

    if (!upsertRes.ok) {
      const txt = await upsertRes.text().catch(() => '');
      console.error(
        'approve-' + type + '-reset upsert failed:',
        'admin=' + admin.userId,
        'target=' + targetUserId,
        'status=' + upsertRes.status,
        txt.slice(0, 200)
      );
      // Log the FAILED attempt to tower_admin_actions. This is the
      // whole point of the audit table — failed approvals are
      // actionable telemetry for Tower ops (might indicate a DB
      // outage, a malformed target, or a permission drift).
      logAdminAction(env, ctx, {
        admin_user_id: admin.userId,
        target_user_id: targetUserId,
        action_type: actionType,
        result: 'failed',
        error_message: 'upsert_failed_' + upsertRes.status,
        metadata: { reason },
      });
      return Response.json(
        { error: 'db_error', message: 'Could not record approval' },
        { status: 500, headers: CORS }
      );
    }

    // Only log success AFTER the write resolves OK. Split-truth
    // guard — logging before the write could record success for
    // an approval that actually failed.
    logAdminAction(env, ctx, {
      admin_user_id: admin.userId,
      target_user_id: targetUserId,
      action_type: actionType,
      result: 'success',
      metadata: { reason, expires_at: expiresAt },
    });

    return Response.json(
      { status: 'approved', expires_at: expiresAt },
      { headers: CORS }
    );
  };
}

export const handleApprovePinReset = buildApproveHandler('pin');
export const handleApprovePasswordReset = buildApproveHandler('password');
