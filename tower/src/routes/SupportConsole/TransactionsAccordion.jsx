// TransactionsAccordion — collapsible last-20-txns viewer for admin.
//
// Session 22 · Room 6. Privacy-sensitive; worker double-logs to both
// tower_admin_reads AND tower_admin_actions. `note` field omitted
// server-side (Session 21 privacy default) so we can't render it here
// even if we wanted to.
//
// Behavior:
//   - Starts collapsed
//   - First expand → POST worker /view-transactions with optional
//     reason → cache results in local state
//   - Subsequent close/reopen → render from cache (no re-fetch)
//   - Unmounts when admin selects a different user (UserDetailPanel
//     remounts us with new userId), dropping the cache — correct,
//     since we don't want to show user A's txns under user B's header

import { useState } from "react";
import { useFetchAdmin } from "./hooks/useFetchAdmin";

function fmtAmount(amount, currency) {
  const n = Number(amount) || 0;
  if (currency === "LAK") return `${n.toLocaleString()} ${currency}`;
  return `${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function TxnRow({ tx }) {
  const typeColor = tx.type === "income" ? "text-emerald-400" : "text-slate-300";
  const typeSign = tx.type === "income" ? "+" : "−";
  return (
    <div className="flex items-start gap-3 px-3 py-2 border-b border-slate-800/50 last:border-b-0 text-[12px]">
      <div className="w-6 h-6 shrink-0 rounded-sm bg-slate-800 flex items-center justify-center text-[13px]">
        {tx.category_emoji || "•"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-slate-200 font-medium">{tx.category_name || "—"}</span>
          <span className="text-slate-600 text-[10px] font-mono">{tx.date}</span>
        </div>
        <div className="text-[11px] text-slate-500 truncate">{tx.description || "—"}</div>
      </div>
      <div className={`shrink-0 font-mono text-[12.5px] ${typeColor}`}>
        {typeSign}{fmtAmount(tx.amount, tx.currency)}
      </div>
    </div>
  );
}

export function TransactionsAccordion({ userId, totalCount = null }) {
  const fetchAdmin = useFetchAdmin();
  const [isOpen, setIsOpen] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [transactions, setTransactions] = useState([]);

  const toggle = async () => {
    const next = !isOpen;
    setIsOpen(next);
    // Lazy fetch on first expand only. Subsequent opens serve from cache.
    if (next && !fetched && !loading) {
      setLoading(true);
      setError(null);
      const res = await fetchAdmin(
        `/admin/users/${encodeURIComponent(userId)}/view-transactions`,
        {
          method: "POST",
          body: JSON.stringify({ reason: "tower_room6_view" }),
        }
      );
      setLoading(false);
      setFetched(true);
      if (!res.ok) {
        setError(res.error || "Failed to load transactions");
        return;
      }
      setTransactions(res.data?.transactions || []);
    }
  };

  const countLabel = totalCount != null
    ? `${Math.min(totalCount, 20)} of ${totalCount} recent`
    : `recent`;

  return (
    <div className="border border-slate-800 bg-slate-900/40 rounded-sm">
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-slate-800/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-orange-500/80 text-[10px]">{isOpen ? "▾" : "▸"}</span>
          <span className="hud-kicker text-slate-300">Recent transactions</span>
        </div>
        <span className="hud-label text-[10px] text-slate-500">{countLabel}</span>
      </button>
      {isOpen && (
        <div className="border-t border-slate-800/70">
          {loading && <div className="px-3 py-6 text-center text-[11px] text-slate-500">Loading…</div>}
          {error && <div className="px-3 py-3 text-[11px] text-red-400">{error}</div>}
          {!loading && !error && transactions.length === 0 && (
            <div className="px-3 py-6 text-center text-[11px] text-slate-500">No transactions.</div>
          )}
          {transactions.length > 0 && (
            <div>
              {transactions.map((tx) => <TxnRow key={tx.id} tx={tx} />)}
            </div>
          )}
          <div className="px-3 py-2 border-t border-slate-800/60 text-[10px] font-mono tracking-wider uppercase text-slate-600">
            ⚑ Privacy: note field omitted. Access logged.
          </div>
        </div>
      )}
    </div>
  );
}
