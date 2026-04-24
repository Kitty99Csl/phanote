# Session 24 — RISKS

**Date:** 2026-04-24  
**Sprint:** M.1 (Truthfulness Hardening Part 1)  

---

## Risks CLOSED this session

### Review-P1-1 — Profile-fetch failures route to Onboarding
- **Source:** 2026-04-24 external review (GPT Codex + peer)
- **File:** `src/App.jsx loadUserData`
- **Closed by:** Batch 3 — new `loadError` state + render gate + retry UI
- **Verification:** Paste-back review confirms gate position (L620) between loading splash and onboarding decision. State machine traced end-to-end. Commit `3d0eba7`.
- **Residual risk:** Runtime behavior of retry button unverified via smoke test (see Phase-C deferral). Rollback trivial if issue surfaces.

### Review-P1-2 — dbUpdateTransaction + siblings silent-write
- **Source:** 2026-04-24 external review
- **Files:** `src/lib/db.js` + `src/App.jsx` call sites
- **Closed by:** Batch 1 (db.js 4 helpers hardened) + Batch 2 (6 caller sites updated)
- **Verification:** All helpers throw on `{ error }`. All caller sites revert optimistic UI + toast on failure. Pattern matches `dbInsertTransaction` template + Session 10 `handleUpdateCategory`.
- **Residual risk:** Same as above — runtime smoke deferred.

### Discovery-M1-1a — handleOnboarding silent upsert failure
- **Source:** CC Phase 0 inventory (in-session discovery)
- **File:** `src/App.jsx` L434-441
- **Closed by:** Batch 2 Site 5 — revert `setProfile(null)` + toast + early return gating dbTrackEvent
- **Verification:** Paste-back review confirms early return prevents logging "onboarding_complete" when onboarding didn't complete.

### Discovery-M1-1b — handleUpdateProfile silent upsert failure
- **Source:** CC Phase 0 inventory
- **File:** `src/App.jsx` L477-484
- **Closed by:** Batch 2 Site 6 — capture `previousProfile` + revert + toast
- **Verification:** Paste-back review confirms closure semantics correct for React state.

---

## Risks still open (for Sprint M.2)

### Review-P1-3 — StatementScanFlow reports success before saves land
- **File:** `src/screens/StatementScanFlow.jsx handleImport`
- **Severity:** HIGH — user scans bank statement, "Imported 20!" lies when only 19 landed
- **Target:** Sprint M.2 Batch 3
- **Blocked by:** Need `onAdd` callback signature change to return `{ ok }`

### Review-P1-5 — GoalsScreen performDeleteGoal + addSavings silent
- **File:** `src/screens/GoalsScreen.jsx`
- **Severity:** HIGH
- **Target:** Sprint M.2 Batch 1
- **Blocked by:** Apply Session 10 `updateGoal` pattern to 2 sibling functions

### Review-P2-10 — BudgetScreen no rollback on failed save
- **File:** `src/screens/BudgetScreen.jsx saveBudget`
- **Severity:** MEDIUM
- **Target:** Sprint M.2 Batch 2

### Review-P2-11 — streak.js local/persisted drift
- **File:** `src/lib/streak.js`
- **Severity:** MEDIUM
- **Target:** Sprint M.2 Batch 4

### Review-P2-8 — constants.js txDedupKey ignores currency/type
- **File:** `src/lib/constants.js`
- **Severity:** MEDIUM
- **Target:** Sprint M.2 Batch 3 add-on

### Review-P2-7 — categories.js unknown → food/salary collapse
- **File:** `src/lib/categories.js`
- **Severity:** MEDIUM
- **Target:** Sprint M.2 (optional) OR future

### Review-P2-13 — StatementScanFlow batch deletion weak error handling
- **File:** `src/screens/StatementScanFlow.jsx`
- **Severity:** MEDIUM
- **Target:** Sprint M.2 Batch 3 add-on

---

## Open threads (OT) — for future sprints

### OT-M-5: dbSaveMemory SELECT error handling
- **File:** `src/lib/db.js dbSaveMemory` (the initial maybeSingle SELECT)
- **Issue:** If RLS blocks SELECT, `existing` becomes null, falls through to insert path → worst case duplicate memory row (not user-visible)
- **Severity:** LOW (not user-visible, cosmetic data quality)
- **Target:** Sprint P candidate
- **Captured:** 2026-04-24

### OT-M-6: dbTrackEvent internal `{ error }` check
- **File:** `src/lib/db.js dbTrackEvent`
- **Issue:** Current try/catch only catches network throws. Supabase `{ error }` shape from RLS/data rejection would silently no-op telemetry.
- **Severity:** LOW (acceptable telemetry degradation)
- **Target:** Sprint P candidate
- **Captured:** 2026-04-24

### OT-M-7: handleUpdateCategory caller try/catch audit
- **Files:** `src/modals/EditTransactionModal.jsx`, `src/modals/QuickEditToast.jsx`
- **Issue:** Session 10 `handleUpdateCategory` has `throw e` at L544. If callers don't wrap in try/catch, unhandled rejection could occur on category update failure.
- **Severity:** MEDIUM (pre-existing since Session 10)
- **Target:** Sprint N (modals) or Sprint M.2 add-on if trivial
- **Captured:** 2026-04-24 by CC during Batch 2 Phase 0
- **Note:** Not a regression — pre-existing behavior

### OT-M-8: Handler contract rule — modal throw / event no-throw
- **Scope:** Repository-wide code convention
- **Documentation:** Captured in this session's DECISIONS.md under D-Batch2-Q2
- **Target:** Include in CLAUDE.md learnings at Sprint M.2 close
- **Captured:** 2026-04-24

---

## Risks discovered but deferred

### R-Phase-C-1: Runtime smoke test deferred
- **Context:** Local environment blocked build verification; full smoke test skipped
- **Mitigation:** 
  - Defensive pattern propagation minimizes risk class
  - Paste-back reviewed twice per site
  - Wife as production tester with daily use
  - Trivial rollback path (`git revert 3d0eba7`)
- **Residual exposure:** Runtime regressions in retry UI rendering or offline revert logic could surface in production
- **Detection:** Wife reports friction OR Speaker observes during own use
- **Response:** Immediate revert + investigate in dedicated hotfix session
- **Captured in commit message:** `3d0eba7`

### R-Env-1: Local Windows environment lacks project Node version
- **Context:** Windows Node 20.11.0 vs project-required 24.13.1
- **Impact:** Cannot run local build/dev server without upgrade
- **Mitigation:** Stay in Codespaces for future smoke testing
- **Not an open risk per se** — just an operator note

---

## Sprint M overall risk posture

**Before Sprint M.1 (2026-04-22 Sprint I close):**
- 7 review findings open
- 2 known-latent bugs matching R21-13 class (unfixed siblings)

**After Sprint M.1 (this session):**
- 4 review findings CLOSED (F1, F2, + 2 Discovery bonuses)
- 3 review findings remain for Sprint M.2 (F3, F7, P2-10/11)
- 4 open threads captured (OT-M-5 through OT-M-8)

**Sprint M.2 exit criteria (for reference):**
- All remaining Review-P1-* findings CLOSED
- Screen-level rollback patterns applied (GoalsScreen, BudgetScreen, StatementScanFlow, streak.js)
- constants.js + categories.js data-quality fixes
- Zero silent-write paths remaining in src/ (grep-verified)

---

*Risks assessed 2026-04-24. Next review at Sprint M.2 close.*
