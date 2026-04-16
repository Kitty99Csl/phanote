# 🔐 TOWER — AUTH DESIGN

> **Status:** Supporting reference (Sprint C auth plan, now implemented)

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
| v1.1 | 2026-04-15 | Added §11 Deploy & Verify Protocol and §12 Wife Migration Protocol. Formalizes the "throwaway account first, Speaker second, family opportunistic" deploy sequence and wife's in-person migration support plan. |

---

## 11. DEPLOY & VERIFY PROTOCOL

Auth is the highest-risk commit in the project so far. These 5 steps must run **in order** after Sprint C's user-visible commit (commit 6: LoginScreen rewrite + App.jsx wiring) is pushed to `main`. Do not skip ahead. Each step is a gate — the next step only begins if the current one passes cleanly.

### Step 1 — Throwaway account registration on production

Speaker opens `https://app.phajot.com/` on a clean browser (incognito, or a device never used for Phajot) and registers a **throwaway test account** with a phone number that has never been used for a real Phajot account. Examples of safe throwaway numbers:

- `+856 9000 0000 01` (structured Lao test number)
- A secondary SIM or work phone
- The User B RLS test identity (`5e3629a1-aa60-4c25-a013-11bf40b8e6b9`) if and only if it's not already tied to a real account in Supabase — check first

Registration flow:
1. Tap "Create account" tab
2. Enter the throwaway phone + country code
3. Set a password (simple — e.g., `test123`). Confirm it.
4. Flow into onboarding wizard (name, language, currency, categories)
5. Land on HomeScreen

**Gate:** if anything in steps 1-5 fails, **revert commit 6 immediately** via `git revert` and post-mortem in `docs/session-11/ROLLBACK.md`. Do not touch any real account until the throwaway registration is proven working in production.

### Step 2 — Verify Supabase state for the throwaway account

In the Supabase SQL Editor, run:

```sql
SELECT id, email, created_at, legacy_auth
FROM profiles WHERE id = (SELECT id FROM auth.users WHERE email LIKE '856900000001%');
```

Expected: exactly 1 row with `legacy_auth = false`. If the flag is `true`, the `UPDATE profiles SET legacy_auth = true WHERE created_at < NOW()` from commit 2 fired too liberally — stop and investigate before proceeding.

### Step 3 — Second-device login with the throwaway account

