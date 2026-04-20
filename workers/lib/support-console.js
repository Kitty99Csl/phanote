/**
 * Support Console subsystem — shared auth helpers, audit logging,
 * and route dispatcher for /recovery/* and /admin/users/* paths.
 *
 * Added Session 21 Sprint I (2026-04-20).
 *
 * Architecture (Rule 17 + Session 21 DECISIONS):
 *   Tower is a viewer, the worker is the writer. All credential-
 *   adjacent actions and privacy-sensitive reads go through these
 *   endpoints, mediated by Supabase service-role + audit-logged.
 *
 * Route ownership:
 *   /recovery/*        — user-facing (requireAuth)
 *   /admin/users/*     — admin-facing (requireAdmin)
 *
 * Main worker imports handleSupportConsoleRoute() and dispatches
 * matching paths to this module. Non-matching paths return null
 * so the main worker continues its own fall-through.
 *
 * Groups to fill in (Session 21 Commit 2):
 *   A — this file: helpers + router shell           [DONE]
 *   B — user-facing recovery endpoints              [pending]
 *   C — admin approval endpoints                    [pending]
 *   D — admin summary endpoints                     [pending]
 */


// ─── CORS ──────────────────────────────────────────────────────
// Mirrors phanote-api-worker.js. Keep in sync if main worker
// changes its CORS headers. Not DRY-extracted because doing so
// would require main worker to export it, increasing churn scope
// beyond Session 21. Duplication is deliberate and bounded.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};


// ─── Tunables ──────────────────────────────────────────────────
// 30-minute window for approved resets. Locked in Session 21 DECISIONS
// (D21-Q3 family-beta pragmatics). Named constant so Session 22+ can
// tune without hunting magic numbers.
const APPROVAL_WINDOW_MS = 30 * 60 * 1000;

// Standard v4 UUID shape; Supabase PK format. Used to reject obviously
// malformed target_user_id URL params before any DB call.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;


// ─── Error types + response shaping ────────────────────────────
// AuthError lets the caller distinguish expected auth failures
// (401/403/410) from unexpected 500s. isAuthError=true on the
// thrown instance.
class AuthError extends Error {
  constructor(status, code, message) {
    super(message);
    this.isAuthError = true;
    this.status = status;
    this.code = code;
  }
}

function authErrorResponse(err) {
  return Response.json(
    { error: err.code, message: err.message },
    { status: err.status, headers: CORS }
  );
}

function internalErrorResponse(message) {
  return Response.json(
    { error: 'internal', message: message || 'Internal server error' },
    { status: 500, headers: CORS }
  );
}


// ─── Supabase REST fetch helper ────────────────────────────────
// All calls here use service role. Service role bypasses RLS; for
// anything we want RLS-gated we'd use the user's token instead —
// but Session 21 endpoints all perform admin-gated or user-gated
// logic in worker code, so service-role is correct.
async function supabaseRest(env, path, options = {}) {
  const url = `${env.SUPABASE_URL}/rest/v1${path}`;
  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  return fetch(url, { ...options, headers });
}


// ─── requireAuth ───────────────────────────────────────────────
// Validates the caller's Supabase JWT via /auth/v1/user and
// returns { userId, token }. Throws AuthError(401) on any failure.
//
// The /auth/v1/user endpoint takes the caller's JWT as Bearer and
// the anon-or-service-role key as apikey. Using service-role as
// apikey avoids adding SUPABASE_ANON_KEY to the worker secret list
// (one fewer moving part). Response is the auth.users row for the
// authenticated user; its id field IS the user_id we need.
export async function requireAuth(request, env) {
  const auth = request.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) {
    throw new AuthError(401, 'missing_token', 'Missing or malformed Authorization header');
  }
  const token = auth.slice(7);
  if (!token) {
    throw new AuthError(401, 'missing_token', 'Empty bearer token');
  }

  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    },
  });
  if (!res.ok) {
    throw new AuthError(401, 'invalid_token', 'Token verification failed');
  }

  const user = await res.json().catch(() => null);
  if (!user?.id) {
    throw new AuthError(401, 'invalid_token', 'Token did not resolve to a user');
  }
  return { userId: user.id, token };
}


