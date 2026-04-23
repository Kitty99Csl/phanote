# Session 23 — Sprint I Part 3 CLOSED (Backend hygiene batch)

**Date:** 2026-04-21 → 2026-04-22 (resumed next day for cache diagnostic + Phase C C5 + Phase D)
**Theme:** Consolidated backend cleanup — Migration 016 atomic RPC + R21-6/R21-8/R21-10/R21-12 + R22-1 closure + I-11 won't-fix
**Duration:** ~3 hours active work across 2 calendar days (overnight pause mid-Phase-C after Tower browser-cache diagnostic)
**Commits:** 2 — `048b408` (feat, backend hygiene batch) + `<this wrap>` (docs, atomic Rule 20)

---

## Goal

Close Sprint I's backend backlog in a single session: atomic PIN reset, file split, app_events query tweak, pending-queue worker endpoint, Tower consumer migration. Ship bundled worker deploy (v4.8.2) + Migration 016 + Tower bundle refresh in one feat commit.

**Pre-locked scope (from Session 22 close):**
- I-10 — R21-10 split `workers/lib/support-console.js` (1498 lines → 5 sub-modules)
- I-11 — R21-11 PostgREST FK-hint embed investigation (stretch)
- I-12 — R21-6 + R21-8 Migration 016 bundle (audit CHECK + `complete_pin_reset` RPC)
- I-13 — R21-12 worker query tweak (drop `level=eq.error`, rename field)
- I-14 — R22-1 `GET /admin/pending-requests` + Tower `usePendingQueue` migration

**External review shaping (from Session 22 opening):** GPT-5 confirmed Session 21 decisions sound (no changes needed). Gemini 2.5 Pro caught (1) I-9 is an implicit dep of I-4 (must ship together or UI renders with broken field), (2) cognitive-mode split between Session 22 (UI) and Session 23 (backend) — don't mix contexts. Both corrections adopted. Speaker **rejected** Gemini's client-direct-RPC proposal for `complete_pin_reset`, correctly identifying that authorization requires multi-party state (user JWT + admin approval record) checked together at the worker — worker is the enforcement point, not a privileged middleman. External review is a signal, not an authority.

---

## Phase A — Design decisions

5 questions locked at Phase A, plus one override post-Batch-2 and one late-session decision.

| Q | Decision | Source |
|---|----------|--------|
| D23-Q1 | File split: `helpers.js` / `user-recovery.js` / `admin-approve.js` / `admin-summary.js` + thin `index.js` dispatcher | Phase A lock |
| D23-Q2 | RPC structured-jsonb-return (not `RAISE EXCEPTION`), SECURITY DEFINER, stored `pin_reset_expires_at` for Gate 2, preserve `approved_by` + `last_action_metadata` | Phase A, **column-name bug caught pre-write by Speaker review** |
| D23-Q3 | I-11 Path A with 30-min timeout; close R21-11 won't-fix if fails | Phase A |
| D23-Q4 | I-14 rich response: embed `_classification` + `_profile` server-side, both PIN + password fields future-proof | Phase A + Q4 polish |
| D23-Q5 | I-10 upgraded must-ship (CC override, accepted); I-11 sole stretch | Phase A |
| D23-C1 | Option C: skip Batch 7, close R21-11 **won't-fix** — Fallback A stable, optimization not correctness | Post-Batch-6 Speaker decision |
| D23-C2 | admin-summary.js 567 lines accepted as-is (Option A) — Rule 7 hard line is 800; 5-file tree per Phase A spec preserved | Post-Batch-6 Speaker decision |

### I-9 closure confirmation

Path C from Session 22 (UI conditional render on null when `issue_counts.app_errors_last_7d` is null due to missing `app_events.level` column) — resolved this session via I-13 worker tweak + Tower UserDetailPanel consumer update. Render always with `?? "—"` fallback, mirror AI errors pattern. Field renamed `app_errors_last_7d → events_last_7d`. R21-12 fully closed.

---

## Phase B — 7 batches

Dependency-aware batch order, auth-path paste-back for Batches 2, 3, 4; summary paste-back for 1, 5, 6; Batch 7 skipped per Option C.

| Batch | Item | Scope | Mode |
|-------|------|-------|------|
| 1 | I-13 | Worker `app_events` query: drop `level=eq.error`, rename response field, internal variable cleanup; Tower UserDetailPanel consumer update | summary |
| 2 | I-12 | Migration 016: `complete_pin_reset(uuid, jsonb)` SECURITY DEFINER + `tower_admin_actions.action_type` CHECK extended | **PASTE-BACK** |
| 3 | I-12 | Worker `handleCompletePinReset` migrated to atomic RPC call; Mode 2 straggler + `state_cleanup_pending` warning removed | **PASTE-BACK** |
| 4 | I-14 | `GET /admin/pending-requests` handler + `classifyPendingRequest` helper + dispatcher prefix widening `/admin/users/` → `/admin/` | **PASTE-BACK** |
| 5 | I-14 | Tower `usePendingQueue.js` migrated from direct-Supabase to `useFetchAdmin` call (103 → 50 lines) | summary |
| 6 | I-10 | `support-console.js` split into 5 files under `workers/lib/support-console/` (pure refactor) | summary |
| 7 | I-11 | Skipped — Option C won't-fix | — |

