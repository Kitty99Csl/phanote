# Full Review Summary

Status: complete review snapshot
Last updated: 2026-04-24
Companion log: `docs/review/REVIEW-LOG.md`

## Purpose

This file is the one-shot summary of the repo review so the project can move from
investigation into ordered fixes.

It condenses the batch review log into:
- executive summary
- source-of-truth view
- highest-risk product issues
- UX/UI issues
- data/integrity issues
- Tower/admin issues
- recommended fix order
- remaining verification gaps

## Review scope covered

Reviewed at meaningful depth:
- root docs and project guidance
- `src/components/`
- `src/modals/`
- `src/screens/`
- shared logic in `src/lib/`
- selected worker/backend logic in `workers/`
- Tower app in `tower/`
- selected config and Supabase migrations

Not treated as fully exhaustive runtime verification:
- live device/browser testing
- end-to-end auth/session testing against production services
- complete worker failure-path simulation
- build/lint/test execution in a fully installed environment

## Executive summary

Phajot has real product value and a surprisingly broad surface area already,
but the current codebase has three recurring failure patterns:

1. mobile modal/layout foundations are fragile
2. several write paths can silently fail while UI still looks successful
3. authority and observability are weaker than the UI sometimes suggests

The highest-risk user-facing issues are not cosmetic. They are trust issues:
- existing users can be routed into the wrong flow on profile-load failure
- edits/imports/goals/budgets can appear to succeed when persistence fails
- statement import can report success too early
- Pro upgrade currently cannot complete from the main CTA

The highest-value structural fix is the shared sheet/modal system. The highest-value
logic fix is making all persistence paths truthful about failure. The highest-value
admin fix is making Tower reflect real system state instead of hardcoded healthy status.

## Source of truth hierarchy

Current practical hierarchy after review:
- live project state: `docs/ROADMAP-LIVE.md`
- operating rules: `CLAUDE.md`
- supporting product/design reference: `project_codex.md`
- historical/supporting handoff material: most other docs unless explicitly maintained as live

Main documentation problem:
- several files still read as current even when they are snapshots or historical context
- this causes onboarding drift and wrong-path decision-making

## Highest-priority findings

### P1: Existing users can fall into onboarding after profile read failure
- File: `src/App.jsx`
- Why it matters: transient profile fetch failure is too close to "no profile", so an authenticated user can be misrouted into onboarding.

### P1: Transaction updates can fail silently
- File: `src/lib/db.js`
- Why it matters: update helpers do not consistently inspect Supabase errors, so the UI may claim success when the database rejected the write.

### P1: Statement import can finish before saves actually succeed
- File: `src/screens/StatementScanFlow.jsx`
- Why it matters: users can be told an import completed even though async transaction writes are still pending or have failed.

### P1: Shared modal/sheet layout breaks on mobile keyboards
- File: `src/components/Sheet.jsx`
- Why it matters: the base popup geometry can push actions out of view and make edit/confirm flows feel broken on small phones.

### P1: Edit/goal modals lose header and close context while scrolling
- Files:
  - `src/modals/EditTransactionModal.jsx`
  - `src/modals/GoalModal.jsx`
- Why it matters: top controls scroll away while action buttons remain pinned elsewhere, causing alignment and exit problems.

### P1: Pro upgrade screen has an inert primary CTA
- File: `src/screens/ProUpgradeScreen.jsx`
- Why it matters: users can reach the paywall/upsell but cannot actually begin conversion from the primary button.

### P1: Goal savings can look successful even when persistence fails
- File: `src/screens/GoalsScreen.jsx`
- Why it matters: savings progress and completion can be shown locally even if the backend never stored the update.

## Important P2 findings

### UX/UI and flow
- `src/components/QuickAddBar.jsx`
  - quick-add row is too dense on narrow mobile widths
- `src/modals/AiAdvisorModal.jsx`
  - long chat loses fixed title/close context
- `src/screens/AnalyticsScreen.jsx`
  - month navigation can get stuck across gap months
- `src/screens/HomeScreen.jsx`
  - import completion forces the background tab to Home
- `src/screens/LoginScreen.jsx`
  - centered auth card is risky on short screens with the keyboard open
- `src/screens/OnboardingScreen.jsx`
  - Thai is still omitted from the onboarding language picker

### Data integrity and logic
- `src/lib/categories.js`
  - unknown categories collapse to `food` for expense flows and `salary` for income flows instead of a neutral bucket
- `src/lib/constants.js`
  - statement dedup key ignores currency/type and can suppress legitimate transactions
- `src/screens/GoalsScreen.jsx`
  - goal deletion follows the same silent-success pattern as goal savings
- `src/screens/BudgetScreen.jsx`
  - optimistic local budget updates are not rolled back on failed saves
- `src/lib/streak.js`
  - streak/xp can drift locally from persisted state on write failure
- `src/screens/StatementScanFlow.jsx`
  - statement review cannot reclassify into custom categories
