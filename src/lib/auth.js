// Phone-based auth helpers for Sprint C password replacement.
//
// Three functions:
//   registerWithPassword(phone, countryCode, password)
//   loginWithPassword(phone, countryCode, password)
//   migrateLegacyAccount(newPassword)
//
// ============================================================================
// NON-NEGOTIABLE INVARIANTS
// ============================================================================
//
// These invariants exist because Kitty + wife accounts were created with the
// derived-password pattern in src/lib/supabase.js. Any divergence breaks
// migration and requires a manual password reset in the Supabase dashboard.
// See docs/tower/AUTH-DESIGN.md §9 (rollback) and §11 (deploy-verify).
//
// 1. Phone normalization MUST match src/lib/supabase.js:11 byte-identical:
//
//      const cleaned = phone.replace(/\D/g, "");
//
//    Do NOT strip leading zeros. Do NOT add them if missing. Do NOT change
//    the regex. If you think the phone should be normalized differently,
//    the correct fix is to write a NEW migration (006+) that renames
//    existing accounts' emails to match the new normalization — NOT to
//    change this helper. Sprint C is not the place to touch phone format.
//
// 2. Legacy derived password MUST match src/lib/supabase.js:14 byte-identical:
//
//      const password = `Ph4n0te${cleaned}X`;
//
//    Note the trailing uppercase `X` — it is a literal character, not a
//    placeholder. The prefix is `Ph4n0te` (with zero, not letter o).
//    The body is the cleaned phone digits ONLY — country code is NOT
//    included in the password, only in the email.
//
// 3. Email construction MUST match src/lib/supabase.js:13 byte-identical:
//
//      const email = `${countryCode.replace("+","")}${cleaned}@phanote.app`;
//
//    Domain is @phanote.app (legacy, preserved per CLAUDE.md rule).
//    Country code has the "+" stripped and is concatenated before the
//    cleaned phone with no separator.
// ============================================================================

import { supabase } from "./supabase";

// Canonical normalization — the ONLY place in Sprint C code where
// phone normalization is implemented. All three helpers below delegate here.
const cleanPhone = (phone) => phone.replace(/\D/g, "");

// Construct the internal email identifier from phone + country code.
// Matches src/lib/supabase.js:13 byte-identical.
const buildEmail = (countryCode, cleaned) =>
  `${countryCode.replace("+", "")}${cleaned}@phanote.app`;

// Construct the legacy derived password for a given cleaned phone.
// Matches src/lib/supabase.js:14 byte-identical. Used ONLY by the
// loginWithPassword fallback path — never constructed anywhere else.
const buildLegacyDerivedPassword = (cleaned) => `Ph4n0te${cleaned}X`;


// ============================================================================
// registerWithPassword — new user signup
// ============================================================================
//
// Creates a new auth.users row via Supabase signUp with a user-chosen
// password. The handle_new_user trigger (001_profiles.sql) auto-creates a
// profiles row with legacy_auth=false (the column default from 005). We then
// explicitly set legacy_auth=false on the profile row as a defensive
// belt-and-braces — if a future migration changes the column default,
// new accounts still land in the correct state.
//
// Returns { user, error }:
//   user: the Supabase User object on success, or null
//   error: { message, code } on failure, or null
//
// Does NOT do phone+country_code upsert — that's handled by App.jsx's
// handleLogin path after this returns, matching the existing flow.
export const registerWithPassword = async (phone, countryCode, password) => {
  const cleaned = cleanPhone(phone);
  const email = buildEmail(countryCode, cleaned);

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { user: null, error };
  if (!data?.user) return { user: null, error: { message: "Signup returned no user" } };

  // Defensive: explicitly set legacy_auth=false on the newly-created profile.
  // The trigger creates the row with the column default, but a future
  // migration could change that default and we don't want new accounts
  // accidentally flagged as legacy.
  const { error: flagError } = await supabase
    .from("profiles")
    .update({ legacy_auth: false })
    .eq("id", data.user.id);

  if (flagError) {
    console.error("registerWithPassword: failed to set legacy_auth=false", flagError);
    // Non-fatal — the column default should still be false. Log and continue.
  }

  return { user: data.user, error: null };
};


