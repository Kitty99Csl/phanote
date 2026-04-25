# Session 25 — DECISIONS

**Date:** 2026-04-25  
**Sprint:** M.2a (GoalsScreen truthfulness)  
**Author:** CTO (chat Claude) + CC + Speaker (Kitty)

---

## Pre-session decisions (Phase A)

### D-M2-Q1: StatementScanFlow failure UX

**Decision:** Option A — honest "Imported N of M, K failed" UX

**Status:** DEFERRED to Sprint M.2b (StatementScanFlow not touched in M.2a)

**Locked rationale:** Truthful, simplest, actionable. Matches Sprint M philosophy. Lower complexity than auto-retry (Option B) or per-row indicators (Option C). Speaker confirmed.

### D-M2-Q2: addSavings rollback semantics

**Decision:** Option A — capture previousGoals, optimistic update, await DB, revert on failure + toast

**Status:** APPLIED in Batch 1 ✅

**Why Option A:** Matches Session 10 `updateGoal` pattern, simplest correct handling for both complete-path and partial-path optimistic updates.

### D-M2-Q3: streak.js rollback approach

**Decision:** Option A — full revert (consistent with Q2)

**Status:** DEFERRED to Sprint M.2b (streak.js not touched in M.2a)

**Why Option A:** Consistency with Q2 reduces cognitive load. Streak matters to user (gamification) — they should know if it failed.

---

## In-session decisions

### D-Batch1-Q1: Throw vs no-throw for new GoalsScreen functions

**Context:** In-file `updateGoal` (Session 10 legacy) throws despite FAF caller. New functions could match in-file precedent OR match OT-M-8 contract (current rule).

**Decision:** NO THROW for both new functions (match OT-M-8)

**Rationale:**
- OT-M-8 is current documented contract (Sprint M.1 / Session 24)
- Both functions called from FAF arrows (AddSavingsModal.onSave, ConfirmSheet.onConfirm)
- Throwing would create unhandled rejections at L271, L275
- Revert + toast is sufficient user signal for FAF context
- updateGoal's throw is acceptable legacy — leave alone (out of M.2a scope)

**Acknowledged asymmetry:** GoalsScreen.jsx ends with `updateGoal` throwing (legacy) and `addSavings` + `performDeleteGoal` not throwing (new pattern). Documented, not bug.

---

### D-Batch1-Q2: Revert strategy for addSavings two-path optimistic update

**Context:** addSavings has TWO optimistic state mutations:
- Complete path: `setGoals(prev => prev.filter(g => g.id !== goalId))` — REMOVES goal
- Partial path: `setGoals(prev => prev.map(g => g.id === goalId ? {...g, saved_amount: newSaved} : g))` — UPDATES goal

**Decision:** Capture full `previousGoals` array before any mutation. Single `setGoals(previousGoals)` revert covers both paths.

**Rationale:**
- React's `setGoals(prev => ...)` produces NEW array — captured reference to OLD array stays intact
- Single revert call handles either optimistic path correctly
- Simpler than tracking which mutation occurred and reverting that specific change
- Matches React state patterns from `handleUpdateNote`, `performDeleteTransaction` (Sprint M.1)

---

### D-Batch1-Q3: Modal close timing (success-gate)

**Context:** Original code unconditionally cleared `setAddToGoal(null)` and `setPendingDeleteGoalId(null)` after the await — even on failure.

**Decision:** Move close-state mutations INSIDE try block, AFTER the `if (error) throw error` guard.

**Rationale:**
- Failed write should keep modal open for retry
- User signal: modal stays open + toast = "this didn't save, try again"
- Strict improvement over original (no regressions, fixes latent UX bug)
- CC's investigation flagged that original `performDeleteGoal` never cleared `pendingDeleteGoalId` — possibly a latent bug already

---

### D-Phase-C-decision: Smoke test in browser, not deferred

**Context:** Sprint M.1 deferred Phase C runtime smoke due to local Windows env issues. Sprint M.2a benefits from now-fixed local env.

**Decision:** Run smoke test in real browser under Node 24.13.1 / npm 11.8.0 (production-fidelity).

**Rationale:**
- Sprint M.2 has higher blast radius than M.1 (especially Batch 3 / StatementScanFlow)
- Sprint M.2 explicitly required Codespaces smoke per Session 24 doc — local Windows now meets same Node version criteria
- Faster iteration than Codespaces (no resume/sync overhead)
- Caught zero new bugs but provided high confidence

**Trade-off:** Per-batch smoke slows rhythm but increases per-batch confidence. Acceptable for trust-critical sprint.

---

### D-Sprint-Split: Sprint M.2 → M.2a + M.2b

**Context:** Original Sprint M.2 plan = single 2.5hr session covering 4 batches. Reality: env setup + Batch 1 + smoke ate ~3hr; Speaker fatigue surfacing. Continuing 4 more batches risks subtle bugs in StatementScanFlow money math.

**Decision:** Ship Batch 1 today as Sprint M.2a (independently valuable). Defer Batches 2-4 + supporting fixes to Sprint M.2b future session.

**Rationale:**
- Batch 1 is independently valuable (closes 2 silent-write bugs in production goals screen)
- Each batch is atomic, doesn't depend on later batches
- Sprint M.2b can ship fresh in future session with full focus
- Tired engineering on money-math code (StatementScanFlow Batch 3) = wrong place to push through

**Pattern for future sprints:** Sprint scope can flex mid-session when energy/time constraints surface. Independent batches > forced completion.

---

## Open threads (carried to Sprint M.2b)

- **OT-M.2-1:** Batch 2 — BudgetScreen.jsx saveBudget capture-previous-revert pattern
- **OT-M.2-2:** Batch 3 — StatementScanFlow.jsx handleImport honest count UI + deleteBatch
- **OT-M.2-3:** Batch 4 — streak.js rollback semantics
- **OT-M.2-4:** constants.js txDedupKey include currency + type
- **OT-M.2-5:** categories.js unknown → "other" fallback
- **OT-M.2-6:** updateGoal Session 10 legacy throw — Sprint N audit (caller try/catch in callers)

---

## Rule 20 atomic wrap discipline

Session 25 follows Sprint I / M.1 pattern:
- **Commit 1:** `c5bd19d` — feat (GoalsScreen Batch 1)
- **Commit 2:** `<this wrap>` — docs (Sprint M.2a close)

Both required for Sprint M.2a atomicity.
