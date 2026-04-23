# Session 23 — Risk Ledger

**Date:** 2026-04-21 → 2026-04-22
**Theme:** Sprint I Part 3 backend hygiene batch

Sprint I's carry-forward risks + any opened this session.

---

## CLOSED this session

### R21-8 — Atomic `complete_pin_reset` (Session 21 carry-forward)

**Severity:** LOW (but architecturally important — partial-state recovery)
**Closed:** 2026-04-22 via Migration 016 + worker v4.8.2
**Commits:** `048b408` (feat) + `<this wrap>` (docs)

**Original concern:** Session 21's `handleCompletePinReset` did sequential PATCH-profiles-then-PATCH-state. If Step D failed after Step C succeeded (Mode 2), PIN was live in profiles but pin_reset_required + pin_reset_expires_at fields remained set, forcing user through recovery again.

**Resolution:**
1. Migration 016 introduced `public.complete_pin_reset(p_user_id uuid, p_new_pin_config jsonb)` SECURITY DEFINER RPC. Atomic UPDATE of profiles + user_recovery_state inside PostgREST's implicit transaction.
2. RPC re-verifies all 3 gates defensively (belt-and-braces vs worker's first-line gates).
3. Worker Batch 3 migrated from 2-step PATCH to single RPC call. Removed R21-8-MODE2 grep marker + `state_cleanup_pending` warning path — both architecturally impossible post-atomic.
4. Gate 3 (`pin_reset_required` still true) serves as idempotency guard. Second call after successful completion returns `{ ok: false, error: 'already_completed' }` → HTTP 409, preventing silent overwrite.

**Verification:** Phase C C5 smoke PASS.
- Pre-state: user has approved recovery, current PIN = test01
- Step 2: RPC returns `{ok: true}` ✓
- Step 3: profiles.pin_config = {owner: "7777", guest: null}, all pin_reset_* fields cleared, approved_by preserved ✓
- Step 4: Second call returns `{ok: false, error: "already_completed"}` ✓
- Step 5: pin_config still 7777 (Gate 3 prevented overwrite to 9999) ✓
- Step 6: Cleanup restored test01 ✓

**Bonus property from atomic design:** timeout resilience comes for free. Worker killed mid-RPC-call → either transaction committed (retry sees `already_completed` → 409 → user signs in with new PIN) or it didn't (retry just works). No partial-state recovery code needed.

---

### R21-10 — `support-console.js` file split (Session 21 carry-forward)

**Severity:** LOW (tech debt, Rule 7)
**Closed:** 2026-04-22 via Batch 6 pure refactor
**Commits:** `048b408`

**Original concern:** 1498-line `workers/lib/support-console.js` violated Rule 7 hard line (800 lines).

**Resolution:** Split into 5 files under `workers/lib/support-console/` package:

| File | Lines | Purpose |
|------|-------|---------|
| index.js | 131 | Thin dispatcher + re-exports |
| helpers.js | 381 | Auth gates + REST wrapper + audit loggers + shared utilities |
| user-recovery.js | 323 | Group B: 3 user-facing handlers |
| admin-approve.js | 167 | Group C: 2 approvers + factory |
| admin-summary.js | **567** | Group D: 4 handlers (over aspirational 500, under Rule 7's 800) |

- No circular imports (hub-and-spoke via helpers.js)
- Zero behavior changes (handler bodies transplanted verbatim)
- Main worker import updated single-site: `'./lib/support-console.js'` → `'./lib/support-console/index.js'`
- Old monolith deleted from git history

**Verification:** wrangler dry-run PASSED (532.70 KiB). Phase C smoke end-to-end PASS.

---

### R21-12 — `app_events` query / schema mismatch (Session 22 carry-forward, Path C closure)

**Severity:** LOW
**Closed:** 2026-04-22 via Batch 1 worker tweak + Tower consumer update
**Commits:** `048b408`

**Original concern:** Worker's `/admin/users/:id/summary` queried `app_events?user_id=eq.X&level=eq.error&...` but `app_events` has no `level` column. Query returned null; Session 22 Tower UserDetailPanel did UI-side graceful-null to hide the missing field.

**Resolution:**
1. Worker: dropped `level=eq.error` filter. Renamed response field `app_errors_last_7d → events_last_7d` + internal variable cleanup (`errR → eventsR`, `appErrors7d → events7d`).
2. Tower UserDetailPanel: always-render-with-`?? "—"` fallback (mirrors AI errors pattern). Label renamed "App errors" → "App events". Removed conditional `{issue_counts?.app_errors_last_7d != null && ...}` gate. Header + inline R21-12 placeholder comments replaced with Session 23 closure notes.

**Post-fix honesty:** Query is now semantically correct (returns ALL app events, not just errors). "App events" label matches. Section header "Issues · 7d" slightly semantically wobbly (events aren't all issues), but minor — accepted as-is.

---

### R22-1 — Pending-queue + profile-enrichment reads unaudited (Session 22 opened)

**Severity:** LOW
**Closed:** 2026-04-22 via Batch 4 worker endpoint + Batch 5 Tower consumer migration
**Commits:** `048b408`

**Original concern:** Tower Room 6 pending queue read `user_recovery_state` + batched profile fetch directly via admin-read RLS. Asymmetry vs. `/admin/users/:id/summary` (worker-mediated + audited). Intentional for Session 22 v1, scheduled for Session 23.

**Resolution:**
1. Batch 4: `GET /admin/pending-requests` worker endpoint. Reads `user_recovery_state` via service-role, filters + classifies via new `classifyPendingRequest` helper, enriches via single `.in()` profile call, logs to `tower_admin_reads` with `table_name='user_recovery_state'`.
2. Batch 5: Tower `usePendingQueue.js` migrated from direct-Supabase to `useFetchAdmin` call (103 → 50 lines). Client-side `isPending()` + `classify()` helpers deleted — server now authoritative via `_classification` + `_profile` embed.
3. Dispatcher prefix gate widened from `/admin/users/` to `/admin/` to accept the new non-`/users/`-scoped route. Zero collision with main worker (grep confirmed no existing `/admin/*` paths).

**Verification:**
- C3: Tower Network tab shows `GET /admin/pending-requests` call firing with 200 (after cache clear)
- C4: SQL audit query confirms new `tower_admin_reads` row with `table_name='user_recovery_state'`, `row_count>=0`, `accessed_at` within smoke window
- Full worker-audit coverage for pending queue achieved

**Detection gap noted:** Speaker's initial Q3 audit query returned zero `user_recovery_state` reads because Tower production still served Session 22 bundle (cache). The zero-row audit was the diagnostic signal that triggered deploy-before-smoke sequencing.

---

## WON'T-FIX this session

### R21-11 — PostgREST embedded resources 500 on `user_recovery_state` (Session 21 carry-forward)

**Severity:** LOW (perf optimization, not correctness)
**Decision:** WON'T-FIX per Option C
**Rationale:**
- Fallback A (parallel `fetchRecoveryForUser` + explicit per-row calls) is production-stable
- `/admin/users/search` uses 50 profiles × 2 subrequests = 100 CF subrequests per call, well under CF paid-plan 1000 limit
- Embed-syntax migration would save some round-trips but is performance optimization, not correctness
- 30-min investigation budget not justified at family-beta scale
- Session 24+ may revisit if admin search volume grows significantly

**Possible future revisit triggers:** admin endpoint latency complaints; approach CF subrequest cap at user growth >100 active users searched per minute; need to reduce embed-schema-relationship DB work for other endpoints.

**Current implementation that stays:** `workers/lib/support-console/admin-summary.js` `handleSearchUsers` + `handleUserSummary` + `handlePendingRequests` all use Fallback A explicit-fetch pattern.

---

## STRUCTURALLY READY (no behavior change this session)

### R21-6 — Unauthorized admin attempt audit (Session 21 carry-forward)

**Severity:** LOW (observability, not security — actual unauthorized access still blocked at RLS + `requireAdmin` layer)
**Status:** STRUCTURALLY READY — Migration 016 extended `tower_admin_actions.action_type` CHECK to include `'unauthorized_admin_attempt'`. Worker write path deferred.

**Why deferred:** `requireAdmin` in `workers/lib/support-console/helpers.js` already emits `console.warn('unauthorized admin attempt:', user=X, path=Y)` on 403. Adding a persistent `logAdminAction` write path is scope creep for a session themed around atomicity + hygiene. The CHECK constraint slot existing ahead of the write path means Session 24+ can add the write with no migration coordination.

**Session 24+ scope (candidate):** Add `logAdminAction(env, ctx, { admin_user_id, target_user_id: null, action_type: 'unauthorized_admin_attempt', result: 'failed', error_message: path, metadata: {...} })` inside the `requireAdmin` 403-throw branch. Small diff, single file, no migration needed.

---

## No new risks opened this session

Sprint I Part 3 closes the Sprint I risk ledger cleanly.

---

## Sprint I — Final risk summary (5 sessions)

| Risk | Severity | Opened | Closed | Status |
|------|----------|--------|--------|--------|
| R21-1 | LOW | S21 Phase A | S21 Commit 2 (via Fallback A) | CLOSED |
| R21-2 | INFO | S21 Phase A | S21 Phase A (accepted as-is) | ACCEPTED |
| R21-3 | LOW | S21 Phase A | S21 Phase A (pre-launch RLS re-tighten review) | ACCEPTED |
| R21-4 | INFO | S21 Phase A | S21 (acknowledged, no code change) | ACCEPTED |
| R21-5 | LOW | S21 Commit 2 | S21 Commit 2 (trust-mode paste-back caught, fixed pre-deploy) | CLOSED |
| R21-6 | LOW | S21 Phase A | S23 Batch 2 (structurally ready) | STRUCTURALLY READY |
| R21-7 | LOW | S21 Commit 2 | S21 (accepted — debounce is caller's job) | ACCEPTED |
| R21-8 | LOW | S21 Commit 2 | S23 Batch 2+3 | **CLOSED** |
| R21-9 | LOW | S21 Commit 2 | S21 (accepted — service-role path via worker doesn't hit client RLS) | ACCEPTED |
| R21-10 | LOW | S21 Commit 2 | S23 Batch 6 | **CLOSED** |
| R21-11 | LOW | S21 Commit 2 | S23 | **WON'T-FIX** |
| R21-12 | LOW | S22 I-9 | S23 Batch 1 | **CLOSED** |
| R21-13 | HIGH | S21.5 opening | S21.5 hotfix | CLOSED |
| R21-14 | MEDIUM | S21.5 Phase C smoke | S21.6 | CLOSED |
| R21-15 | MEDIUM | S21.5 Phase C smoke | S21.6 | CLOSED |
| R22-1 | LOW | S22 Phase A | S23 Batch 4+5 | **CLOSED** |

Zero open Sprint I risks. R21-6 structurally ready (forward-capacity only). R21-11 won't-fix (rationale above). Everything else closed.

**Sprint I — FORMALLY CLOSED** — 5 sessions (21 + 21.5 + 21.6 + 22 + 23), admin-approved recovery system production-ready for family-beta.