// ============================================================================
// loginWithPassword — existing user signin with derived-password fallback
// ============================================================================
//
// The two-attempt flow:
//
//   1. Try the user's typed password via signInWithPassword.
//      If it succeeds, the account is post-Sprint-C (has a real password).
//      Return { user, error: null, fellBackToLegacy: false }.
//
//   2. If the first attempt fails with invalid_credentials, try the legacy
//      derived password (Ph4n0te${cleaned}X) as a silent fallback.
//      If it succeeds, the account is a legacy pre-Sprint-C account that
//      still has the derived password. The user is now authenticated with
//      the derived password, but their typed password is what they want
//      to use going forward — pass it back to the caller so LoginScreen
//      can forward it to MigrationScreen as the pre-fill.
//      Return { user, error: null, fellBackToLegacy: true, typedPassword }.
//
//   3. If both attempts fail, return the original error from attempt 1
//      (which is the one the user actually cares about — the typed password
//      is wrong, not the derived one).
//      Return { user: null, error, fellBackToLegacy: false }.
//
// Why not try the derived password FIRST? Two reasons:
//   (a) Post-Sprint-C accounts outnumber legacy accounts very quickly as
//       new users register. Making the derived-password attempt the default
//       would mean every login has an extra round trip.
//   (b) Trying the user's typed password first means a successful login
//       takes exactly one Supabase call — the fast-path.
export const loginWithPassword = async (phone, countryCode, password) => {
  const cleaned = cleanPhone(phone);
  const email = buildEmail(countryCode, cleaned);

  // Attempt 1: user's typed password
  const first = await supabase.auth.signInWithPassword({ email, password });
  if (first.data?.user) {
    return { user: first.data.user, error: null, fellBackToLegacy: false };
  }

  // Attempt 2: derived legacy password as silent fallback
  const derivedPassword = buildLegacyDerivedPassword(cleaned);
  const second = await supabase.auth.signInWithPassword({
    email,
    password: derivedPassword,
  });
  if (second.data?.user) {
    return {
      user: second.data.user,
      error: null,
      fellBackToLegacy: true,
      typedPassword: password,
    };
  }

  // Both failed. Return the FIRST error (the one about the typed password)
  // because that's what the user will understand. The second error is
  // always "invalid credentials" which is the same shape but less helpful.
  return {
    user: null,
    error: first.error || { message: "Login failed" },
    fellBackToLegacy: false,
  };
};


// ============================================================================
// migrateLegacyAccount — set a new password for a legacy account
// ============================================================================
//
// Called from MigrationScreen's Continue button after the user has been
// authenticated via the loginWithPassword derived-password fallback path.
// At this point:
//   - supabase.auth has a live session
//   - The profile row still has legacy_auth=true
//   - The auth.users row still has the old derived password
//
// Two updates:
//   1. supabase.auth.updateUser({ password: newPassword }) — replaces the
//      hashed password in auth.users. After this, the derived pattern no
//      longer works for this account.
//   2. UPDATE profiles SET legacy_auth=false — flips the flag so the next
//      profile load routes the user to HomeScreen instead of MigrationScreen.
//
// If step 1 succeeds but step 2 fails, the user is in a partially-migrated
// state: their password is the new one, but the profile still says legacy.
// On their next login, the profile fetch will re-route them to
// MigrationScreen, and step 1 will attempt to set their already-set-new
// password again (harmless — Supabase accepts it). They'll enter the
// password field again, it'll work on the first try (no derived fallback
// needed), and step 2 will retry. This is the intended recovery path.
export const migrateLegacyAccount = async (newPassword) => {
  // Step 1: update Supabase auth password
  const { data: userData, error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (updateError) return { error: updateError };
  if (!userData?.user) return { error: { message: "updateUser returned no user" } };

  // Step 2: clear the legacy_auth flag on the profile row
  const { error: flagError } = await supabase
    .from("profiles")
    .update({ legacy_auth: false })
    .eq("id", userData.user.id);

  if (flagError) {
    console.error("migrateLegacyAccount: password updated but flag clear failed", flagError);
    return { error: flagError };
  }

  return { error: null };
};
