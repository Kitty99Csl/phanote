# Review Log

Status: in progress
Last updated: 2026-04-24
Scope reviewed so far:
- docs authority and status framing
- `src/components/`
- `src/modals/`
- `src/screens/`
- selected core logic files in `src/lib/`
- selected worker files
- initial Tower routing check

Purpose:
- Keep a local, human-readable review backlog in the repo
- Capture review findings before code changes
- Separate "reviewed already" from "still needs review"

Important limits:
- This is a static review log, not a full runtime/device test report
- Findings here are based on code inspection unless otherwise noted
- Items are grouped by review batch to preserve context

## Review Coverage

### Docs reviewed
- `README.md`
- `CLAUDE.md`
- `project_codex.md`
- `docs/ROADMAP-LIVE.md`
- `docs/RISKS.md`
- `docs/TOMORROW-START-HERE.md`
- `docs/decisions/DECISIONS-LOG.md`
- `docs/decisions/OPEN-QUESTIONS.md`
- `docs/tower/CHARTER.md`
- `docs/tower/ROADMAP.md`
- `docs/tower/design-system.md`
- `docs/tower/README.md`
- `docs/tower/RISKS-FROM-AUDITS.md`
- `docs/tower/vanguard/SPRINT-CURRENT.md`
- `docs/session-14/SUMMARY.md`
- `docs/session-15/SUMMARY.md`

### Core app and logic reviewed
- `src/App.jsx`
- `src/lib/auth.js`
- `src/lib/categories.js`
- `src/lib/constants.js`
- `src/lib/db.js`
- `src/lib/fetchWithTimeout.js`
- `src/lib/i18n.js`
- `src/lib/parser.js`
- `src/lib/store.js`
- `src/lib/streak.js`
- `src/lib/supabase.js`
- `workers/phanote-api-worker.js`
- `workers/lib/ai-costs.js`

### Config and schema reviewed
- `package.json`
- `wrangler.toml`
- `supabase/migrations/001_profiles.sql`
- `supabase/migrations/002_categories.sql`
- `supabase/migrations/003_remaining_tables.sql`
- `supabase/migrations/004_capture_current_schema.sql`
- `supabase/migrations/005_auth_legacy_flag.sql`
- `supabase/migrations/006_observability.sql`

### Components reviewed
- `src/components/Sheet.jsx`
- `src/components/ConfirmSheet.jsx`
- `src/components/QuickAddBar.jsx`
- `src/components/BottomNav.jsx`
- `src/components/OcrButton.jsx`
- `src/components/TransactionList.jsx`
- `src/components/Toast.jsx`
- `src/hooks/useKeyboardOffset.js`

### Modals reviewed
- `src/modals/EditTransactionModal.jsx`
- `src/modals/GoalModal.jsx`
- `src/modals/ConfirmModal.jsx`
- `src/modals/SetBudgetModal.jsx`
- `src/modals/AddSavingsModal.jsx`
- `src/modals/AiAdvisorModal.jsx`
- `src/modals/MonthlyWrapModal.jsx`
- `src/modals/StreakModal.jsx`
- `src/modals/QuickEditToast.jsx`

### Screens reviewed
- `src/screens/HomeScreen.jsx`
- `src/screens/LoginScreen.jsx`
- `src/screens/OnboardingScreen.jsx`
- `src/screens/SettingsScreen.jsx`
- `src/screens/TransactionsScreen.jsx`
- `src/screens/StatementScanFlow.jsx`
- `src/screens/AnalyticsScreen.jsx`
- `src/screens/BudgetScreen.jsx`
- `src/screens/GoalsScreen.jsx`
- `src/screens/ProUpgradeScreen.jsx`
- `src/screens/GuideScreen.jsx`
- `src/screens/MigrationScreen.jsx`
- `src/screens/PinLock.jsx`

