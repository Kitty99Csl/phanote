/**
 * Support Console — user-facing recovery endpoints (Group B).
 *
 * All handlers are requireAuth-gated (user must have a valid JWT).
 * AuthError throws bubble up to the dispatcher's try/catch; returned
 * Responses (for 400/500/410) are returned directly.
 *
 * Routes:
 *   POST /recovery/request-pin-reset
 *   GET  /recovery/status
 *   POST /recovery/complete-pin-reset
 */

import { CORS, requireAuth, supabaseRest } from './helpers.js';


// POST /recovery/request-pin-reset
//
// Upserts user_recovery_state for the caller. Sets
// pin_reset_requested_at = now(). Clears any prior
// pin_reset_approved_at / required / expires so a stale approval
// doesn't bleed into a new request.
//
// Password fields on the row are NOT touched — user-side password
// reset flow is future scope; leaving those fields alone means a
// concurrent password recovery isn't disturbed.
export async function handleRequestPinReset(request, env) {
  const { userId } = await requireAuth(request, env);

  const requestedAt = new Date().toISOString();
  const res = await supabaseRest(
    env,
    '/user_recovery_state?on_conflict=user_id',
    {
      method: 'POST',
      headers: {
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({
        user_id: userId,
        pin_reset_requested_at: requestedAt,
        pin_reset_approved_at: null,
        pin_reset_required: false,
        pin_reset_expires_at: null,
      }),
    }
  );
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    console.error(
      'request-pin-reset upsert failed:',
      res.status,
      txt.slice(0, 200)
    );
    return Response.json(
      { error: 'db_error', message: 'Could not record request' },
      { status: 500, headers: CORS }
    );
  }
  return Response.json(
    { status: 'requested', requested_at: requestedAt },
    { headers: CORS }
  );
}


// GET /recovery/status
//
// Returns the caller's user_recovery_state row if present, or an
// empty object if no row exists. Main app uses the presence of
// `pin_reset_required` / `password_reset_required` boolean fields
// to decide routing post-login.
//
// Fail-closed on any DB error — main app contract is: network
// error here → proceed to normal login, do NOT auto-allow recovery.
// The 500 status is the signal; client treats it as "skip recovery
// check this login".
export async function handleRecoveryStatus(request, env) {
  const { userId } = await requireAuth(request, env);

  const res = await supabaseRest(
    env,
    `/user_recovery_state?user_id=eq.${encodeURIComponent(userId)}&select=*`
  );
  if (!res.ok) {
    console.error(
      'recovery/status read failed:',
      'user=' + userId,
      'status=' + res.status
    );
    return Response.json(
      { error: 'db_error', message: 'Could not read status' },
      { status: 500, headers: CORS }
    );
  }
  const rows = await res.json().catch(() => null);
  if (!Array.isArray(rows)) {
    console.error(
      'recovery/status read returned non-array:',
      'user=' + userId
    );
    return Response.json(
      { error: 'db_error', message: 'Could not read status' },
      { status: 500, headers: CORS }
    );
  }
  return Response.json(rows[0] || {}, { headers: CORS });
}


