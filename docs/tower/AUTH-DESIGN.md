# 🔐 TOWER — AUTH DESIGN

### Sprint C Authentication Plan · Version 1.0

> This document specifies the replacement for Phajot's current pseudo-phone-auth pattern. It is the canonical plan for Sprint C (Session 11). Changes to this plan must be recorded in the changelog at the bottom.

---

## 1. THE PROBLEM WE'RE SOLVING

**Current state (as of April 14, 2026):**
- Registration and login both use a deterministic pattern: `{phone}@phanote.app` as email and `Ph4n0te{phone}` as password
- Anyone who knows a user's phone number can log in as them
- The Phanote QA & Product Audit flagged this as **P0** — the highest-severity finding

**Why it hasn't been fixed yet:**
- Two real accounts exist using this pattern (Kitty + wife) and migration must not break them
- Real OTP via Twilio costs real money and adds signup friction
- Family testing didn't need a stronger pattern

**Why it must be fixed in Sprint C:**
- Audit P0 has been open for multiple sessions
- Tower's admin panel (Room 5) will eventually expose user search, which increases the blast radius of any auth compromise
- Public launch (Sprint K+) requires a real auth story — it's cheaper to fix now than to retrofit during launch

---

## 2. DESIGN PRINCIPLES

These are the rules the design must follow. Any alternative proposed must satisfy all of them.

1. **Login must be fast.** Phone + password, no OTP, no extra steps. Daily use must feel as frictionless as today.
2. **Registration is the gate.** If verification is needed, it happens exactly once, at signup.
3. **Existing accounts must not break.** Kitty and wife must be able to log in the next morning after the deploy.
4. **Zero external costs in v1.** No Twilio, no SMS gateway, no paid services.
5. **The design must scale to public launch.** Sprint K can add OTP as an additive layer, not a rewrite.
6. **All text must be multilingual.** Login/register copy exists in lo/th/en.

---

## 3. THE DESIGN

### 3.1 Registration Flow (New Users)

```
┌─────────────────────────────────────┐
│ 1. Enter phone number               │
│    [ +856 __ ___ ____ ]             │
│    Country code defaults to Laos    │
│    [ Continue ]                     │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 2. Set a password                   │
│    [ ______________ ]               │
│    [ ______________ ] (confirm)     │
│    Hint: at least 6 characters      │
│    [ Create account ]               │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 3. Onboarding wizard                │
│    (existing flow — unchanged)      │
│    Language → Currency → Categories │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 4. Home screen                      │
│    Welcome! 🐾                      │
└─────────────────────────────────────┘
```

**No OTP in v1.** No SMS verification. No email. Just phone + chosen password.

This is an acceptable risk for the current threat model:
- Family testing: you know all users personally
- No public launch until Sprint K
- When strangers can register in Sprint K, LINE OTP is added as an additive layer without changing this flow

### 3.2 Login Flow (Returning Users)

```
┌─────────────────────────────────────┐
│ 1. Enter phone number               │
│    [ +856 __ ___ ____ ]             │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 2. Enter password                   │
│    [ ______________ ]               │
│    [ Forgot password? ]             │
│    [ Log in ]                       │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 3. Home screen                      │
└─────────────────────────────────────┘
```

**Two steps, no more.** No OTP. No email. No passwordless magic link. Fast daily use.

### 3.3 Migration Flow (Existing Accounts — Kitty + Wife)

The two existing accounts were created with the derived-password pattern. They must migrate to user-set passwords without being locked out.

```
First login attempt after Sprint C deploy:
              ↓
┌─────────────────────────────────────┐
│ 1. Enter phone number               │
└─────────────────────────────────────┘
              ↓
System detects this account was created with
the legacy derived-password pattern.
              ↓
┌─────────────────────────────────────┐
│ 2. "Welcome back, Kitty! 🐾         │
│    We've upgraded how passwords     │
│    work. Please set a new one."     │
│                                     │
│    [ New password: ______ ]         │
│    [ Confirm:      ______ ]         │
│    [ Continue ]                     │
└─────────────────────────────────────┘
              ↓
Password updated in Supabase auth.users
legacy flag cleared from profile.
              ↓
┌─────────────────────────────────────┐
│ 3. Home screen (normal)             │
└─────────────────────────────────────┘
```

**How we detect legacy accounts:**
- Add a boolean column `profiles.legacy_auth` that defaults to `true` for existing accounts and `false` for newly-created ones
- Migration SQL: `UPDATE profiles SET legacy_auth = true WHERE created_at < '2026-04-28'` (or whatever date Sprint C deploys)
- On login, if `legacy_auth = true` AND the user submitted the derived password successfully, show the migration screen
- After the user sets a new password, flip the flag to `false`

### 3.4 Password Rules (v1)

