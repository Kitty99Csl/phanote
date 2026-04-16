# Session 11 Summary — Sprint C: Auth Replacement

**Duration:** April 16, 2026 (single session)
**Commits shipped:** 7 + 1 hotfix (all on `main`, no working branch cut)
**Status:** Complete — derived-password auth replaced, legacy migration path shipped, deploy-verified on phone + desktop
**Branch:** `main` (direct, following Session 9/10 pattern)

## What happened

Session 11 was Sprint C — auth replacement. The only Sprint C priority remaining after Sessions 10 shipped schema drift capture and native dialog replacement early. Sprint C replaces the pre-existing phone-to-email auth trick (`{countryCode}{phone}@phanote.app` + `Ph4n0te{phone}X` derived password) with proper user-set passwords, while providing a seamless migration path for the 10 existing legacy accounts.

Seven commits landed in sequence, plus one hotfix discovered during deploy-verify:

1. Deploy-verify and wife migration protocols documented
2. `legacy_auth` column migration (005)
3. Auth i18n keys for all 3 languages
4. `src/lib/auth.js` helpers with derived-password fallback
5. MigrationScreen component
6. LoginScreen rewrite + App.jsx wiring (the big one)
7. PinLock + migration flicker hotfix (discovered during deploy-verify Test C)

Closes **audit P0 finding #1** (derived-password auth). Zero P0 findings remain open.

**Rule 11 compliance:** the production bundle hash was verified after every user-visible commit:

| Stage | Commit | Hash | Verification |
|---|---|---|---|
| Session start baseline | — | `index-BeOPC5lm.js` | confirmed (Session 10 deploy) |
| After auth i18n keys | `c3d4a24` | `index-DiF26egM.js` | flipped, confirmed |
| After auth.js helpers | `45162b0` | `index-DiF26egM.js` | no change (additive module, not imported yet) |
| After MigrationScreen | `45db331` | `index-DiF26egM.js` | no change (standalone, not imported yet) |
| After LoginScreen rewrite | `770af58` | `index-Cz7dMZg6.js` | flipped, confirmed. Matches local build. |
| After hotfix | `8be34f5` | `index-CEFkIaIU.js` | flipped, confirmed. Matches local build. |

## The commits

### 1. `59f35be` — docs: deploy-verify + wife migration protocols

Added §11 (deploy-verify protocol) and §12 (wife migration walkthrough) to `docs/tower/AUTH-DESIGN.md`. Defines the three-test protocol:
- Test A: new user register + onboarding
- Test B: log out + log in with set password
- Test C: legacy account migration (55616161 throwaway)

All three tests must pass before touching Kitty's or wife's accounts.

### 2. `53208a9` — feat: legacy_auth column migration (005)

`supabase/migrations/005_add_legacy_auth.sql`: adds `legacy_auth BOOLEAN DEFAULT false` to the profiles table. Existing accounts get `false` by default — the column is flipped to `true` via manual SQL for the 10 known legacy accounts. New accounts created via `registerWithPassword` get `false` automatically.

**Manual gate:** Speaker ran `UPDATE profiles SET legacy_auth = true;` against production Supabase after verifying all 10 rows. Confirmed via `SELECT id, display_name, legacy_auth FROM profiles;`.

### 3. `c3d4a24` — feat: auth i18n keys (lo/th/en)

21 new keys added to `src/lib/i18n.js` across all 3 language dicts: login mode toggle, password fields, registration, migration screen copy, error messages, and the "forgot password" flow. Notable:
- `migrationTitle` uses the 🐾 capybara paw emoji across all 3 languages
- `authForgotMessage` is a family-only soft message ("contact Kitty") since there's no automated reset yet
- `authWrongPassword` is deliberately generic (covers both wrong-password and unknown-phone — Supabase returns the same error for both, preventing phone enumeration attacks)

### 4. `45162b0` — feat: auth.js helpers with derived-password fallback

`src/lib/auth.js` — three exported functions:
- `registerWithPassword(phone, countryCode, password)` — creates auth.users row + defensively sets `legacy_auth=false`
- `loginWithPassword(phone, countryCode, password)` — two-attempt flow: typed password first, derived legacy password fallback second. Returns `fellBackToLegacy: true` + `typedPassword` when the fallback succeeds.
- `migrateLegacyAccount(newPassword)` — updates auth.users password + clears `legacy_auth` flag on profile

