// UserSearch — phone-substring search via worker /admin/users/search.
// Audited to tower_admin_reads (query_hash = sha256 of cleaned digits).
//
// Session 22 · Room 6. D22-Q1: explicit Go button, no debouncing.
// Each submission is 1 + N subrequests worker-side — accidental
// keystrokes shouldn't burn that budget.
//
// Input validation mirrors worker contract (3+ digits cleaned).
// Returns up to 50 rows; shows "refine your search" banner at cap.

import { useState } from "react";
import { Module, Btn, StatusPill } from "../../components/shared";
import { useFetchAdmin } from "./hooks/useFetchAdmin";

function Row({ user, onSelect }) {
  const initial = (user.display_name || "?").charAt(0).toUpperCase();
  return (
    <button
      onClick={() => onSelect(user.id)}
      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-800/40 border-b border-slate-800/60 last:border-b-0 transition-colors"
    >
      <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-[12px] font-semibold text-slate-100">
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] text-slate-200 truncate">
          {user.display_name || <span className="text-slate-500">{user.id.slice(0, 8)}…</span>}
        </div>
        <div className="hud-label text-[10px] text-slate-500 truncate">
          {user.phone || "—"} · {user.total_transactions ?? "—"} tx
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        {user.is_admin && <StatusPill kind="info" label="ADMIN" size="sm" />}
        {user.is_pro && <StatusPill kind="ok" label="PRO" size="sm" />}
        {user.has_pending_request && <StatusPill kind="warn" label="PENDING" size="sm" />}
      </div>
    </button>
  );
}

export function UserSearch({ onSelectUser }) {
  const fetchAdmin = useFetchAdmin();
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState([]);

  const cleaned = query.replace(/\D/g, "");
  const canSubmit = cleaned.length >= 3 && !loading;

  const submit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    setSubmitted(true);
    const res = await fetchAdmin("/admin/users/search", {
      method: "POST",
      body: JSON.stringify({ query: cleaned, limit: 50 }),
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.error || "Search failed");
      setResults([]);
      return;
    }
    setResults(res.data?.results || []);
  };

  const atCap = results.length === 50;

  return (
    <Module code="SEARCH" title="Find User" pad={false}>
      <div className="p-4 flex items-center gap-2 border-b border-slate-800/60">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Phone digits (min 3)"
          className="flex-1 bg-slate-900/60 border border-slate-700 rounded-sm px-3 py-2 text-[13px] text-slate-100 font-mono tracking-wide focus:outline-none focus:border-orange-500/60"
        />
        <Btn onClick={submit} variant={canSubmit ? "primary" : "ghost"} size="md">
          {loading ? "…" : "Go"}
        </Btn>
      </div>

      {error && (
        <div className="px-4 py-3 text-[12px] text-red-400 border-b border-slate-800/60">
          {error}
        </div>
      )}

      {atCap && (
        <div className="px-4 py-2 text-[11px] text-amber-400 bg-amber-500/5 border-b border-slate-800/60 font-mono">
          50+ results — refine your search
        </div>
      )}

      {!loading && submitted && !error && results.length === 0 && (
        <div className="px-4 py-8 text-center text-[12px] text-slate-500">
          No users match "{cleaned}".
        </div>
      )}

      {results.length > 0 && (
        <div>
          {results.map((u) => (
            <Row key={u.id} user={u} onSelect={onSelectUser} />
          ))}
        </div>
      )}
    </Module>
  );
}
