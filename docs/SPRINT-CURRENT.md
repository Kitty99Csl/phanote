# Current sprint — Sprint M.2b (Truthfulness Hardening — Part 2 remainder)

> **Status:** Scope-locked, not yet started. Sprint M.2a CLOSED 2026-04-25.  
> **Last updated:** 2026-04-25  
> **Sprint M.1:** CLOSED Session 24
> **Sprint M.2a:** CLOSED Session 25 (commit c5bd19d + wrap)

---

## Sprint M.2a summary (CLOSED)

**Theme:** GoalsScreen truthfulness hardening
**Duration:** Session 25 (~3 hours including ~45min env setup)
**Commits:** 2 (feat c5bd19d + wrap)
**Files touched:** 1 — src/screens/GoalsScreen.jsx
**LoC delta:** +23/-5
**Bundle hash:** flipped DhdWacHa → DekFTcxm
**Risks closed:** Review-P1-5 partial (DELETE + ADD halves)

**Full context:** docs/session-25/SUMMARY.md

---

## Sprint M.2b — Truthfulness Hardening (remainder)

**Theme:** BudgetScreen + StatementScanFlow + streak.js + supporting data-quality fixes

**Sessions:** 1 (planned ~2 hours, fresh energy required)

**Driver:** Continue from Sprint M.2a — remaining Sprint M scope.

---

### Sprint M.2b definition of done

Must meet ALL:
- [ ] `BudgetScreen saveBudget` optimistic update rolls back on failed write
- [ ] `StatementScanFlow handleImport` truthful: `onAdd` returns `{ ok }`, loop tracks failures, honest "Imported N of M" UX
- [ ] `streak.js` updates local state only AFTER persistence confirms (revert on failure)
- [ ] `constants.js txDedupKey` includes currency + type
- [ ] `categories.js normalizeCategory` unknown → "other" (not food/salary)
- [ ] `StatementScanFlow deleteBatch` same pattern as Batch 1 helpers
- [ ] Per-batch smoke test in browser (same as M.2a)
- [ ] Single atomic feat + wrap per Rule 20
- [ ] Sprint M formally closes at M.2b wrap

---

### Session M.2b phase structure

Per M.2a rhythm (proven this session):

**Phase A (~5 min):** Pre-locked design questions confirmed (D-M2-Q1, Q3 still apply)

**Phase B (~75 min):** Build in 4 batches with paste-back per batch

Batch 2 — BudgetScreen.jsx (~15 min):
- saveBudget — capture previous map, revert on throw, toast

Batch 3 — StatementScanFlow.jsx (~30 min, the BIG one):
- handleImport — onAdd returns `{ ok }`, loop tracks failures
- Step "done" shows honest "Imported N of M, K failed" UX
- deleteBatch — same pattern as Batch 1 helpers
- HIGHEST blast radius: real money math, multi-currency

Batch 4 — src/lib/streak.js (~15 min):
- Save previous state → optimistic → await → revert on failure → toast

Plus data-quality (~15 min):
- src/lib/constants.js — txDedupKey includes currency + type
- src/lib/categories.js — unknown fallback to "other" both directions

**Phase C (~15-20 min):** Per-batch smoke test in browser (Sprint M.2a pattern)

**Phase D (~15 min):** Atomic Rule 20 wrap commit
- Sprint M formally closes here
- Sentinel re-sync standalone

---

## What NOT to do in Sprint M.2b

Scope discipline:
- ❌ NO src/components/Sheet.jsx — Sprint N
- ❌ NO src/modals/* — Sprint N
- ❌ NO Tower changes — Sprint P
- ❌ NO updateGoal legacy throw audit — Sprint N
- ❌ NO new features

---

## Open threads from Sprint M.1 (carried)

- OT-M-5 — dbSaveMemory SELECT error handling (Sprint P)
- OT-M-6 — dbTrackEvent internal `{ error }` check (Sprint P)
- OT-M-7 — handleUpdateCategory caller try/catch audit (Sprint N)
- OT-M-8 — Handler contract rule (modal throw / event no-throw — documented in Session 24 DECISIONS.md, to merge into CLAUDE.md at Sprint M.2b wrap)

## Open threads from Sprint M.2a (carried)

- OT-M.2-1 through OT-M.2-5 — captured in Session 25 DECISIONS.md (= Sprint M.2b scope)
- OT-M.2-6 — updateGoal Session 10 legacy throw — Sprint N

---

## Smoke test environment for M.2b

**Local Windows is now production-fidelity** post Session 25 env setup:
- Node 24.13.1 ✅
- npm 11.8.0 ✅
- .env.local present ✅
- Lockfile verified compatible ✅

Speaker can ship M.2b from local OR Codespaces — both work. Prefer local for continuity.

---

## Full context

- docs/session-25/SUMMARY.md — M.2a session recap
- docs/session-25/DECISIONS.md — D-M2-Q1..Q3 + D-Batch1-Q1..Q3 + D-Sprint-Split
- docs/session-24/SUMMARY.md — M.1 session recap
- docs/review/2026-04-24/SPRINT-M-SCOPE.md — original Sprint M scope (M.2b targets still accurate)
- docs/ROADMAP-LIVE.md — post-M.2a current state
