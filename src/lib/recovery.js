// Recovery API — client-side helpers for the /recovery/* worker
// endpoints added in Session 21 Sprint I Commit 2.
//
// All three helpers:
//   - require a Supabase access_token (caller passes it in)
//   - use fetchWithTimeout per Rule 10 (5s for status/request,
//     10s for complete since it does two DB writes worker-side)
//   - fail-closed: any error path returns a structured { error }
//     object rather than throwing, so callers (App.jsx login
//     flow, SetNewPin screen) can distinguish expected failures
//     (401/403/410) from transient/network issues without
//     try/catch plumbing
//
// Rule 17 note: these endpoints are worker-mediated (service-role
// writes on the worker side). From the client's perspective, they
// are the single entry point for ALL credential-adjacent state
// changes. The client should NEVER bypass this module to write
// directly to Supabase — RLS on user_recovery_state has no user-
// side INSERT/UPDATE policy by design (Migration 014 header).

import { fetchWithTimeout, FetchTimeoutError } from "./fetchWithTimeout";

const API_BASE = "https://api.phajot.com";

// Shape of every resolved value:
//   { ok: true, data: <endpoint response body> }
//   { ok: false, status: <http code | 0>, code: <error code string>, message: <human string> }
// The status:0 path covers network errors + timeouts — callers treat
// as "transient, retryable" rather than a worker-issued error code.

// ─── requestPinReset ───────────────────────────────────────────
// POST /recovery/request-pin-reset
// Expected response: { status: 'requested', requested_at: iso }
export async function requestPinReset(accessToken) {
  if (!accessToken) {
    return { ok: false, status: 0, code: "missing_token", message: "No session token provided" };
  }
  try {
    const res = await fetchWithTimeout(
      `${API_BASE}/recovery/request-pin-reset`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: "{}",
      },
      5000
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        code: data.error || "http_" + res.status,
        message: data.message || "Request failed",
      };
    }
    return { ok: true, data };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      code: e instanceof FetchTimeoutError ? "timeout" : "network",
      message: e?.message || "Network error",
    };
  }
}

// ─── getRecoveryStatus ─────────────────────────────────────────
// GET /recovery/status
// Expected response: the user_recovery_state row, or {} if none.
// Fail-closed per Session 21 plan: caller treats any !ok result
// as "skip recovery check this login, proceed to normal flow".
export async function getRecoveryStatus(accessToken) {
  if (!accessToken) {
    return { ok: false, status: 0, code: "missing_token", message: "No session token provided" };
  }
  try {
    const res = await fetchWithTimeout(
      `${API_BASE}/recovery/status`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
      5000
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        code: data.error || "http_" + res.status,
        message: data.message || "Status check failed",
      };
    }
    return { ok: true, data };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      code: e instanceof FetchTimeoutError ? "timeout" : "network",
      message: e?.message || "Network error",
    };
  }
}

// ─── completePinReset ──────────────────────────────────────────
// POST /recovery/complete-pin-reset
// Body: { new_pin: "NNNN" } — exactly 4 digits per worker contract
// Expected success: { status: 'completed' } or
//                   { status: 'completed', warning: 'state_cleanup_pending' }
// Expected failures (caller surfaces specific i18n messages):
//   400 bad_pin       — malformed (caller validated; shouldn't happen)
//   403 not_approved  — no pending/approved recovery state
//   410 expired       — approval window elapsed
//   500 db_error      — transient; retry
// Timeout 10s — worker does read + 2 PATCH writes sequentially.
export async function completePinReset(accessToken, newPin) {
  if (!accessToken) {
    return { ok: false, status: 0, code: "missing_token", message: "No session token provided" };
  }
  // Client-side validation mirrors the worker's /^\d{4}$/ so we fail fast
  // without the round-trip. Any bypass would be caught by the worker
  // anyway (defense in depth).
  if (typeof newPin !== "string" || !/^\d{4}$/.test(newPin)) {
    return { ok: false, status: 0, code: "bad_pin", message: "PIN must be exactly 4 digits" };
  }
  try {
    const res = await fetchWithTimeout(
      `${API_BASE}/recovery/complete-pin-reset`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ new_pin: newPin }),
      },
      10000
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        code: data.error || "http_" + res.status,
        message: data.message || "PIN reset failed",
      };
    }
    return { ok: true, data };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      code: e instanceof FetchTimeoutError ? "timeout" : "network",
      message: e?.message || "Network error",
    };
  }
}
