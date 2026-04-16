# Next Session Start Here

**Last session:** Session 12 — Sprint D partial (i18n sweep + infra cleanup) · April 16, 2026
**Next session:** Session 13 — Continue Sprint D (remaining i18n + Settings reorg)
**Production hash:** `index-BLP-ChCs.js`

## Quick context

**Sprint D is 40% complete.** Six commits shipped in Session 12, all on `main`, all build-verified:

| # | Commit | What landed |
|---|---|---|
| 1 | `932a8bc` | Delete `signInWithPhone` dead code (security surface closure) |
| 2 | `c3b74a0` | Namespace `phanote_pins` localStorage per-user (cross-account fix) |
| 3 | `6dcb578` | i18n LoginScreen (3 strings) |
| 4 | `e0804ef` | i18n PinLock (8 strings + lang prop wiring) |
| 5 | `b5cd68b` | i18n OnboardingScreen (4 strings) |
| 6 | `0695707` | i18n SettingsScreen (23 strings) |

**38 strings i18n'd** across 4 critical-path screens. 59 total new keys across Sessions 11-12 pending Lao/Thai wife review.

**Bundle hash progression:** `CEFkIaIU` → `BkevNGeM` → `BLP-ChCs`

**Audit findings:** 0 P0 open, 2 P1 open (statement import nav, i18n — 40% done), 2 P2 open (analytics memo, settings overload).

## What's shipping in Session 13

Session 13 continues Sprint D. Estimated time: **4-5 hours**.

### Priority 1 — Finish i18n sweep (~124 strings, ~2.5h)

| File(s) | Est. strings | Notes |
|---|---|---|
| 6 modals (GoalModal, EditTransaction, SetBudget, AddSavings, StreakModal, QuickEditToast) | ~39 | Daily use, high priority |
| StatementScanFlow (+ 4 missing Thai `statementError*` keys) | ~8 | Pro feature, fixes Session 8 gap |
| WalletCards | ~5 | Home screen component |
| AnalyticsScreen gaps | ~12 | Period labels, section headers |
| BudgetScreen + GoalsScreen small gaps | ~4 | "Tap to set limit", "Due this month" |

**If time permits:** GuideScreen (~45 strings) + ProUpgradeScreen (~20 strings). These are lowest priority — GuideScreen is help docs, ProUpgradeScreen is a feature not yet live. Can defer to Sprint D-ext or Sprint E.

### Priority 2 — Settings reorganization (~2h)

Audit recommended 5 clear sections instead of the current layout:
1. Profile (name, avatar, language, currency)
2. Security (PIN, password change)
3. Data (export, reset)
4. About (version, legal)
5. Support (contact, feedback)

This closes audit P2 finding #7.

### Priority 3 — Small items (~30 min)

- PIN UX clarity copy (password recommended with PIN opt-out notice)

## How to start Session 13

1. Open Codespace (remember: stop when done to save quota)
2. `git pull origin main` — should be at the Session 12 docs commit or newer
3. `nvm use 24.13.1` (verify `node --version` matches `.nvmrc`)
4. `npm ci` — verify lockfile is clean
5. `npm run build` — confirm bundle builds
6. `curl -s https://app.phajot.com/ | grep -oE 'index-[A-Za-z0-9_-]+\.js'` — **should return `index-BLP-ChCs.js` or newer. Write down the hash.**
7. Read `docs/session-12/SUMMARY.md` for full Session 12 context
8. Read `docs/ROADMAP-LIVE.md` for the full sprint timeline
9. Tell Claude "continue Sprint D — start with the modals i18n sweep"

## Session 12 learnings to carry forward

1. **One commit per screen is the right i18n granularity.** Small enough to review, easy to revert if a translation is off.
2. **Interpolation via `.replace()` at the call site is simple and sufficient.** `t()` stays a pure dict lookup.
3. **Components that render before profile loads need a `lang` prop with `"lo"` default.** PinLock pattern: `lang={profile?.lang || "lo"}`.
4. **Bilingual hardcoded headers (e.g. "Security / ຄວາມປອດໄພ") should be replaced with single-language i18n keys.** Each language gets its native word.

## What's deferred

- **Sprint E (observability)** — starts after Sprint D completes. Unlocks Tower.
- **New features** — deferred until Tower ships (Sprint K).
- **Landing page rewrite** — deferred to Sprint K.
- **Lao/Thai wife review for 59 new i18n keys** — non-blocking, can happen between sessions.

## Known things NOT to touch

* `workers/phanote-api-worker.js` (unchanged since Session 6)
* `@phanote.app` email domain in auth (legacy identifier, preserved)
* `Ph4n0te` password prefix (legacy derived password, used by fallback until all 10 accounts migrate)
* `migratingRef` in App.jsx (TOKEN_REFRESHED guard, do not remove until all 10 accounts migrated)
* `useClickGuard` + `fetchWithTimeout` + `Sheet` + `toast` + `ConfirmSheet` — infrastructure, don't bypass
* `.nvmrc` exact pinning + `package.json` `engines` field
* RLS policies on all 7 user-data tables
* User B test account (`5e3629a1-aa60-4c25-a013-11bf40b8e6b9`)

## Session 13 definition of done

Before marking Sprint D complete:

- [ ] All user-facing strings go through `src/lib/i18n.js` (Rule 15 enforced retroactively)
- [ ] Settings reorganized into 5 sections (audit P2 #7)
- [ ] 4 missing Thai `statementError*` keys added
- [ ] Production bundle hash different from session start (Rule 11)
- [ ] `docs/session-13/SUMMARY.md` created
- [ ] `docs/RISKS.md` updated
- [ ] `docs/ROADMAP-LIVE.md` updated (Rule 18)
- [ ] `TOMORROW-START-HERE.md` updated to point at Sprint E (observability)

## Remember

Sprint D is the tedious-but-safe sprint. No migration paths, no security surfaces, no existing-user impact. Just strings and layout. The hardest sprints (B auth-replacement, C deploy-verify) are behind you. Sprint E (observability) is what unlocks Tower — it should not slip past Session 14.

- Take breaks. Drink water.
- One commit per logical unit. Atomic, reversible.
- Rule 11: "merged" ≠ "shipped." Always verify the bundle hash.
- Rule 15: no hardcoded user-facing strings. This is what Sprint D enforces.
- Rule 18: update `docs/ROADMAP-LIVE.md` in the wrap-up commit.