// POST /recovery/complete-pin-reset
//
// Atomic PIN reset completion via public.complete_pin_reset RPC
// (Migration 016, Session 23 Batch 3 — closes R21-8).
// Body: { new_pin: string }.
//
// Two-layer gate check:
//
//   Worker gates (first line — this handler):
//     - Body shape + /^\d{4}$/ PIN format
//     - pin_reset_required === true
//     - pin_reset_approved_at not null
//     - pin_reset_expires_at > now()
//     - any DB read error → 500 (NEVER fall through to success)
//
//   RPC gates (second line — Migration 016 complete_pin_reset):
//     - Same 3 gates re-verified defensively (belt-and-braces)
//     - Atomic UPDATE profiles + UPDATE user_recovery_state in
//       a single PostgREST transaction (no partial-failure state)
//
// RPC returns structured jsonb { ok: boolean, error?: slug }.
// Error-slug → HTTP code mapping (all slugs below are unreachable
// in practice because worker gates reject first; defense-in-depth
// against a hypothetical race between worker read and RPC call):
//   not_requested     → 403
//   not_approved      → 403
//   expired           → 410
//   already_completed → 409  (idempotency — new in Session 23)
//   PostgREST 5xx     → 500 db_error
export async function handleCompletePinReset(request, env) {
  const { userId } = await requireAuth(request, env);

  // ── Step 0. Validate request body + PIN format ──
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: 'bad_request', message: 'Invalid JSON body' },
      { status: 400, headers: CORS }
    );
  }
  const newPin = body?.new_pin;
  // Exactly 4 digits, matching App.jsx handlePinKey convention.
  // Reject anything else — non-string, wrong length, non-digit —
  // with 400 before touching the DB.
  if (typeof newPin !== 'string' || !/^\d{4}$/.test(newPin)) {
    return Response.json(
      { error: 'bad_pin', message: 'PIN must be exactly 4 digits' },
      { status: 400, headers: CORS }
    );
  }

  // ── Step A. Read recovery state (fail-closed on any read error) ──
  const stateRes = await supabaseRest(
    env,
    `/user_recovery_state?user_id=eq.${encodeURIComponent(userId)}` +
      `&select=pin_reset_required,pin_reset_approved_at,pin_reset_expires_at`
  );
  if (!stateRes.ok) {
    console.error(
      'complete-pin-reset state read failed:',
      stateRes.status
    );
    return Response.json(
      { error: 'db_error', message: 'Could not verify recovery state' },
      { status: 500, headers: CORS }
    );
  }
  const stateRows = await stateRes.json().catch(() => null);
  if (!Array.isArray(stateRows)) {
    console.error('complete-pin-reset state read returned non-array');
    return Response.json(
      { error: 'db_error', message: 'Could not verify recovery state' },
      { status: 500, headers: CORS }
    );
  }
  const state = stateRows[0] || null;

  // ── Step B. Fail-closed gates ──
  if (!state) {
    return Response.json(
      { error: 'not_approved', message: 'No recovery request on file' },
      { status: 403, headers: CORS }
    );
  }
  if (state.pin_reset_required !== true || !state.pin_reset_approved_at) {
    return Response.json(
      { error: 'not_approved', message: 'Request not approved' },
      { status: 403, headers: CORS }
    );
  }
  const expiresAt = state.pin_reset_expires_at
    ? new Date(state.pin_reset_expires_at)
    : null;
  if (!expiresAt || expiresAt.getTime() <= Date.now()) {
    return Response.json(
      { error: 'expired', message: 'Approval expired — contact support to re-approve' },
      { status: 410, headers: CORS }
    );
  }

  // ── Read existing pin_config so we preserve the guest PIN.
  //    Shared-PIN design: owner = primary lock, guest = secondary
  //    (e.g. wife/family). Recovery resets owner only.
  const profRes = await supabaseRest(
    env,
    `/profiles?id=eq.${encodeURIComponent(userId)}&select=pin_config`
  );
  if (!profRes.ok) {
    console.error(
      'complete-pin-reset profile read failed:',
      profRes.status
    );
    return Response.json(
      { error: 'db_error', message: 'Could not read profile' },
      { status: 500, headers: CORS }
    );
  }
  const profRows = await profRes.json().catch(() => null);
  if (!Array.isArray(profRows) || profRows.length === 0) {
    // Should not happen — requireAuth succeeded so auth.users row
    // exists, and handle_new_user trigger guarantees a profiles row.
    // Treat as internal error rather than a recoverable 4xx.
    console.error(
      'complete-pin-reset no profile row for authenticated user:',
      userId
    );
    return Response.json(
      { error: 'no_profile', message: 'Profile not found' },
      { status: 500, headers: CORS }
    );
  }
  const existingCfg = profRows[0]?.pin_config;
  const existingGuest =
    existingCfg && typeof existingCfg === 'object'
      ? existingCfg.guest || null
      : null;
  const newPinConfig = { owner: newPin, guest: existingGuest };

  // ── Step C (atomic). Call complete_pin_reset RPC (Migration 016)
  //    which does the profiles + user_recovery_state UPDATEs in a
  //    single PostgREST transaction. RPC re-verifies all 3 gates
  //    defensively (belt-and-braces with worker gates above).
  const rpcRes = await supabaseRest(
    env,
    '/rpc/complete_pin_reset',
    {
      method: 'POST',
      body: JSON.stringify({
        p_user_id: userId,
        p_new_pin_config: newPinConfig,
      }),
    }
  );
  if (!rpcRes.ok) {
    const txt = await rpcRes.text().catch(() => '');
    console.error(
      'complete-pin-reset RPC HTTP error:',
      'user=' + userId,
      'status=' + rpcRes.status,
      txt.slice(0, 200)
    );
    return Response.json(
      { error: 'db_error', message: 'Could not complete PIN reset' },
      { status: 500, headers: CORS }
    );
  }
  const rpcBody = await rpcRes.json().catch(() => null);
  if (!rpcBody || typeof rpcBody !== 'object') {
    console.error(
      'complete-pin-reset RPC non-object body:',
      'user=' + userId
    );
    return Response.json(
      { error: 'db_error', message: 'Could not complete PIN reset' },
      { status: 500, headers: CORS }
    );
  }
  if (rpcBody.ok === true) {
    return Response.json({ status: 'completed' }, { headers: CORS });
  }

  // RPC returned { ok: false, error: '<slug>' } — map to HTTP code.
  // In normal operation the worker gates above reject all of these
  // cases before the RPC is called; these branches are defense-
  // in-depth against a hypothetical race (e.g. two tabs completing
  // simultaneously).
  const slug = rpcBody.error;
  const slugMap = {
    not_requested:     { status: 403, message: 'No recovery request on file' },
    not_approved:      { status: 403, message: 'Request not approved' },
    expired:           { status: 410, message: 'Approval expired — contact support to re-approve' },
    already_completed: { status: 409, message: 'PIN already reset — sign in with the new PIN' },
  };
  const mapped = slugMap[slug];
  if (mapped) {
    return Response.json(
      { error: slug, message: mapped.message },
      { status: mapped.status, headers: CORS }
    );
  }

  console.error(
    'complete-pin-reset RPC unknown error slug:',
    'user=' + userId,
    'slug=' + String(slug)
  );
  return Response.json(
    { error: 'db_error', message: 'Could not complete PIN reset' },
    { status: 500, headers: CORS }
  );
}