- Minimum 6 characters
- No maximum enforced (let Supabase handle)
- No complexity rules (no forced uppercase/numbers/symbols — those are user-hostile and don't meaningfully improve security for this threat model)
- Passwords are hashed by Supabase using bcrypt (this is automatic)

**Why 6 characters and no complexity rules:**
- Multilingual user base — forcing uppercase/symbols hurts Lao/Thai users
- Family accounts — wife is more likely to use a 6-digit number she can remember
- PIN security (separate feature) already guards the device at the app level

### 3.5 Forgot Password (v1)

**v1: Manual reset by Speaker.**
- "Forgot password?" link shows a message: *"Please contact Kitty for help. At this stage, Phajot is family-only."*
- Speaker manually resets in Supabase dashboard using service role
- Not ideal but acceptable for family testing

**v2 (Sprint K): Automated reset.**
- For users with LINE linked: send reset token via LINE Notify
- For users with email linked: send reset token via Supabase magic link
- Users without either: manual reset

---

## 4. IMPLEMENTATION PLAN

### 4.1 Database Changes

```sql
-- Add legacy auth flag to profiles
ALTER TABLE profiles ADD COLUMN legacy_auth boolean DEFAULT false;

-- Mark existing accounts as legacy
UPDATE profiles SET legacy_auth = true WHERE created_at < NOW();

-- (After Sprint C deploys successfully)
-- No further DB changes needed. Supabase handles password hashing.
```

This is 2 SQL statements. Safe. Reversible.

### 4.2 Frontend Changes (Estimated ~150 lines)

| File | Change |
|---|---|
| `src/screens/LoginScreen.jsx` | Replace derived-password logic with user password prompt. Detect legacy accounts. Show migration screen if needed. |
| `src/screens/RegisterScreen.jsx` (new, or add to LoginScreen) | Two-step register: phone → password → onboarding handoff |
| `src/lib/auth.js` | New helper: `registerWithPassword(phone, password)`, `loginWithPassword(phone, password)`, `migrateLegacyAccount(phone, oldDerived, newPassword)` |
| `src/lib/i18n.js` | Add keys: `loginPhone`, `loginPassword`, `loginForgot`, `registerTitle`, `registerPasswordHint`, `migrationTitle`, `migrationMessage`, `passwordTooShort`, `passwordMismatch` |

### 4.3 What Stays the Same

- The `{phone}@phanote.app` email pattern stays (it's an internal identifier, never shown to users)
- The password prefix `Ph4n0te` is retired for new accounts but still works for legacy accounts during migration
- `localStorage phanote-*` keys are untouched
- All RLS policies untouched
- Phone number is still the primary identifier

---

## 5. TESTING CHECKLIST

Before Sprint C can be declared done:

- [ ] New user can register with phone + password
- [ ] New user's password is at least 6 characters (validation works)
- [ ] New user flows into existing onboarding wizard
- [ ] New user can log out and log back in with their password
- [ ] Kitty's existing account shows the migration screen on first login
- [ ] Kitty can set a new password and log in normally afterward
- [ ] Wife's existing account shows the migration screen on first login
- [ ] Wife can set a new password and log in normally afterward (walkthrough in-person)
- [ ] Wrong password shows a friendly error, not a raw Supabase error
- [ ] Unknown phone number shows a friendly error, not "user not found"
- [ ] All login/register/migration text works in Lao, Thai, and English
- [ ] The "Forgot password?" link shows the contact message in all 3 languages

---

## 6. WHAT HAPPENS IN SPRINT K (Pre-Launch)

This design is specifically built so Sprint K can add OTP as a layer without rewriting anything.

**Sprint K additions:**

1. **LINE OTP at registration** — after step 2 (password set), if the user opts in, send a 6-digit code via LINE Notify. User enters code, account is LINE-linked.
2. **Email OTP fallback** — if user doesn't have LINE, offer email. Supabase magic link handles it for free.
3. **Manual approval mode** — during the first week of public launch, auto-approval can be disabled and the Speaker approves new accounts manually.

None of this requires changing the Sprint C design. It's all additive.

---

## 7. THREAT MODEL

What this design protects against and what it doesn't.

### ✅ Protects against
- Someone guessing the derived password pattern from knowing a phone number
- Someone brute-forcing a random user's account (user-set passwords aren't predictable)
- Accidental account compromise from Kitty or wife sharing their phone number
- Basic credential stuffing (no email address is exposed, so credentials from other breaches don't match)

### ⚠️ Does not protect against (acceptable for v1)
- A determined attacker who has physical access to someone's phone and can see their password
- SIM swap attacks (defer: Sprint K adds LINE OTP which mitigates this)
- Password reuse across sites (user education issue)
- An insider (Kitty) with database access — this is inherent to any app

### 🚫 Out of scope for this document
- RLS policy audit (completed Session 9)
- Rate limiting on login attempts (worker-level concern, handled separately)
- MFA (deferred to Phase 5)

---

## 8. DEPENDENCIES

Sprint C cannot start until Sprint B completes. Specifically:
- Error toast system from Sprint B Priority C must be live (new auth errors need a place to surface)
- `alert()` replacement from Sprint B must be at least partially done (new auth uses only in-app modals)

---

## 9. ROLLBACK PLAN

If Sprint C causes login problems in production:

1. Revert the frontend commits
2. The `legacy_auth` column stays but is ignored by the reverted code
3. Both accounts can log in with the derived pattern again
4. Schedule a post-mortem in `docs/session-11/ROLLBACK.md`
5. Retry in Sprint C.2 with lessons applied

The rollback takes less than 10 minutes because no destructive schema changes are involved.

---

## 10. CHANGELOG

| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-04-14 | Initial design. Decision locked: user-set password at registration, no OTP in v1, LINE OTP added in Sprint K. |

---

*"Login should not be hard complex. Just phone and password. Register is where verification lives."* — Kitty, April 14, 2026
