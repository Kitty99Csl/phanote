# Session 27 — DECISIONS

**Date:** 2026-04-27
**Sprint:** M.2b3 (Truthfulness Hardening — FINAL)

---

## Phase A locked decisions (5 questions)

### D-Batch3-Q1: handleAddTransaction return shape — Option A
**Decision:** Return { ok: true, id: saved.id } on success, { ok: false } on failure.
**Rationale:** Additive, doesn't break QuickAddBar fire-and-forget, includes id 
for future undo features. Matches Sprint M.1 D-M1-Q1 dbInsertTransaction precedent.

### D-Batch3-Q2: App.jsx toast suppression during batch — Option A
**Decision:** isBatch flag on tx object. handleAddTransaction checks 
!tx.isBatch before calling showToast on failure.
**Rationale:** Preserves QuickAddBar single-add error UX (Sprint M.1 fix). 
Batch summary shown in done UI instead of 19 stacked toasts.

### D-Batch3-Q3: deleteBatch toast strategy — Module-level import
**Decision:** import { showToast } from "../lib/toast" at top of file. 
No prop wiring needed.
**Rationale:** showToast is a module-level function (useSyncExternalStore 
pattern), already in App.jsx 13× usage. Cleanest path, zero prop chain change.

### D-Batch3-Q4: i18n key naming + reuse — 2 new keys
**Decision:** Add statementImportPartial + statementImportAllFailed (× 3 langs). 
Keep statementSuccess for full-success case. Plus deleteBatchFailed for Step 5.
**Rationale:** Specific copy per state more truthful than generic 
"Imported X of Y" template. Wife reads Lao primary; Thai gap closures 
proactive (statementSuccess, statementImporting, statementRetry, 
statementCancel — 4 pre-existing gaps + 2 new in same edit).

### D-Batch3-Q5: "done" UI three-state branching — Option A
**Decision:** Branched UI with distinct emoji + color + buttons per state.
- All-success: ✅ green, Done button
- Partial-fail: ⚠️ amber #D97706, Done + Retry buttons
- All-failed: ❌ red #C0392B, Retry + Cancel buttons
**Rationale:** Wife reads UI in 1 second. Color + emoji do work text alone can't. 
Single-template would be less truthful at a glance.

---

## Mid-session decisions

### D-Batch3-Q6: Retry destination — Option B (review, not upload)
**Decision:** handleRetry sends user to step:"review" instead of step:"upload".
**Rationale:** OCR already succeeded. Failure was in import phase. Sending 
to upload would risk re-OCR (Gemini API cost + time waste). Review screen 
preserves parsed transactions; user re-taps Import. Dedup logic handles 
already-saved rows.

### D-Batch3-Q7: deleteBatch sequencing — Optimistic-first
**Decision:** Capture previousBatchHistory + previousViewBatchId before 
mutation, then optimistic mutate, then await + check { error }, then 
revert + toast on catch.
**Rationale:** Matches Sprint M.1 / M.2a / M.2b1 pattern across codebase. 
Brief flash on failure < silent success on RLS failures (the actual bug 
being fixed).

---

## Smoke test decisions

### D-SmokeC-1: Phase C-Lite (DevTools, not phone)
**Decision:** 7-min DevTools offline simulation instead of 15-20 min 
real-phone bad-WiFi. 3 tests: happy / all-fail / partial-fail.
**Rationale:** Solo session, real-phone test annoying to set up, DevTools 
covers 80% of bug surface. Phase C-Full deferred to wife's actual usage.

### D-SmokeC-2: Production smoke after deploy in incognito
**Decision:** After CF Pages deploys, smoke production in incognito window 
(not normal browser).
**Rationale:** Session 23 cache-lying learning. Service workers + disk 
cache can serve old bundle. Incognito = guaranteed fresh fetch.

---

## Sprint M close decisions

### D-SprintM-Close-1: Sprint M close via atomic wrap
**Decision:** Sprint M FORMAL CLOSES with this wrap commit (Rule 20 atomic 
docs commit including CLAUDE.md Rule 22 addition + ROADMAP-LIVE + 
SPRINT-CURRENT).
**Rationale:** No half-closes. All M-related changes land atomically.

### D-SprintM-Close-2: Open threads filed forward, not closed
**Decision:** OT-M.2b3-extra-1, -2, -3 (batchId UX, HomeScreen prop gap, 
Tower log scraping) deferred to Sprint N or P. NOT closed in Sprint M.
**Rationale:** None block truthfulness contract. All cosmetic or 
observability. Sprint N (UX) and Sprint P (Tower honesty) are correct 
homes.
