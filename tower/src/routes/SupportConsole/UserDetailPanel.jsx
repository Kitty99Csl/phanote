// UserDetailPanel — right column of Room 6. Shows full summary for
// the currently-selected user, with approve buttons + recent-txns
// accordion.
//
// Session 22 · Room 6. Data from useUserSummary (worker-mediated,
// audited to tower_admin_reads).
//
// Session 23 Batch 1 (I-13): worker query dropped the stale
// level=eq.error filter (app_events has no such column) and
// renamed the response field app_errors_last_7d → events_last_7d.
// Rendered always with "—" fallback, mirroring AI errors pattern.
// Closes R21-12.

import { Module, StatusPill, Stat, Btn } from "../../components/shared";
import { TransactionsAccordion } from "./TransactionsAccordion";
import { ApproveButton } from "./ApproveButton";

function ageLabel(iso) {
  if (!iso) return "—";
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

// Derive a concise recovery-state signal from the embedded row.
// Priority: approved-awaiting-user > awaiting-admin > none.
function summarizeRecovery(rs) {
  if (!rs) return { label: "No active request", tone: "idle" };
  const now = Date.now();
  const notExpired = (iso) => iso && new Date(iso).getTime() > now;

  if (rs.pin_reset_required && notExpired(rs.pin_reset_expires_at)) {
    return { label: `PIN approved · ${remainingLabel(rs.pin_reset_expires_at)} to complete`, tone: "info" };
  }
  if (rs.password_reset_required && notExpired(rs.password_reset_expires_at)) {
    return { label: `Password approved · ${remainingLabel(rs.password_reset_expires_at)} to complete`, tone: "info" };
  }
  if (rs.pin_reset_requested_at && !rs.pin_reset_approved_at) {
    return { label: `PIN reset · Awaiting admin (requested ${ageLabel(rs.pin_reset_requested_at)})`, tone: "warn", canApprove: "pin" };
  }
  if (rs.password_reset_requested_at && !rs.password_reset_approved_at) {
    return { label: `Password reset · Awaiting admin (requested ${ageLabel(rs.password_reset_requested_at)})`, tone: "warn", canApprove: "password" };
  }
  return { label: "No active request", tone: "idle" };
}

export function UserDetailPanel({ userId, summary, loading, error, onRefresh, onClose, onApproved, onError }) {
  if (!userId) {
    return (
      <Module code="DETAIL" title="User Detail" pad={true}>
        <div className="text-[12px] text-slate-500 text-center py-12">
          Select a user from the queue or search to view details.
        </div>
      </Module>
    );
  }

  if (loading) {
    return (
      <Module code="DETAIL" title="User Detail" pad={true}>
        <div className="text-[12px] text-slate-500 text-center py-12">Loading summary…</div>
      </Module>
    );
  }

  if (error) {
    return (
      <Module code="DETAIL" title="User Detail" pad={true}>
        <div className="text-[12px] text-red-400 text-center py-6">{error}</div>
        <div className="flex justify-center"><Btn onClick={onRefresh} size="sm">Retry</Btn></div>
      </Module>
    );
  }

  if (!summary) return null;

  const { profile, transaction_counts, top_categories, top_categories_truncated, issue_counts, recovery_state } = summary;
  const recovery = summarizeRecovery(recovery_state);

  return (
    <Module
      code="DETAIL"
      title="User Detail"
      action={
        <div className="flex items-center gap-2">
          <Btn onClick={onRefresh} size="sm" variant="ghost">Refresh</Btn>
          <Btn onClick={onClose} size="sm" variant="ghost">Close</Btn>
        </div>
      }
      pad={false}
    >
      {/* Profile header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-800/60">
        <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-orange-500/70 to-amber-700/70 flex items-center justify-center text-[14px] font-semibold text-slate-950">
          {(profile?.display_name || "?").charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] text-slate-100 truncate">{profile?.display_name || "—"}</div>
          <div className="hud-label text-[10px] text-slate-500 truncate">
            {profile?.phone || "—"} · {profile?.language || "—"} · {profile?.base_currency || "—"}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {profile?.is_admin && <StatusPill kind="info" label="ADMIN" size="sm" />}
          {profile?.is_pro && <StatusPill kind="ok" label="PRO" size="sm" />}
        </div>
      </div>

      {/* Recovery-state signal */}
      <div className="px-4 py-3 border-b border-slate-800/60">
        <div className="hud-label text-slate-500 mb-1.5">Recovery state</div>
        <div className="flex items-center justify-between gap-3">
          <div className="text-[12.5px] text-slate-200 min-w-0">{recovery.label}</div>
          {recovery.canApprove && (
            <ApproveButton
              userId={userId}
              flow={recovery.canApprove}
              onApproved={onApproved}
              onError={onError}
            />
          )}
        </div>
      </div>

      {/* Transaction counts */}
      <div className="px-4 py-4 border-b border-slate-800/60 grid grid-cols-3 gap-3">
        <Stat label="Total tx" value={transaction_counts?.total ?? "—"} size="sm" />
        <Stat label="Last 7d" value={transaction_counts?.last_7d ?? "—"} size="sm" />
        <Stat label="Last 30d" value={transaction_counts?.last_30d ?? "—"} size="sm" />
      </div>

      {/* Top categories */}
      <div className="px-4 py-4 border-b border-slate-800/60">
        <div className="flex items-center justify-between mb-2">
          <div className="hud-label text-slate-500">Top categories · 30d</div>
          {top_categories_truncated && (
            <div className="text-[9.5px] font-mono tracking-wider uppercase text-slate-600">based on latest 500</div>
          )}
        </div>
        {(!top_categories || top_categories.length === 0) ? (
          <div className="text-[11px] text-slate-500">—</div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {top_categories.map((c) => (
              <div key={c.name} className="flex items-center gap-2 text-[12px]">
                <span className="text-[14px]">{c.emoji || "•"}</span>
                <span className="text-slate-200 flex-1 truncate">{c.name}</span>
                <span className="font-mono text-slate-500 text-[11px]">{c.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Issue counts — 7d window (app events + AI errors) */}
      <div className="px-4 py-4 border-b border-slate-800/60">
        <div className="hud-label text-slate-500 mb-2">Issues · 7d</div>
        <div className="flex gap-6">
          <div>
            <div className="text-[10px] text-slate-500">AI errors</div>
            <div className="text-[16px] font-mono text-slate-100">{issue_counts?.ai_errors_last_7d ?? "—"}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500">App events</div>
            <div className="text-[16px] font-mono text-slate-100">{issue_counts?.events_last_7d ?? "—"}</div>
          </div>
        </div>
      </div>

      {/* Recent transactions — accordion, lazy fetch + session cache */}
      <div className="px-4 py-4">
        <TransactionsAccordion userId={userId} totalCount={transaction_counts?.total} />
      </div>

      {/* Profile metadata footer */}
      <div className="px-4 py-3 border-t border-slate-800/60 flex justify-between hud-label text-[9.5px] text-slate-600">
        <span>Created {ageLabel(profile?.created_at)}</span>
        <span>Last seen {ageLabel(profile?.last_seen_at)}</span>
      </div>
    </Module>
  );
}
