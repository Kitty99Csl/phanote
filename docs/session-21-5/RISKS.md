# Session 21.5 — Risk Log

**Session:** 21.5 · **Date:** 2026-04-20 · **Sprint:** I.5 (R21-13 hotfix)

Tracks risks closed, opened, or changed severity during Session 21.5. Master register: `docs/RISKS.md`.

---

## Closed this session

### [HIGH] R21-13 — Settings PIN change silent DB failure — CLOSED

**Master entry:** `docs/RISKS.md`
**Closed by:** Commit `98f758d` (Session 21.5)
**Smoke verification:** 3/3 Phase C tests PASS with DB-level SQL confirmation

**Root cause:** `savePinConfig` in App.jsx had a triple defect stack (fire-and-forget IIFE + `catch {}` + no `{ error }` shape check). Supabase JS does not throw on RLS/constraint/permission errors, so the try/catch was dead code for common-case failures. DB writes silently failed; localStorage reflected changes the DB didn't have; `loadUserData` read stale DB on next login.

**Fix:** `savePinConfig` is now async + awaits the Supabase update + checks `{ error }` response shape + throws on failure. All 3 call sites updated (handleSetupKey with toast + revert, handlePinRecoveryComplete with console.warn-only, SettingsScreen Guest Remove with toast + revert).

**Verification:**
- Test 1 (Owner change 1234 → 7777): localStorage + DB + post-login PIN all show `7777` ✓
- Test 2 (Guest set → Remove): DB `pin_config.guest = null` ✓
- Test 3 (Forgot PIN button present): visible, ConfirmSheet opens correctly ✓

**Status:** Resolved. Unblocks public launch for PIN-related concerns.

---

## Opened this session (for Session 21.6 bundle)

### [MEDIUM] R21-14 — No password change flow in Settings

**Discovered:** Session 21.5 Phase C smoke (organic — Speaker explored account security surface)
**Status:** Open — scheduled for Session 21.6

Current state: Password can only be changed during the one-time legacy-auth Migration flow (Sprint C) or via admin intervention / Supabase dashboard. No Settings button for "Change password" exists.

**User impact:** User who wants to rotate their password (suspected compromise, periodic hygiene, shared-device cleanup) has no self-service path. Reasonable expectation on any account product.

**Design questions (locked at 21.6 Phase A):**
- Prompt current password + new password + confirm? (probably yes)
- Reuse MigrationScreen UI? (evaluate)
- Error handling: wrong current password → inline error on current field
- Shared destructive-change confirmation pattern (with R21-15)
- i18n copy

**Priority:** Medium — not a launch blocker (admins can manually help for family-beta), but expected feature for public.

---

### [MEDIUM] R21-15 — No "Disable PIN" option for owner PIN once set

**Discovered:** Session 21.5 Phase C smoke (Speaker expected a Turn Off button alongside Change)
**Status:** Open — scheduled for Session 21.6

Current state: `SettingsScreen.jsx:170-196` offers:
- Owner PIN: "Change" button (opens setup flow)
- Owner PIN: **NO** disable/remove button (unlike Guest which has explicit Remove)
- "Lock app now": re-locks but doesn't disable

**User impact:** Once owner PIN is set, user cannot remove it without admin intervention (SQL or Forgot PIN flow + admin approval). Reasonable scenario: user sets PIN because phone was shared, later gets private device, wants no-PIN experience.

**Design questions (locked at 21.6 Phase A):**
- Confirmation dialog required (removes security layer)
- Require current PIN entry before disabling?
- Effect on guest PIN (keep or force-remove?) — probably remove, guest without owner is semantically weird
- Effect on recovery flow: Forgot PIN button should hide when no owner PIN
- i18n copy

**Priority:** Medium — not a launch blocker, but user-friction gap. Family-beta has admin intervention fallback; public launch needs self-service.

---

## Deferred / noted

### [UX backlog, no severity yet] D21.5-Q2 — Owner vs Guest PIN card visual parity

**Discovered:** Phase C smoke false-alarm ("Settings disappeared" turned out to be guest-PIN entered, not owner-PIN change silent-failure)
**Status:** Backlog — Session 22+ Settings visual pass

Settings Owner PIN and Guest PIN cards share identical styling; only the icon (🔐 vs 🔑) and subtle label differ. Easy to conflate during testing (and presumably during real user interaction). Session 22+ Settings visual pass should add:
- Stronger visual hierarchy (accent colors, grouped sections)
- Clearer labels ("Your PIN" vs "Family access PIN" or equivalent)
- Possibly section divider with small intro text explaining the two-PIN model

**Priority:** Low — UX polish, not a blocker. Indicates the two-PIN feature needs better introduction/education either way.

---

## Session 21 risks — no change this session

R21-1 through R21-12 status unchanged from Session 21 close. See `docs/session-21/RISKS.md` for full context.