// ─── requireAdmin ──────────────────────────────────────────────
// requireAuth + confirms profiles.is_admin = true via a service-
// role read (bypasses RLS so we get the authoritative answer).
// Throws AuthError(403) if the user is not an admin.
//
// Intentionally does NOT call the public.is_admin() SQL function
// (Migration 015) here, because that function relies on auth.uid()
// and service-role context has auth.uid() = NULL. Direct SELECT
// on profiles is the correct pattern for worker code.
export async function requireAdmin(request, env) {
  const auth = await requireAuth(request, env);

  const res = await supabaseRest(
    env,
    `/profiles?id=eq.${encodeURIComponent(auth.userId)}&select=is_admin`
  );
  if (!res.ok) {
    throw new AuthError(500, 'profile_lookup_failed', 'Could not verify admin status');
  }

  const rows = await res.json().catch(() => []);
  const isAdmin = Array.isArray(rows) && rows[0]?.is_admin === true;
  if (!isAdmin) {
    // Minimal signal for compromised-token scenarios. Full persistent
    // audit trail deferred to Session 22 (Migration 016 will extend
    // tower_admin_actions.action_type with 'unauthorized_admin_attempt').
    // See docs/session-21/RISKS.md R21-6.
    console.warn(
      'unauthorized admin attempt:',
      'user=' + auth.userId,
      'path=' + (request.url || 'unknown')
    );
    throw new AuthError(403, 'not_admin', 'Admin access required');
  }
  return auth;
}


// ─── logAdminRead ──────────────────────────────────────────────
// Fire-and-forget INSERT into public.tower_admin_reads.
// Pattern mirrors logAICall in the main worker: failures logged
// to console, never thrown, ctx.waitUntil for keep-alive when
// available.
//
// NEVER log the row body (identifiers only) in the error path —
// query_hash is already one-way-hashed; table_name + row_count
// are not PII.
export function logAdminRead(env, ctx, { admin_user_id, table_name, row_count, query_hash }) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return;
  const p = fetch(`${env.SUPABASE_URL}/rest/v1/tower_admin_reads`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      admin_user_id,
      table_name,
      row_count: row_count ?? null,
      query_hash: query_hash ?? null,
    }),
  }).then(async (res) => {
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      console.error('tower_admin_reads insert failed:', res.status, txt.slice(0, 200));
    }
  }).catch((err) => {
    console.error('tower_admin_reads insert errored:', err?.message || 'unknown');
  });
  if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(p);
}


// ─── logAdminAction ────────────────────────────────────────────
// Fire-and-forget INSERT into public.tower_admin_actions.
// action_type is CHECK-constrained in the DB (Migration 014).
// Invalid values will be rejected at the DB layer; we see those
// in console.error, not in the caller's response.
//
// Callers that need to double-log (e.g. view_transactions is
// privacy-sensitive → writes to BOTH tower_admin_reads AND
// tower_admin_actions per Session 21 plan) call both functions.
export function logAdminAction(env, ctx, {
  admin_user_id,
  target_user_id,
  action_type,
  result = 'success',
  error_message = null,
  metadata = {},
}) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return;
  const p = fetch(`${env.SUPABASE_URL}/rest/v1/tower_admin_actions`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      admin_user_id,
      target_user_id,
      action_type,
      result,
      error_message,
      metadata,
    }),
  }).then(async (res) => {
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      console.error('tower_admin_actions insert failed:', res.status, txt.slice(0, 200));
    }
  }).catch((err) => {
    console.error('tower_admin_actions insert errored:', err?.message || 'unknown');
  });
  if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(p);
}


// ─── Crypto helper: SHA-256 hex digest ─────────────────────────
// Used by Group D /admin/users/search for query_hash audit field.
// Web Crypto is available in the Cloudflare Workers runtime.
//
// NOTE on threat model: this hash is a coarse correlation signal
// ("same admin searched the same thing again"), not a cryptographic
// secret. Phone-number input space is small enough that a determined
// reverser could dictionary-attack it — acceptable for operator audit
// but not for PII protection. If we ever need the latter, switch to
// HMAC with a per-env salt.
async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const hashBuf = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}