### Tower reviewed
- `tower/src/App.jsx`
- `tower/src/main.jsx`
- `tower/src/index.css`
- `tower/src/layouts/ShellLayout.jsx`
- `tower/src/components/HeaderStrip.jsx`
- `tower/src/components/NavItem.jsx`
- `tower/src/components/StatusChip.jsx`
- `tower/src/components/TacticalPlaceholder.jsx`
- `tower/src/routes/Lobby.jsx`
- `tower/src/routes/Health.jsx`
- `tower/src/routes/AICalls.jsx`
- `tower/src/routes/DailyStats.jsx`
- `tower/package.json`
- `tower/vite.config.js`
- `tower/README.md`

## Batch A: Docs Authority Review

Summary:
- The live project state is primarily tracked in `docs/ROADMAP-LIVE.md`
- Several other files still present themselves as current or authoritative when they are actually historical or supporting references

Highest-value cleanup already identified:
- `CLAUDE.md`
- `project_codex.md`
- `docs/TOMORROW-START-HERE.md`
- `docs/tower/README.md`
- `docs/RISKS.md`
- `docs/tower/RISKS-FROM-AUDITS.md`

Authority model recommended:
- Current live state: `docs/ROADMAP-LIVE.md`
- Current operating rules: `CLAUDE.md`
- Supporting philosophy/reference: `project_codex.md`
- Historical/supporting snapshots: everything else that is not maintained as live state

## Batch B: Core Logic Findings

### P1: Profile-load failures can misroute authenticated users into onboarding
- File: `src/App.jsx`
- Summary: profile fetch failures are treated too much like "no profile", so existing users can fall into onboarding on transient read failures

### P1: Transaction update helper can silently ignore write failures
- File: `src/lib/db.js`
- Summary: transaction updates do not reliably surface Supabase write errors to callers

### P1: Statement import can report success before async saves finish
- File: `src/screens/StatementScanFlow.jsx`
- Summary: import progress and success state can complete before all writes have actually succeeded

### P2: Tower direct navigation likely needs SPA fallback
- File: `tower/src/App.jsx`
- Summary: `BrowserRouter` routes may break on direct refresh/deep links in Pages-style deployments without fallback rewrites

## Batch C: Components and Modals Review

### P1: Shared sheet layout hard-codes bottom chrome and over-translates for mobile keyboards
- File: `src/components/Sheet.jsx`
- Why it matters: the modal foundation can move action rows off-screen and shrink usable content too aggressively on short phones

### P1: Edit transaction modal puts title and close inside scrollable content
- File: `src/modals/EditTransactionModal.jsx`
- Why it matters: top controls can scroll away while the save action remains pinned elsewhere

### P1: Goal modal repeats the same scroll-away header pattern
- File: `src/modals/GoalModal.jsx`
- Why it matters: longer forms amplify the same mobile misalignment and exit problems

### P2: Quick-add row is too dense for narrow mobile widths
- File: `src/components/QuickAddBar.jsx`
- Why it matters: the text field gets squeezed first in the highest-frequency input path

### P2: AI advisor modal loses header/close context during longer chats
- File: `src/modals/AiAdvisorModal.jsx`
- Why it matters: the chat header scrolls away while the composer remains pinned, which makes the modal feel context-less

Supporting notes from this batch:
- `src/modals/SetBudgetModal.jsx` and `src/modals/AddSavingsModal.jsx` use the same custom-in-body header pattern
- `src/modals/QuickEditToast.jsx` relies on a fixed bottom offset tied to current home chrome
- `src/screens/HomeScreen.jsx` still contains one-off modal/overlay patterns outside the shared sheet system

## Batch D: Screen Review

### P1: Pro upgrade CTA is inert
- File: `src/screens/ProUpgradeScreen.jsx`
- Why it matters: users can reach the upsell but cannot actually start conversion

### P1: Goal savings can update local progress even if persistence fails
- File: `src/screens/GoalsScreen.jsx`
- Why it matters: users can believe a savings update or completion succeeded when the backend never stored it

