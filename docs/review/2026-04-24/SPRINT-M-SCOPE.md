# Sprint M — Scope Lock

**Status:** Scope-locked 2026-04-24 pre-session-start
**Started:** Pending (next session)
**Theme:** Truthfulness Hardening — every Supabase write path truthful, profile-fetch-fail never routes to onboarding.

---

## File-level targets

### Session M.1 — Backend helpers (~2.5 hrs)

| Target | Current state | Fix | Priority |
|--------|---------------|-----|----------|
| src/lib/db.js dbUpdateTransaction | await supabase.from().update() no error check | Destructure error, throw on error | P1 CRITICAL |
| src/lib/db.js dbSaveMemory | Two separate write paths (update existing OR insert new), neither checks errors | Both destructure error, throw on error | P1 HIGH |
| src/lib/db.js dbUpsertProfile | await supabase.from("profiles").upsert() no error check | Destructure, throw | P1 HIGH |
| src/lib/db.js dbTrackEvent | Empty try/catch (intentional telemetry swallow) | Keep swallow but console.warn instead of empty catch | P2 LOW |
| src/lib/db.js dbInsertTransaction | Already correct | Use as template for fixing others, verify + comment | — |
| src/App.jsx loadUserData | Silent profile-fetch failure routes user to OnboardingScreen | Distinguish "no profile" from "fetch failed"; retry UI on fetch fail | P1 CRITICAL |
| src/App.jsx handleUpdateCategory | Has rethrow from Session 10 fix | Verify still correct, no changes expected | — |
| src/App.jsx handleUpdateNote | try/catch with console.error, no rethrow, no toast | Add showToast + rethrow | P2 |
| src/App.jsx handleDeleteTransaction / performDeleteTransaction | Empty catch | Toast + log + keep in list on failure | P1 |

### Session M.2 — Screen-level rollback (~2.5 hrs)

| Target | Current state | Fix | Priority |
|--------|---------------|-----|----------|
| src/screens/GoalsScreen.jsx performDeleteGoal | No error check, always optimistic | Check error, toast, don't filter goal out on failure | P1 HIGH |
| src/screens/GoalsScreen.jsx addSavings | No error check | Check error, toast, revert saved_amount on failure | P1 HIGH |
| src/screens/BudgetScreen.jsx saveBudget | Session 10 added throw, but no revert on failure | Save previous state, revert on throw, toast | P2 MEDIUM |
| src/screens/StatementScanFlow.jsx handleImport | onAdd() fire-and-forget, setSaveProgress blind, step-to-done regardless | onAdd returns { ok }, loop tracks failures, honest done-count | P1 HIGH |
| src/screens/StatementScanFlow.jsx deleteBatch | Weak error handling same class as dbUpdateTransaction | Apply same pattern as Sprint M.1 Batch 1 | P2 |
| src/lib/streak.js | Local state updates before profile write completes, only logs on failure | Save previous, optimistic update, await, revert on failure, toast | P2 MEDIUM |
| src/lib/constants.js txDedupKey | Ignores currency + type in dedup key | Include currency + type in key composition | P2 MEDIUM |
| src/lib/categories.js normalizeCategory | Unknown expense to food, unknown income to salary | Unknown to other for both directions | P2 MEDIUM |

---

## Files NOT touched in Sprint M

Scope discipline — these wait for their own sprint:

