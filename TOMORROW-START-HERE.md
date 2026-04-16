# Next Session Start Here

**Last session:** Session 11 — Sprint C shipped (Auth Replacement) · April 16, 2026
**Next session:** Session 12 — Sprint D (i18n marathon + Settings reorg)
**Production hash:** `index-CEFkIaIU.js`

## Quick context

**Sprint C is complete.** Seven commits + 1 hotfix shipped in Session 11, all on `main`, all Rule-11 verified:

| # | Commit | What landed |
|---|---|---|
| 1 | `59f35be` | Deploy-verify + wife migration protocols in AUTH-DESIGN.md |
| 2 | `53208a9` | `legacy_auth` column migration (005) |
| 3 | `c3d4a24` | Auth i18n keys (21 keys, lo/th/en) |
| 4 | `45162b0` | `src/lib/auth.js` helpers with derived-password fallback |
| 5 | `45db331` | MigrationScreen component |
| 6 | `770af58` | LoginScreen rewrite + App.jsx legacy detection wiring |
| 7 | `8be34f5` | PinLock + migration flicker hotfix |

**Deploy-verify protocol passed** on phone + desktop:
- Test A: new user register + onboarding
- Test B: log out + log in with set password
- Test C: legacy account migration (55616161 throwaway, no PIN)

**Security audit clean:** `loginWithPassword` only calls `signInWithPassword` — never `signUp`. The old `signInWithPhone` auto-signup function is dead code (exported, zero callers).

**Bundle hash progression:** `BeOPC5lm` → `DiF26egM` → `Cz7dMZg6` → `CEFkIaIU`

**Audit findings:** 0 P0 open, 2 P1 open (statement import nav, i18n), 2 P2 open (analytics memo, settings overload). 4 of 8 closed across Sessions 10-11.

## What's shipping in Sprint D (Session 12)

Sprint D scope is **i18n marathon + Settings reorganization**. Estimated time: **5–6 hours**.

### Priority 1 — Hardcoded string sweep (Rule 15)

Sweep all user-facing strings through `src/lib/i18n.js` with keys for `lo`, `th`, `en`. Screens to audit:
- LoginScreen (partially done in Sprint C — mode toggle, password fields, errors all use i18n. Some structural text like phone placeholder may remain.)
- OnboardingScreen
- SettingsScreen
- HomeScreen greeting/header
- WalletCards
- All modals
- StatementScanFlow (4 missing Thai `statementError*` keys from Session 8)

This closes audit P1 finding #3.

### Priority 2 — Settings reorganization into 5 sections

Audit recommended 5 clear sections instead of the current "control center" feeling:
1. Profile (name, avatar, language, currency)
2. Security (PIN, password change)
3. Data (export, reset)
4. About (version, legal)
5. Support (contact, feedback)

This closes audit P2 finding #7.

### Priority 3 — Sprint D additions from Session 11 findings

| Item | Source | Effort |
|---|---|---|
| Delete `signInWithPhone` dead code | Security audit | 5 min |
| localStorage namespace `phanote_pins` per-user | Hotfix follow-up | 30 min |
| PIN UX clarity (password recommended, PIN opt-out) | Deploy-verify | 30 min |
| Lao/Thai wife review for auth i18n keys | Sprint C follow-up | Wife task, not code |

## How to start Session 12

1. Open Codespace (remember: stop when done to save quota)
2. `git pull origin main` — should be at the Session 11 docs commit or newer
3. `nvm use 24.13.1` (verify `node --version` matches `.nvmrc`)
4. `npm ci` — verify lockfile is clean
5. `npm run build` — confirm bundle builds
6. `curl -s https://app.phajot.com/ | grep -oE 'index-[A-Za-z0-9_-]+\.js'` — **should return `index-CEFkIaIU.js` or newer. Write down the hash.**
7. Read `docs/session-11/SUMMARY.md` for full Session 11 context
8. Read `docs/RISKS.md` for the current prioritized risk list
9. Read `docs/ROADMAP-LIVE.md` for the full sprint timeline
10. Tell Claude "start Sprint D priority [1/2/3]" OR describe a different priority order

## Session 11 learnings to carry forward

