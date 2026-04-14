# Phajot — Known Risks

Living document. Updated at the end of each session.

**Severity levels:**
- **HIGH** — launch blocker or user-facing data integrity / security risk
- **MEDIUM** — quality issue, user-visible but recoverable, or latent failure mode
- **LOW** — tech debt, nice-to-have, or documentation gap

**Last updated:** 2026-04-14 (Session 9)

---

## HIGH

### [HIGH] Silent CF Pages deploy failures
**Discovered:** Session 9
**Status:** Partially mitigated — underlying build-break fixed, but detection is still missing

Cloudflare Pages can fail a build and continue serving the previous successful build **with no notification**. During Sessions 7 and 8, 8 commits were stuck for 2 days (Session 7 refactor + Session 8 Sprint A + Ext + docs) because of `.nvmrc` major-version pinning (`24`) combined with Node 24.11.1/24.13.1 npm resolver drift. Every `git push origin main` appeared successful, but CF Pages was silently dropping each build and serving the last-known-good bundle `index-BCwqjvty.js` from the Session 6 era.

The build-break was fixed in commit `aa78f9e` (Session 9) via exact Node version pinning + lockfile regeneration. But **the detection gap remains**: the next CF Pages build failure (from a different cause) will be just as silent. There is currently no alert that triggers when a deploy stops succeeding.

