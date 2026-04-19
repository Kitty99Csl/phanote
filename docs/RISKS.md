# Phajot — Known Risks

> **Status:** Current source of truth (active risks + mitigations)

Living document. Updated at the end of each session.

**Severity levels:**
- **HIGH** — launch blocker or user-facing data integrity / security risk
- **MEDIUM** — quality issue, user-visible but recoverable, or latent failure mode
- **LOW** — tech debt, nice-to-have, or documentation gap

**Last updated:** 2026-04-19 (post Session 18 close)

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

### [HIGH] No automated RLS regression tests
**Discovered:** Session 9
**Status:** Unmitigated

Session 9 verified RLS **manually** with an adversarial SQL test in the Supabase SQL Editor (see `docs/session-9/RLS-HARDENING.md`). The test proves current correctness but is a one-shot — a future policy change could introduce a regression that only a second-user test would catch. Current testing model: "me, once, manually, in the dashboard."

**Near-miss context:** Session 9 discovered a `USING(true)` permissive policy on `ai_memory` that had been silently leaking data across users for an unknown period. The policy looked correct in the dashboard audit UI and passed casual inspection. The only reason we caught it is that we happened to read every policy's `qual` column in `pg_policies` during the investigation. Without that deliberate audit, the leak could have persisted indefinitely.

**Mitigation:** Consider a `supabase/tests/rls_regression.sql` file that can be run before each deploy via `psql` to re-verify cross-user isolation with the test user account (User B, `5e3629a1-aa60-4c25-a013-11bf40b8e6b9`). Alternatively, add the 3 probe queries from `docs/session-9/RLS-HARDENING.md` to a pre-launch checklist. Deferred to a future session.

---

## MEDIUM

### [MEDIUM] Thai translations missing for 4 statementError* keys
**Discovered:** Session 8 Sprint A Ext fetchWithTimeout sweep
**Status:** ✅ Closed Session 14. Sprint D i18n marathon completed; commit `44bad73` ("4 Thai fills") resolved the remaining statementError* keys. Sprint D marked closed per ROADMAP-LIVE.md.

`statementErrorParse`, `statementErrorNetwork`, `statementErrorRateLimit`, `statementErrorTimeout` all have EN + LO entries but no TH. Thai users fall back to English via the `t()` helper's implicit fallback. This was a **pre-existing gap from Session 6** — Session 9 added one more key (`statementErrorTimeout`) following the same partial pattern.

**Mitigation:** Resolved via Sprint D i18n marathon (Sessions 12–14).

---

## LOW

### [LOW] `wrangler.toml` dashboard drift
**Discovered:** Session 9 investigation
**Status:** Likely closed. Session 14 commit `caa4b1a` (Sprint E Item 2) added `api.phajot.com/*` route to `wrangler.toml` alongside legacy `api.phanote.com/*`. Both routes live as intended during migration window. Recommend: re-verify dashboard shows both routes on next worker deploy.

`api.phajot.com` route was bound via the Cloudflare dashboard, not via `wrangler.toml`. The `wrangler.toml` in the repo used to have:

```toml
routes = [
  { pattern = "api.phanote.com/*", zone_name = "phanote.com" }
]
```

(legacy domain, pre-rename) while the actual production route pointed at `api.phajot.com`. This worked because CF dashboard routes override `wrangler.toml` routes, but meant the route binding was **invisible to git**. Session 14's Sprint E Item 2 work added the phajot.com route to `wrangler.toml` so git is source of truth.

**Mitigation:** Applied in commit `caa4b1a`. Verify on next worker deploy that dashboard and `wrangler.toml` agree.

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
**Status:** Still open. Scheduled check from Session 10 never executed. Recommended: verify in Session 16 pre-work as part of Item 2 (admin gate + Migration 007) prep work — Migration 007 will touch `profiles` table directly.

The trigger that auto-creates a `profiles` row when a new `auth.users` row is inserted is **critical to the signup flow working**. It was documented in `supabase/migrations/001_profiles.sql` but we haven't queried the live trigger to confirm it still exists and matches the migration definition.

If the trigger drops for any reason (manual deletion, failed migration apply), new user signups will fail silently with a 403 RLS violation: the Supabase client tries to upsert into `profiles` after signup, but there's no row yet AND no INSERT policy allows the user to create one. (Session 9's `profiles_user_access` policy with `FOR ALL` does cover INSERT now, which partially mitigates this, but the trigger is still the primary path.)

