# Session 25 — Sprint M.2a SHIPPED (GoalsScreen)

**Date:** 2026-04-25  
**Theme:** Sprint M.2 Part A — GoalsScreen truthfulness hardening  
**Duration:** ~3 hours total session (env setup + Phase A + Batch 1 + smoke + ship)  
**Sprint:** M.2 (Part A of 2)  
**Prior HEAD:** f04be7f (Session 24.1)  
**Post HEAD:** c5bd19d (feat) → <this wrap>

---

## Session outcome

Sprint M.2a SHIPPED — production bundle flipped from `index-DhdWacHa.js` (Sprint M.1) to `index-DekFTcxm.js` (Sprint M.2a, ~25s post-push).

**One review finding partial-closed:**
- Review-P1-5 partial — GoalsScreen `performDeleteGoal` + `addSavings` silent-write bugs CLOSED
- (Review-P1-5 full close requires updateGoal audit — out of Sprint M.2 scope, pre-existing Session 10 legacy)

**Three open threads captured for Sprint M.2b:**
- Batch 2: BudgetScreen.jsx saveBudget rollback
- Batch 3: StatementScanFlow.jsx handleImport honest count + deleteBatch
- Batch 4: streak.js rollback pattern
- Plus: constants.js + categories.js data-quality fixes

---

## Work completed

### Pre-sprint env setup (~45 min)

Local Windows dev environment fully fixed:
- Node 24.13.1 installed via manual MSI (CC could not install due to non-elevated session — admin password required)
- npm 11.8.0 active (matches CF Pages canonical version per Session 9)
- .env.local created with VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_WORKER_URL=https://api.phajot.com
- Lockfile drift verified: committed lockfile installs cleanly under Node 24.13.1 via `npm ci` strict mode (no Rule 12 incompatibility)
- Dev server boots in 334ms, HTTP 200 at localhost:3000

**Pattern learning:** Local Windows env setup takes ~45 min when starting from Node 20 + missing .env.local. Codespaces alternative would have been ~5 min. For solo founder context, the local setup investment pays back across all future sessions.

### Phase A — Design lock (~5 min)

3 questions pre-locked at session opener:
- D-M2-Q1: StatementScan failure UX → Option A (honest "Imported N of M") — DEFERRED to M.2b
- D-M2-Q2: addSavings rollback → Option A (full revert + toast) — APPLIED in Batch 1
- D-M2-Q3: streak.js rollback → Option A (full revert + toast) — DEFERRED to M.2b

Plus in-batch decisions:
- D-Batch1-Q1: Both new functions follow OT-M-8 (no throw) despite in-file `updateGoal` legacy throw
- D-Batch1-Q2: Capture full `previousGoals` array (not per-goal state) for clean revert across both addSavings paths

### Phase B Batch 1 — GoalsScreen.jsx (~25 min)

**Phase 0 investigation (CC ~3 min):**
- File overview: 283 lines, 5 functions
- Found 2 silent-write targets: `performDeleteGoal` (L83-88), `addSavings` (L67-79)
- Found reference template: `updateGoal` (L54-65, Session 10 pattern)
- Caller audit: Both targets called from FAF arrows (AddSavingsModal.onSave, ConfirmSheet.onConfirm)
- Toast helper already imported (L13), `toastGoalError` i18n key already exists in en/lo/th
- Discovery: `performDeleteGoal` never cleared `pendingDeleteGoalId` — strict improvement to add explicit close

**Phase 1 spec + paste-back (~10 min):**
- CTO drafted both function replacements
- CC paste-back review caught modal-close wiring nuance (ConfirmSheet self-close vs latent bug — proposed change is strict improvement either way)
- CC verdict: OK TO APPLY, no blocking concerns
- Speaker greenlight after independent review

**Phase 2 apply (~2 min):**
- Both `str_replace` operations clean
- Diff exactly the 2 functions, +23 lines net (CTO estimate +16 was 30% low — drift pattern continues)
- 0 new ESLint errors (1 pre-existing `baseCurrency` unused error documented in file head)
- Single-file scope intact

### Phase C — Smoke test (~10 min)

All 4 tests passed in browser at localhost:3000:
- Test 1 — addSavings happy path: ✅ goal updates, modal closes
- Test 2 — addSavings offline: ✅ UI reverts, toast in correct language, no false save
- Test 3 — performDeleteGoal happy path: ✅ goal deletes, ConfirmSheet closes
- Test 4 — performDeleteGoal offline: ✅ UI reverts, toast appears, goal stays in DB

**Real production-fidelity smoke test under Node 24.13.1 / npm 11.8.0** — same versions CF Pages uses. No "deferred to production observation" caveat this session.

### Phase D — Ship (~5 min)

