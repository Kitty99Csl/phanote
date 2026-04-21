/**
 * Support Console — shared helpers.
 *
 * Auth gates (requireAuth / requireAdmin), service-role REST fetch
 * wrapper, audit loggers (logAdminRead / logAdminAction), crypto
 * helpers, PostgREST count helper, path parsing, and small shared
 * classification utilities.
 *
 * Exported for consumption by sibling handler modules in this
 * directory and by the dispatcher in index.js. No handler logic
 * lives here.
 *
 * Session 23 Batch 6 (I-10): extracted from the original
 * workers/lib/support-console.js (1498 lines) into a directory
 * package. Zero behavior changes from that split.
 */


// ─── CORS ──────────────────────────────────────────────────────
// Mirrors phanote-api-worker.js. Keep in sync if main worker
// changes its CORS headers. Not DRY-extracted because doing so
// would require main worker to export it, increasing churn scope.
// Duplication is deliberate and bounded.
export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};


// ─── Tunables ──────────────────────────────────────────────────
// 30-minute window for approved resets. Locked in Session 21 DECISIONS
// (D21-Q3 family-beta pragmatics). Named constant so future sessions
// can tune without hunting magic numbers.
export const APPROVAL_WINDOW_MS = 30 * 60 * 1000;

// Standard v4 UUID shape; Supabase PK format. Used to reject obviously
// malformed target_user_id URL params before any DB call.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;


// ─── Error types + response shaping ────────────────────────────
// AuthError lets the caller distinguish expected auth failures
// (401/403/410) from unexpected 500s. isAuthError=true on the
// thrown instance.
export class AuthError extends Error {
  constructor(status, code, message) {
    super(message);
    this.isAuthError = true;
    this.status = status;
    this.code = code;
  }
}

export function authErrorResponse(err) {
  return Response.json(
    { error: err.code, message: err.message },
    { status: err.status, headers: CORS }
  );
}

export function internalErrorResponse(message) {
  return Response.json(
    { error: 'internal', message: message || 'Internal server error' },
    { status: 500, headers: CORS }
  );
}


// ─── Supabase REST fetch helper ────────────────────────────────
// All calls here use service role. Service role bypasses RLS; for
// anything we want RLS-gated we'd use the user's token instead —
// but the support-console endpoints all perform admin-gated or
// user-gated logic in worker code, so service-role is correct.
export async function supabaseRest(env, path, options = {}) {
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
    // audit trail slot reserved in Session 23 Migration 016
    // (tower_admin_actions.action_type CHECK now includes
    // 'unauthorized_admin_attempt') — write path not yet implemented.
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
// action_type is CHECK-constrained in the DB (Migrations 014, 016).
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
// Used by /admin/users/search for query_hash audit field. Web
// Crypto is available in the Cloudflare Workers runtime.
//
// NOTE on threat model: this hash is a coarse correlation signal
// ("same admin searched the same thing again"), not a cryptographic
// secret. Phone-number input space is small enough that a determined
// reverser could dictionary-attack it — acceptable for operator audit
// but not for PII protection. If we ever need the latter, switch to
// HMAC with a per-env salt.
export async function sha256Hex(text) {
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
export async function countViaHead(env, table, filters) {
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


// ─── Path parsing: /admin/users/:id/<suffix> ───────────────────
// Returns the UUID if all of {prefix, uuid-shape, suffix-exact-match}
// hold, else null. Keeps the dispatcher readable and UUID validation
// out of the handlers.
export function extractTargetUserId(path, suffix) {
  const prefix = '/admin/users/';
  if (!path.startsWith(prefix)) return null;
  const rest = path.slice(prefix.length);
  const needle = '/' + suffix;
  if (!rest.endsWith(needle)) return null;
  const id = rest.slice(0, -needle.length);
  return UUID_RE.test(id) ? id : null;
}


// ─── Pending-request classification ────────────────────────────

// Shape the has_pending_request boolean for the search response.
// Requested-but-not-approved on either flow = pending.
export function derivePendingRequest(recoveryRow) {
  if (!recoveryRow || typeof recoveryRow !== 'object') return false;
  const pinPending =
    !!recoveryRow.pin_reset_requested_at &&
    !recoveryRow.pin_reset_approved_at;
  const pwPending =
    !!recoveryRow.password_reset_requested_at &&
    !recoveryRow.password_reset_approved_at;
  return pinPending || pwPending;
}


// Richer classification for /admin/pending-requests. Returns a
// { flow, stage, … } object if the row is in any pending state, or
// null if fully idle. Distinct from derivePendingRequest (boolean,
// awaiting-admin only) because the queue listing needs to surface
// approved-awaiting-user rows too. Priority: approved-awaiting-user
// ranked ahead of awaiting-admin on each flow (approved-with-timer
// is more time-sensitive).
export function classifyPendingRequest(row) {
  if (!row || typeof row !== 'object') return null;
  const nowMs = Date.now();
  const notExpired = (iso) => !!iso && new Date(iso).getTime() > nowMs;

  if (row.pin_reset_required && notExpired(row.pin_reset_expires_at)) {
    return { flow: 'pin', stage: 'approved', expires_at: row.pin_reset_expires_at };
  }
  if (row.password_reset_required && notExpired(row.password_reset_expires_at)) {
    return { flow: 'password', stage: 'approved', expires_at: row.password_reset_expires_at };
  }
  if (row.pin_reset_requested_at && !row.pin_reset_approved_at) {
    return { flow: 'pin', stage: 'awaiting_admin', requested_at: row.pin_reset_requested_at };
  }
  if (row.password_reset_requested_at && !row.password_reset_approved_at) {
    return { flow: 'password', stage: 'awaiting_admin', requested_at: row.password_reset_requested_at };
  }
  return null;
}


// Fetch the user_recovery_state row for a single user. Returns the
// row object (or null if absent / any error). Used by /search and
// /summary endpoints — PostgREST embedded resource syntax failed in
// Session 21 deploy-time smoke testing (500 on both endpoints even
// after NOTIFY pgrst schema reload), so we fall back to explicit
// per-user fetches.
//
// R21-11 in docs/session-21/RISKS.md tracks the embedded-resource
// investigation — likely requires explicit FK-name syntax or a
// schema-relationship grant that Migration 014 didn't emit.
export async function fetchRecoveryForUser(env, userId) {
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
export function settledCount(result) {
  if (result.status !== 'fulfilled') return null;
  return typeof result.value === 'number' ? result.value : null;
}