(full list in `docs/session-11/SUMMARY.md`)

1. **Deploy-verify protocol caught bugs that static analysis missed.** The three-test protocol (new user, existing user, legacy user) is the minimum viable smoke test for auth changes. Do not skip it.
2. **TOKEN_REFRESHED is a side-effect footgun.** Guard the `onAuthStateChange` handler with a ref when mid-operation state must not be disturbed.
3. **Render gates mask bugs in later gates.** Test the full render chain, not just the gate you added.
4. **localStorage is device-global, not per-user.** Test with multiple accounts on the same device to catch cross-account leakage.
5. **Supabase intentionally conflates "wrong password" and "user not found".** Don't try to distinguish them on the login path — it's anti-enumeration by design.

## What's deferred

Per Speaker directives across Sessions 9–11:

- **New features** (LINE bot, recurring transactions, CSV export, bulk actions) — deferred until Tower ships. Revisited in Sprint K.
- **Tower construction itself** — deferred until prerequisites ship (Sprints B ✅, C ✅, **D**, E). First Tower code lands in Session 14 (Sprint F).
- **Landing page rewrite** — deferred to Sprint K.
- **Lao/Thai auth copy wife review** — non-blocking. Can happen any time between sessions.
- **LINE OTP / LIFF login** — deferred to Sprint K. Current auth is user-set passwords, which is sufficient for the family-use phase.

## Known things NOT to touch

* `workers/phanote-api-worker.js` (filename preserved post-rename, content renamed)
* `@phanote.app` email domain in auth (legacy identifier, preserved per CLAUDE.md)
* `Ph4n0te` password prefix (legacy derived password, used by `loginWithPassword` fallback until all 10 accounts migrate)
* `localStorage phanote-*` keys (preserves user preferences)
* `useClickGuard` + `fetchWithTimeout` + `Sheet` + `toast` + `ToastContainer` + `ConfirmSheet` usage sites — infrastructure, don't bypass
* `.nvmrc` exact pinning + `package.json` `engines` field
* User B test account (`5e3629a1-aa60-4c25-a013-11bf40b8e6b9`) — permanent RLS regression test identity
* RLS policies on all 7 user-data tables — canonical single-policy shape
* `migratingRef` in App.jsx — TOKEN_REFRESHED guard during legacy migration, do not remove until all 10 accounts have migrated

## Session 12 definition of done

Before marking Sprint D complete:

- [ ] All user-facing strings go through `src/lib/i18n.js` (Rule 15 enforced retroactively)
- [ ] Settings reorganized into 5 sections
- [ ] `signInWithPhone` dead code deleted
- [ ] localStorage `phanote_pins` namespaced per-user
- [ ] Production bundle hash different from session start (Rule 11)
- [ ] `docs/session-12/SUMMARY.md` created
- [ ] `docs/RISKS.md` updated
- [ ] `docs/ROADMAP-LIVE.md` updated (Rule 18)
- [ ] `TOMORROW-START-HERE.md` updated to point at Sprint E (observability)

## If Sprint D slips

Sprint D has 2 mandatory priorities (i18n sweep, Settings reorg) and 3 smaller additions. If time runs out:

- i18n sweep is the P1 audit finding — ship it even if Settings reorg defers.
- Settings reorg is P2 — can carry to Session 13 without blocking Tower.
- The 3 smaller additions are all low-priority — carry forward if needed.

Sprint E (observability) is what unlocks Tower. It should not slip past Session 13.

## Remember

Sprint D is brick 3 of the Tower wall. i18n is the last user-facing cleanup before observability (Sprint E) and then Tower itself (Sprint F). The hardest sprints are behind you — auth is shipped and deploy-verified. Sprint D is tedious but low-risk: no migration paths, no security surfaces, no existing-user impact. Just strings and layout.

- Take breaks. Drink water.
- One commit per logical unit. Atomic, reversible.
- Rule 11: "merged" ≠ "shipped." Always verify the bundle hash.
- Rule 15: no hardcoded user-facing strings. This is what Sprint D enforces.
- Rule 18: update `docs/ROADMAP-LIVE.md` in the wrap-up commit.
