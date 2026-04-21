# Session 22 — Decision Log

**Session:** 22 · **Date:** 2026-04-21 · **Sprint:** I Part 2 (Tower Room 6 Admin Support Console UI)

Pre-session scope shaped by external review (GPT + Gemini). All design decisions locked at Phase A before any code.

---

## I-9 resolution: Path C (defer worker tweak to Session 23)

**Question:** `app_events.level` column confirmed missing (Migration 004 authoritative, no later migration adds it). Summary endpoint's `level=eq.error` filter → always-null response for `app_errors_last_7d`. Three fix paths considered:

- **Path A**: Migration 016 with ALTER TABLE add column + retrofit `dbTrackEvent` to accept level param
- **Path B**: Worker query tweak (drop level filter, rename field) — Session 22 worker deploy
- **Path C**: UI graceful-null — omit the field's row when null. Backend fix deferred to Session 23

**Decision:** Path C. Session 22 = UI only; backend deploy deferred to Session 23 cognitive-mode batch.

**Rationale:** Gemini's cognitive-mode split argument: don't mix UI work and backend deploys in the same session. Path B would introduce v4.8.2 deploy, then Session 23 bumps to v4.8.3 for Migration 016 — two deploys instead of one. Path A retrofits a column with no existing data to populate (no `dbTrackEvent` call is "error" today). Path C preserves scope discipline AND keeps UI honest (omit row vs "0 app errors" lie).

**Impact:** `UserDetailPanel.jsx:134` renders app_errors row behind `issue_counts?.app_errors_last_7d != null` gate. Comment marks the placeholder. Session 23 worker tweak renames field + drops filter; UI adapts conditionally when non-null.

---

## D22-Q1 — Search input: Go button, no debouncing

**Question:** Debounce search input 300ms or require explicit Go button?

**Decision:** Go button.

**Rationale:** Each search triggers 1 profiles query + N per-row enrichments (N = result count, up to 50). Accidental keystrokes shouldn't burn 100+ subrequests worker-side. Go button conveys intent. Tower is an admin tool — explicit actions are preferred over ambient behavior.

**Impact:** `UserSearch.jsx` renders input with Enter-key and Go button submit paths. `canSubmit = cleaned.length >= 3 && !loading` gates button state.

---

## D22-Q2 — User detail panel: right-side column desktop, stacked mobile

**Question:** User detail appears inline when selected, or as modal/drawer?

**Decision:** 2-column grid on desktop (`lg+` breakpoint), stacked single-column below. No slide-up Sheet for mobile v1.

