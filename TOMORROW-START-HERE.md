# Next Session Start Here

**Last session:** Session 9 — CF Pages deploy pipeline fix + RLS hardening
**Status:** Complete, 3 commits on main (2 infra + 1 docs wrap-up). Session 8 Sprint A + Ext is FINALLY live on `app.phajot.com` after 2 days of silently stuck deploys.
**Next session:** Session 10 — Sprint B polish + pipeline hardening

## Quick context

- **Session 9 was a 2-part session:**
  1. **Deploy pipeline fix** — Cloudflare Pages had been silently failing every build for 2 days. Root cause: `.nvmrc` pinned to major `24` while CF Pages used 24.13.1 and local was 24.11.1. The minor-version npm drift (11.6.2 vs 11.8.0) caused lockfile resolution mismatches that `npm ci` rejected in strict mode. Fix: pin exact Node version + regenerate lockfile under matching npm. Commit `aa78f9e`.
  2. **RLS hardening** — Dropped a critical `USING(true)` permissive SELECT policy on `ai_memory` (data leak), enabled RLS on `goals` (was rowsecurity=false with inert policy), deduped `profiles` and `transactions` policies. Adversarially verified with second user. All applied via Supabase SQL Editor as `postgres` (no git commits — see `docs/session-9/RLS-HARDENING.md` for the full SQL record).
- **Session 8 Sprint A + Ext reached production on April 14**, 30+ hours after it merged. 8 commits' worth of fixes (security, 5 bugs, click-guard sweep, fetchWithTimeout sweep, GoalModal Sheet migration) are now running on user devices.
- **New non-negotiable rules** (CLAUDE.md 11 + 12): always `curl` production bundle hash after merging user-visible changes; always pin exact Node version in `.nvmrc`.
- **RISKS.md is now a thing** — living document at `docs/RISKS.md`, tracks HIGH/MEDIUM/LOW risks across the project. Update at end of each session.

## What's done (Priority D: RLS) ✅

**Status:** COMPLETE and adversarially verified.

See `docs/session-9/RLS-HARDENING.md` for the full story. Key points:
- 5 user-data tables have canonical single-policy RLS: `profiles`, `transactions`, `budgets`, `ai_memory`, `goals`
- Adversarial test with User B (`5e3629a1-aa60-4c25-a013-11bf40b8e6b9`) proves cross-user SELECT/INSERT are blocked while self-access still works
- Remaining: `app_events` and `monthly_reports` not adversarially verified (flagged MEDIUM in RISKS.md, ~15 min in Session 10)
- Remaining: schema drift capture into migration files (flagged HIGH in RISKS.md, separate session)

## What's ready for Session 10 (pick one)

### Priority B: Parent-wrapper hygiene sweep — ~1 hour
Fix 5 fire-and-forget `onSave` wrappers flagged in `docs/session-8/SPRINT-A-EXT-BACKLOG.md`. Each is a 5-line change. Use `GoalsScreen.jsx:252-253` as the positive template (correct async wrapper that awaits and closes after). This makes the Session 8 click-guard visual busy state actually visible on the 5 affected modals (currently it flashes 0ms because parents return undefined).

Sites to fix:
1. `BudgetScreen.jsx:159` — fire-and-forget `onSave` wrapper
2. `BudgetScreen.jsx:36` — `saveBudget` no try/catch
3. `HomeScreen.jsx:71` — `handleEditSave` same pattern
4. `dbSaveMemory` .catch(()=>{}) in HomeScreen
5. `GoalsScreen.jsx:47` — `updateGoal` no try/catch

### Priority C: Error-surfacing toasts — ~2-3 hours
Add a shared toast system for Supabase write failures. Currently multiple catch blocks swallow errors silently (`dbInsertTransaction`, `dbSaveMemory`, `saveBudget`, `updateGoal`). Users see no indication when a write fails — a partial Supabase outage could persist for hours without anyone noticing data isn't saving.

### Priority A: Sheet migration finish — ~4-5 hours
3 remaining raw-div modals: `EditTransactionModal`, `SetBudgetModal`, `StreakModal`. Follow the GoalModal migration pattern from commit `bacdf06`. Preserves `useClickGuard` wiring byte-identical (already verified on GoalModal). Hand-rolled `kbOffset` math is fragile across iOS/Android keyboard variants.

### Priority F: Wife testing + feedback capture — ~1 hour
Walk wife through the new Session 8 Sprint A Ext click-guard + timeout fixes now that they're finally live in production. Capture reactions like Session 5 did. Generates Session 10+ priorities from real user signal.