// ─── Count helper: HEAD + Prefer=count=exact + Content-Range ───
// PostgREST returns the row count in the Content-Range header when
// the request carries Prefer: count=exact. HEAD avoids the body
// payload entirely — we only want the number.
//
// Returns the integer count on success, or null on any failure
// (non-OK response, missing header, unparseable). Callers treat
// null as "unknown" and surface a degraded view rather than a 500.
async function countViaHead(env, table, filters) {
  const url = `${env.SUPABASE_URL}/rest/v1/${table}?${filters}`;
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: 'count=exact',
      },
    });
    if (!res.ok) return null;
    const cr = res.headers.get('content-range') || '';
    const m = cr.match(/\/(\d+)$/);
    return m ? parseInt(m[1], 10) : null;
  } catch {
    return null;
  }
}


// ═══════════════════════════════════════════════════════════════
// Group B — user-facing recovery endpoints (requireAuth)
// ═══════════════════════════════════════════════════════════════
// Internal named handlers. Dispatched from handleSupportConsoleRoute.
// AuthError throws bubble up to the dispatcher's try/catch; returned
// Responses (for 400/500/410) are returned directly.

// POST /recovery/request-pin-reset
//
// Upserts user_recovery_state for the caller. Sets
// pin_reset_requested_at = now(). Clears any prior
// pin_reset_approved_at / required / expires so a stale approval
// doesn't bleed into a new request.
//
// Password fields on the row are NOT touched — user-side password
// reset flow is Session 22/23 scope; leaving those fields alone
// means a concurrent password recovery isn't disturbed.
async function handleRequestPinReset(request, env) {
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
async function handleRecoveryStatus(request, env) {
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
// Fail-closed PIN reset completion. Body: { new_pin: string }.
// All four gate checks must pass or return 403/410:
//   - pin_reset_required === true
//   - pin_reset_approved_at not null
//   - pin_reset_expires_at > now()
//   - any DB query error → 500 (NEVER fall through to success)
//
// Sequential-write pattern per Session 21 DECISION (Interpretation A):
//   Step C: PATCH profiles.pin_config (owner replaced, guest preserved)
//   Step D: PATCH user_recovery_state to clear pin_reset_* fields
// Partial-failure self-heal documented as R21-8:
//   Mode 1 (Step C fails): bail with 500, no state changed. User retries.
//   Mode 2 (Step D fails, Step C succeeded): PIN is live; return
//     { status: 'completed', warning: 'state_cleanup_pending' }. Next
//     login re-routes to SetNewPin; user re-confirms; endpoint retries
//     Step D. Idempotent.
async function handleCompletePinReset(request, env) {
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

  // ── Step C. Write new pin_config to profiles. ──
  //    R21-8 Mode 1: if this fails, bail with 500, no state changed.
  const pinUpdate = await supabaseRest(
    env,
    `/profiles?id=eq.${encodeURIComponent(userId)}`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ pin_config: newPinConfig }),
    }
  );
  if (!pinUpdate.ok) {
    const txt = await pinUpdate.text().catch(() => '');
    console.error(
      'complete-pin-reset pin update failed:',
      pinUpdate.status,
      txt.slice(0, 200)
    );
    return Response.json(
      { error: 'db_error', message: 'Could not update PIN' },
      { status: 500, headers: CORS }
    );
  }

  // ── Step D. Clear pin_reset_* fields on user_recovery_state. ──
  //    R21-8 Mode 2: if this fails, PIN is already live in profiles.
  //    Return 200 with warning:'state_cleanup_pending'. Next login
  //    re-enters the flow and retries (idempotent).
  const stateUpdate = await supabaseRest(
    env,
    `/user_recovery_state?user_id=eq.${encodeURIComponent(userId)}`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        pin_reset_requested_at: null,
        pin_reset_approved_at: null,
        pin_reset_required: false,
        pin_reset_expires_at: null,
      }),
    }
  );
  if (!stateUpdate.ok) {
    const txt = await stateUpdate.text().catch(() => '');
    // Grep-friendly log marker for CF Worker logs (R21-8 Mode 2
    // straggler identification pre-Session-22 RPC migration).
    console.error(
      'R21-8-MODE2 complete-pin-reset state clear failed (PIN updated OK):',
      'user=' + userId,
      'status=' + stateUpdate.status,
      txt.slice(0, 200)
    );
    return Response.json(
      { status: 'completed', warning: 'state_cleanup_pending' },
      { headers: CORS }
    );
  }

  return Response.json({ status: 'completed' }, { headers: CORS });
}