**Mitigation:** Run `SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';` in the Supabase SQL Editor at Session 16 pre-work (Item 2 prep) to verify the trigger still exists. If it does, document in RLS-HARDENING.md as confirmed. ~30 seconds.

### [LOW] Webhook probe commit `741ae93` left in history
**Discovered:** Session 9
**Status:** Cosmetic only

The empty commit `741ae93 chore: nudge CF Pages redeploy (webhook probe)` was a diagnostic, not a functional change. It's safe to leave in history as documentation of the investigation path, but a future `git log` reader may find it confusing. Not worth rewriting history to remove.

### ~~[LOW] profiles RLS policy name mismatch (cosmetic)~~
**Discovered:** Session 16, 2026-04-19
**Status:** ✅ Resolved Session 18 — Migration 011 Item 3 (commit `82f7221`)

Production `profiles_policy` renamed to `profiles_user_access` (canonical per Migration 004). Semantic preflight guard verified correct shape before renaming. Idempotent skip if canonical already present.

---

### ~~[LOW] transactions RLS policy name mismatch (cosmetic)~~
**Discovered:** Session 18 drift audit, 2026-04-19
**Status:** ✅ Resolved Session 18 — Migration 011 Item 4 (commit `82f7221`)

Production `transactions_policy` renamed to `transactions_user_access` (canonical per Migration 004). Same pattern as profiles drift. Discovered in same audit pass.

---

### ~~[MEDIUM] admin_user_summary view with wide-open grants~~
**Discovered:** Session 18 drift audit, 2026-04-19
**Status:** ✅ Resolved Session 18 — Migration 011 Item 1 (commit `82f7221`)