File header includes NON-NEGOTIABLE INVARIANTS documenting byte-identical matching with `src/lib/supabase.js` for phone normalization, email construction, and derived password pattern.

### 5. `45db331` — feat: MigrationScreen component

`src/screens/MigrationScreen.jsx` — standalone component. Uses Sheet wrapper with `showCloseButton={false}` (added in the commit 6 pass). Pre-fills new password field from LoginScreen's typed password. Validates min 6 chars + confirm match. Inline validation for form errors, `showToast` for backend errors. Uses `useClickGuard` per Rule 9.

Props: `{ profile, lang, prefillPassword, onMigrated, onClose }`. Nothing imported it at this point — commit 6 wires it.

### 6. `770af58` — feat: LoginScreen rewrite + App.jsx wiring

**LoginScreen** (83 → 210 lines): complete rewrite. Replaces `signInWithPhone` (the auto-signup-capable legacy function) with `loginWithPassword` + `registerWithPassword` from `src/lib/auth.js`. Login/register mode toggle (pill-style switcher). Password field, confirm password in register mode. Inline error display. `authWrongPassword` shown for all login failures (intentional — matches Supabase's anti-enumeration design).

**App.jsx** (+43 lines):
- Import MigrationScreen
- Add `migrationPrefill` state (transient, cleared after migration)
- Profile mapping gains `legacyAuth: dbProfile.legacy_auth === true`
- `handleLogin` signature expanded: 5th arg `authMeta = { fellBackToLegacy, typedPassword }`
- `handleMigrated` — clears prefill, optimistic `setProfile(p => ({...p, legacyAuth: false}))`
- `handleMigrationCancel` — full sign-out (backdrop tap on MigrationScreen)
- New render gate between OnboardingScreen and Pin/Home: `if (profile.legacyAuth) return <MigrationScreen />`

**Security property:** `loginWithPassword` only calls `supabase.auth.signInWithPassword` — never `signUp`. A never-registered phone number with any password returns an error. No auto-signup path exists in the new flow. The old `signInWithPhone` function (which HAD auto-signup) is now dead code — exported from `supabase.js` but imported by zero files.

### 7. `8be34f5` — fix: PinLock + migration flicker (hotfix)

Discovered during deploy-verify Test C on legacy account 55616161 (no PIN set). Two root bugs:

**Bug A — PinLock rendered for users with no PIN:**
Root cause: render gate `pinRole === null || pinSetupMode` at App.jsx:362 fired on `pinRole===null`, but `pinRole` could be null from localStorage contamination (different user's PIN on same device). Fix: gate now checks `pinRole === null && pinConfig?.owner` — uses the DB-backed pinConfig as source of truth. Users with no PIN cannot see PinLock regardless of localStorage state.

**Bug B — Migration screen flickered mid-flow:**
Root cause: `supabase.auth.updateUser({ password })` in `migrateLegacyAccount` fires a `TOKEN_REFRESHED` event. The `onAuthStateChange` handler called `loadUserData` which raced with the in-flight `profiles.update({ legacy_auth: false })`, corrupting profile state. Fix: `migratingRef` tracks `profile.legacyAuth` via `useEffect`. TOKEN_REFRESHED handler skips `loadUserData` while migration is active.

**Bug 3 (refresh required to reach Home after migration)** was a compound of A+B — auto-resolved by fixing both.

Total: 8 lines added, 2 lines modified. All additive. Zero behavior change for non-legacy users or PIN users.

## Deploy-verify protocol results

All three tests passed on phone (iOS Safari) + desktop (Chrome):

| Test | Scenario | Result |
|---|---|---|
| A | New user register + onboarding | Pass — registerWithPassword → OnboardingScreen → HomeScreen |
| B | Log out + log in with set password | Pass — loginWithPassword → HomeScreen (no legacy fallback) |
| C | Legacy account migration (55616161, no PIN) | Pass (after hotfix) — loginWithPassword fell back to derived password → MigrationScreen → set new password → HomeScreen |

Tests A and B passed before the hotfix. Test C initially failed (Bugs A+B), passed cleanly after `8be34f5`.

## Security audit results

Speaker raised a critical question mid-session: can a never-registered phone + any password accidentally create an account?

**Audit result: NO.** `loginWithPassword` only calls `signInWithPassword` (never `signUp`). Both attempts (typed password and derived password) fail cleanly for unregistered phones. The old `signInWithPhone` function in `supabase.js` (which HAD auto-signup) is dead code — defined but never called after the Sprint C rewrite.

Supabase's `signInWithPassword` returns `AuthApiError: Invalid login credentials` for both "wrong password" and "user doesn't exist" — same error, same status code. This is intentional anti-enumeration design. LoginScreen correctly shows `authWrongPassword` for all login failures without attempting to distinguish the two cases.

## Follow-ups for Sprint D

| Item | Priority | Notes |
|---|---|---|
| Lao/Thai wife review for auth i18n keys | Medium | 21 new keys need native speaker check |
| PIN UX clarity | Medium | Consider password-recommended messaging with PIN opt-out notice |
| Delete `signInWithPhone` dead code | Low | Still exported from supabase.js, called by nobody |
| localStorage namespace per-user for `phanote_pins` | Low | Hotfix mitigated the symptom, root cause (device-global key) remains |
| Thai translations for 4 `statementError*` keys | Low | Pre-existing gap from Session 8 |

## Lessons learned

1. **Deploy-verify protocol caught two bugs that build + type-check + code review missed.** The PinLock gate and migration flicker were invisible to static analysis. Only exercising the full legacy-migration path on a real account surfaced them. The three-test protocol (new user, existing user, legacy user) is the minimum viable smoke test for auth changes.

2. **TOKEN_REFRESHED is a side-effect footgun.** `supabase.auth.updateUser()` fires a TOKEN_REFRESHED event that triggers any registered `onAuthStateChange` handler. If that handler calls `loadUserData()`, you get a race condition with whatever in-flight DB writes triggered the `updateUser` in the first place. Guard the handler with a ref when mid-operation state must not be disturbed.

3. **Render gates mask bugs in later gates.** The MigrationScreen gate (legacyAuth check) rendered before the PinLock gate. While migration was active, PinLock's broken state was invisible. The moment migration completed and the next gate evaluated, the bug surfaced. Any early-return render gate can mask downstream issues — test the full chain, not just the gate you added.

4. **localStorage is device-global, not per-user.** The `phanote_pins` key in localStorage is shared across all accounts on the same browser. Testing multiple accounts on the same device (which is exactly what deploy-verify requires) exposes cross-account leakage. The hotfix added a source-of-truth guard at the render gate; the proper fix (per-user localStorage keys) is deferred to Sprint D.

5. **Supabase intentionally conflates "wrong password" and "user not found" errors.** This is anti-phone-enumeration design, not a limitation. Don't try to distinguish them on the login path. The register path can safely say "already exists" because the user declared intent to create — different threat model.

6. **Optimistic state updates need protection from async reconciliation.** `handleMigrated` optimistically set `legacyAuth: false`, but the TOKEN_REFRESHED handler's `loadUserData` could overwrite it with `legacyAuth: true` from DB (if the write hadn't committed yet). The fix was to suppress the reconciliation during migration, not to remove the optimistic update.

7. **Dead code is a security surface.** `signInWithPhone` with its auto-signup fallback is inert (no callers) but would be a security hole if anyone re-imported it. Sprint D should delete it. Until then, the function's docblock and this summary document its status.

## Post-state

- **Local `main`**: `8be34f5`
- **`origin/main`**: `8be34f5`
- **Production `app.phajot.com`**: serving `index-CEFkIaIU.js`
- **Auth model**: password-based (new), with derived-password fallback for legacy accounts during migration
- **Legacy accounts**: 10 accounts with `legacy_auth=true`. Each will see MigrationScreen on next login.
- **Audit P0**: zero open. Finding #1 (derived-password auth) closed by `770af58`.
- **Audit P1**: 2 open (statement import nav, i18n hardcoded strings). 3 closed in Session 10.
- **Audit P2**: 2 open (analytics memoization, settings overload).
- **Worker**: `api.phajot.com` at v4.4.0, unchanged in Session 11
- **Working tree**: clean except `.claude/` untracked