Open production on a **second browser or device** that has never seen this account (different incognito window, different device, whatever is cleanly separate from step 1's session). Sign in with the throwaway phone + password from step 1. Must land on HomeScreen directly with no migration screen and no re-onboarding.

**Gate:** this proves auth works across devices, not just from cached localStorage in the session from step 1. If this fails, commit 6 has a session-handling bug — revert and investigate.

### Step 4 — Walk through Speaker's own account migration

After steps 1-3 pass, Speaker (Kitty) signs into her real account on a device where she's currently logged out. Expected flow:

1. Enter phone + a new password of her choice
2. First Supabase auth fails (she doesn't know the derived password)
3. Frontend falls back to the derived password, succeeds silently
4. Profile loads with `legacy_auth = true`
5. MigrationScreen renders: "Welcome back, Kitty! 🐾 We've upgraded how passwords work. Please set a new password."
6. New password field is pre-filled with what she just typed in LoginScreen; she either keeps it or picks a different one
7. Confirm password field (empty, must be filled separately to defend against fat-finger)
8. Tap Continue
9. `updateUser({ password: newPassword })` + `UPDATE profiles SET legacy_auth = false` both succeed
10. Land on HomeScreen

**Gate:** Speaker completes this flow successfully AND verifies in Supabase dashboard that her `profiles.legacy_auth = false` AND her `auth.users.encrypted_password` has been updated (visible as a different hash from before the commit). Only then is the path proven.

**Critical:** once step 4 completes, rollback becomes more expensive. Speaker's `auth.users.encrypted_password` has been replaced. Reverting commit 6 would leave Speaker stuck — the old derived-password login pattern no longer matches her new password. The only fix would be a manual password reset in Supabase dashboard (service role required). Document this explicitly so future sessions don't treat the rollback plan as "always cheap."

### Step 5 — Family migration (opportunistic)

After step 4 passes, the remaining real accounts (wife + any other family members — brother, sister-in-law, etc.) will see the MigrationScreen naturally on their next login. Speaker does NOT need to schedule a mass migration or send a "please log in today" message. The migration is opportunistic:

- **Wife:** in-person walkthrough per §12 below. This is the only family member with an explicit handling plan because she's the first-time-password-field user.
- **Other family members:** handle as their logins come in. Speaker is on standby to help via phone/LINE if anyone hits confusion. If any account's migration fails irrecoverably, Speaker resets the password in Supabase dashboard rather than asking a non-technical family member to debug.

**Sprint C's testing checklist** (§5 above) is complete when steps 1-4 pass. Step 5 is operational, not verification — it ships whenever family members happen to log in.

---

## 12. WIFE MIGRATION PROTOCOL

Wife's first login after Sprint C deploys will be the **first time she has ever typed a password into Phajot**. Phajot has never asked her for a password before — the current auth uses a derived pattern she never sees. This is the highest-friction moment in the deploy, and the only real user whose migration has an explicit support plan.

### Pre-deploy briefing (in person)

Before Speaker pushes commit 6 to production, Speaker briefs wife in person with this message:

> "Tomorrow when you open Phajot, it'll ask you to set a new password. This is a one-time thing for security. Pick something easy to remember — even 4 numbers is fine. You only need to set it once."

Tone matters here. Keep it short. Frame it as "we're making the app safer" not "there's been a problem" or "this is a security upgrade." Wife doesn't need to know about audit findings or P0 rankings. She needs to know:

1. Something will look different tomorrow
2. The different thing is setting a password, one time
3. Any short password is fine

### Day-of support (in person)

Speaker should be **physically present** when wife opens Phajot the next morning. Not over the phone, not via LINE — in the same room. Reasons:

- Wife's first-time-password-field interaction will generate at least one question, and the fastest answer is a pointing finger on the screen
- If wife makes a typo on the confirm field, Speaker can catch it immediately
- If the app behaves unexpectedly (screen flicker, unexpected toast, slow load), Speaker can calmly explain "that's normal, try again" instead of wife closing the app and assuming it's broken
- The entire interaction takes 45 seconds if it works smoothly, 3-4 minutes if wife has questions — either way, in-person is fastest

If Speaker cannot be physically present on the expected day, delay the deploy. Sprint C is not blocked by a particular calendar date; it's blocked only by audit P0 pressure, which is already months old and not meaningfully worse for another day.

### Fallback if wife's migration fails

If wife's first migration attempt fails for ANY reason — network hiccup, typo, app bug, supabase latency, anything — **Speaker resets her account manually in Supabase dashboard** instead of asking wife to debug. The manual reset flow:

1. Speaker opens Supabase dashboard → Authentication → Users
2. Finds wife's row
3. Uses the "Send magic link" or direct password update (service role required, Speaker has it)
4. Speaker tells wife her new password is `{whatever Speaker chose}`
5. Wife logs in manually with that password
6. On next login, she's in `legacy_auth = false` state (Speaker flipped it via SQL)

The reason this fallback exists: wife's frustration threshold for debugging a broken flow is about 30 seconds. Beyond that she will assume Phajot is broken, close the app, and not reopen it for a day. Manual reset from the Speaker side is strictly faster than even one round trip of "what did you just tap? where does it say that?" over the kitchen table.

### Why no protocol for other family members

Brother, sister-in-law, and any other real users that exist get the standard Sprint C migration UX without a special protocol. Reasons:

- They have a mental model of "apps sometimes change how login works"
- They will read the MigrationScreen text and follow it
- If they get stuck, they LINE Speaker, and Speaker walks them through it remotely — which is an acceptable recovery path for users with a mental model of passwords
- Wife is specifically the one whose frustration threshold is measured in seconds, because she has neither the mental model of passwords nor a high tolerance for "something's different today"

This is not a judgment of wife — it's a judgment of **context-fit**. Wife is Phajot's most important user (product-market-fit validation happened on her couch) and also the user with the least tolerance for friction. The protocol treats those two facts as non-negotiable and designs around them.

---

*"Login should not be hard complex. Just phone and password. Register is where verification lives."* — Kitty, April 14, 2026
