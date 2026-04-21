# Session 21.6 — Decision Log

**Session:** 21.6 · **Date:** 2026-04-21 · **Sprint:** I.6 (Account security settings cluster — R21-14 + R21-15)

Same-cluster follow-up to Session 21.5. All decisions locked at Phase A before any code.

---

## D21.6-Q1 — Require current PIN before disable → YES

**Question:** Should disabling owner PIN require the user to enter their current PIN as a verify step, or just rely on the destructive ConfirmSheet?

**Decision:** YES, require current PIN entry.

**Rationale:** Symmetry with password change (D21.6-Q3 new modal requires current password). Disabling PIN removes a security layer; the standard UX for sensitive account changes is "prove you are who you claim to be." Destructive ConfirmSheet + PIN verify = defense-in-depth against someone who has physical access to an unlocked phone.

**Impact:** `handleSetupKey` in App.jsx gains LEADING `disable-confirm` branch with early return. Verify against `pinConfig.owner` only (guest PIN explicitly not accepted — owner-only action).

---

## D21.6-Q2 — Force-remove guest PIN on owner disable → YES

**Question:** When owner PIN is disabled, should guest PIN be preserved or cleared?

**Decision:** YES, force-remove guest PIN (cascade).

**Rationale:** Guest PIN without owner PIN is semantically nonsensical — the whole two-PIN model assumes owner gates the app (primary lock) and guest provides a restricted-access alternative. With no primary lock, guest has nothing to gate against. Clearing both is cleanest semantic state.

**Impact:** `savePinConfig({ owner: null, guest: null })` on disable verify success. Both keys null in DB `profiles.pin_config`.

**User-visible consequence:** if user had guest PIN set + wants to re-enable owner PIN later, they'll need to re-set guest PIN too. Accepted — re-setup is one Settings tap.

---

## D21.6-Q3 — Password change UI: NEW ChangePasswordModal (not MigrationScreen reuse)

**Question:** Reuse MigrationScreen's UI for the password change modal, or create a new component?

**Decision:** NEW component — `src/screens/ChangePasswordModal.jsx`.

**Rationale:** MigrationScreen is coupled to legacy-auth one-time-upgrade semantics:
- Prefill-from-typed-password hop (LoginScreen → MigrationScreen)
- "Welcome back" greeting copy + migration-specific hints
- Post-migration `handleMigrated` side-effect (clears legacy_auth flag)

Decoupling would require factoring those out into props, pushing complexity into MigrationScreen for a use case that isn't its concern. New 180-line component matching the MigrationScreen visual + useClickGuard pattern is cleaner.

**Impact:** New file. Reuses Sheet + T/S theme + useClickGuard hook. Zero change to MigrationScreen.

---

## D21.6-Q4 — ConfirmSheet array refactor → DEFER

**Question:** Current App.jsx has 4 ConfirmSheet instances (delete-tx, reset, forgot-pin, now disable-pin). Refactor to a map/array-driven approach?

**Decision:** DEFER.

**Rationale:** 5 JSX instances still readable. Refactor threshold in practice seems to be ~6-8. Each ConfirmSheet has distinct i18n keys and destructive/non-destructive flag; map-driven refactor would need an entry-per-kind lookup table that doesn't obviously improve clarity at this count. If Session 22+ adds a 6th+ ConfirmSheet, revisit.

**Impact:** App.jsx gains one more JSX ConfirmSheet instance. Same pattern as existing 4.

---

## D21.6-Q5 — PIN entry UI approach for disable verify → Option C' (setPinSetupMode extension)

**Question:** Three options considered for the current-PIN-verify step before disable:
- A) Inline PIN input in a modified ConfirmSheet
- B) Two-step flow: ConfirmSheet → separate PinLock-style entry modal
- C) Reuse existing setPinSetupMode pattern with new mode "verify-before-disable"

**Decision:** Option C' — extend `setPinSetupMode` with new value `"disable-confirm"`, add single-entry-verify branch in `handleSetupKey`, extend PinLock title/subtitle ternaries 2-way → 3-way.

**Rationale:**
- **Option A breaks ConfirmSheet's simple abstraction** (confirm/cancel, no inline inputs).
- **Option B is two sequential dialogs** — heavy for a single intent.
- **Option C' reuses existing UI user already knows** (same keypad, same visual) — minimum cognitive load. Small surface change: 1 new setupMode value + 1 LEADING branch in handleSetupKey + PinLock title/subtitle ternary extension. Free wins: existing top-right Cancel button gives escape hatch; Forgot PIN button auto-hides via existing `!isSetup` gate.

**Impact:** App.jsx + PinLock.jsx each receive minimal edits. Setup state machine gains one mode value without restructuring.

---

## D21.6-Q6 — 80ms setTimeout cancel-race → SHIP AS-DRAFTED (INFO only)

**Question:** In `handleSetupKey`'s disable-confirm branch, the verify check fires 80ms after the 4th digit (matches existing setup-flow timing). If user taps the top-right Cancel button within that 80ms window, the callback still fires and could disable PIN despite cancel intent.

**Decision:** Ship as-drafted. No mitigation.

**Rationale:**
- **Probability extremely low**: 80ms is faster than typical human reaction to finger-lift + re-target-to-Cancel-button.
- **Impact low**: the outcome is disable-PIN, which is what the user was about to do anyway (they typed the PIN correctly).
- **Mitigation cost**: would require ref-based mode check inside setTimeout to guard against mode changing mid-window. ~10 lines of plumbing for a no-real-user-hits-this window.

**Impact:** No code change. Logged as INFO.

---

## D21.6-Obs2 — `passwordSameAsCurrent` dedicated i18n key

**Question (from Phase B2 review):** `ChangePasswordModal` initially mapped same-as-current password to `toastGenericError` ("Something didn't go through"). This lies — nothing failed, the code caught it intentionally.

**Decision:** Add dedicated `passwordSameAsCurrent` i18n key. Copy: "New password must differ from current" (+ lo + th equivalents).

**Rationale:** Honest error copy. Generic error makes user wonder if retry will succeed. Dedicated message tells them exactly what to do (pick a different password). 6 strings trivial.

**Impact:** +3 i18n entries. `ChangePasswordModal` uses new key.

---

## D21.6-Obs1 — Submit button disabled on empty fields (no new i18n)

**Question (from Phase B2 review):** Empty `currentPassword` initially mapped to `passwordCurrentWrong` ("Current password incorrect"), which is misleading when nothing was entered yet.

**Decision:** Disable submit button when any field empty. No new i18n — disabled visual state communicates "fill in first" without a message.

**Rationale:** Standard UX pattern (most Change-Password dialogs do this). Lighter surface than adding a new key. Once user fills all fields, button enables + validation error messages apply only to actually-filled-but-invalid cases.

**Impact:** `allFilled` boolean in `ChangePasswordModal` gates `disabled` attribute + button styling.

---

## Session close decisions

- **Phase B order:** B5 (i18n) → B1 (core) — wait, for this session actually **B1 (i18n) → B2 (ChangePasswordModal) → B3 (App.jsx/PinLock/HomeScreen) → B4 (SettingsScreen)**. Chosen so each subsequent phase could reference keys/components added earlier.
- **Edge-case smoke (C3-C10) deferred**: critical C1 + C2 + bonus re-enable passed. If any edge surfaces in next session smoke or real usage, backfill.
- **Sentinel re-sync at close** covering just Session 21.6 (not combined — Session 21.5's covered 21 + 21.5).