- Atomic feat commit `c5bd19d`
- Push clean
- CF Pages rebuild ~25s
- Bundle hash flipped `DhdWacHa` → `DekFTcxm` ✅
- Rule 11 verified

---

## File manifest

### Modified (1 file)
- `src/screens/GoalsScreen.jsx` — +23/-5 lines, 2 functions hardened

### Unchanged but verified
- `updateGoal` (Session 10 legacy throw) — documented asymmetry preserved
- All other screens — out of scope for M.2a
- `lib/db.js` — Sprint M.1 hardening still in place
- `App.jsx` — Sprint M.1 caller hygiene still in place

---

## Metrics

| Metric | Value |
|--------|-------|
| Session duration | ~3 hours |
| Env setup time | ~45 min |
| Sprint M.2a actual coding | ~50 min |
| Phases completed | A through D |
| Functions hardened | 2 (performDeleteGoal + addSavings) |
| New i18n keys | 0 (reused toastGoalError) |
| ESLint new errors | 0 |
| Smoke tests run | 4 (all pass) |
| Commits | 2 (feat c5bd19d + this wrap) |
| Bundle hash flips | 1 (DhdWacHa → DekFTcxm) |
| Rollbacks | 0 |
| Review findings closed | 1 partial (Review-P1-5 partial) |
| Open threads for M.2b | 5 (Batch 2/3/4 + 2 supporting files) |

---

## Learnings

### 1. Local env setup is one-time investment, not recurring cost

The 45 min spent fixing Node 24 + .env.local + lockfile verify was investment. Future Sprint M.2b, N, O, etc. won't need this work again. Pattern: solo founder dev env work is amortized across many sessions.

### 2. Lockfile compatibility verification has explicit pattern

CC's `git checkout -- package-lock.json && rm -rf node_modules && npm ci` sequence verified that committed lockfile is compatible with local Node 24.13.1 / npm 11.8.0. This is the exact Rule 12 / Session 9 verification that prevents silent CF Pages failures. Should be documented in session-ritual.md as standard env setup step.

### 3. CC paste-back review catches modal-close wiring

CC noticed that original performDeleteGoal never cleared pendingDeleteGoalId. CTO's spec covered this implicitly (success-gated close), but CC made the discovery explicit by reading ConfirmSheet's open prop wiring. **Pattern: paste-back review at the wiring level, not just the function-body level.**

### 4. Per-batch smoke testing catches issues earlier

Sprint M.1 deferred Phase C smoke entirely. Sprint M.2a ran smoke per-batch in real browser under production-fidelity Node version. Real-time verification prevents downstream cascade. Trade-off: slower rhythm but higher confidence per batch.

### 5. Splitting Sprint M.2 into M.2a + M.2b is legitimate

Original plan: Sprint M.2 = single ~2.5hr session. Reality: env setup ate 45 min, Batch 1 ate 50 min, Speaker tired after ~3hr total. Splitting into M.2a (today, Batch 1 only) + M.2b (future, Batches 2-4) is correct judgment — each batch is independently valuable, not all-or-nothing.

**Pattern learning:** Sprint scope can flex when energy/time constraints surface mid-session. Atomic batches > forced completion of pre-planned scope.

### 6. CTO arithmetic estimation drift continues

Batch 1 actual: +23/-5 lines. CTO estimate: +16. **+44% over estimate.** Pattern persists across Sprint M.1 and M.2a. CTO should trust CC's post-edit `wc -l` over own arithmetic.

---

## What Sprint M.2a does NOT do

Scope discipline maintained:
- ❌ NO `BudgetScreen.jsx` — Sprint M.2b
- ❌ NO `StatementScanFlow.jsx` — Sprint M.2b (the highest-risk batch)
- ❌ NO `streak.js` — Sprint M.2b
- ❌ NO `constants.js txDedupKey` — Sprint M.2b
- ❌ NO `categories.js` unknown→other — Sprint M.2b
- ❌ NO `updateGoal` legacy throw audit — Sprint N or later
- ❌ NO Tower changes — Sprint P
- ❌ NO modal geometry — Sprint N

---

## Next — Sprint M.2b

Pre-locked scope already in `docs/SPRINT-CURRENT.md`:
- Batch 2: `src/screens/BudgetScreen.jsx saveBudget` — capture-previous-revert pattern
- Batch 3: `src/screens/StatementScanFlow.jsx handleImport` — honest "Imported N of M" + `deleteBatch`
- Batch 4: `src/lib/streak.js` — rollback semantics
- Plus: `src/lib/constants.js txDedupKey` + `src/lib/categories.js` unknown→"other"

**Estimated:** 1 session, ~2 hours.

**Pre-flight requirement:** Speaker should be fresh. Sprint M.2b includes StatementScanFlow which handles real money math — high blast radius. Don't run tired.

---

*Session 25 closed 2026-04-25. Sprint M.2a of M.2 complete.*
