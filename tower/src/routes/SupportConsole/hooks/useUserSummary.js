// useUserSummary — fetch a user's full support-safe summary from
// worker /admin/users/:id/summary. Audited to tower_admin_reads.
//
// Session 22 · Room 6. Called when admin selects a user from
// PendingQueue or UserSearch results.
//
// Cache: single-user state, re-fetched on userId change. If
// admin wants fresh data for same user, call refresh().

import { useState, useEffect, useCallback } from "react";
import { useFetchAdmin } from "./useFetchAdmin";

export function useUserSummary(userId) {
  const fetchAdmin = useFetchAdmin();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    if (!userId) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetchAdmin(
      `/admin/users/${encodeURIComponent(userId)}/summary`,
      { method: "GET" }
    );
    if (!res.ok) {
      setError(res.error || "Failed to load user summary");
      setData(null);
    } else {
      setData(res.data);
    }
    setLoading(false);
  }, [userId, fetchAdmin]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refresh: fetch };
}
