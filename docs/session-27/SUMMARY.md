# Session 27 — Sprint M.2b3 SHIPPED + Sprint M FORMAL CLOSE

**Date:** 2026-04-27
**Theme:** Sprint M.2b3 — StatementScanFlow truthful import (final batch)
**Duration:** ~2.5 hours including pre-flight + Phase A + 5 build steps + smoke + push
**Sprint:** M.2b3 (Final batch of Sprint M)
**Prior HEAD:** 100a27e (Session 26 / Sprint M.2b1+M.2b2 wrap)
**Post HEAD:** 8edec33 (M.2b3 feat) → <this wrap>

---

## Session outcome

**Sprint M FORMALLY CLOSES with this wrap commit.** All Review-P1 + 
relevant P2 truthfulness findings closed across Sessions 24-27.

| # | Batch | Commit | Bundle |
|---|-------|--------|--------|
| 1 | M.2b3 feat — StatementScanFlow truthful import | 8edec33 | 6cXL-RDb → D8N37nO9 |
| 2 | This wrap | <hash> | hold at D8N37nO9 |

**Production deploy:** push → CF Pages flip in 31 seconds. Bundle 
hash verified differs from pre-session baseline (Rule 11 satisfied).

**Risks closed:**
- Review-P1-3 — StatementScanFlow reports success before saves land
- OT-M-8 — Handler contract rule (modal-throw, event-no-throw) merged 
  to CLAUDE.md as Rule 22
