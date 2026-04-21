# Session 22 — Risk Log

**Session:** 22 · **Date:** 2026-04-21 · **Sprint:** I Part 2 (Tower Room 6 Admin Support Console UI)

Tracks risks opened, closed, or changed severity during Session 22. Master register: `docs/RISKS.md`.

---

## Opened this session

### [LOW] R22-1 — Pending queue + profile enrichment reads unaudited

**Discovered:** Session 22 Phase A architecture audit (pre-build)
**Status:** Open — scheduled Session 23

Tower Room 6's pending queue list reads `user_recovery_state` + enriches with profiles via direct Supabase admin-read RLS (Migrations 014+015). These reads do NOT log to `tower_admin_reads` because `tower_admin_reads` has no user-side INSERT policy (service-role-only by design per Rule 17).

**Applies to:**
- Pending queue full list (`usePendingQueue.js`)
- Profile enrichment for queue rows (batched `.in('id', userIds)` query)

**Does NOT apply to** — these remain worker-audited:
- User search (`POST /admin/users/search` → `tower_admin_reads`)
- User summary (`GET /admin/users/:id/summary` → `tower_admin_reads`)
- View transactions (`POST /admin/users/:id/view-transactions` → double-log)
- Approve PIN/password (`POST /admin/users/:id/approve-*` → `tower_admin_actions`)

**Impact assessment:** List reads are the lowest-stakes audit tier (admin sees "who's in the queue" — an aggregate signal, not detail). Detail reads + credential actions remain audited. The asymmetry matches Session 21 D21-Q4 (summary reads direct, credential actions via worker).

**Mitigation (Session 23):** Add `GET /admin/pending-requests` worker endpoint:
- `requireAdmin` gate
- Returns the same pending-queue shape currently derived client-side
- Logs a single `tower_admin_reads` row per query (table_name: `pending_requests`, row_count: N, query_hash: null)
- Tower `usePendingQueue.js` migrates from direct Supabase to worker-mediated via `useFetchAdmin`
- Acceptance: diff of row shapes matches pre-migration; queue UX unchanged
- Also audit the profile enrichment: either (a) bundled into the new endpoint's response, or (b) switch profile enrichment to worker-mediated via a new sub-path

**Priority:** Low — family-beta has 2 admins, audit gap bounded. Not a launch blocker for beta; should be closed before public launch.

---

## Closed this session (via UI handling, not backend fix)

### [LOW] R21-12 — `app_errors_last_7d` returns null in summary (UI handling only)

**Master entry:** `docs/session-21/RISKS.md` R21-12
**Status (Session 22):** Partial close — UI adapts via Path C (conditional render); backend query tweak deferred to Session 23

**Root cause (confirmed Phase A):** `app_events.level` column does NOT exist (Migration 004 authoritative; no subsequent migration adds it). Summary endpoint's `level=eq.error` filter yields 0 rows → `countViaHead` returns null → summary response has `app_errors_last_7d: null`.

**Session 22 UI handling (Path C):** `UserDetailPanel.jsx` renders app_errors row behind `issue_counts?.app_errors_last_7d != null` gate. When null (current state, always), row omitted entirely — not displayed as "0" or "—" (honest UI over lie-by-default).

**Session 23 backend fix:** worker query tweak (drop level filter, rename field `app_errors_last_7d` → `events_last_7d`). UI adapts conditionally when new field is non-null. R21-12 fully closes when Session 23 ships.

---

## Carried forward from Session 21 — unchanged

- **R21-6** [MEDIUM] unauthorized-admin-attempt audit — Session 23 Migration 016 scope
- **R21-8** [LOW] `complete_pin_reset` non-atomic (self-healing) — Session 23 Migration 016 RPC scope
- **R21-9** [LOW] PIN weak-pattern acceptance — pre-public-launch
- **R21-10** [LOW] `workers/lib/support-console.js` 1300 lines — Session 23 split scope
- **R21-11** [LOW] PostgREST embedded-resource 500 — Session 23 investigation scope
- **D21.5-Q2** UX backlog (Owner vs Guest PIN card visual parity) — unchanged

---

## Session 23 scope summary

All open risks (R21-6, R21-8, R21-10, R21-11, R21-12 worker side, R22-1) plus new Migration 016 items consolidate into Session 23 "backend hygiene batch". Single worker deploy covers all changes. Single Migration 016 atomic file. ~2-2.5 hour target.