- `src/screens/StatementScanFlow.jsx`
  - batch deletion also uses weak error handling

### Worker and admin surface
- `tower/src/components/HeaderStrip.jsx`
  - hardcoded `System Nominal` status
- `tower/src/routes/Lobby.jsx`
  - hardcoded healthy/active readouts can mislead operators
- `tower/src/layouts/ShellLayout.jsx`
  - desktop-only shell likely degrades badly on narrow screens
- `tower/src/App.jsx`
  - BrowserRouter deep links likely need SPA fallback in deployment
- `workers/phanote-api-worker.js`
  - observability logs still collapse most AI traffic into anonymous free-tier rows

## Documentation and authority cleanup findings

The documentation problem is mostly authority drift, not lack of content.

Main cleanup targets already identified:
- `CLAUDE.md`
- `project_codex.md`
- `docs/TOMORROW-START-HERE.md`
- `docs/tower/README.md`
- `docs/RISKS.md`
- `docs/tower/RISKS-FROM-AUDITS.md`

Main fixes needed:
- remove contradictory "current" or "source of truth" claims
- relabel stale files as historical/supporting snapshots
- point live state readers back to `docs/ROADMAP-LIVE.md`

## Root problem themes

### 1. Truthfulness under failure

The app repeatedly updates local UI state before confirming persistence, then fails
to roll back or surface the backend error clearly. This appears in:
- transaction updates
- goal savings
- goal deletion
- budget saves
- streak/profile updates
- statement import completion

This is the single most important reliability theme in the repo.

### 2. Shared UI foundations need one structural pass

The modal/sheet system is creating downstream problems in multiple forms. Fixing
individual popups without fixing the shared geometry would likely create churn.

### 3. Operator trust must match actual wiring

Tower currently looks more live than it really is in some places. Placeholder rooms
are acceptable, but hardcoded healthy status in admin-facing chrome is risky.

### 4. Authority drift

Docs, code comments, and admin/Tower messaging do not always reflect the same
current project truth. That makes maintenance harder than it needs to be.

## Recommended fix order

### Phase 1: trust and data integrity
- `src/lib/db.js`
- `src/App.jsx`
- `src/screens/GoalsScreen.jsx`
- `src/screens/StatementScanFlow.jsx`
- `src/screens/ProUpgradeScreen.jsx`

Goal:
- users should never be told something saved/imported/updated when it did not
- existing authenticated users should not be routed into the wrong screen
- paid conversion should actually work

### Phase 2: mobile modal foundation
- `src/components/Sheet.jsx`
- `src/modals/EditTransactionModal.jsx`
- `src/modals/GoalModal.jsx`
- `src/modals/AiAdvisorModal.jsx`
- follow-up sweep on shorter modals using the same pattern

Goal:
- stop disappearing buttons, sliding forms, and scroll-away headers on mobile

### Phase 3: input and navigation quality
- `src/components/QuickAddBar.jsx`
- `src/screens/AnalyticsScreen.jsx`
- `src/screens/HomeScreen.jsx`
- `src/screens/LoginScreen.jsx`
- `src/screens/OnboardingScreen.jsx`

Goal:
- clean up the most-used input path and remove avoidable navigation frustration

### Phase 4: categorization and statement correctness
- `src/lib/categories.js`
- `src/lib/constants.js`
- `src/screens/StatementScanFlow.jsx`

Goal:
- reduce silent misclassification and false duplicate suppression

### Phase 5: Tower/admin truthfulness
- `tower/src/components/HeaderStrip.jsx`
- `tower/src/routes/Lobby.jsx`
- `tower/src/layouts/ShellLayout.jsx`
- `workers/phanote-api-worker.js`

Goal:
- make the admin/operator layer accurate before making it more sophisticated

### Phase 6: docs authority cleanup
- the six priority docs from the docs pass

Goal:
- make future maintenance easier and reduce stale guidance

## Testing focus once fixes start

Highest-value live verification after code changes:
- existing-user login with temporary profile read failure
- edit transaction flow on small mobile screen with keyboard open
- goal savings success and failure paths
- budget save failure path
- statement import with partial write failure simulation
- custom-category review in statement import
- Pro upgrade CTA flow
- Tower direct navigation refresh on deployed subpaths

## Residual unknowns

These are not signs of bad review coverage; they are natural limits of static review:
- device-specific keyboard behavior still needs live testing
- Supabase/RLS behavior needs runtime confirmation in a real environment
- worker/provider edge cases need real request/response testing
- build/lint/test verification remains separate until dependencies are installed and run

## Bottom line

The project is not blocked by lack of features. It is blocked more by polish truthfulness:
- UI should stay visible and controllable on mobile
- writes should fail honestly
- admin status should reflect reality
- docs should say which file is authoritative

That means the next best move is not another broad review pass.
It is implementation, starting with the P1 trust issues and the shared modal foundation.
