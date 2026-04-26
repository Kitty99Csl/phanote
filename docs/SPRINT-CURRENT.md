# Current sprint — Sprint M.2b3 (Truthfulness Hardening — Final batch)

> **Status:** Scope-locked, not yet started. M.2b1 + M.2b2 CLOSED 2026-04-26.  
> **Last updated:** 2026-04-26  
> **Sprint M.1:** CLOSED Session 24
> **Sprint M.2a:** CLOSED Session 25
> **Sprint M.2b1:** CLOSED Session 26 (commit b539310)
> **Sprint M.2b2:** CLOSED Session 26 (commit f663579 + wrap)
> **Sprint M.2b3:** ACTIVE — final batch

---

## Sprint M.2b1 + M.2b2 summary (CLOSED)

**Theme:** BudgetScreen.saveBudget + streak.js + constants.js + categories.js  
**Duration:** Session 26 (~3 hours)
**Commits:** 3 (b539310 + f663579 + wrap)
**Files touched:** 4 (BudgetScreen, streak.js, constants.js, categories.js)
**Bundle hashes:** flipped DekFTcxm → C3dtQtFg → 6cXL-RDb
**Risks closed:** Review-P2-7, P2-8, P2-10, P2-11

**Full context:** docs/session-26/SUMMARY.md

---

## Sprint M.2b3 — StatementScanFlow + handleAddTransaction (FINAL)

**Theme:** Honest batch import counting + cross-file API change

**Sessions:** 1 (planned ~75-90 min, fresh energy required)

**Driver:** Final remaining truthfulness fix — the highest blast radius of all of Sprint M (real money math, multi-currency batch import).

---

### Sprint M.2b3 definition of done

Must meet ALL:
- [ ] `src/App.jsx handleAddTransaction` returns `{ ok }` (or similar) for caller to count
- [ ] `src/screens/StatementScanFlow.jsx handleImport` awaits each onAdd, counts ok/fail
- [ ] "done" step UI shows honest 3-state result (all-success / partial / all-failed)
- [ ] `src/screens/StatementScanFlow.jsx deleteBatch` Sprint M.1 pattern (capture-revert-toast)
- [ ] App.jsx toast suppression during batch import (isBatch flag — recommended approach)
- [ ] New i18n keys: statementImportPartial, statementImportAllFailed (× 3 languages)
- [ ] Per-batch smoke test in browser
- [ ] Atomic feat + wrap commits per Rule 20
- [ ] Sprint M FORMALLY CLOSES at this wrap
- [ ] OT-M-8 handler contract rule merged to CLAUDE.md
- [ ] All Review-P1 findings now closed

---

### Session M.2b3 phase structure

**Phase A (~15 min):** Lock 5 design questions

CC's Phase 0 investigation already done (Session 26 transcript). 5 questions ready:
- D-Batch3-Q1: handleAddTransaction return shape
- D-Batch3-Q2: App.jsx toast suppression mechanism
- D-Batch3-Q3: deleteBatch toast strategy
- D-Batch3-Q4: New i18n key naming + reuse vs new
- D-Batch3-Q5: "done" UI three-state branching

**Phase B (~50 min):** Apply changes

1. App.jsx handleAddTransaction return shape (~10 min)
2. StatementScanFlow handleImport with honest counting (~15 min)
3. New i18n keys × 3 languages (~5 min)
4. "done" step UI branching (~10 min)
5. deleteBatch hardening (~10 min)

**Phase C (~15-20 min):** Smoke test

Highest-priority smoke: simulate partial failure during batch import. Wife scenario test.

**Phase D (~15 min):** Atomic feat + wrap commit
- Sprint M FORMALLY CLOSES here
- OT-M-8 → CLAUDE.md merge
- Sentinel re-sync prompt

---

## Pre-flight requirements for Sprint M.2b3

**Speaker readiness:**
- Fresh energy (not "I just woke up groggy")
- Eaten recently
- 90+ min uninterrupted block
- Real product judgment for 5 design questions (these are not trivial)

**Environment (already verified, just confirm):**
- Node 24.13.1 active
- npm 11.8.0 active
- node_modules clean
- .env.local intact
- Dev server boots

**Sprint M.2b3 is the wrong batch to push through tired.** Real money math.

---

## Pre-locked design context for Phase A (CC's Session 26 investigation)

### D-Batch3-Q1: handleAddTransaction return shape

CC's recommended Option A: Return `{ ok: boolean, id? }`. Additive change. Existing FAF callers (QuickAddBar) ignore return; StatementScanFlow's loop awaits + counts.

Alternative: throw. Rejected — would break QuickAddBar (FAF caller).

### D-Batch3-Q2: App.jsx toast suppression during batch

CC's recommended Option A: Add `isBatch` flag to tx. handleAddTransaction skips toast when `tx.isBatch === true`. StatementScanFlow sets isBatch in txObj. Clean.

Alternative B: Keep per-row toasts → 19 toasts during 19-failure import. Bad UX.
Alternative C: Remove App.jsx toast entirely → regresses Sprint M.1 single-add toast. Bad.

### D-Batch3-Q3: deleteBatch toast strategy

Open. CC flagged: file has zero showToast usage today. Either import + use, OR put inline error in batch-history list. Phase A decision.

### D-Batch3-Q4: New i18n keys

Need at minimum:
- `statementImportPartial` — "Imported {ok} of {total}, {fail} failed"
- `statementImportAllFailed` — "Couldn't import any transactions. Try again?"

Possibly modify `statementSuccess` (currently "Imported {n}!") for the all-success case OR keep for ok=total case.

### D-Batch3-Q5: "done" UI states

Single template "Imported {ok} of {total}" works for all cases (when ok=total, says "Imported 20 of 20"). Or 3 branched messages with different emojis (✅ all / ⚠️ partial / ❌ all-failed).

CC's recommendation: single template covers all cases simply. Branched is nicer UX but more code.

---

## What NOT to do in Sprint M.2b3

Scope discipline:
- ❌ NO Sheet.jsx — Sprint N
- ❌ NO modal geometry — Sprint N
- ❌ NO updateGoal Session 10 audit — Sprint N
- ❌ NO Tower changes — Sprint P
- ❌ NO OT-M-7 (handleUpdateCategory caller audit) — Sprint N

---

## Open threads from earlier sprints

- **OT-M-5** — dbSaveMemory SELECT error handling (Sprint P)
- **OT-M-6** — dbTrackEvent internal `{ error }` check (Sprint P)
- **OT-M-7** — handleUpdateCategory caller try/catch audit (Sprint N)
- **OT-M-8** — Handler contract rule (DOCUMENTED in S25 DECISIONS.md, MERGE to CLAUDE.md at M.2b3 wrap)
- **OT-M.2-6** — updateGoal Session 10 legacy throw — Sprint N
- **OT-M.2b3-1 through M.2b3-7** — see Session 26 DECISIONS.md

---

## Full context

- docs/session-26/SUMMARY.md — M.2b1 + M.2b2 session recap
- docs/session-26/DECISIONS.md — All Session 26 decisions
- docs/session-25/SUMMARY.md — M.2a session recap
- docs/session-24/SUMMARY.md — M.1 session recap
- docs/review/2026-04-24/SPRINT-M-SCOPE.md — original Sprint M scope
- docs/ROADMAP-LIVE.md — current state
