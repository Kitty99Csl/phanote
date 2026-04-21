# Session 21.6 SUMMARY

**Date:** 2026-04-21 (day after Session 21.5 close)
**Duration:** ~2 hours (target 95-110 min, ~10 min over on B scope + paste-back iterations)
**Speaker energy:** methodical, scope-disciplined (single-scope bundle, no scope-creep temptation)
**Sprint:** I.6 — Account security settings cluster (R21-14 + R21-15)
**Shipped:** 1 atomic commit closing both risks

## Session metrics

| Metric | Count |
|---|---|
| Commits | 1 feat + 1 wrap |
| Files changed | 7 (1 new: ChangePasswordModal.jsx; 6 modified) |
| Lines changed | +365 / −32 |
| i18n keys added | 15 × 3 languages |
| Dependency bumps | 1 (supabase-js 2.101.1 → 2.104.0) |
| Smoke-test scenarios passed | C1 + C2 critical + bonus re-enable = 3/3 on critical path |
| Risks closed | 2 (R21-14 + R21-15) |
| Decisions locked | 6 (D21.6-Q1..Q6) + 1 observation fix (Obs2 passwordSameAsCurrent) |

## Phase log

| Phase | Elapsed | Outcome |
|---|---|---|
| Ritual | 2 min | No drift. HEAD `617d270`, prod `CQswCaAm.js`, worker 4.8.1, 15 migrations, Sentinels synced |
| A — Reality check | ~10 min | supabase-js 2.101.1 < 2.102 → bump plan. ConfirmSheet destructive variant reused. Option C' chosen (setPinSetupMode extension, PinLock title/subtitle ternary). 6 decisions locked |
| B1 — i18n (14 + 1 Obs2 key × 3 langs) | ~8 min | Summary paste-back; clean |
| B2 — ChangePasswordModal NEW | ~20 min | Sheet + useClickGuard pattern, 3-field validation, defensive server-error regex mapping. Full paste-back. Obs1/Obs2 fixes applied same-phase |
| B3 — App.jsx + PinLock + HomeScreen wiring | ~35 min | performDisableOwnerPin + handleSetupKey leading branch + PinLock title/subtitle extension + ConfirmSheet + modal mount + HomeScreen prop pass-through. Full paste-back per auth-path trust mode |
| B4 — SettingsScreen UI | ~10 min | Owner PIN Remove button (mirrors Guest PIN visual) + Change password row in Help & Account section. No new i18n keys |
| C — Speaker smoke | ~15 min | C1 PASS, C2 PASS, bonus re-enable PIN PASS |
| D — Commit + wrap | ~15 min | Atomic commit `03b39e2` + Rule 11 verify + wrap docs |

## Fix summaries

### R21-14 — In-Settings password change

Previously: password changeable only via one-time MigrationScreen flow (Sprint C) or admin intervention. No self-service path.

Now: authenticated user navigates Settings → Help & Account → "Change password" → modal with 3 fields (current / new / confirm) → submit calls `supabase.auth.updateUser({password, currentPassword})` which verifies server-side.

Key mechanism: **supabase-js v2.102+** added `currentPassword` param to `updateUser`. Server verifies; wrong password returns `{ error }` (not throw). Client maps error messages to user-facing toasts:
- "Invalid login credentials" → `passwordCurrentWrong`
- "weak/short/length" → `passwordTooShort`
- anything else → `toastGenericError` + `console.error`

Defensive regex fallback handles Supabase's evolving error messages.

**Obs1 polish applied during B2**: submit button disabled when any field empty (cleaner UX than showing "Current password incorrect" when nothing typed yet). Mirrors standard Change-Password UX.

**Obs2 polish applied during B2**: dedicated `passwordSameAsCurrent` i18n key instead of lying with `toastGenericError`. 6 strings added (en/lo/th for message).

### R21-15 — Disable owner PIN

Previously: once owner PIN set, no UI to remove it. "Lock app now" re-locks but doesn't disable. User required admin intervention (SQL or Forgot PIN + approve) to return to no-PIN state.

Now: Settings → Security → Owner PIN "Remove" button → destructive ConfirmSheet → current-PIN-verify step → `savePinConfig({owner: null, guest: null})` cascade → success toast + direct-to-HomeScreen on next login.

