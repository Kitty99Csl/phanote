// usePendingQueue — direct Supabase read of user_recovery_state
// + profile enrichment via .in('id', userIds).
//
// Session 22 · Room 6. Uses admin-read RLS (Migration 014+015)
// for both tables. No worker endpoint exists for this list yet
// (R22-1 tracks for Session 23).
//
// Returns rows matching ANY pending state:
//   - pin_reset_requested && !pin_reset_approved (awaiting admin)
//   - password_reset_requested && !password_reset_approved
//   - pin_reset_required && !expired (approved, awaiting user)
//   - password_reset_required && !expired (approved, awaiting user)
//
// In-memory filter chosen over complex PostgREST .or() clauses —
// user_recovery_state is small for family-beta (few rows max at
// any time). Revisit if row count grows past ~50.

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../lib/supabase";

function isPending(row) {
  const now = Date.now();
  const notExpired = (iso) => iso && new Date(iso).getTime() > now;
  const pinAwaitingAdmin = !!row.pin_reset_requested_at && !row.pin_reset_approved_at;
  const pwAwaitingAdmin = !!row.password_reset_requested_at && !row.password_reset_approved_at;
  const pinAwaitingUser = row.pin_reset_required && notExpired(row.pin_reset_expires_at);
  const pwAwaitingUser = row.password_reset_required && notExpired(row.password_reset_expires_at);
  return pinAwaitingAdmin || pwAwaitingAdmin || pinAwaitingUser || pwAwaitingUser;
}

function classify(row) {
  const now = Date.now();
  const notExpired = (iso) => iso && new Date(iso).getTime() > now;
  // Which flow + which stage. UI uses this for badges.
  if (row.pin_reset_required && notExpired(row.pin_reset_expires_at)) {
    return { flow: "pin", stage: "approved", expires_at: row.pin_reset_expires_at };
  }
  if (row.password_reset_required && notExpired(row.password_reset_expires_at)) {
    return { flow: "password", stage: "approved", expires_at: row.password_reset_expires_at };
  }
  if (row.pin_reset_requested_at && !row.pin_reset_approved_at) {
    return { flow: "pin", stage: "awaiting_admin", requested_at: row.pin_reset_requested_at };
  }
  if (row.password_reset_requested_at && !row.password_reset_approved_at) {
    return { flow: "password", stage: "awaiting_admin", requested_at: row.password_reset_requested_at };
  }
  return null;
}

export function usePendingQueue() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetchAt, setLastFetchAt] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: recoveryRows, error: recoveryErr } = await supabase
        .from("user_recovery_state")
        .select("*")
        .order("updated_at", { ascending: false });
      if (recoveryErr) throw recoveryErr;

      const pending = (recoveryRows || []).filter(isPending);
      if (pending.length === 0) {
        setRows([]);
        setLastFetchAt(new Date());
        setLoading(false);
        return;
      }

      const userIds = [...new Set(pending.map((r) => r.user_id))];
      const { data: profiles, error: profErr } = await supabase
        .from("profiles")
        .select("id, display_name, phone, avatar")
        .in("id", userIds);
      if (profErr) throw profErr;

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

      const enriched = pending.map((row) => ({
        ...row,
        _classification: classify(row),
        _profile: profileMap.get(row.user_id) || null,
      }));
      setRows(enriched);
      setLastFetchAt(new Date());
    } catch (e) {
      setError(e?.message || "Failed to load pending queue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { rows, loading, error, lastFetchAt, refresh: fetch };
}