### Priority NEW: Master Control Room — not sized
Kitty has this planned as a larger feature for deploy health monitoring, pipeline hardening, CI/CD visibility. Session 9's silent deploy failure is the canonical motivator — we need alerting when CF Pages stops shipping. Not sized yet. Discuss at start of Session 10 to scope and split.

### Priority RLS cleanup (cheap): `app_events` + `monthly_reports` verification — ~15 min
Run the 3 adversarial probes from `docs/session-9/RLS-HARDENING.md` against these two tables and confirm canonical single-policy coverage. Low-risk tables (write-only event log + read cache) but should be buttoned up before public launch.

### Priority SCHEMA: write `004_capture_current_schema.sql` — ~2 hours
Capture the live Supabase schema into a migration file so the repo can rebuild production state. 4 tables with column drift + 3 tables missing from migrations entirely. Currently a disaster-recovery gap (HIGH in RISKS.md). Not on the critical path for Sprint B, but worth doing before public launch.

## How to start Session 10

1. Open Codespace (remember: stop when done to save quota)
2. `git pull origin main` — should already be at `aa78f9e` + the Session 9 docs wrap-up commit
3. `nvm use 24.13.1` (or verify `node --version` matches `.nvmrc`)
4. `npm ci` — verify the lockfile is still consistent
5. `npm run build` — confirm bundle builds clean
6. **`curl -s https://app.phajot.com/ | grep -oE 'index-[A-Za-z0-9_-]+\.js'`** — confirm production is running `index-CWOl1l1h.js` or newer (Session 8 Sprint A + Ext live)
7. Read `docs/session-9/SUMMARY.md` for full Session 9 context
8. Read `docs/RISKS.md` for the current prioritized risk list
9. Tell Claude "continue with priority [B/C/A/F/NEW/RLS/SCHEMA]" OR describe a new priority

## Known things NOT to touch

- `workers/phanote-api-worker.js` (filename preserved post-rename, content renamed)
- `@phanote.app` email domain in auth (breaks existing users)
- `Ph4n0te` password prefix (same reason)
- `localStorage phanote-*` keys (preserves user preferences)
- Legacy phanote.com URLs in worker comment line 3 (historical marker)
- `useClickGuard` + `fetchWithTimeout` usage sites — Sprint A Ext infrastructure, don't bypass
- **`.nvmrc` exact pinning** — do not revert to major-only or you reintroduce the Session 9 deploy failure
- **`package.json` `engines` field** — same reason
- **User B test account** (`5e3629a1-aa60-4c25-a013-11bf40b8e6b9`) — keep around as permanent RLS regression test identity
- **RLS policies on profiles / transactions / budgets / ai_memory / goals** — canonical single-policy shape from Session 9, don't add overlapping policies

## New rules landed in Session 9 (in CLAUDE.md)

11. **After merging user-visible changes to main, always `curl` production to verify the bundle hash changed.** "Merged to main" is NOT "shipped to users." Run: `curl -s https://app.phajot.com/ | grep -oE 'index-[A-Za-z0-9_-]+\.js'` and confirm the hash differs from what the previous session saw. Do not claim "shipped" until the hash is confirmed different.
12. **`.nvmrc` must pin exact Node version** (e.g. `24.13.1`, not just `24`). Lockfile must be regenerated under the same Node version CF Pages uses. Verify with `npm ci` (strict mode) before pushing lockfile changes.

## Deferred (not in current priority list)

- **New features** (LINE bot, recurring transactions, CSV export, bulk actions) — deferred per Kitty's Session 9 request. Focus stays on stabilization until Sprint B ships.

## Open backlog highlights (full list in `docs/RISKS.md`)

- **3 raw-div modals** still on the Sheet migration list (Priority A)
- **5 parent-wrapper bugs** flagged in `docs/session-8/SPRINT-A-EXT-BACKLOG.md` (Priority B)
- **Silent DB write failures** need error toasts (Priority C)
- **Schema drift** — 4 tables with column drift, 3 tables missing from migrations (HIGH in RISKS.md)
- **No automated RLS regression tests** — Session 9 verification was manual, one-shot (HIGH in RISKS.md)
- **Silent CF Pages deploy failures** — underlying build-break fixed, but detection still missing (HIGH in RISKS.md)
- **Thai translations** for 4 `statementError*` keys (Sprint D i18n marathon)
- **`app_events` + `monthly_reports` RLS** not adversarially verified (MEDIUM, 15-min cleanup)

See `docs/RISKS.md` for the full prioritized risk list with mitigations.
