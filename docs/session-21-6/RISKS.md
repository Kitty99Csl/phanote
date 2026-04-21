# Session 21.6 — Risk Log

**Session:** 21.6 · **Date:** 2026-04-21 · **Sprint:** I.6 (Account security settings cluster)

Tracks risks closed, opened, or changed severity during Session 21.6. Master register: `docs/RISKS.md`.

---

## Closed this session

### [MEDIUM] R21-14 — No password change flow in Settings — CLOSED

**Master entry:** `docs/RISKS.md`
**Closed by:** Commit `03b39e2` (Session 21.6)
**Smoke verification:** Phase C Scenario C1 PASS against production Supabase

**Previously:** Password changeable only via one-time MigrationScreen (Sprint C legacy-auth flow) or admin intervention. User who wanted to rotate password had no self-service path.

**Fix:** `src/screens/ChangePasswordModal.jsx` — new Sheet modal in Settings → Help & Account → Change password. Three fields (current / new / confirm), client-side validation (min length, match, not-same-as-current), then `supabase.auth.updateUser({password, currentPassword})`. Server verifies current password via supabase-js v2.102+ `currentPassword` param (bumped 2.101.1 → 2.104.0 this session).

**Defensive error mapping:**
- "Invalid login credentials" / "incorrect" → `passwordCurrentWrong`
- "weak" / "short" / "length" → `passwordTooShort`
- Any other Supabase error → `toastGenericError` + `console.error`

**Obs polishes applied**: submit button disabled on empty fields (no misleading errors); dedicated `passwordSameAsCurrent` i18n key (honest error copy instead of lying via `toastGenericError`).

**Verification (C1):** current password verify works, new password persists across logout/login, old password rejected by Supabase.

**Status:** Resolved. Unblocks public-launch user expectation of self-service password rotation.

---

### [MEDIUM] R21-15 — No disable-owner-PIN option in Settings — CLOSED

**Master entry:** `docs/RISKS.md`
**Closed by:** Commit `03b39e2` (Session 21.6)
**Smoke verification:** Phase C Scenario C2 PASS against production Supabase

**Previously:** Once owner PIN set, no UI to remove it. Guest PIN had explicit Remove; Owner did not. User who set PIN on shared phone and later got private device had to SQL or Forgot-PIN-plus-admin-approve to return to no-PIN.

**Fix:** Settings → Security → Owner PIN card now shows a red destructive "Remove" button (only when `pinConfig.owner` truthy). Tap → destructive ConfirmSheet → current-PIN-verify step via PinLock in new `"disable-confirm"` mode → `savePinConfig({owner: null, guest: null})` cascade → success toast.

**Security invariants applied:**
- **Current PIN required** (D21.6-Q1 YES) — destructive actions should verify identity
- **Guest PIN force-removed** (D21.6-Q2 YES) — guest without owner is semantically nonsensical
- **Guest PIN explicitly NOT accepted** for verify (owner-only action)
- **Forgot PIN button** auto-hides in disable-confirm mode via existing `!isSetup` gate
- **Cancel escape hatch** via existing top-right Cancel button in setup mode

**Post-disable state**: `pinConfig = {owner: null, guest: null}` in DB. Next login: pinRole initializes to "owner" (since cfg?.owner is null), HomeScreen renders directly, no PinLock gate.

**Re-enable**: existing Settings "Set up" flow works without modification (Bonus smoke PASS).

**Verification (C2):** disable flow end-to-end — ConfirmSheet → PinLock verify → DB cascade → next login no-PinLock. Bonus: re-enable works normally.

**Status:** Resolved. Closes the self-service gap on the account-security surface.

---

## No new risks opened this session

Phase C smoke surfaced no new gaps. The account-security cluster (R21-14 + R21-15) is the last of the main-app self-service-gap items identified in Session 21.5 organic product discovery.

## Deferred from Session 21 — unchanged

R21-6, R21-8, R21-9, R21-10, R21-11, R21-12 remain open — Session 22 scope. See `docs/session-21/RISKS.md` for full context.

## Session 21.5 UX backlog — unchanged

D21.5-Q2 (Owner vs Guest PIN visual parity) — still backlog for Session 22+ Settings visual pass.

## Account-security cluster — CLOSED

All Session 21.5 organic discoveries (R21-14 + R21-15) now resolved. No open gaps on the main-app self-service account-security surface for family-beta users.