### P2: Monthly analytics navigation gets stuck across gap months
- File: `src/screens/AnalyticsScreen.jsx`
- Why it matters: older valid history can become unreachable if the immediately previous month has no data

### P2: Statement review cannot reclassify to custom categories
- File: `src/screens/StatementScanFlow.jsx`
- Why it matters: manual correction is incomplete for users who rely on custom categories

### P2: Statement import completion forces background tab to Home
- File: `src/screens/HomeScreen.jsx`
- Why it matters: users close the transaction overlay and land in a mismatched background state

Lower-priority notes from this batch:
- `src/screens/LoginScreen.jsx` uses a translated card layout without a scroll fallback on short screens
- `src/screens/OnboardingScreen.jsx` still omits Thai from the onboarding language picker
- `src/screens/BudgetScreen.jsx` does optimistic local updates before persistence and does not roll back on failure

## Batch E: Shared Logic, Schema, and Config Review

### P2: Unknown categories silently collapse to Food for expense flows
- Files:
  - `src/lib/categories.js`
  - used by `src/components/QuickAddBar.jsx`
  - used by `src/components/OcrButton.jsx`
  - used by `src/screens/StatementScanFlow.jsx`
- Why it matters: `normalizeCategory()` falls back to `food` for any unknown expense-side category and `salary` for unknown income-side category. That means AI/OCR/parser outputs that do not match the alias map do not stay neutral or land in `other`; they are silently rewritten into a strong semantic category. In practice, unrecognized transactions can be stored as Food even when the system was actually uncertain.

### P2: Statement dedup key can mark legitimate transactions as duplicates across currencies or types
- Files:
  - `src/lib/constants.js`
  - used by `src/screens/StatementScanFlow.jsx`
- Why it matters: `txDedupKey()` only includes `date`, `amount`, and normalized `description`. The statement importer uses that key to suppress already-existing transactions. If two real transactions share the same date, amount, and description but differ by currency or transaction type, they can be treated as duplicates even though they are not the same record.

### P2: Goal deletion has the same silent-success pattern as goal savings
- File: `src/screens/GoalsScreen.jsx`
- Why it matters: `performDeleteGoal()` removes the goal from local state without checking the Supabase delete result. If the delete is rejected, the goal disappears in UI anyway and returns only on next reload, which makes the app look flaky and undermines trust in goal management.

### P2: Budget edits can remain locally changed after a failed save
- File: `src/screens/BudgetScreen.jsx`
- Why it matters: `saveBudget()` mutates local budget state before persistence and throws on failure, but it does not roll back the optimistic local change. That means the user can briefly or persistently see a budget limit that the backend never stored.

### Supporting notes from this batch
- `src/lib/db.js` has more than one silent-write path, not just `dbUpdateTransaction()`. `dbSaveMemory()` and `dbUpsertProfile()` also do not inspect Supabase error payloads.
- `src/lib/streak.js` updates local profile streak/xp before the profile write completes and only logs if the write fails, so streak display can drift from persisted state.
- `src/screens/StatementScanFlow.jsx` batch deletion uses the same "await without checking `{ error }`" pattern as other Supabase writes in the app.
- `supabase/migrations/004_capture_current_schema.sql` explicitly documents schema drift from earlier migrations; this is useful historical context, but it means old migration files should not be assumed to represent the live app shape by themselves.
- `supabase/migrations/005_auth_legacy_flag.sql` is intentionally one-shot and should not be re-run blindly after the original migration window.
- `wrangler.toml` and `package.json` look directionally consistent with the current worker/web split, but runtime validation is still limited until dependencies are installed locally.

## Batch F: Worker and Tower Review

### P2: Tower status chrome presents hardcoded healthy/live state instead of real system state
- Files:
  - `tower/src/components/HeaderStrip.jsx`
  - `tower/src/routes/Lobby.jsx`
