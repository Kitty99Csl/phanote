// Room C-02 — Admin Support Console.
//
// Session 22 · Sprint I Part 2. Consumes worker endpoints built in
// Session 21 Sprint I Part 1 Commit 2 (workers/lib/support-console.js)
// plus direct Supabase admin-read RLS for the pending queue list
// (R22-1 tracks adding a worker endpoint for pending-queue audit).
//
// Layout:
//   Desktop (lg+): 2-col grid — [queue + search] | [detail panel]
//   Mobile: stacked, detail panel below.
//
// Freshness: useTicker drives re-render every 5s so age labels
// ("2m ago", "12m left", "Updated 8s ago") stay live without admin
// needing to re-click Refresh.
//
// Toast: Tower doesn't have a global toast system. Each room owns
// its own (precedent: LanguageStrings). Top-of-room toast for approve
// success/failure messaging.

import { useEffect, useState } from "react";
import { PageTitle } from "../components/shared";
import { useAdminGate } from "../hooks/useAdminGate";
import { useTicker } from "../hooks/useTicker";
import { PendingQueue } from "./SupportConsole/PendingQueue";
import { UserSearch } from "./SupportConsole/UserSearch";
import { UserDetailPanel } from "./SupportConsole/UserDetailPanel";
import { usePendingQueue } from "./SupportConsole/hooks/usePendingQueue";
import { useUserSummary } from "./SupportConsole/hooks/useUserSummary";

export default function SupportConsole() {
  const gate = useAdminGate();
  const currentAdminId = gate.user?.id || null;

  // Freshness tick — age labels update every 5s. Data-fetching hooks
  // have stable useCallback deps and do NOT refire on ticker tick.
  // eslint-disable-next-line no-unused-vars
  const _tick = useTicker(5000);

  const [selectedUserId, setSelectedUserId] = useState(null);
  const [toast, setToast] = useState(null); // { type: 'success'|'error', message }

  const queue = usePendingQueue();
  const summary = useUserSummary(selectedUserId);

  useEffect(() => {
    document.title = "Tower · Support Console";
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(id);
  }, [toast]);

  const handleApproved = async () => {
    setToast({ type: "success", message: "Approval recorded." });
    // Refresh both so the approve row shows its new state in queue
    // AND the detail panel reflects approved_at / expires_at / required.
    queue.refresh();
    summary.refresh();
  };

  const handleError = (msg) => {
    setToast({ type: "error", message: msg });
  };

  const closeDetail = () => setSelectedUserId(null);

  return (
    <div>
      <PageTitle
        kicker={["ADMIN", "ROOM 06"]}
        title="Support Console"
        desc="Approve recovery requests, search users, investigate account issues."
      />

      {toast && (
        <div
          className={`mb-4 px-3 py-2 text-[12px] font-mono tracking-wide rounded-sm border ${
            toast.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
              : "bg-red-500/10 border-red-500/40 text-red-300"
          }`}
        >
          {toast.type === "success" ? "◉ " : "✕ "}
          {toast.message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4 items-start">
        {/* Left column: queue + search */}
        <div className="flex flex-col gap-4 min-w-0">
          <PendingQueue
            rows={queue.rows}
            loading={queue.loading}
            error={queue.error}
            lastFetchAt={queue.lastFetchAt}
            onRefresh={queue.refresh}
            onSelectUser={setSelectedUserId}
            currentAdminId={currentAdminId}
          />
          <UserSearch onSelectUser={setSelectedUserId} />
        </div>

        {/* Right column: detail panel */}
        <div className="min-w-0">
          <UserDetailPanel
            userId={selectedUserId}
            summary={summary.data}
            loading={summary.loading}
            error={summary.error}
            onRefresh={summary.refresh}
            onClose={closeDetail}
            onApproved={handleApproved}
            onError={handleError}
          />
        </div>
      </div>
    </div>
  );
}
