# Session 26 — DECISIONS

**Date:** 2026-04-26  
**Sprint:** M.2b1 + M.2b2 (BudgetScreen + streak/dedup/categories)

---

## Confirmed from Sprint M.2 Phase A (Session 25)

### D-M2-Q1: StatementScanFlow failure UX — Option A
**Status:** DEFERRED to Sprint M.2b3
**Locked rationale:** honest "Imported N of M, K failed"

### D-M2-Q3: streak.js rollback — Option A
**Status:** APPLIED in M.2b2 ✅
**Implementation note:** Refined to telemetry-style (no toast, console.warn + revert). See D-Batch4-Q1 below.

---

## New decisions this session

### D-M2-Q4: BudgetScreen saveBudget rollback — Option A
**Decision:** Capture full `previousBudgets` map before optimistic mutation; revert on failure.
**Rationale:** Same simplicity as M.2a addSavings/previousGoals; covers both upsert and delete paths via single setBudgets call.

---

### D-Batch2-Q1: throw vs no-throw for saveBudget
**Decision:** NO THROW (match OT-M-8)
**Rationale:** Same caller shape as M.2a (FAF arrow inside `<SetBudgetModal onSave>`). Existing throw was Session 10 legacy. Removing it eliminates unhandled-rejection path; revert + toast = full user signal.

### D-Batch2-Q2: Single previousBudgets capture
**Decision:** Capture ONCE before ternary setBudgets.
**Rationale:** React's immutable state means single revert call covers both upsert and delete paths.

### D-Batch2-Q3: { error } destructure vs res.error
**Decision:** Use `const { error } = await ...` destructure.
**Rationale:** Match Sprint M.1/M.2a convention. Future audit easier with single pattern.

---

### D-Batch4-Q1: streak.js failure handling — Option B (no-throw + revert + return null)
**Context:** updateStreak is a side-effect of handleAddTransaction. Caller already wraps in try/catch.
**Options considered:**
- A) Throw → caller's catch fires `toastSaveError` (LIE — tx already saved)
- B) No-throw + revert previousProfile + return null (correct semantics)
- C) No-throw + lib emits own toast (architectural drift — lib shouldn't import showToast)

**Decision:** Option B.
**Rationale:** Streak failure ≠ data loss. Matches dbTrackEvent telemetry pattern but ALSO reverts UI for truthfulness. Caller's `if (bonusToast)` gate handles null return without celebration toast.

### D-Batch4-Q2: New i18n keys for streak error?
**Decision:** No new keys.
**Rationale:** Silent revert is the contract. No user-facing toast needed.

### D-Batch4-Q3: previousProfile capture
**Decision:** Explicit `const previousProfile = currentProfile` (consistency with M.2a/M.2b1 patterns).
**Rationale:** Future readers see the same shape across all hardened helpers.

---

### D-Constants-Q1: txDedupKey component order
**Decision:** `date|amount|currency|type|description` (stable scalars first, mutable string last).
**Rationale:** Any order works for set membership; convention chooses scalars-first.

### D-Constants-Q2: Missing currency/type fallback
**Decision:** `||""` fallback for both fields.
**Rationale:** Defensive against legacy/malformed tx objects.

---

### D-Categories-Q1: Use other/other_inc as fallback
**Decision:** Mirror existing L154 alias mapping.
**Rationale:** Both canonical IDs already exist with neutral 📦 emoji + 3-language labels. Fix uses existing infrastructure.

### D-Categories-Q2: Data migration?
**Decision:** No migration needed.
**Rationale:** Existing transactions keep their stored category_name (mostly correct anyway). Only NEW unknown categorizations get the corrected fallback.

---

### D-Sprint-Split: Sprint M.2b → M.2b1 + M.2b2 + M.2b3
**Context:** Sprint M.2b plan = single 2hr session for 3 batches + supporting. Reality: Speaker stopped after Batches 2, 4, supporting (4 of 5 batches). Batch 3 (StatementScanFlow) = ~75-90 min on its own due to scope.
**Decision:** Ship M.2b1 + M.2b2 today; defer M.2b3 to fresh tomorrow session.
**Rationale:** 
- Batch 3 has 5 design questions still to resolve, real money math, multi-currency, cross-file API change
- Pushing through tired = exactly the wrong place
- Each sub-sprint is independently valuable (wife already gets 4 trust improvements tonight)
- Pattern: scope flexibility within sprint > forced completion

---

## Open threads carried to Sprint M.2b3

- **OT-M.2b3-1:** StatementScanFlow handleImport honest count UX
- **OT-M.2b3-2:** StatementScanFlow deleteBatch hardening (same Sprint M.1 pattern)
- **OT-M.2b3-3:** App.jsx handleAddTransaction return shape (`{ ok }` recommended)
- **OT-M.2b3-4:** App.jsx toast suppression during batch (isBatch flag recommended)
- **OT-M.2b3-5:** New i18n keys for partial-success / all-failed states
- **OT-M.2b3-6:** OT-M-8 Handler contract rule merge to CLAUDE.md (carried since Sprint M.1; final Sprint M close)
- **OT-M.2b3-7:** updateGoal Session 10 legacy throw audit (Sprint N)

---

## Rule 20 atomic wrap discipline

Session 26 follows Sprint I / Sprint M.1 / Sprint M.2a pattern:
- Commit 1: b539310 (M.2b1 BudgetScreen)
- Commit 2: f663579 (M.2b2 streak + supporting)
- Commit 3: <this wrap> (docs)

Sprint M.2b3 will be Session 27's commit + final M.2b wrap.