// ═══════════════════════════════════════════════════════════════
// Group C — admin approval endpoints (requireAdmin)
// ═══════════════════════════════════════════════════════════════
// POST /admin/users/:id/approve-pin-reset
// POST /admin/users/:id/approve-password-reset
//
// Both endpoints share structure; only the column prefix + action_type
// literal differ. Extracted as a factory via buildApproveHandler(type)
// to avoid two nearly-identical 120-line handlers.
//
// Password-reset approval ships this session but is DORMANT — no user-
// side request or complete flow exists yet (Session 22/23 scope). The
// admin endpoint is built ahead so Tower Room 6 UI (Session 22) can
// wire both flows without needing another worker deploy.
//
// action_type values match the Migration 014 CHECK constraint exactly:
//   'approve_pin_reset' | 'approve_password_reset'
//
// logAdminAction is called AFTER the DB write resolves (either success
// or failure) — logging before the write would create split-truth if
// the write fails silently. Speaker-noted in Group C brief.


// Parse /admin/users/:id/<suffix> paths. Returns the UUID if all of
// {prefix, uuid-shape, suffix-exact-match} hold, else null. Keeps the
// dispatcher readable and UUID validation out of the handlers.
function extractTargetUserId(path, suffix) {
  const prefix = '/admin/users/';
  if (!path.startsWith(prefix)) return null;
  const rest = path.slice(prefix.length);
  const needle = '/' + suffix;
  if (!rest.endsWith(needle)) return null;
  const id = rest.slice(0, -needle.length);
  return UUID_RE.test(id) ? id : null;
}


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

const handleApprovePinReset = buildApproveHandler('pin');
const handleApprovePasswordReset = buildApproveHandler('password');


// ═══════════════════════════════════════════════════════════════
// Group D — admin summary endpoints (requireAdmin)
// ═══════════════════════════════════════════════════════════════
// POST /admin/users/search
// GET  /admin/users/:id/summary
// POST /admin/users/:id/view-transactions
//
// All three write to tower_admin_reads (read audit). /view-transactions
// additionally writes to tower_admin_actions with action_type=
// 'view_transactions' — double-logged intentionally per Session 21
// plan because it is privacy-sensitive.
//
// Per R21-1: no profiles.total_transactions column exists. Counts
// come from count(*) queries. Search uses a PostgREST embedded
// count (1 round-trip). Summary uses sequential countViaHead calls
// in Promise.allSettled for graceful degradation (partial data is
// better than a full 500 for an operator trying to help a user).


// Shape the has_pending_request boolean for the search response.
// Requested-but-not-approved on either flow = pending.
function derivePendingRequest(recoveryRow) {
  if (!recoveryRow || typeof recoveryRow !== 'object') return false;
  const pinPending =
    !!recoveryRow.pin_reset_requested_at &&
    !recoveryRow.pin_reset_approved_at;
  const pwPending =
    !!recoveryRow.password_reset_requested_at &&
    !recoveryRow.password_reset_approved_at;
  return pinPending || pwPending;
}


// Fetch the user_recovery_state row for a single user. Returns the
// row object (or null if absent / any error). Used by the /search
// and /summary endpoints — PostgREST embedded resource syntax
// failed in Session 21 deploy-time smoke testing (500 on both
// endpoints even after NOTIFY pgrst schema reload), so we fall
// back to explicit per-user fetches.
//
// R21-11 in docs/session-21/RISKS.md tracks the embedded-resource
// investigation — likely requires explicit FK-name syntax or a
// schema-relationship grant that Migration 014 didn't emit. Cleanup
// candidate for Session 22.
async function fetchRecoveryForUser(env, userId) {
  const res = await supabaseRest(
    env,
    `/user_recovery_state?user_id=eq.${encodeURIComponent(userId)}` +
      `&select=pin_reset_requested_at,pin_reset_approved_at,` +
      `password_reset_requested_at,password_reset_approved_at`
  );
  if (!res.ok) return null;
  const rows = await res.json().catch(() => null);
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}


