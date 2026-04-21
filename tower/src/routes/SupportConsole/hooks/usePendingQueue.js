// usePendingQueue — fetches the admin "pending-requests" queue via
// the worker endpoint, which returns rows already filtered,
// classified, and enriched with profile data.
//
// Session 23 Batch 5 (I-14 consumer) — closes R22-1. Session 22's
// original direct-Supabase implementation used admin-read RLS on
// user_recovery_state + profiles with a client-side isPending()
// filter and classify() helper. Those are no longer needed: the
// worker's GET /admin/pending-requests is the single source of
// truth for the queue state, and it audit-logs each read uniformly
// with the rest of Tower Room 6.
//
// Contract unchanged: { rows, loading, error, lastFetchAt, refresh }.
// Each row shape now carries server-embedded _classification
// ({ flow, stage, requested_at | expires_at }) and _profile
// ({ id, display_name, phone, avatar } | null). PendingQueue.jsx
// already consumes those fields by the same names — no consumer
// changes required in this batch.

import { useState, useEffect, useCallback } from "react";
import { useFetchAdmin } from "./useFetchAdmin";

export function usePendingQueue() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetchAt, setLastFetchAt] = useState(null);

  const fetchAdmin = useFetchAdmin();

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchAdmin("/admin/pending-requests", { method: "GET" });
    if (!res.ok) {
      setError(res.error || "Failed to load pending queue");
      setLoading(false);
      return;
    }
    setRows(Array.isArray(res.data?.rows) ? res.data.rows : []);
    setLastFetchAt(new Date());
    setLoading(false);
  }, [fetchAdmin]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { rows, loading, error, lastFetchAt, refresh };
}