- src/components/Sheet.jsx — Sprint N
- src/modals/* — Sprint N
- src/components/QuickAddBar.jsx — Sprint N
- src/screens/HomeScreen.jsx (layout issues) — Sprint N
- src/screens/AnalyticsScreen.jsx — Sprint N or future
- src/screens/LoginScreen.jsx — Sprint N
- src/screens/OnboardingScreen.jsx — Sprint N (Thai picker fix could be 5-min squeeze-in at M close)
- src/screens/ProUpgradeScreen.jsx — Sprint K (payment flow wiring)
- tower/** — Sprint P
- workers/** — Sprint P (user_id logging) or Sprint O (/parse-statement instrumentation)

---

## Phase structure — both sessions

Per Sprint I's successful pattern:

**Phase A (10-15 min):** Design questions, reality check, scope lock confirmation.
**Phase B (90 min):** Build, batched with paste-back reviews per Rule 13.
**Phase C (20-30 min):** Smoke test — manual offline-mode tests, grep verification.
**Phase D (15 min):** Atomic wrap commit per Rule 20. Sentinel re-sync.

---

## Rule 13 paste-back scope (auth-critical + write-critical)

Auth/credential-adjacent code → full paste-back with CTO review before commit.

Sprint M batches that require paste-back:
- M.1 Batch 1 (db.js helpers — all writes go through these)
- M.1 Batch 2 (App.jsx caller hygiene — user-facing error paths)
- M.1 Batch 3 (loadUserData — authentication flow, critical path)
- M.2 Batch 1 (GoalsScreen — user-data writes)
- M.2 Batch 2 (BudgetScreen — user-data writes)
- M.2 Batch 3 (StatementScanFlow — batch import, highest-risk)
- M.2 Batch 4 (streak.js — user-facing state)

**All 7 batches require paste-back.** None can ship without CTO review.

---

## Exit criteria (measurable, grep-able)

**Must pass before Sprint M closes:**

1. Grep-based verification:
   grep -rn "await supabase" src/ | grep -v "error" | wc -l
   Expected: zero (every await is error-checked) EXCEPT dbTrackEvent (documented telemetry swallow).

2. Grep for silent catches:
   grep -rn "catch.*console.error" src/
   Each result must have either (a) a throw follow-up OR (b) a showToast above OR (c) be explicitly marked as intentional telemetry swallow.

3. Offline smoke test manual checklist:
   - [ ] Edit transaction → offline → save fails → toast appears, UI reverts
   - [ ] Delete goal → offline → delete fails → goal stays, toast appears
   - [ ] Add savings → offline → write fails → progress doesn't advance, toast appears
   - [ ] Save budget → offline → save fails → budget value reverts, toast appears
   - [ ] Statement import → offline → fails → honest "Failed: N" count shown
   - [ ] Refresh app → offline → shows retry UI, NOT OnboardingScreen

4. Regression check:
   - Previous behaviors unchanged (online path still works identically)
   - No new console errors on happy path
   - Bundle size delta: <5KB (pure logic change, no new deps)

---

## Risk tracking

Risks that could surface during Sprint M:

- **R-M-1 [LOW]** — Error-checking many writes might expose latent bugs where callers DIDN'T handle errors before. Could cause new user-facing toasts in places that previously silently succeeded-with-stale-UI. Mitigation: smoke test all screens on happy path after each batch.

- **R-M-2 [LOW]** — dbTrackEvent is used from many places for analytics. Keeping it silent-swallow is a design choice; may miss real errors later. Mitigation: log via console.warn + track in docs as intentional.

- **R-M-3 [MEDIUM]** — StatementScanFlow loop refactor to track failures needs test data. Manual test with Supabase offline is the easiest way but requires devtools throttle. If smoke test reveals issues, might expand to M.3 session.

- **R-M-4 [LOW]** — loadUserData retry behavior not yet designed. Phase A D-M1-Q4 decides: simple "retry on tap" button vs auto-retry with backoff. Wrong choice could annoy users or hide outages.

---

## Success definition

Sprint M is SUCCESS when:
1. All P1 findings from 2026-04-24 review map to CLOSED status
2. Zero regressions (every happy path still works)
3. Wife can use Phajot offline and see honest errors (not false success)
4. Any future Supabase-write-based feature has a template to follow (dbInsertTransaction + Session 10 pattern now applies to ALL db.js helpers)
5. docs/RISKS.md has "Review-P1-*" risks marked CLOSED with verification commit hash

---

## Open threads for future sprints (discovered during Sprint M planning)

Not in M scope, capture for later:

- **OT-M-1:** Universal Supabase wrapper — src/lib/db.js wrappers around EVERY direct supabase.from(...).update(...) call in the codebase (not just the ones in db.js). GoalsScreen has direct supabase usage. Many screens do.
- **OT-M-2:** Standardize toast error messages i18n — audit current toast keys and add missing Lao/Thai translations.
- **OT-M-3:** Error telemetry — when writes fail, surface to Tower for operator awareness (not just user-facing toast). Sprint P candidate.
- **OT-M-4:** Offline-mode banner — if all writes start failing, show persistent "You're offline" banner (not just individual toasts). UX polish, Sprint N or future.
