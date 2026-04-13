# Next Session Start Here

**Last session:** Session 8 Sprint A + Ext — post-refactor stabilization + credential leak remediation
**Status:** Complete, merged to main at `ac9bd77`, phone-tested 5/5 on iOS Safari
**Next session:** Sprint B — open to Sheet-migration finish + parent-wrapper hygiene OR new features

## Quick context

- **Session 7 refactored** `src/App.jsx` from 5,480 → 345 lines across a multi-layer structure (`src/lib/`, `src/hooks/`, `src/components/`, `src/modals/`, `src/screens/`)
- **Session 8 Sprint A** fixed 5 critical bugs surfaced on real-device test (2 latent ReferenceErrors from the refactor, 1 parse hang, 2 iOS keyboard bugs) and remediated a leaked Gemini API key
- **Session 8 Sprint A Ext** added two codebase-wide sweeps (`useClickGuard` across 7 buttons, `fetchWithTimeout` across 4 endpoints) and migrated the last high-priority raw-div modal (GoalModal) to the `Sheet` component
- Phajot is live at phajot.com, app.phajot.com, api.phajot.com; legacy phanote.com domains redirect cleanly
- The new Gemini key is live on the Cloudflare worker, OCR + statement scan verified working end-to-end

## What's ready for Sprint B (pick one)

### Priority A: Finish the Sheet migration (3 remaining modals)
`EditTransactionModal`, `SetBudgetModal`, `StreakModal` still use raw `<div>` overlays with manual `useKeyboardOffset` math. Follow the pattern established in `AddSavingsModal`, `AiAdvisorModal`, and `GoalModal`. ~1-2 hours per modal, ~4-5 hours total. Preserves the `useClickGuard` wiring byte-identical (already verified pattern on GoalModal).

### Priority B: Fix the parent-side wrapper bugs flagged in SPRINT-A-EXT-BACKLOG.md
Five fire-and-forget `onSave` wrappers and missing try/catches in `BudgetScreen`, `HomeScreen`, `GoalsScreen`. Each one is a 5-line fix. Use `GoalsScreen:252-253` as the positive template — those wrappers properly return Promises and close after await. Ship as one sweep commit. ~1 hour total. This makes the click-guard visual busy state actually visible on the 5 affected modals.

### Priority C: Error-surfacing toasts
Several DB write paths swallow errors silently (`dbInsertTransaction` catch, `dbSaveMemory` catch, `saveBudget` no try/catch, `updateGoal` no try/catch). Users currently see nothing when a Supabase write fails. Add a shared `useToast` or similar, surface errors at the App.jsx handler layer. ~2-3 hours.

### Priority D: RLS on Supabase (profiles, transactions)
**Still blocks public launch.** Write the policies for `profiles` and `transactions` tables + verify with a second user. ~2 hours. Highest user-visible blocker to expanding beyond family testing.

### Priority E: New features (LINE bot, recurring transactions, CSV export, bulk actions)
Deferred from the original Session 7 priority list. Scoped ~1-3 hours each:
- **LINE bot**: uses `/parse` endpoint, wife uses LINE daily, ~2-3 hours
- **Recurring transactions**: salary/rent/subscriptions, needs schema migration, ~3-4 hours
- **CSV export**: filtered TransactionsScreen → CSV download, ~1 hour
- **Bulk actions**: multi-select + bulk delete/categorize in TransactionsScreen, ~1.5 hours

### Priority F: Wife testing + feedback capture
Walk wife through the new Sprint A Ext click-guard + timeout fixes. Capture reactions like Session 5 did. Generates Sprint B priorities from real user signal. ~1 hour.

## How to start Sprint B

1. Open Codespace (remember: stop when done to save quota)
2. `git pull origin main`
3. `npm run dev`
4. Read `docs/session-8/SUMMARY.md` for full Sprint A + Ext context
5. Read `docs/session-8/SPRINT-A-EXT-BACKLOG.md` for the open follow-ups
6. Tell Claude "continue with priority [A-F]" OR describe a new priority

## Known things NOT to touch

- `workers/phanote-api-worker.js` (filename preserved, content renamed)
- `@phanote.app` email domain in auth (breaks existing users)
- `Ph4n0te` password prefix (same reason)
- `localStorage phanote-*` keys (preserves user preferences)
- Legacy phanote.com URLs in worker comment line 3 (historical marker)
- `useClickGuard` + `fetchWithTimeout` usage sites — Sprint A Ext infrastructure, don't bypass

## New rules landed in Session 8 Sprint A Ext (in CLAUDE.md)

9. **All new async action buttons (save/confirm/submit) must wrap their handler in `useClickGuard`.** See `src/hooks/useClickGuard.js`. Pattern: `const { busy, run } = useClickGuard(); const save = () => run(async () => {...}); <button onClick={save} disabled={busy}>`.
10. **All new `fetch()` calls to worker endpoints must use `fetchWithTimeout`** with an endpoint-appropriate timeout. Never bare `fetch()` to `api.phajot.com`. Pattern: `fetchWithTimeout(url, options, 30000)` + `catch (e) { if (e instanceof FetchTimeoutError) ... }`.

## Open backlog highlights

- **3 raw-div modals still on the Sheet migration list** (Sprint B Priority A)
- **5 parent-wrapper bugs** flagged in `docs/session-8/SPRINT-A-EXT-BACKLOG.md`
- **RLS on Supabase** — still blocking public launch
- **Thai translations** for `statementError*` keys (4 keys missing) — Sprint D i18n marathon