- Why it matters: the operator surface shows `System Nominal`, `NOMINAL`, `0 calls/hr`, and an "Active" field report as fixed strings rather than values fetched from `/health` or `ai_call_log`. That means Tower can look healthy during a real outage or during incomplete wiring, which is worse than an obvious placeholder because it can mislead the operator.

### P2: Worker observability logs still collapse AI traffic into anonymous free-tier rows
- File: `workers/phanote-api-worker.js`
- Why it matters: `/parse`, `/advise`, `/ocr`, and `/parse-statement` still write `user_id: null` and `plan_tier: 'free'` in `logAICall()` payloads. The routes already receive user context in some request bodies, but Tower's underlying data still cannot support trustworthy per-user or per-plan analysis. This weakens the whole observability/admin story even if the calls themselves succeed.

### P2: Tower shell is desktop-only and will degrade badly on narrow screens
- File: `tower/src/layouts/ShellLayout.jsx`
- Why it matters: the fixed `w-60` sidebar plus two-column shell has no collapse, drawer, or stacked mobile mode. On narrow screens the navigation consumes most of the viewport before any room content appears, so Tower is likely to feel cramped or unusable on phones and smaller tablets.

### Supporting notes from this batch
- `tower/src/routes/Health.jsx`, `tower/src/routes/AICalls.jsx`, and `tower/src/routes/DailyStats.jsx` are still placeholders; that is fine structurally, but it reinforces the need for the shared chrome not to imply live accuracy yet.
- `tower/README.md` still frames Session 16 as the moment when the rooms render data, which now reads as historical drift rather than current onboarding guidance.
- `tower/src/App.jsx` still uses `BrowserRouter` with real subpaths, and this review has not found any explicit SPA rewrite/fallback artifact in the Tower project itself.
- `workers/phanote-api-worker.js` returns graceful partial success in a few places, especially `/monthly-report`, which is product-friendly but means Tower metrics need accurate `status` semantics even more.
- `workers/phanote-api-worker.js` helper behavior is otherwise directionally sensible: `classifyError()`, `logAICall()`, `fixAmount()`, and `computeWrapStats()` are readable and intentionally scoped, even where product tradeoffs remain.

## Priority Fix Order

1. Fix the shared sheet/mobile keyboard geometry in `src/components/Sheet.jsx`
2. Standardize modal headers so title and close controls remain fixed
3. Fix silent or false-success data paths:
   - `src/lib/db.js`
   - `src/screens/GoalsScreen.jsx`
   - `src/screens/StatementScanFlow.jsx`
4. Restore full paid conversion by wiring `src/screens/ProUpgradeScreen.jsx`
5. Reduce input density and mobile layout stress in `src/components/QuickAddBar.jsx`
6. Clean up screen flow mismatches in:
   - `src/screens/HomeScreen.jsx`
   - `src/screens/AnalyticsScreen.jsx`
7. Stop forced category misclassification and dedup false positives in:
   - `src/lib/categories.js`
   - `src/lib/constants.js`
8. Reconcile optimistic UI paths that do not roll back on failed writes:
   - `src/screens/BudgetScreen.jsx`
   - `src/lib/streak.js`
9. Make the operator/admin layer truthful before it looks polished:
   - `tower/src/components/HeaderStrip.jsx`
   - `tower/src/routes/Lobby.jsx`
   - `workers/phanote-api-worker.js`
10. Add a real responsive shell for Tower before treating it as a usable admin surface:
   - `tower/src/layouts/ShellLayout.jsx`

## Still Recommended Next Review Batches

Not fully completed yet:
- deeper worker edge-case review beyond route/helper behavior
- config/deployment consistency review
- final combined summary/backlog pass

## Notes About Local Verification

Build and lint verification were limited in this environment because local dev dependencies were not installed. Static review was still possible, but compile/runtime validation remains a separate step.