### Migration 016 column-name bug caught pre-write

CC's Phase A draft of `complete_pin_reset` RPC referenced `v_state.approved_at` and `v_state.requested_at`. Actual Migration 014 columns are `pin_reset_approved_at` + `pin_reset_requested_at`. `%ROWTYPE` declaration would have let it compile cleanly — runtime NULL reads on non-existent fields would have cascaded every call to `{ ok: false, error: 'not_approved' }`. Speaker caught via schema lookup during Phase A paste-back review, fixed before disk write.

### Latent Session 21 dispatcher bug surfaced during Phase C

Phase C Step 2 curl of `/admin/pending-requests` without auth returned CF 1101 instead of expected 401. Diagnosed: dispatcher's `return handlerX(request, env, ctx)` without `await` means async throws (from `requireAuth` / `requireAdmin`) escape the try/catch — the async function returns a rejecting promise but the synchronous try/catch only intercepts synchronous throws. Fixed by changing all 8 handler calls to `return await handlerX(...)` and adding a 6-line NOTE comment documenting the trap. Redeployed v4.8.2. Post-fix probes: unauth `GET /admin/pending-requests` → 401 ✓, unauth `GET /recovery/status` → 401 ✓, unauth `POST /admin/users/search` → 401 ✓.

This bug was invisible in Sessions 21/22 because all smoke paths were authenticated (no AuthError thrown). The Session 23 unauth probe was the first call that exercised it.

---

## Phase C — Production smoke

Phase C paused overnight mid-stream after Tower browser served stale Session 22 bundle for 13+ minutes despite successful CF Pages build (verified via `wrangler pages deployment list`). Speaker resumed next day; cache-clear (incognito / SW unregister) resolved it. Actual root cause likely a registered service worker from a prior session persisting the old bundle.

| # | Check | Result |
|---|-------|--------|
| C1 | SQL: create pending recovery row for User B | PASS |
| C2 | Worker: authenticated `GET /admin/pending-requests` → enriched row returned | PASS |
| C3 | Tower: new bundle loaded (not `index-DcC1f2x6.js`) + `/admin/pending-requests` call fires in Network tab with 200 | PASS (after cache clear) |
| C4 | SQL: audit row appears in `tower_admin_reads` with `table_name='user_recovery_state'` (not present before Tower deploy — diagnostic gap Speaker caught) | PASS |
| C5 | SQL + worker: atomic RPC end-to-end — profiles.pin_config = 7777 AND user_recovery_state cleared in single transaction | PASS |
| C5.1 | Idempotency: second RPC call returns `{ok: false, error: "already_completed"}`; pin_config NOT overwritten by 9999 | PASS (Gate 3 verified) |
| C5.2 | Cleanup: test01 restored | PASS |
| C6 | Empty queue renders cleanly (no rows, no 500) | PASS (implicit from earlier probes) |

---

## Sprint I final risk ledger

| Risk | Severity | Status | Closed via |
|------|----------|--------|-----------|
| R21-6 | LOW | **structurally ready** | Migration 016 CHECK extension; worker write path deferred to Session 24+ (no user-visible gap for family-beta) |
| R21-8 | LOW | **CLOSED** | Migration 016 atomic RPC + worker v4.8.2 + C5 end-to-end verified |
| R21-10 | LOW | **CLOSED** | `support-console.js` split into 5 files; largest (admin-summary.js) 567 lines, all under Rule 7 hard line of 800 |
| R21-11 | LOW | **WON'T-FIX** | Fallback A production-stable; 100 subrequests per 50-user search, well under CF 1000 limit; optimization not correctness |
| R21-12 | LOW | **CLOSED** | Batch 1 worker query + field rename + Tower consumer |
| R22-1 | LOW | **CLOSED** | Batch 4 + Batch 5 worker endpoint + Tower migration; audit verified via C4 smoke |

**Sprint I complete across 5 sessions: 21 + 21.5 + 21.6 + 22 + 23.** Admin-approved recovery system is production-ready for family-beta.

---

## File manifest

**New (6):**
- `supabase/migrations/016_atomic_pin_reset_rpc.sql` — 219 lines
- `workers/lib/support-console/index.js` — 131 lines (dispatcher + re-exports)
- `workers/lib/support-console/helpers.js` — 381 lines (auth + REST + audit loggers + utilities)
- `workers/lib/support-console/user-recovery.js` — 323 lines (3 handlers)
- `workers/lib/support-console/admin-approve.js` — 167 lines (2 handlers + factory)
- `workers/lib/support-console/admin-summary.js` — 567 lines (4 handlers)

