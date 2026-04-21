// useFetchAdmin — token-refresh-aware wrapper for worker admin endpoints.
//
// Session 22 · Room 6 Support Console. Used by worker-mediated calls
// only (search / summary / view-transactions / approve-*). Direct
// Supabase reads (pending queue, profile enrichment) don't go through
// this — the supabase-js client handles its own token refresh.
//
// Behavior:
//   1. Fetches the current session access_token lazily (not cached in
//      closure — each call re-asks `supabase.auth.getSession()`) so a
//      silently-refreshed token from onAuthStateChange picks up on the
//      NEXT call without the consumer re-rendering.
//   2. On 401 response: calls `supabase.auth.refreshSession()` and
//      retries ONCE with the new token. If still 401 → returns the
//      401 result. Consumer must handle "re-auth needed" (typically
//      routing to /login via AdminGate picking up the session change).
//   3. Returns a structured { ok, status, data, error } shape. No
//      throws — consumers branch on `ok` (mirrors Session 21.6's
//      src/lib/recovery.js fail-closed contract).
//
// Timeout: 10s default. Worker endpoints typically respond in 200-
// 500ms but summary is multi-aggregate and occasionally slower.

import { useCallback } from "react";
import { supabase } from "../../../lib/supabase";

const API_BASE = "https://api.phajot.com";
const DEFAULT_TIMEOUT_MS = 10000;

async function getAccessToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data?.session?.access_token || null;
}

async function doFetch(path, options, token, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });
    const body = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data: body };
  } finally {
    clearTimeout(timer);
  }
}

export function useFetchAdmin() {
  const fetchAdmin = useCallback(async (path, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) => {
    let token = await getAccessToken();
    if (!token) {
      return {
        ok: false,
        status: 0,
        code: "no_session",
        error: "No session token available",
      };
    }
    try {
      let res = await doFetch(path, options, token, timeoutMs);
      // 401 → attempt refresh + single retry.
      // Supabase JWT is 1hr by default; a long Tower session hits this
      // on warm admin investigations. autoRefreshToken on the client
      // usually keeps this ahead, but belt-and-braces.
      if (res.status === 401) {
        const refreshRes = await supabase.auth.refreshSession();
        const newToken = refreshRes?.data?.session?.access_token;
        if (newToken) {
          res = await doFetch(path, options, newToken, timeoutMs);
        }
      }
      if (!res.ok) {
        return {
          ok: false,
          status: res.status,
          code: res.data?.error || `http_${res.status}`,
          error: res.data?.message || `Request failed: ${res.status}`,
          data: res.data,
        };
      }
      return { ok: true, status: res.status, data: res.data };
    } catch (e) {
      return {
        ok: false,
        status: 0,
        code: e?.name === "AbortError" ? "timeout" : "network",
        error: e?.message || "Network error",
      };
    }
  }, []);

  return fetchAdmin;
}
