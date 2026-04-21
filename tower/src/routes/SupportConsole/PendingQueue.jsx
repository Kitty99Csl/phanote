// PendingQueue — list of users with active recovery requests.
//
// Session 22 · Room 6. Data from usePendingQueue (direct Supabase
// admin-read RLS). Row-click selects user for UserDetailPanel.
//
// Shows, per row:
//   - Avatar / display_name / phone
//   - Classification badge: [PIN · Pending admin] or [PIN · Awaiting user · 12m]
//   - "also approved by other admin" subtle badge when approved_by !==
//     current admin (Gemini concurrency addition)
//
// Empty state: "No pending requests ✓" — positive messaging per D22-Q5.

import { Module, Btn, StatusPill } from "../../components/shared";

function ageLabel(iso) {
  if (!iso) return null;
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

function remainingLabel(iso) {
  if (!iso) return null;
  const secs = Math.floor((new Date(iso).getTime() - Date.now()) / 1000);
  if (secs <= 0) return "expired";
  if (secs < 60) return `${secs}s left`;
  return `${Math.floor(secs / 60)}m left`;
}

function RowBadge({ classification }) {
  if (!classification) return null;
  const { flow, stage, requested_at, expires_at } = classification;
  const flowLabel = flow === "pin" ? "PIN" : "PASSWORD";
  if (stage === "awaiting_admin") {
    return (
      <span className="inline-flex items-center gap-2">
        <StatusPill kind="warn" label={`${flowLabel} · AWAITING ADMIN`} size="sm" />
        <span className="text-[10px] text-slate-500 font-mono">{ageLabel(requested_at)}</span>
      </span>
    );
  }
  if (stage === "approved") {
    return (
      <span className="inline-flex items-center gap-2">
        <StatusPill kind="info" label={`${flowLabel} · APPROVED`} size="sm" />
        <span className="text-[10px] text-slate-500 font-mono">{remainingLabel(expires_at)}</span>
      </span>
    );
  }
  return null;
}

function Row({ row, onSelect, currentAdminId }) {
  const profile = row._profile;
  const initial = (profile?.display_name || "?").charAt(0).toUpperCase();
  const approvedByOther = row.approved_by && row.approved_by !== currentAdminId;
  return (
    <button
      onClick={() => onSelect(row.user_id)}
      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-800/40 border-b border-slate-800/60 last:border-b-0 transition-colors"
    >
      <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-orange-500/70 to-amber-700/70 flex items-center justify-center text-[12px] font-semibold text-slate-950">
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] text-slate-200 truncate">
          {profile?.display_name || <span className="text-slate-500">{row.user_id.slice(0, 8)}…</span>}
        </div>
        <div className="hud-label text-[10px] text-slate-500 truncate">
          {profile?.phone || "—"}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <RowBadge classification={row._classification} />
        {approvedByOther && (
          <span className="text-[9.5px] font-mono tracking-[0.1em] uppercase text-amber-500/80">
            ◆ approved by other admin
          </span>
        )}
      </div>
    </button>
  );
}

export function PendingQueue({ rows, loading, error, lastFetchAt, onRefresh, onSelectUser, currentAdminId }) {
  const count = rows.length;
  const lastFetchLabel = lastFetchAt
    ? `Updated ${ageLabel(lastFetchAt.toISOString())}`
    : null;

  return (
    <Module
      code="QUEUE"
      title={`Pending Requests · ${count}`}
      action={
        <div className="flex items-center gap-3">
          {lastFetchLabel && <span className="hud-label text-slate-500">{lastFetchLabel}</span>}
          <Btn onClick={onRefresh} size="sm" variant="ghost">
            {loading ? "…" : "Refresh"}
          </Btn>
        </div>
      }
      pad={false}
    >
      {error && (
        <div className="px-4 py-3 text-[12px] text-red-400 border-b border-slate-800/60">
          Failed to load queue: {error}
        </div>
      )}
      {!loading && !error && count === 0 && (
        <div className="px-4 py-10 text-center">
          <div className="text-[14px] text-emerald-400">No pending requests ✓</div>
          <div className="text-[11px] text-slate-500 mt-1">All clear.</div>
        </div>
      )}
      {count > 0 && (
        <div>
          {rows.map((row) => (
            <Row key={row.user_id} row={row} onSelect={onSelectUser} currentAdminId={currentAdminId} />
          ))}
        </div>
      )}
    </Module>
  );
}
