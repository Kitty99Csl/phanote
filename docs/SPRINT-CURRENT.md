# Current sprint — Sprint M.2 (Truthfulness Hardening — Part 2)

> **Status:** Scope-locked, not yet started. Sprint M.1 CLOSED 2026-04-24.  
> **Last updated:** 2026-04-24  
> **Sprint M part 1:** CLOSED (Session 24, commits `3d0eba7` + `<this wrap>`)

---

## Sprint M.1 summary (CLOSED)

**Theme:** Backend helpers + loadUserData retry UI  
**Duration:** Session 24 (~2h 15min)  
**Commits:** 2 (feat `3d0eba7` + wrap `<this>`)  
**Files touched:** 3 — `src/lib/db.js`, `src/App.jsx`, `shared/i18n-data.js`  
**LoC delta:** +119 / -12  
**Bundle hash:** flipped `CJY85dLV` → `DhdWacHa`  

**Risks closed:** 4 P1 findings (Review-P1-1, Review-P1-2, Discovery-M1-1a, Discovery-M1-1b)

**Full context:** `docs/session-24/SUMMARY.md`

---

## Sprint M.2 — Truthfulness Hardening (Part 2)

**Theme:** Screen-level rollback patterns + data-quality fixes in `src/lib/`

**Sessions:** 1 (planned ~2.5 hrs)

**Driver:** 2026-04-24 external review remaining P1 + P2 findings + OT captures from Sprint M.1.

---

### Sprint M.2 definition of done

Must meet ALL:
- [ ] `GoalsScreen performDeleteGoal` + `addSavings` handle error honestly (pattern from Session 10 `updateGoal`)
- [ ] `BudgetScreen saveBudget` optimistic update rolls back on failed write
- [ ] `StatementScanFlow handleImport` truthful: `onAdd` returns `{ ok }`, loop tracks failures, honest count on done
- [ ] `streak.js` updates local state only AFTER persistence confirms (revert on failure)
- [ ] `constants.js txDedupKey` includes currency + type
- [ ] `categories.js normalizeCategory` unknown → "other" (not food/salary)
- [ ] `StatementScanFlow deleteBatch` same pattern as Batch 1
- [ ] Offline-mode smoke test passes (requires working Codespaces env this time)
- [ ] Single atomic feat + wrap per Rule 20
- [ ] All remaining Review-P1-* risks marked CLOSED
- [ ] Sprint M formally closes at M.2 wrap

---

### Session M.2 phase structure

Per Sprint I / Sprint M.1 rhythm:

**Phase A (~10 min):** Design questions
- D-M2-Q1: StatementScanFlow import failure UX — N-of-M count OR retry-failed flow?
- D-M2-Q2: addSavings rollback — revert optimistic savings on failure?
- D-M2-Q3: streak.js rollback — full revert OR accept eventual consistency?

**Phase B (~90 min):** Build in 4 batches, paste-back per site

Batch 1 — `GoalsScreen.jsx`:
- `performDeleteGoal` — check `{ error }`, show toast, keep goal on failure
- `addSavings` — check `{ error }`, revert saved_amount on failure, toast

Batch 2 — `BudgetScreen.jsx`:
- `saveBudget` — capture previous state, revert on throw, toast

Batch 3 — `StatementScanFlow.jsx`:
- `handleImport` — `onAdd` returns `{ ok }`, loop tracks failures
- Step "done" shows honest "Imported N of M, K failed" UX
- `deleteBatch` — same pattern as Batch 1 helpers

Batch 4 — `src/lib/streak.js`:
- Save previous state → optimistic → await → revert on failure → toast

Plus data-quality:
- `src/lib/constants.js` — `txDedupKey` includes currency + type
- `src/lib/categories.js` — unknown fallback to "other" both directions

**Phase C (~30 min):** Smoke test — THIS TIME IN CODESPACES
- Online regression
- Offline goal delete/add-savings
- Offline budget save
- Statement import simulated partial failure
- Streak drift test

**Phase D (~15 min):** Atomic Rule 20 wrap commit
- Sprint M formally closes here
- Sentinel re-sync for Session 25 (M.2)

---

## What NOT to do in Sprint M.2

Scope discipline — these wait for their own sprint:
- ❌ NO `src/components/Sheet.jsx` — Sprint N
- ❌ NO `src/modals/*` — Sprint N  
- ❌ NO Tower changes — Sprint P
- ❌ NO OCR instrumentation — Sprint O
- ❌ NO ProUpgradeScreen wiring — Sprint K
- ❌ NO OT-M-7 `handleUpdateCategory` caller audit — Sprint N or add-on
- ❌ NO OT-M-5, OT-M-6 dbSaveMemory/dbTrackEvent consistency — Sprint P

---

## Open threads from Sprint M.1 (not M.2 scope)

Captured in `docs/session-24/RISKS.md`:
- **OT-M-5** — dbSaveMemory SELECT error handling (Sprint P)
- **OT-M-6** — dbTrackEvent internal `{ error }` check (Sprint P)
- **OT-M-7** — handleUpdateCategory caller try/catch audit (Sprint N)
- **OT-M-8** — Handler contract rule (documented in DECISIONS.md, to merge into CLAUDE.md at M.2 wrap)

---

## Smoke test environment for M.2

**Per Session 24 learning:** Stay in Codespaces for runtime verification. Local Windows lacks required Node 24 + `.env.local`. Do NOT switch mid-sprint.

**M.2 smoke prerequisites:**
- Codespaces session open and healthy
- Node 24.13.1 active (per `.nvmrc`)
- `.env.local` present with Supabase credentials
- `npm run dev` succeeds before batches begin

---

## Full context

- `docs/session-24/SUMMARY.md` — M.1 session recap
- `docs/session-24/DECISIONS.md` — D-M1-Q1 through Q5 + Discovery-M1-1
- `docs/session-24/RISKS.md` — closed + open risks
- `docs/review/2026-04-24/SPRINT-M-SCOPE.md` — original Sprint M scope (Session M.2 targets still accurate)
- `docs/ROADMAP-LIVE.md` — post-M.1 current state

---

## Archive — previous sprints

Sprint I (Admin-Approved Recovery System) — CLOSED 2026-04-22. 5 sessions, 11 commits, 16 risks closed.  
Sprint M.1 (Truthfulness Hardening Part 1) — CLOSED 2026-04-24. 1 session, 2 commits, 4 risks closed.

Complete sprint history: `docs/ROADMAP-LIVE.md#sprint-archive`.