// Helper for summary aggregates: turns a Promise.allSettled outcome
// into an integer-or-null. Non-fulfilled or non-number → null.
function settledCount(result) {
  if (result.status !== 'fulfilled') return null;
  return typeof result.value === 'number' ? result.value : null;
}


// POST /admin/users/search
//
// Phone-partial search (digits only). No email search per Session 21
// scope lock. Returns up to 50 rows with basic profile + pending-
// request flag + total transactions.
//
// Input validation:
//   - query must be string, ≤100 chars raw (cap before cleaning)
//   - cleaned (non-digit stripped) must be ≥3 chars (too-short =
//     too many hits, performance risk)
//   - limit clamped to [1, 50]; default 50
//
// Audit: logs to tower_admin_reads with query_hash = sha256(raw query).
async function handleSearchUsers(request, env, ctx) {
  const admin = await requireAdmin(request, env);

  // ── Parse + validate body ──
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: 'bad_request', message: 'Invalid JSON body' },
      { status: 400, headers: CORS }
    );
  }

  const rawQuery = typeof body?.query === 'string' ? body.query.slice(0, 100) : '';
  const cleaned = rawQuery.replace(/\D/g, '');
  if (cleaned.length < 3) {
    return Response.json(
      { error: 'query_too_short', message: 'Query must contain at least 3 digits' },
      { status: 400, headers: CORS }
    );
  }

  const rawLimit = Number(body?.limit);
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(Math.floor(rawLimit), 50)
      : 50;

  // ── Step 1: fetch matching profiles (no embeds) ──
  // PostgREST embedded resources (user_recovery_state, transactions)
  // failed in Session 21 smoke testing — R21-11. Fallback pattern:
  // fetch profiles first, then parallel per-user followups.
  // PostgREST wildcard syntax uses `*` for ILIKE patterns.
  const select =
    'id,display_name,phone,avatar,language,base_currency,last_seen_at,is_pro,is_admin';
  const qs =
    `select=${encodeURIComponent(select)}` +
    `&phone=ilike.*${encodeURIComponent(cleaned)}*` +
    `&limit=${limit}`;

  const res = await supabaseRest(env, `/profiles?${qs}`);
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    console.error(
      'admin/users/search profiles fetch failed:',
      'admin=' + admin.userId,
      'status=' + res.status,
      txt.slice(0, 200)
    );
    return Response.json(
      { error: 'db_error', message: 'Search query failed' },
      { status: 500, headers: CORS }
    );
  }

  const rows = await res.json().catch(() => null);
  if (!Array.isArray(rows)) {
    console.error(
      'admin/users/search non-array response:',
      'admin=' + admin.userId
    );
    return Response.json(
      { error: 'db_error', message: 'Search query failed' },
      { status: 500, headers: CORS }
    );
  }

  // ── Step 2: parallel per-profile enrichment ──
  // For each matched profile, fetch in parallel: transaction count
  // (countViaHead) + recovery state row. Cloudflare Workers subrequest
  // limit is 1000 on paid plans; 50 profiles × 2 subrequests = 100 —
  // well under the cap. Both calls return null on failure; the mapped
  // result degrades gracefully rather than 500-ing the whole search.
  const results = await Promise.all(
    rows.map(async (row) => {
      const [txnCount, recovery] = await Promise.all([
        countViaHead(
          env,
          'transactions',
          `user_id=eq.${encodeURIComponent(row.id)}&is_deleted=eq.false`
        ),
        fetchRecoveryForUser(env, row.id),
      ]);
      return {
        id: row.id,
        display_name: row.display_name,
        phone: row.phone,
        avatar: row.avatar,
        language: row.language,
        base_currency: row.base_currency,
        last_seen_at: row.last_seen_at,
        total_transactions: typeof txnCount === 'number' ? txnCount : null,
        is_pro: !!row.is_pro,
        is_admin: !!row.is_admin,
        has_pending_request: derivePendingRequest(recovery),
      };
    })
  );

  // Audit. Hash the CLEANED digits, not the raw input — otherwise
  // identical searches in different formats ("+856 20 123" vs
  // "85620123") would hash differently and fragment the audit
  // trail. Small info loss (formatting nuance) vastly outweighed
  // by dedupe correctness for "same admin searched same person".
  const queryHash = await sha256Hex(cleaned);
  logAdminRead(env, ctx, {
    admin_user_id: admin.userId,
    table_name: 'profiles',
    row_count: results.length,
    query_hash: queryHash,
  });

  return Response.json({ results }, { headers: CORS });
}