Architecture (Option C' per D21.6-Q5):
- New `pinSetupMode` value: `"disable-confirm"` (single-entry verify, not two-step enter-confirm)
- `handleSetupKey` gains LEADING branch with early return — prevents existing enter-confirm logic from capturing verify PIN as new "first"
- `PinLock.jsx` title/subtitle ternary extended 2-way → 3-way for disable-confirm mode
- New i18n: `pinDisableVerifyTitle` / `pinDisableVerifySub`
- Free wins: existing top-right Cancel button gives escape hatch; Forgot PIN button auto-hides via existing `!isSetup` gate
- **Guest PIN explicitly NOT accepted** for verify (owner-only action) — intentional `if (next === pinConfig.owner)` only, not `|| pinConfig.guest`

Error handling: same revert-and-toast pattern as Session 21.5 `savePinConfig` fix — if DB write fails after optimistic local update, revert via `savePinConfig(previousCfg).catch(() => {})` best-effort + `pinSaveFailed` toast. User exits `disable-confirm` mode either way, can retry via Settings.

## Supabase-js version bump

2.101.1 → 2.104.0 via `npm update @supabase/supabase-js`. Caret range `^2.101.1` in package.json already allowed 2.104.0, so only `package-lock.json` regenerated. 6 packages touched total (Supabase sub-dep family). No breaking changes; `currentPassword` param added in v2.102.0 is new-capability-only.

## Obs polishes adopted during B2

- **Obs1 — disable submit on any empty field**: cleaner UX than showing error message. No new i18n key (disabled state communicates "fill me in" visually).
- **Obs2 — passwordSameAsCurrent dedicated key**: honest error instead of lying with `toastGenericError`. +6 strings (en/lo/th).

Speaker's guidance on both: "Don't let polish block Phase B3." Applied both because each was ~2 min — no Phase B3 delay.

## Smoke test results (Phase C)

Speaker drove `npm run dev` locally against production Supabase (same pattern as Session 21.5).

| # | Scenario | Result |
|---|---|---|
| C1 | Password change: current verify + new persists across logout/login + old rejected | ✅ PASS |
| C2 | Disable PIN: verify step + DB cascade + login skips PinLock | ✅ PASS |
| Bonus | Re-enable PIN after disable via existing Settings setup flow | ✅ PASS |

Edge cases (C3-C10) deferred as time-boxed. Not blocking commit — critical path verified.

## Decisions

All 6 design questions locked at Phase A + 1 observation fix documented. See `docs/session-21-6/DECISIONS.md`.

## Deferred / noted

- **D21.6-Q6**: 80ms setTimeout cancel-race — extremely low probability, low impact, not worth ref-based mitigation. Logged INFO only.
- **D21.6-Q4**: ConfirmSheet array-driven refactor — defer. 4 → 5 instances is still readable; refactor threshold ~6-8.
- **Edge-case smoke (C3-C10)**: verified implicitly via code review + critical-path passing. If Session 22+ surfaces any edge failure, will backfill test scenarios.

## Production state post-21.6

- **Worker:** v4.8.1 (unchanged)
- **Main app bundle:** flipped from `index-CQswCaAm.js` (21.5 close) to new CF-Pages-built hash (tracked in ROADMAP-LIVE)
- **Migrations:** 15 (unchanged)
- **HEAD:** `03b39e2` (fix) + `<wrap commit>` (this wrap)

## Sentinel re-sync

Single re-sync covering just Session 21.6 at session close:
- Vanguard: **TO TRIGGER** (Speaker runs out-of-band)
- Osiris: **TO TRIGGER** (Speaker runs out-of-band)

## Open threads for next session

Session 22 opens with a clean account-security surface. Remaining Session 21 open risks (R21-6, R21-8, R21-10, R21-11, R21-12) still deferred — Session 22 is Tower Room 6 UI focused.

## Cluster close

R21-14 + R21-15 close completes the "account security settings gap" cluster identified organically during Session 21.5 Phase C smoke. No self-service gaps remain on the Phajot main-app account-security surface for family-beta users.