**Mitigations needed:**
1. Set up CF Pages email notifications on failed builds (dashboard → project → Settings → Notifications). **NOT DONE.**
2. Add a post-merge verification step to CLAUDE.md non-negotiables — always `curl` the production bundle hash after a user-visible merge. **DONE** (rules 11 and 12 in CLAUDE.md).
3. Longer term: master control room (Kitty's planned Session 10+ feature) with deploy health monitoring.

### [HIGH] Schema drift between migration files and live Supabase
**Discovered:** Session 9 RLS investigation
**Status:** Unfixed — flagged for future session

The repo's `supabase/migrations/001-003 + seed.sql` reflect the **Phase 1 original schema** (April 2026). Since then, columns and tables have been added via the Supabase dashboard without corresponding migration files. The repo therefore **cannot rebuild production state** from migrations alone.

**4 tables with column drift** (migration file is missing columns the live DB has):
- `profiles` — missing 9 columns: `phone`, `phone_country_code`, `avatar`, `custom_categories`, `exp_cats`, `inc_cats`, `last_seen_at`, `app_version`, `pin_config`
- `transactions` — missing 8 columns: `note`, `category_name`, `category_emoji`, `raw_input`, `is_deleted`, `deleted_at`, `batch_id`, `edited_at`
- `budgets` — column name drift: migration has `amount` + `period`, live DB uses `monthly_limit` (no period column)
- `ai_memory` — missing `input_pattern` and `type` columns; migration has `category_id` which is not referenced in current code

**3 tables entirely missing from migration files** (created via Supabase dashboard only):
- `goals` (actively used by GoalsScreen, SafeToSpend, AiAdvisorModal)
- `app_events` (actively used by `dbTrackEvent` in `src/lib/db.js`)
- `monthly_reports` (actively used by MonthlyWrapModal as a narrative cache)

**Mitigation:** Write `supabase/migrations/004_capture_current_schema.sql` with `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for drift and `CREATE TABLE IF NOT EXISTS` for missing tables. Then `005_rls_policies_final.sql` to capture the Session 9 RLS work. Deferred because it's not on the critical path for Sprint B priorities, but this is a real disaster-recovery gap — if the Supabase project were ever lost or needed to be rebuilt, we could not restore it from the repo alone.

### [HIGH] No automated RLS regression tests
**Discovered:** Session 9
**Status:** Unmitigated

Session 9 verified RLS **manually** with an adversarial SQL test in the Supabase SQL Editor (see `docs/session-9/RLS-HARDENING.md`). The test proves current correctness but is a one-shot — a future policy change could introduce a regression that only a second-user test would catch. Current testing model: "me, once, manually, in the dashboard."

**Near-miss context:** Session 9 discovered a `USING(true)` permissive policy on `ai_memory` that had been silently leaking data across users for an unknown period. The policy looked correct in the dashboard audit UI and passed casual inspection. The only reason we caught it is that we happened to read every policy's `qual` column in `pg_policies` during the investigation. Without that deliberate audit, the leak could have persisted indefinitely.

**Mitigation:** Consider a `supabase/tests/rls_regression.sql` file that can be run before each deploy via `psql` to re-verify cross-user isolation with the test user account (User B, `5e3629a1-aa60-4c25-a013-11bf40b8e6b9`). Alternatively, add the 3 probe queries from `docs/session-9/RLS-HARDENING.md` to a pre-launch checklist. Deferred to a future session.

---

## MEDIUM

### [MEDIUM] Parent-side wrapper hygiene bugs
**Discovered:** Session 8 Sprint A Ext click-guard sweep
**Status:** Unfixed — Session 10 Priority B

5 items flagged in `docs/session-8/SPRINT-A-EXT-BACKLOG.md`. Each is a 5-line fix; the whole sweep is ~1 hour. They make the `useClickGuard` visual busy state actually visible on the 5 affected modals (currently the busy state flashes 0ms because the parent wrappers return undefined instantly).

1. **`BudgetScreen.jsx:159`** — fire-and-forget `onSave` wrapper. `saveBudget(...)` is async but the wrapper doesn't await it. Fix: `onSave={async amount => { await saveBudget(...); setEditCat(null); }}`.
2. **`BudgetScreen.jsx:36`** — `saveBudget` has no try/catch. On Supabase failure, throws unhandled rejection. Fix: wrap + toast.
3. **`HomeScreen.jsx:71`** — `handleEditSave` is sync, fires async `onUpdateCategory(...)` without awaiting. Same pattern as BudgetScreen:159.
4. **`dbSaveMemory`** fire-and-forget in `HomeScreen.handleEditSave` — `.catch(()=>{})` swallows errors silently.
5. **`GoalsScreen.jsx:47`** — `updateGoal` has no try/catch. On Supabase failure, optimistic state update still runs, leaving local state out of sync with the database.

**Positive template:** `GoalsScreen.jsx:252-253` does it right — both `createGoal` and `updateGoal` wrappers properly return Promises and close after await. Use as the reference shape.

### [MEDIUM] Silent DB write failures not surfaced to users
**Discovered:** Session 8 Sprint A Ext click-guard sweep, Session 9 RLS investigation
**Status:** Unfixed — Session 10 Priority C

Multiple catch blocks swallow errors without surfacing to the user:
- `dbInsertTransaction` catch in `handleAddTransaction` (App.jsx:212) — `console.error("Save tx error:", e);` only
- `dbSaveMemory` .catch(()=>{}) — completely silent
- `saveBudget` no try/catch — unhandled rejection
- `updateGoal` no try/catch — same
- `dbTrackEvent` .catch(()=>{}) — silent (acceptable for an event log, but flags a pattern)

User sees **no indication** when a write fails. A partial Supabase outage or an RLS regression could cause writes to fail for hours before any user notices their data isn't saving.

**Mitigation:** Add a shared `useToast` or similar and surface errors at the App.jsx handler layer. Session 10 Priority C, estimated 2-3 hours.

### [MEDIUM] 3 raw-div modals with hand-rolled keyboard offset
**Discovered:** Session 8 Sprint A Ext
**Status:** Unfixed — Session 10 Priority A

`EditTransactionModal`, `SetBudgetModal`, `StreakModal` still use raw `<div>` overlays + manual `useKeyboardOffset` + `transform:translateY(-kbOffset)` math. Session 8 migrated `AddSavingsModal`, `AiAdvisorModal`, and `GoalModal` to the shared `Sheet` component. Hand-rolled math is fragile across iOS/Android — specific keyboard variants (hardware keyboard, search-enabled keyboards, Thai script keyboards with prediction bars) can mis-offset.

**Mitigation:** Session 10 Priority A Sheet migration, estimated 4-5 hours total. Follow the pattern proven on GoalModal in commit `bacdf06`. Preserves `useClickGuard` wiring byte-identical (verified path).

### [MEDIUM] Thai translations missing for 4 statementError* keys
**Discovered:** Session 8 Sprint A Ext fetchWithTimeout sweep
**Status:** Unfixed — Sprint D i18n marathon

`statementErrorParse`, `statementErrorNetwork`, `statementErrorRateLimit`, `statementErrorTimeout` all have EN + LO entries but no TH. Thai users fall back to English via the `t()` helper's implicit fallback. This is a **pre-existing gap from Session 6** — Session 9 added one more key (`statementErrorTimeout`) following the same partial pattern.

**Mitigation:** Sprint D i18n marathon. Planned, not scheduled. Low urgency because English fallback is functional, just off-brand.

### [MEDIUM] `app_events` and `monthly_reports` RLS not adversarially verified
**Discovered:** Session 9 RLS hardening
**Status:** Partially mitigated — tables have policies, but not verified with second user

Session 9's RLS sweep focused on the user-data tables: `profiles`, `transactions`, `budgets`, `ai_memory`, `goals`. The two remaining tables with user data (`app_events` as a write log, `monthly_reports` as a read cache) were not adversarially tested because of time pressure. Both are lower-risk:
- `app_events` — write-only event log, users never read their own events in-app, minimal data leak surface
- `monthly_reports` — read cache, worst case is cross-user narrative exposure (PII minor, not financial)

But both should still get canonical single-policy coverage and adversarial verification before public launch.

**Mitigation:** Run the 3 probes from `docs/session-9/RLS-HARDENING.md` against both tables in Session 10 cleanup. ~15 minutes.

---

## LOW

### [LOW] `wrangler.toml` dashboard drift
**Discovered:** Session 9 investigation
**Status:** Documented, not fixed

`api.phajot.com` route is bound via the Cloudflare dashboard, not via `wrangler.toml`. The `wrangler.toml` in the repo still has:

```toml
routes = [
  { pattern = "api.phanote.com/*", zone_name = "phanote.com" }
]
```

(legacy domain, pre-rename) while the actual production route points at `api.phajot.com`. This works because CF dashboard routes override `wrangler.toml` routes, but it means the route binding is **invisible to git**. If the dashboard state is ever lost (account rotation, accidental deletion, billing issue), the route must be manually re-attached.

**Mitigation:** Update `wrangler.toml` to include the phajot.com route binding so git is source of truth. Low priority because the current setup is stable.

### [LOW] Dead migrations — `categories` and `recurring_rules`
**Discovered:** Session 9 RLS investigation
**Status:** Documented, not removed

Both tables exist in the database with RLS enabled, but no code reads them:
- **`categories`** — replaced by hardcoded `DEFAULT_EXPENSE_CATS` / `DEFAULT_INCOME_CATS` in `src/lib/categories.js` (Session 6 refactor). The `002_categories.sql` migration and `seed.sql` are dead.
- **`recurring_rules`** — Phase 1 planned feature (recurring transactions) that was never built. Migration exists, table exists, nothing references it.

Not harmful, just noise. If recurring transactions ships in a future session (Sprint B Priority E new features), `recurring_rules` becomes live. `categories` can probably be dropped entirely, but deleting live tables is a decision that deserves its own session.

**Mitigation:** Document in Session 10 planning; defer cleanup.

### [LOW] `profiles` `handle_new_user` trigger documentation gap
**Discovered:** Session 9 RLS investigation
**Status:** Documented, not verified

The trigger that auto-creates a `profiles` row when a new `auth.users` row is inserted is **critical to the signup flow working**. It was documented in `supabase/migrations/001_profiles.sql` but we haven't queried the live trigger to confirm it still exists and matches the migration definition.

If the trigger drops for any reason (manual deletion, failed migration apply), new user signups will fail silently with a 403 RLS violation: the Supabase client tries to upsert into `profiles` after signup, but there's no row yet AND no INSERT policy allows the user to create one. (Session 9's `profiles_user_access` policy with `FOR ALL` does cover INSERT now, which partially mitigates this, but the trigger is still the primary path.)

**Mitigation:** Run `SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';` in the Supabase SQL Editor at Session 10 start to verify the trigger still exists. If it does, document in RLS-HARDENING.md as confirmed. ~30 seconds.

### [LOW] Webhook probe commit `741ae93` left in history
**Discovered:** Session 9
**Status:** Cosmetic only

The empty commit `741ae93 chore: nudge CF Pages redeploy (webhook probe)` was a diagnostic, not a functional change. It's safe to leave in history as documentation of the investigation path, but a future `git log` reader may find it confusing. Not worth rewriting history to remove.

---

## Resolved (historical record)

### ~~[HIGH] Leaked Gemini API key in git history~~
**Resolved:** Session 8 Sprint A commit `5fc5e84`
Forensic audit + key rotation + `.gitignore` tightening. See `docs/session-8/SUMMARY.md`.

### ~~[HIGH] 9 action buttons with no click-guarding (zombie-modal duplicate saves)~~
**Resolved:** Session 8 Sprint A Ext commit `2579924`
`useClickGuard` hook applied to 7 action buttons across 6 files. See `docs/session-8/SUMMARY.md`.

### ~~[HIGH] 4 fetch sites with no timeout protection (infinite spinner UX)~~
**Resolved:** Session 8 Sprint A Ext commit `947fd8a`
`fetchWithTimeout` helper applied to 4 endpoints with per-endpoint timeouts. See `docs/session-8/SUMMARY.md`.

### ~~[HIGH] 2 latent silent ReferenceErrors in HomeScreen (Session 7 pure-move refactor)~~
**Resolved:** Session 8 Sprint A commit `534e6ac`
`setTxFilter` and `setTransactions` references rewired to App.jsx root scope. See `docs/session-8/SUMMARY.md`.

### ~~[HIGH] 2 modals hiding save buttons behind iOS keyboard~~
**Resolved:** Session 8 Sprint A commit `534e6ac`
AddSavingsModal + AiAdvisorModal migrated to Sheet. See `docs/session-8/SUMMARY.md`.

### ~~[HIGH] GoalModal raw-div with fragile keyboard offset math~~
**Resolved:** Session 8 Sprint A Ext commit `bacdf06`
Sheet migration, last high-priority raw-div modal from the top-priority list. See `docs/session-8/SUMMARY.md`.

### ~~[HIGH] `ai_memory` data leak — `USING(true)` permissive SELECT policy~~
**Resolved:** Session 9 live SQL fix
Policy dropped in Supabase SQL Editor, replaced with canonical `auth.uid() = user_id` shape. See `docs/session-9/RLS-HARDENING.md`.

### ~~[HIGH] `goals` table RLS disabled (inert policy)~~
**Resolved:** Session 9 live SQL fix
`ALTER TABLE goals ENABLE ROW LEVEL SECURITY`. See `docs/session-9/RLS-HARDENING.md`.

### ~~[HIGH] CF Pages build failing on `.nvmrc` major-version mismatch~~
**Resolved:** Session 9 commit `aa78f9e`
Pinned `.nvmrc` to `24.13.1`, added `engines` field to package.json, regenerated `package-lock.json` under Node 24.13.1 + npm 11.8.0. See `docs/session-9/SUMMARY.md`.
