# Next Session Start Here

**Last session:** Session 12 — Sprint D ~70% (i18n sweep + infra cleanup) · April 16, 2026
**Next session:** Session 13 — Finish Sprint D (remaining modals + Settings reorg + PIN UX)
**Production hash:** `index-oPuRioVP.js`

## Quick context

**Sprint D is ~70% complete.** Twelve commits shipped in Session 12 (6 morning + 6 post-break), all on `main`, all build-verified:

| # | Commit | What landed |
|---|---|---|
| 1 | `932a8bc` | Delete `signInWithPhone` dead code (security surface closure) |
| 2 | `c3b74a0` | Namespace `phanote_pins` localStorage per-user (cross-account fix) |
| 3 | `6dcb578` | i18n LoginScreen (3 strings) |
| 4 | `e0804ef` | i18n PinLock (8 strings + lang prop wiring) |
| 5 | `b5cd68b` | i18n OnboardingScreen (4 strings) |
| 6 | `0695707` | i18n SettingsScreen (23 strings) |
| 7 | `61402e5` | i18n QuickEditToast (1 string — inline ternary migrated) |
| 8 | `dcfb87f` | i18n AddSavingsModal (4 strings + lang prop) |
| 9 | `98a9648` | i18n WalletCards (2 strings, zero new keys — reuse pattern) |
| 10 | `fe02751` | i18n BudgetScreen + GoalsScreen (6 strings) |
| 11 | `7ceb361` | i18n SetBudgetModal (7 strings, 3 reused) |
| 12 | `17fae99` | i18n EditTransactionModal (9 strings, 3 reused) |

**67 strings i18n'd** across 10 screens/components. 80 new keys + 9 reused across Sessions 11-12 (= 240 new entries across 3 langs). Lao walkthrough passed in Session 12. Thai translations pending wife review.

**Bundle hash progression:** `CEFkIaIU` → `BkevNGeM` → `BLP-ChCs` → `oPuRioVP`

**Audit findings:** 0 P0 open, 2 P1 open (statement import nav, i18n — ~70% done), 2 P2 open (analytics memo, settings overload).

## What's shipping in Session 13

Session 13 continues Sprint D. Estimated time: **3-4 hours**.

### Priority 1 — Finish i18n sweep (~55 strings, ~1.5h)

| File(s) | Est. strings | Notes |
|---|---|---|
| StreakModal | ~10 | Level names, XP descriptions, milestone labels |
| GoalModal | ~8 | Form labels, save/cancel buttons |
| StatementScanFlow (+ 4 missing Thai `statementError*` keys) | ~8 | Pro feature, fixes Session 8 gap |
| AnalyticsScreen gaps | ~12 | Period labels, section headers |
| EditTransactionModal silent-return gap | ~1 | Add toast on invalid input (UX fix, not i18n) |

**If time permits:** GuideScreen (~45 strings) + ProUpgradeScreen (~20 strings). Lowest priority — help docs + not-live feature. Can defer to Sprint D-ext.

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
6. `curl -s https://app.phajot.com/ | grep -oE 'index-[A-Za-z0-9_-]+\.js'` — **should return `index-oPuRioVP.js` or newer. Write down the hash.**
7. Read `docs/session-12/SUMMARY.md` for full Session 12 context
8. Read `docs/ROADMAP-LIVE.md` for the full sprint timeline
9. Tell Claude "continue Sprint D — start with StreakModal + GoalModal i18n"

## Session 12 learnings to carry forward

1. **One commit per screen is the right i18n granularity.** Small enough to review, easy to revert if a translation is off.
2. **Interpolation via `.replace()` at the call site is simple and sufficient.** `t()` stays a pure dict lookup.
3. **Components that render before profile loads need a `lang` prop with `"lo"` default.** PinLock pattern: `lang={profile?.lang || "lo"}`.
4. **Bilingual hardcoded headers (e.g. "Security / ຄວາມປອດໄພ") should be replaced with single-language i18n keys.** Each language gets its native word.
5. **Reuse-over-create is the right default.** 9 keys reused across the post-break commits. Means zero translation work and guaranteed consistency.
6. **Byte-verify special characters in translations.** Unicode minus (U+2212) vs ASCII hyphen caught in editTxExpense via `xxd`.
7. **Audit estimates are lower bounds.** Always read the full file; grep heuristics undercount.
8. **Inline lang ternaries are an anti-pattern.** Even if translations are correct, they bypass the i18n system and are invisible to key audits.

## What's deferred

- **Sprint E (observability)** — starts after Sprint D completes. Unlocks Tower.
- **New features** — deferred until Tower ships (Sprint K).
- **Landing page rewrite** — deferred to Sprint K.
- **Lao walkthrough passed** in Session 12 — wife review can focus on Thai translations and the newly i18n'd form modals (80 keys total across Sessions 11-12).

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