**Rationale:** Tower is desktop-first per design docs. Tower has no Sheet primitive (main app's `src/components/Sheet.jsx` is Rule 16 forbidden). Stacked mobile is functional if not ideal. If admin mobile usage grows, add Sheet primitive to Tower in a future session.

**Impact:** `SupportConsole.jsx` uses `grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4 items-start`. `min-w-0` on both columns (Session 20 flex-child width learning).

---

## D22-Q3 — Transactions viewer: inline accordion

**Question:** Recent transactions — inline, accordion, modal, or separate section?

**Decision:** Inline accordion inside UserDetailPanel. Click-to-expand lazy fetches; subsequent close/reopen serves from session cache.

**Rationale:** Admin investigating a user wants everything visible in one view. Accordion balances: hidden by default (bandwidth + audit-log economy — accessing transactions is double-logged to `tower_admin_reads` + `tower_admin_actions`), expanded when actually needed.

**Impact:** `TransactionsAccordion.jsx` maintains local `{ isOpen, fetched, transactions }` state. First expand triggers worker POST `/view-transactions`. Re-open → cache hit, no re-fetch. Unmount (admin selects different user) drops cache correctly.

---

## D22-Q4 — Approve button friction: ConfirmSheet only

**Question:** Approve one-tap → ConfirmSheet? Or two-step (ConfirmSheet + type user's phone)?

**Decision:** ConfirmSheet only.

**Rationale:** Family-beta with 2 admins. Phone-typing friction overkill. ConfirmSheet + optional `reason` param is plenty. Public-launch scale may warrant 2FA-style confirmation but not family-beta.

**Impact:** `ApproveButton.jsx` renders inline confirm overlay (destructive ConfirmSheet-equivalent). Ref-guard + busy state prevent double-fire. Body sends `{ reason: "tower_room6_approve" }` which flows into `tower_admin_actions.metadata.reason` for audit trail.

---

## D22-Q5 — Empty queue state: positive messaging

**Question:** What does admin see when 0 pending requests?

**Decision:** "No pending requests ✓" in emerald-400 with subtle "All clear." subtitle.

**Rationale:** Good-state feeling matters for an admin dashboard. "Empty" = null message reads neutral; "✓" + confident copy reads positive. Consistent with "safe to spend" language pattern in main app's home view.

**Impact:** `PendingQueue.jsx` renders this when `!loading && !error && count === 0`.

---

## D22-Q6 — Recent approvals audit widget: DEFER to v2

**Question:** Show last N approvals in Room 6 v1?

**Decision:** Omit from v1. `tower_admin_actions` table has the data; admin can SQL-query if needed for audit. Session 22+ can add inline recent-activity widget.

**Rationale:** Scope discipline. Queue + search + detail + approve is the core loop; recent-approvals is a forensic/oversight feature not required for the primary admin workflow. Speaker's judgment: ship the primary loop first, see if recent-activity is actually used/missed.

**Impact:** No widget rendered. `tower_admin_actions` table serves as audit source; Session 22+ can add a widget in UserDetailPanel showing last 5 admin actions on this user.

---

## D22-Q7 — Toast system: single-slot, 2.5s auto-dismiss

**Question:** Tower has no global toast system. Each room owns its own (LanguageStrings precedent). How to handle approval success/failure messaging?

**Decision:** Single-slot room-scoped toast. 2.5s auto-dismiss. Rapid-fire admin approvals may have brief overlap between fading-out first toast and appearing second.

**Rationale:** Acceptable for family-beta (2 admins, rare concurrent use). Session 23+ can add global toast queue if needed. Matches LanguageStrings precedent — keeps Tower consistent across rooms.

**Impact:** `SupportConsole.jsx` owns `toast` state. `handleApproved` sets success toast; `handleError` sets error toast. useEffect clears after 2.5s. Rendered as top-of-page banner above the grid.

---

## Concurrency acceptance (carried forward from Session 21 investigation)

**Context:** Session 21 worker code uses PostgREST upsert with `merge-duplicates` for approve endpoints. If admin B approves a row admin A just approved, silent overwrite — no conflict error returned.

**Decision (Session 22 UI side):** Accept as-is for family-beta.

**UX addition:** `PendingQueue.jsx` shows subtle "◆ approved by other admin" badge when row's `approved_by !== currentAdminId`. Admin who lost the race sees the signal on next refresh. Low-stakes visual, not loud.

**Session 23 design note:** Migration 016 `complete_pin_reset` RPC should include optimistic concurrency check (reject if `pin_reset_required` already false) per Gemini's adjacent point. For approve endpoints, current upsert-with-merge is fine — audit richness preserved via `tower_admin_actions` per-attempt rows.

---

## File structure

**Decision:** `tower/src/routes/SupportConsole.jsx` + `tower/src/routes/SupportConsole/<subs>.jsx` subfolder. Hooks in `tower/src/routes/SupportConsole/hooks/`.

**Rationale:** Follows existing Tower convention (`/routes/*.jsx` single-file pattern). Room-specific sub-components + hooks nested under the route's own folder. `useTicker` is global (reusable across rooms) so it lives in `tower/src/hooks/` alongside `useAdminGate`.

**Rejected:** `tower/src/rooms/SupportConsole/` structure from Speaker's initial brief — would break existing convention.

---

## Rejected from Gemini's review

- **Client-direct RPC for `complete_pin_reset`**: Gemini's proposal for Session 23's Migration 016 would have the client call the RPC directly with RLS enforcement. Rejected. Our authorization model requires multi-party state (user JWT + admin approval record checked together). Worker is the enforcement point for fail-closed gates, not a "privileged middleman". Keeping worker-mediated.
- **Adjacent Gemini point adopted**: Migration 016 `complete_pin_reset` RPC should be written defensively (re-verify all gates inside the RPC, not just trust caller). Session 23 implementation note.

---

## Session close decisions

- **Phase B batch order:** Data layer (hooks) → display components → orchestrator + auth-path → routing. Chosen for bottom-up composition; each batch independently verifiable via esbuild.
- **Paste-back split:** auth-path (`useFetchAdmin`, `ApproveButton`) + main layout (`SupportConsole`) required full paste-back; display components summary-mode only. Matches Session 21 trust-mode precedent.
- **Sentinel re-sync at close** covering just Session 22.
- **Session 23 opens next** with backend hygiene batch (R21-10, R21-11, R21-6/R21-8 Migration 016, R21-12 worker tweak, R22-1 pending-queue endpoint). Single worker deploy.