// GET /admin/users/:id/summary
//
// Support-safe profile bundle for Tower Room 6. Aggregates are
// fetched concurrently via Promise.allSettled so a failure on any
// one (e.g. app_events missing column) degrades the summary rather
// than 500-ing the whole operator view.
//
// Profile fetch is the only required call — if that fails, 500.
// Everything else returns null on failure + console.warn.
async function handleUserSummary(request, env, ctx, targetUserId) {
  const admin = await requireAdmin(request, env);

  // ── Required: profile basics (no embed — R21-11 fallback) ──
  const profRes = await supabaseRest(
    env,
    `/profiles?id=eq.${encodeURIComponent(targetUserId)}` +
      `&select=id,display_name,phone,avatar,language,base_currency,` +
      `created_at,last_seen_at,is_pro,is_admin`
  );
  if (!profRes.ok) {
    console.error(
      'admin/users/:id/summary profile fetch failed:',
      'admin=' + admin.userId,
      'target=' + targetUserId,
      'status=' + profRes.status
    );
    return Response.json(
      { error: 'db_error', message: 'Could not read profile' },
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

  const profile = profRows[0];
  // Recovery state fetched separately (see aggregate block below)
  // since embedded resource syntax failed in Session 21 — R21-11.

  // ── Concurrent aggregates ──
  const now = Date.now();
  const d7 = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const d30 = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  const idFilter = `user_id=eq.${encodeURIComponent(targetUserId)}`;

  const results = await Promise.allSettled([
    countViaHead(env, 'transactions', `${idFilter}&is_deleted=eq.false`),
    countViaHead(env, 'transactions', `${idFilter}&is_deleted=eq.false&created_at=gte.${d7}`),
    countViaHead(env, 'transactions', `${idFilter}&is_deleted=eq.false&created_at=gte.${d30}`),
    // Categories over last 30d — fetched up to 500 rows and grouped
    // in-worker. Server-side GROUP BY would require an RPC (deferred).
    supabaseRest(
      env,
      `/transactions?${idFilter}&is_deleted=eq.false&created_at=gte.${d30}` +
        `&select=category_name,category_emoji&limit=500`
    ),
    countViaHead(env, 'app_events', `${idFilter}&level=eq.error&created_at=gte.${d7}`),
    countViaHead(env, 'ai_call_log', `${idFilter}&status=neq.success&created_at=gte.${d7}`),
    // Recovery state — full row, concurrent with the aggregates.
    // Explicit fetch since embedded resource syntax failed (R21-11).
    supabaseRest(
      env,
      `/user_recovery_state?user_id=eq.${encodeURIComponent(targetUserId)}&select=*`
    ),
  ]);

  const [totalR, d7R, d30R, catsR, errR, aiErrR, recoveryR] = results;
  const txnTotal = settledCount(totalR);
  const txn7d = settledCount(d7R);
  const txn30d = settledCount(d30R);
  const appErrors7d = settledCount(errR);
  const aiErrors7d = settledCount(aiErrR);

  // Parse the recovery state fetch result. Null on any failure —
  // summary still renders without it.
  let recoveryState = null;
  if (recoveryR.status === 'fulfilled' && recoveryR.value?.ok) {
    const rrows = await recoveryR.value.json().catch(() => null);
    if (Array.isArray(rrows) && rrows.length > 0) {
      recoveryState = rrows[0];
    }
  } else {
    console.warn(
      'summary recovery fetch failed:',
      'admin=' + admin.userId,
      'target=' + targetUserId
    );
  }

  // ── Top 3 categories (in-worker aggregation) ──
  //    Skip uncategorized rows (NULL/empty category_name) rather than
  //    bucketing them into the legitimate 'other' category — keeps
  //    the "top 3" semantic clean. Surface 500-row truncation via
  //    top_categories_truncated so the Tower UI can label it.
  let topCategories = [];
  let topCategoriesTruncated = false;
  if (catsR.status === 'fulfilled' && catsR.value?.ok) {
    const rows = await catsR.value.json().catch(() => null);
    if (Array.isArray(rows)) {
      topCategoriesTruncated = rows.length === 500;
      const counts = Object.create(null);
      const emojis = Object.create(null);
      for (const row of rows) {
        const key = row.category_name;
        if (!key) continue; // skip uncategorized
        counts[key] = (counts[key] || 0) + 1;
        if (!emojis[key]) emojis[key] = row.category_emoji || '';
      }
      topCategories = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, count]) => ({ name, count, emoji: emojis[name] }));
    } else {
      console.warn(
        'summary category aggregate non-array:',
        'admin=' + admin.userId,
        'target=' + targetUserId
      );
    }
  } else {
    console.warn(
      'summary category fetch failed (partial view):',
      'admin=' + admin.userId,
      'target=' + targetUserId
    );
  }

  // ── Audit ──
  logAdminRead(env, ctx, {
    admin_user_id: admin.userId,
    table_name: 'profile_summary',
    row_count: 1,
    query_hash: null,
  });

  return Response.json(
    {
      profile,
      transaction_counts: {
        total: txnTotal,
        last_7d: txn7d,
        last_30d: txn30d,
      },
      top_categories: topCategories,
      top_categories_truncated: topCategoriesTruncated,
      issue_counts: {
        app_errors_last_7d: appErrors7d,
        ai_errors_last_7d: aiErrors7d,
      },
      recovery_state: recoveryState,
    },
    { headers: CORS }
  );
}