Pre-Session-14 drift view over profiles + transactions. Zero code references outside docs/archive/. Held GRANT SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER to anon + authenticated. RLS on underlying tables provided practical mitigation (view inherits querying user's auth context), but defense-in-depth gap existed. Dropped with CASCADE.

---

### ~~[LOW] ai_memory stale policies (Migration 004 canonical policy never landed)~~
**Discovered:** Session 18 drift audit, 2026-04-19
**Status:** ✅ Resolved Session 18 — Migration 011 Item 2 (commit `82f7221`)

Production ai_memory carried 3 stale policies (`'Users update own memory'`, `'Users write own memory'`, `'users own ai_memory'`) predating Migration 004's intended canonical `ai_memory_user_access`. All 3 dropped; canonical policy created (FOR ALL, auth.uid() = user_id).

---

### [LOW] Tower bundle past Vite 500KB warning threshold
**Discovered:** Session 18, 2026-04-19
**Status:** Accepted, documented

Tower bundle reached 793.25KB raw / 229.64KB gzip after Recharts install (commit `274ee14`). Vite warning fires at 500KB. Tower is admin-only internal surface; accepted for Session 18. Future Tower rooms must reuse existing Recharts (already bundled) rather than adding new chart libraries. If bundle approaches 1.2MB gzip, evaluate dynamic import() code-splitting.

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

### ~~[MEDIUM] Parent-side wrapper hygiene bugs~~
**Resolved:** Session 10 Priority B · commit `6b4911f` · 2026-04-15
5 fire-and-forget `onSave` sites fixed using `GoalsScreen.jsx:253`'s implicit-return Promise pattern as template. Supabase `{ error }` now destructured and thrown where relevant, wrapped in try/catch that logs + rethrows so modals stay open on failure. Click-guard busy state now visible for the full save duration. See `docs/session-10/SUMMARY.md`.

### ~~[MEDIUM] Silent DB write failures not surfaced to users~~
**Resolved:** Session 10 Priority C · commit `2e99fad` · 2026-04-15
Shared toast system built with `useSyncExternalStore` (`src/lib/toast.js` + `ToastContainer` export in `src/components/Toast.jsx`). Wired into 5 catch blocks: `saveBudget`, `updateGoal`, `handleAddTransaction`, `handleUpdateCategory` (with added rethrow from Priority B follow-up), and `dbSaveMemory` (console.error only, background). 4 i18n keys added (lo/th/en) with warm brand-voice copy. 4 more catch sites (`handleUpdateProfile`, `handleUpdateNote`, `handleDeleteTransaction`, `StatementScanFlow` delete batch) intentionally deferred to Sprint C's native-dialog pass. See `docs/session-10/SUMMARY.md`.

### ~~[MEDIUM] 3 raw-div modals with hand-rolled keyboard offset~~
**Resolved:** Session 10 Priority A · commit `05f8f7d` · 2026-04-15
`EditTransactionModal`, `SetBudgetModal`, `StreakModal` all migrated to the shared `Sheet` component, following the `GoalModal` pattern from commit `bacdf06`. `useKeyboardOffset` imports + hooks removed from all 3 files. Zero raw-div modals remain in the codebase. Sheet now covers 9 modals total. See `docs/session-10/SUMMARY.md`.

### ~~[MEDIUM] `app_events` and `monthly_reports` RLS not adversarially verified~~
**Resolved:** Session 10 RLS cleanup (no git commit — direct Supabase SQL) · 2026-04-15
Speaker ran 3 adversarial probes against each table in the Supabase SQL Editor using User B's identity (`5e3629a1-aa60-4c25-a013-11bf40b8e6b9`). All 6 probes passed: cross-user SELECT blocked, cross-user INSERT errored with 42501, self SELECT returned correctly. All 7 user-data tables now have adversarially-verified RLS. See `docs/session-9/RLS-HARDENING.md` Session 10 addendum and `docs/session-10/SUMMARY.md`.

### ~~[HIGH] Schema drift between migration files and live Supabase~~
**Resolved:** Session 10 commit `2ac2897` · 2026-04-15
`supabase/migrations/004_capture_current_schema.sql` (289 lines) captures all post-003 drift: 9 profiles columns, 8 transactions columns, budgets `monthly_limit` + unique index, ai_memory `category_name` + `type` + unique index, and full `CREATE TABLE IF NOT EXISTS` blocks for `goals`, `app_events`, `monthly_reports`. Canonical Session 9 RLS policies applied to all 7 user-data tables with `DROP POLICY IF EXISTS` enumerating every legacy name so the file is fully replay-safe. Vestigial columns from 003 (category_id FKs, recurring_id, is_recurring, amount/period, currency) documented but not dropped per Session 10 policy: capture, don't drop. Not run against live production in the authoring commit — file exists for disaster recovery + fresh-instance rebuilds. Closes the disaster-recovery gap: the repo can now rebuild production-equivalent schema from `001 → 004`. See `docs/session-10/SUMMARY.md`.

### ~~[MEDIUM] Native `alert()` / `window.confirm()` still used for OCR Pro lock + delete flows~~
**Resolved:** Session 10 commit `b6b2598` · 2026-04-15
New shared `ConfirmSheet` component (92 lines) built on top of the existing `Sheet` wrapper. Replaces 6 native dialog sites: OcrButton Pro gate (variant=upgrade), GoalsScreen delete-goal, App.jsx delete-transaction + reset-app, StatementScanFlow delete-batch, plus GoalsScreen createGoal error path (replaced with `showToast` per the errors-use-toast pattern from Priority C, not ConfirmSheet). Initial task-prompt grep missed one site (bare `confirm()` in StatementScanFlow without the `window.` prefix) — caught on second pass. 9 i18n keys added for all 3 languages with warm brand-voice copy; idiomatic Lao/Thai "keep it for later" translation chosen for `proLockNotNow` over literal "not now". App.jsx uses a shared `pendingConfirm = {kind, ...data}` discriminated union state pattern for its two confirm instances; other components use local state. Z-index toast 10001 > confirm 1000 is intentional so errors always render above decisions. Closes audit P1 row 8 in `docs/tower/RISKS-FROM-AUDITS.md` ahead of Sprint C schedule. See `docs/session-10/SUMMARY.md` "Native dialog replacement (bonus)" section.

### ~~[HIGH] Derived-password auth (audit P0 #1)~~
**Resolved:** Session 11 commit `770af58` · 2026-04-16
Phone-to-email auth trick (`{countryCode}{phone}@phanote.app` + `Ph4n0te{phone}X`) replaced with user-set password auth via `src/lib/auth.js`. LoginScreen rewritten with login/register mode toggle. Legacy accounts (10 rows with `legacy_auth=true`) see MigrationScreen on first login post-deploy — pre-fills typed password, validates, calls `migrateLegacyAccount()` to update auth.users password + clear flag. Hotfix `8be34f5` fixed PinLock gate for no-PIN users and TOKEN_REFRESHED race during migration. Deploy-verified on phone + desktop (Tests A/B/C all pass). Old `signInWithPhone` function was dead code (exported, zero callers) — deleted in Session 12 commit `932a8bc`. See `docs/session-11/SUMMARY.md`.

### ~~Sprint D closed~~
**Resolved:** Session 14 · 2026-04-17
See `docs/ROADMAP-LIVE.md` for all associated commits (streak/goal/settings/i18n/audit work). ~210 strings i18n'd across 18 screens/components. CLAUDE.md Rule 15 (no hardcoded user-facing strings) now enforced. Settings 7→5 reorganization shipped commit `858d3a0`. 4 Thai statementError* fills shipped commit `44bad73`.

### ~~Sprint E observability substrate shipped~~
**Resolved:** Session 14 · 2026-04-17
Sentry live (frontend + worker), `ai_call_log` instrumented across 5 endpoints, `/health` enriched with deps monitoring (Supabase ping + AI stats + status field), UptimeRobot on 5-min interval, ErrorBoundary in frontend, Rule 19 (migration files required for schema changes) enforced. Worker v4.4.0 → v4.7.0. Migration 006 backfill documented observability schema drift. See Sprint E table in `docs/ROADMAP-LIVE.md`.

### ~~Tower admin surface live~~
**Resolved:** Session 15 · 2026-04-18
`tower.phajot.com` deployed to CF Pages (project `tower-phajot`, commit `428ad78` for app scaffold, `8df2959` for Lobby + nav shell). Gated by Cloudflare Access Zero Trust application (policy ID `782108c8-7169-438e-9088-77ffb3c49080`, "Speaker only"). Tower Design System v1 approved (`docs/tower/design-system.md`). **New risk vector introduced:** CF Access account compromise → Tower exposure. Mitigated by 24h session duration + email PIN (Zero Trust Free plan). Session 16 adds defense-in-depth via Supabase `is_admin` flag on top of CF Access.

### ~~[MEDIUM] ai_daily_stats matview authenticated-read leak~~
**Resolved:** Session 17 commit `a791872` · 2026-04-20
Matview `ai_daily_stats` was readable by any authenticated user prior to Migration 009. Severity classified MEDIUM: cross-tenant business metrics exposed (daily AI call counts / costs / error rates grouped by day/endpoint/provider/plan_tier). No direct PII — matview aggregates do not include `user_id` in the group-by — but tenant-level volume and cost signal was visible to any signed-in Phajot user. Pre-existing since Migration 006 provenance (direct SQL Editor application pre-Session 14); not caught by Session 14's observability audit because RLS on matviews is not supported in stock Postgres and was not on the audit checklist. Discovered Session 17 via Migration 009 probe — `has_table_privilege('authenticated', 'public.ai_daily_stats', 'SELECT')` returned true with RLS disabled and wide-open grant. Resolved by Migration 009: `REVOKE SELECT ON public.ai_daily_stats FROM authenticated, anon` + `CREATE VIEW public.admin_daily_stats` as inline-is_admin-gated wrapper over the matview, granted SELECT only to authenticated. Non-admin sessions receive an empty result set (not a permission error). Tower Room 3 queries the wrapper view instead of the raw matview.

### ~~[LOW] admin_daily_stats drift view with wide-open grants~~
**Resolved:** Session 17 commit `b963774` · 2026-04-20 (initial DROP during Migration 010 apply; wrap commit `bb75f7f` records the closure in SUMMARY / RISKS / SPRINT-CURRENT docs)
Pre-existing undocumented view `public.admin_daily_stats` (aggregating `app_events` by date, with columns `date / active_users / total_events / transactions_logged / app_opens`) existed in production from pre-Session-14 direct SQL Editor changes. Not referenced anywhere in the Phajot codebase per grep (frontend, worker, Tower, migrations). Held wide-open grants: `anon` + `authenticated` had full DELETE/INSERT/UPDATE/SELECT/TRUNCATE/TRIGGER/REFERENCES privileges. Exposure was low because the view was unused and the underlying `app_events` already had its own RLS; no read or write path via this view exercised in production. Discovered Session 17 during Migration 009 postflight investigation: Tower Room 3 errored with `column admin_daily_stats.day does not exist` because the query resolved to the drift view (which had no `day` column). Resolved by Migration 010: `DROP VIEW IF EXISTS ... CASCADE` (no CASCADE notices — no dependents) + `CREATE VIEW` (not `CREATE OR REPLACE`, to avoid re-triggering the signature-mismatch trap) + `GRANT SELECT` to authenticated. The Migration 010 replacement is the admin-gated wrapper over `ai_daily_stats` that Migration 009 §3 originally intended.
