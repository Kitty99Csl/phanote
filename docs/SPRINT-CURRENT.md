# Current sprint — Sprint M (Truthfulness Hardening)

> **Status:** Scope-locked, not yet started.
> **Last updated:** 2026-04-24
> **Opened via:** External review pivot (GPT Codex 5.4 + peer review, 2026-04-24)

---

## Sprint M — Truthfulness Hardening

**Theme:** Every Supabase write path either succeeds truthfully or surfaces failure to the user. No silent lies. No optimistic UI without rollback. Profile-fetch failures never route to onboarding.

**Sessions:** 2 (M.1 backend helpers, M.2 screen-level rollback patterns)

**Estimated time:** ~5 hours total (M.1 ~2.5 hrs, M.2 ~2.5 hrs)

**Driver:** 2026-04-24 external review (GPT Codex 5.4 + peer review). Confirmed: same bug class as R21-13 from Session 21.5 exists in 5+ other places.

---

### Sprint M definition of done

Must meet ALL:
- [ ] Every Supabase write helper in `src/lib/db.js` inspects `{ error }` and throws on failure
- [ ] All callers of write helpers catch the throw → revert optimistic UI → surface user-facing toast
- [ ] `loadUserData` in `src/App.jsx` distinguishes "no profile exists" from "fetch failed" — never routes to OnboardingScreen on transient failure
- [ ] `GoalsScreen performDeleteGoal` + `addSavings` handle error honestly (same pattern as existing `updateGoal`)
- [ ] `BudgetScreen saveBudget` optimistic update rolls back on failed write
- [ ] `StatementScanFlow` import-completion truthful: shows failure count if any batch items failed
- [ ] `streak.js` updates local state only AFTER persistence confirms (or rolls back on failure)
- [ ] Offline-mode smoke test: every user-triggered write shows honest error, no false-success UI, no state corruption
- [ ] All changes paste-back reviewed per Rule 13 (auth/write-critical code)
- [ ] Single atomic feat commit + single atomic wrap commit per Rule 20

### Sprint M exit criteria (measurable)

- Zero instances of `await supabase.from(...).update(...)` without `{ error }` check in `src/` (grep-verified)
- Zero instances of `supabase.from(...).insert(...)` without `{ error }` check except `dbTrackEvent` (intentional telemetry swallow)
- Zero instances of `catch (e) { console.error(e); }` without rethrow in write paths
- Profile-fetch-fail offline test shows retry UI, NOT OnboardingScreen

---

### Session M.1 — Backend helpers + App.jsx loadUserData (~2.5 hrs)

**Phase A — Design questions (~15 min)**

- D-M1-Q1: dbUpdateTransaction signature change — breaking or additive? Most current callers use the pattern try/await/catch console.error pattern. If we throw on { error }, we need to verify every caller has try/catch.
- D-M1-Q2: dbSaveMemory + dbUpsertProfile — same question
- D-M1-Q3: dbTrackEvent — stays silent swallow (telemetry, not user-facing), but change empty catch to console.warn?
- D-M1-Q4: loadUserData failure handling — show retry UI, show network error toast + stay on loading splash, or something else?
- D-M1-Q5: Commit boundary — batch all 4 helpers + App.jsx in one feat commit, or split by helper?

**Phase B — Build (~1.5 hrs)**

Batch 1: src/lib/db.js helpers (PASTE-BACK)
- dbUpdateTransaction — inspect { error }, throw
- dbSaveMemory — same
- dbUpsertProfile — same
- dbTrackEvent — console.warn instead of empty catch
- dbInsertTransaction — already correct, verify + document as template

Batch 2: src/App.jsx caller hygiene (PASTE-BACK)
- handleUpdateCategory — already has rethrow from Session 10 fix, verify
- handleUpdateNote — add proper error handling
- handleDeleteTransaction — convert empty catch to toast + log
- performDeleteTransaction — same pattern
- Grep for all catch patterns in App.jsx, fix each

Batch 3: src/App.jsx loadUserData (PASTE-BACK — critical path)
- Distinguish data === null from error != null
- On fetch failure: keep loadingProfile true, show retry
- Decision locked at Phase A D-M1-Q4

**Phase C — Smoke test (~30 min)**
- Manual offline test: devtools → offline → edit transaction → verify toast fires, no false success
- Manual offline test: devtools → offline → refresh app → verify profile-fetch shows retry, NOT OnboardingScreen
- Grep verification: zero unchecked writes remaining

**Phase D — Wrap (~15 min)**
- Docs update per Rule 20
- Commit atomic
- Sentinel re-sync

### Session M.2 — Screen-level rollback patterns (~2.5 hrs)

**Phase A — Design questions (~10 min)**

- D-M2-Q1: StatementScanFlow import failure UX — show "Imported N of M, K failed" OR retry-failed flow?
- D-M2-Q2: addSavings rollback — if DB write fails, revert local goals state?
- D-M2-Q3: streak.js — roll back streak/xp on profile write failure, or accept eventual consistency?

**Phase B — Build (~1.5 hrs)**

Batch 1: src/screens/GoalsScreen.jsx (PASTE-BACK)
- performDeleteGoal — check { error }, show toast, keep goal in list on failure
- addSavings — check { error }, revert optimistic savings on failure, show toast

Batch 2: src/screens/BudgetScreen.jsx (PASTE-BACK)
- saveBudget — on throw, revert budget map to pre-optimistic state, show toast

Batch 3: src/screens/StatementScanFlow.jsx (PASTE-BACK — product-critical)
- onAdd callback signature: returns { ok: boolean }
- handleImport loop tracks failures
- Step "done" shows honest count: "Imported N of M" with failure detail

Batch 4: src/lib/streak.js (PASTE-BACK)
- Save previous state → optimistic update → await profile write → on failure, revert + toast

**Phase C — Smoke test (~30 min)**
- Offline: goal delete — verify goal stays, toast fires
- Offline: add savings — verify progress doesn't advance, toast fires
- Offline: budget save — verify budget doesn't visually change, toast fires
- Offline: statement import (mock partial failure) — verify honest count
- Offline: streak drift test — verify streak count doesn't advance locally if DB write failed

**Phase D — Wrap (~15 min)**
- Rule 20 atomic wrap commit
- Sentinel re-sync standalone for M.2
- Sprint M CLOSES

---

## What NOT to do in Sprint M

Scope discipline:
- NO new features
- NO modal/sheet layout work (Sprint N)
- NO Tower changes (Sprint P)
- NO OCR instrumentation (Sprint O)
- NO ProUpgradeScreen wiring (Sprint K)
- NO refactoring src/App.jsx root (out of scope)
- NO i18n new keys unless they're new error toasts

If something is tempting, capture it as a Sprint-X backlog item and move on.

---

## Full context

- docs/review/2026-04-24/TRIAGE.md — full finding-by-finding CTO analysis
- docs/review/2026-04-24/SPRINT-M-SCOPE.md — expanded scope doc with file-level targets
- docs/ROADMAP-LIVE.md — where Sprint M sits in overall roadmap

---

## Archive — previous sprints

Sprint I (Admin-Approved Recovery System) — CLOSED 2026-04-22. 5 sessions, 11 commits, 16 risks closed.

Complete sprint history: docs/ROADMAP-LIVE.md#sprint-archive.