// POST /admin/users/:id/view-transactions
//
// Returns last 20 non-deleted transactions for the target user.
// Privacy-sensitive — double-logged to both tower_admin_reads
// (read channel) and tower_admin_actions (action channel) per
// Session 21 plan. Admin operator should supply a reason.
//
// Field selection deliberately OMITS `note` — that's user-entered
// private annotations (e.g. "my mom paid me back for this"). The
// description field is kept because it's often the AI-parsed or
// user-typed label that makes a transaction identifiable. If a
// support case actually needs `note`, the operator can ask the
// user directly. Defensive-privacy default.
async function handleViewTransactions(request, env, ctx, targetUserId) {
  const admin = await requireAdmin(request, env);

  // ── Optional { reason?: string } body ──
  let reason = null;
  try {
    const raw = await request.json();
    if (raw && typeof raw.reason === 'string') {
      reason = raw.reason.slice(0, 500);
    }
  } catch {
    // empty/malformed body — treat as no reason
  }

  // ── Verify target exists (404 if not) ──
  //    Same rationale as Group C — FK constraint error would be
  //    less actionable than an explicit 404.
  const profRes = await supabaseRest(
    env,
    `/profiles?id=eq.${encodeURIComponent(targetUserId)}&select=id`
  );
  if (!profRes.ok) {
    console.error(
      'view-transactions profile check failed:',
      'admin=' + admin.userId,
      'target=' + targetUserId,
      'status=' + profRes.status
    );
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

  // ── Fetch last 20 transactions ──
  const txnRes = await supabaseRest(
    env,
    `/transactions?user_id=eq.${encodeURIComponent(targetUserId)}` +
      `&is_deleted=eq.false` +
      `&select=id,date,type,category_name,category_emoji,amount,currency,description,created_at` +
      `&order=created_at.desc&limit=20`
  );
  if (!txnRes.ok) {
    const txt = await txnRes.text().catch(() => '');
    console.error(
      'view-transactions fetch failed:',
      'admin=' + admin.userId,
      'target=' + targetUserId,
      'status=' + txnRes.status,
      txt.slice(0, 200)
    );
    // Log the FAILED read+action. Both channels because that's the
    // privacy-sensitive double-log contract — a failed attempt is
    // still a signal worth recording on both.
    logAdminRead(env, ctx, {
      admin_user_id: admin.userId,
      table_name: 'transactions',
      row_count: 0,
      query_hash: null,
    });
    logAdminAction(env, ctx, {
      admin_user_id: admin.userId,
      target_user_id: targetUserId,
      action_type: 'view_transactions',
      result: 'failed',
      error_message: 'fetch_failed_' + txnRes.status,
      metadata: { reason },
    });
    return Response.json(
      { error: 'db_error', message: 'Could not fetch transactions' },
      { status: 500, headers: CORS }
    );
  }
  const transactions = (await txnRes.json().catch(() => [])) || [];

  // ── Double-log success (Rule 17 audit) ──
  logAdminRead(env, ctx, {
    admin_user_id: admin.userId,
    table_name: 'transactions',
    row_count: transactions.length,
    query_hash: null,
  });
  logAdminAction(env, ctx, {
    admin_user_id: admin.userId,
    target_user_id: targetUserId,
    action_type: 'view_transactions',
    result: 'success',
    metadata: { reason, row_count: transactions.length },
  });

  return Response.json({ transactions }, { headers: CORS });
}


// ─── Route dispatcher ──────────────────────────────────────────
// Called from the main worker. Returns a Response if the path
// matches a support-console route; returns null otherwise so the
// main worker continues its own dispatch chain.
//
// Path ownership:
//   /recovery/*       → user-facing recovery endpoints
//   /admin/users/*    → admin-facing support-console endpoints
//
// Non-matching paths return null. Matching-prefix-but-unknown-
// route returns 404 (we "own" the prefix, so falling back to the
// main worker would be misleading).
export async function handleSupportConsoleRoute(url, request, env, ctx) {
  const path = url.pathname;
  const isRecovery = path.startsWith('/recovery/');
  const isAdminUsers = path.startsWith('/admin/users/');
  if (!isRecovery && !isAdminUsers) return null;

  // Only POST + GET are expected on these routes. OPTIONS preflight
  // is handled by the main worker before this dispatcher is called.
  if (request.method !== 'POST' && request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405, headers: CORS });
  }

  try {
    // Groups B/C/D will insert their route handlers here.
    // Each handler is a small async function guarded by its own
    // requireAuth / requireAdmin call, returning a Response.

    // ─── Group B — user-facing recovery endpoints ─────────────
    if (path === '/recovery/request-pin-reset' && request.method === 'POST') {
      return handleRequestPinReset(request, env);
    }
    if (path === '/recovery/status' && request.method === 'GET') {
      return handleRecoveryStatus(request, env);
    }
    if (path === '/recovery/complete-pin-reset' && request.method === 'POST') {
      return handleCompletePinReset(request, env);
    }

    // ─── Group C — admin approval endpoints ──────────────────
    if (request.method === 'POST') {
      const pinTarget = extractTargetUserId(path, 'approve-pin-reset');
      if (pinTarget) {
        return handleApprovePinReset(request, env, ctx, pinTarget);
      }
      const pwTarget = extractTargetUserId(path, 'approve-password-reset');
      if (pwTarget) {
        return handleApprovePasswordReset(request, env, ctx, pwTarget);
      }
    }

    // ─── Group D — admin summary endpoints ───────────────────
    if (path === '/admin/users/search' && request.method === 'POST') {
      return handleSearchUsers(request, env, ctx);
    }
    if (request.method === 'GET') {
      const summaryTarget = extractTargetUserId(path, 'summary');
      if (summaryTarget) {
        return handleUserSummary(request, env, ctx, summaryTarget);
      }
    }
    if (request.method === 'POST') {
      const viewTarget = extractTargetUserId(path, 'view-transactions');
      if (viewTarget) {
        return handleViewTransactions(request, env, ctx, viewTarget);
      }
    }

    return new Response('Not found', { status: 404, headers: CORS });
  } catch (err) {
    if (err?.isAuthError) return authErrorResponse(err);
    console.error('support-console dispatcher error:', err?.message || 'unknown');
    return internalErrorResponse();
  }
}


// ─── Exports for test + future reuse ──────────────────────────
// The helpers are exported so future endpoints (Session 22+) can
// build on them without re-implementing auth / audit patterns.
// AuthError + response shapers are internal-only for now; promote
// to exports if a test harness needs them.