**Modified (3):**
- `workers/phanote-api-worker.js` — version bump `4.8.1 → 4.8.2` + import path update
- `tower/src/routes/SupportConsole/UserDetailPanel.jsx` — Batch 1 field rename + comment refresh
- `tower/src/routes/SupportConsole/hooks/usePendingQueue.js` — Batch 5 rewrite (103 → 50 lines)

**Deleted (1):**
- `workers/lib/support-console.js` — 1498-line monolith, split into the 5 files above

**Feat commit delta:** 10 files, +1838 / −1415 (net +423 including migration + 5-file split headers + latent-bug-fix comment).

---

## Learnings

- **Two audit tables with different timestamp conventions.** `tower_admin_reads.accessed_at` (Migration 006, Sprint E) vs `tower_admin_actions.created_at` (Migration 014, Sprint I). Not a code-layer bug — both logging helpers generate INSERTs without explicit timestamps, letting Postgres populate via `DEFAULT now()` on each table's respective column. Invisible at the worker layer. Surfaces only when operators write ad-hoc audit queries. Small trap worth flagging; could be normalized in a future migration if it becomes recurring friction.

- **`%ROWTYPE` declarations hide column-name typos until runtime.** Migration 016 Phase A draft referenced `v_state.approved_at` for columns actually named `pin_reset_approved_at`. `%ROWTYPE` compiled cleanly because the field reference is syntactic, not typechecked against the actual row shape. Runtime result: every RPC call would return `{ ok: false, error: 'not_approved' }` because NULL reads on non-existent fields cascade that way. Mandatory defense: schema-lookup verification during paste-back review, which Speaker did. Accept that `%ROWTYPE` is ergonomic but not safe — pair it with a pre-write schema check.

- **"Sibling helpers, not DRY reuse" is honest naming.** My Phase A claim that I-14 would "reuse `derivePendingRequest`" was a stretch. That helper returns boolean (awaiting-admin only); the queue listing needs 4 cases (2 awaiting-admin + 2 approved-awaiting-user). Batch 4 added a new sibling `classifyPendingRequest` returning a `{ flow, stage, … }` object. Keep the old helper for its existing search-endpoint use case; don't overload. The real architectural win from Session 23: client-side `classify()` in `usePendingQueue` is now deleted, so the worker is the single authoritative source for pending-row classification.

- **Browser cache persists across sprint cycles; `wrangler pages deployment list` is authoritative.** Session 23 Phase C looked broken for 13+ minutes because Speaker's browser served Session 22's `index-DcC1f2x6.js` despite CF Pages building and deploying `048b408` correctly. The discriminator: `npx wrangler pages deployment list --project-name tower-phajot` showed the new deployment as Active for the right commit SHA. Cache-clear (incognito / SW unregister / DevTools clear site data) resolved it. Lesson for future Tower deploys: if Speaker sees stale hash after expected deploy window, CC can query CF Pages CLI to confirm build status rather than assuming deploy failure.

- **Atomic RPC eliminates whole classes of partial-failure reasoning.** Pre-Batch-3 worker had Mode 1 (Step C fails before Step D) and Mode 2 (Step D fails after Step C) failure modes. Post-RPC: worker gets `{ok:true}` or doesn't. If the worker is killed mid-call, either the transaction committed (retry sees `already_completed` → 409 → user signs in with new PIN) or it didn't (retry just works). No partial-state recovery code needed. The Gate 3 `already_completed` check doubles as idempotency guard, surfaced explicitly as HTTP 409 instead of silently no-op-ing.

- **Latent bugs surface when probe patterns change.** Session 21's `return handleX(request, env, ctx)` without `await` was syntactically identical to a correct return but semantically broken for async throws. Invisible in all Session 21/22 smoke paths (authenticated, so no `requireAuth` throw). Session 23 Phase C Step 2's unauth curl was the first probe that exercised the AuthError path — exposed as CF 1101. General principle: when running sanity checks on a new deploy, curl both auth and unauth paths, both valid and invalid methods. The unauth/invalid paths test the error boundaries that normal use doesn't.

- **Cognitive-mode split between sessions is a real constraint.** Session 22 (Tower UI mode) + Session 23 (backend mode) feels arbitrary but Gemini 2.5 Pro's pre-session review flagged it explicitly. Empirically: Session 23 spent ~3 hours on backend work with dense paste-back review cycles and still exited with energy for Phase C+D. If I-4 Tower Room 6 had been attempted in the same session as I-10/12/13/14 backend work, the context switches would have tanked quality on both. Prefer session themes; accept the calendar cost.