- OT-M.2b3-1 through OT-M.2b3-6 (this session's open threads)

---

## Work completed

### Phase A — Design lock (~15 min)

5 design questions locked, all per CC's Phase 0 recommendations:
- D-Batch3-Q1: handleAddTransaction returns { ok: bool, id?: string }
- D-Batch3-Q2: isBatch flag suppresses per-row toast during batch
- D-Batch3-Q3: deleteBatch uses module-level showToast import
- D-Batch3-Q4: 2 new i18n keys + Thai gap closures
- D-Batch3-Q5: 3-state branched done UI + Retry button to review step

Plus mid-session decisions:
- D-Batch3-Q6: Retry destination = "review" (not "upload") — preserves 
  OCR cost
- D-Batch3-Q7: Optimistic-first ordering for deleteBatch — matches 
  Sprint M.1 pattern

### Phase B — 5 build steps + 2 patches (~50 min)

| Step | File(s) | What |
|------|---------|------|
| 1 | src/App.jsx | handleAddTransaction returns { ok, id? }, isBatch toast guard |
| 2 | StatementScanFlow.jsx | importResult state, await onAdd, count successes/failures |
| 3 | shared/i18n-data.js | statementImportPartial + statementImportAllFailed × 3 langs |
| 3.5 | shared/i18n-data.js | Closed pre-existing Thai gap (statementSuccess + statementImporting) |
| 4 | StatementScanFlow.jsx | 3-state done UI, secondaryBtn helper, handleRetry |
| 4 patch | StatementScanFlow.jsx | handleRetry destination "upload" → "review" |
| 5 | StatementScanFlow.jsx + i18n-data.js | deleteBatch capture-revert-toast + deleteBatchFailed × 3 langs + Thai Retry/Cancel keys |

Paste-back review on every step. Zero rework needed mid-flight.

### Phase C-Lite — Smoke test (~7 min on localhost)

| # | Test | Result |
|---|------|--------|
| 1 | Happy path (online, all save) | ✅ Green checkmark, "Imported N!" |
| 2 | All-failed (DevTools offline) | ✅ Red X, "Couldn't import any. Try again?" + Retry/Cancel buttons |
| 3 | Partial-fail (DevTools offline mid-batch) | ✅ Amber ⚠️, "Imported X of Y — Z failed" + Done/Retry buttons |

Production smoke confirmed via incognito after deploy: same scenario 
that lied earlier in session ("Imported 2!" with red toast) now 
correctly shows ❌ "Couldn't import any."

### Phase D — Atomic feat + wrap commits (~15 min)

- Commit 1: 8edec33 (M.2b3 feat) — pushed, CF Pages built in 31s
- Commit 2: <this wrap> (atomic Rule 20 docs)
- Bundle hash: 6cXL-RDb → D8N37nO9 (Rule 11 verified in incognito)

---

## Sprint M FINAL summary

**Started:** Session 24 (2026-04-24) post external review pivot
**Closed:** Session 27 (2026-04-27)
**Sub-sprints:** M.1 + M.2a + M.2b1 + M.2b2 + M.2b3 (5 sub-sprints)
**Sessions:** 4 (24, 25, 26, 27)
**Commits:** 9 total feat + wrap pairs
**Files hardened:** 8 (loadUserData retry UI, GoalsScreen, BudgetScreen, 
streak.js, constants.js, categories.js, App.jsx, StatementScanFlow.jsx)
**Review findings closed:** 7 (Review-P1-1, P1-2, P1-3, P1-5, P2-7, 
P2-8, P2-10, P2-11) + Discovery-M1-1a, M1-1b
**Open threads carried to Sprint N:** 3 (OT-M-7 caller try/catch audit, 
OT-M.2-6 updateGoal legacy throw, OT-M.2b3-extra-1 batch_id duplication 
on retry)

**The wife scenario:** ✅ closed. Wife can now scan a bank statement 
on bad WiFi and trust whatever the screen says about how many 
transactions imported.

---

## Open threads carried forward

- **OT-M.2b3-extra-1:** Retry generates new batchId, creating two batch 
  entries in DB for one user-conceptual import. Cosmetic, non-truthfulness. 
  Sprint N or later.
- **OT-M.2b3-extra-2:** HomeScreen does not pass onDeleteBatch prop to 
  StatementScanFlow (pre-existing). Confirmed via Phase C smoke that 
  delete works locally; HomeScreen behavior on delete deferred to Sprint N.
- **OT-M.2b3-extra-3:** Tower observability — confirm log scraping 
  includes warn-level for delete-class failures (Sprint P scope).
- All Sprint M.1, M.2a, M.2b1, M.2b2 open threads carry forward unchanged.

---

## Learnings (proposed for CLAUDE.md key learnings block)

### Phase 0 investigation pattern saves rework

CC's pre-investigation in Session 26 (and now Session 27 for deleteBatch) 
turned what could have been multi-cycle code-review-rework loops into 
single-paste-back wins. Pattern: before any edit, CC reads current state, 
audits dependencies, surfaces unknowns. Steps 1-5 of Sprint M.2b3 averaged 
~10 min each because design + investigation happened upfront.

### Smoke-on-localhost catches bugs before production sees them

The "Imported 2!" lying screen on app.phajot.com early in session was 
old-code (Session 26 bundle 6cXL-RDb). Without smoke discipline, easy to 
mistake for a Sprint M bug. CC's diagnostic confirmed pre-deploy state, 
saved 30+ min of false debugging. Pattern reinforced: production has 
deploy-lag from local edits; smoke must happen on localhost OR after 
verified deploy.

### Optimistic-first sequencing trade-off settled

For all of Sprint M (M.1 onward), local-state mutation happens BEFORE 
the await persistence call. Trade-off: if the persistence fails, brief 
flash of wrong state before revert + toast. Decision: acceptable because 
toast tells truth immediately, and 95%+ of writes succeed. Honest flash 
beats await-first's silent-success-on-RLS-fail (which is what Sprint M 
exists to fix).

### Production deploy in 31 seconds today vs 13 minutes Session 23

CF Pages build speed is variable. Today: push → hash flip = 31s. Session 
23: 13+ minutes (browser cache, not build). Pattern: always poll the 
hash, never assume build time. Always verify in incognito.

---

## Phase C-Lite vs Phase C-Full

Speaker initially asked to skip smoke. Pushed back: Sprint M is the 
truthfulness sprint, can't ship truthfulness on faith. Negotiated to 
Phase C-Lite (DevTools offline, ~7 min, no phone needed). All 3 critical 
tests passed. Phase C-Full (real phone, real bad WiFi) deferred to 
post-launch user acceptance — wife scenarios in normal usage will catch 
anything Phase C-Lite missed.

Pattern: smoke testing has tiers. C-Full for high-risk multi-stakeholder 
sessions. C-Lite for solo + DevTools-reachable scenarios. C-skip for 
docs-only changes. Match smoke depth to risk.

---

## Rule 20 atomic wrap discipline

Session 27 follows established Sprint pattern:
- Commit 1: 8edec33 (M.2b3 feat)
- Commit 2: <this wrap> (atomic Rule 20 docs — includes CLAUDE.md 
  Rule 22 addition)

Both required for Sprint M atomicity. Sprint M is not closed without both.
