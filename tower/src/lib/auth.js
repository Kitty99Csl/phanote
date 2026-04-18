// Tower auth helpers.
//
// MIRROR of src/lib/auth.js (buildEmail ONLY) per Rule 16.
// Tower is single-user (Speaker) with a post-Sprint-C account —
// no legacy-password fallback needed. If main app's buildEmail
// ever changes, this file MUST be updated in lockstep. The
// phone-to-email encoding is a byte-identical invariant that
// determines which auth.users record Tower authenticates
// against; drift here would silently authenticate a wrong
// (or nonexistent) user.
//
// Brand note: domain is @phanote.app (legacy). Preserved during
// Phanote→Phajot rename to avoid breaking existing auth records.
// See CLAUDE.md brand-identity rule.

/**
 * Strip non-digits from a phone string.
 * Does NOT strip leading zeros or add them. Byte-identical to main app.
 */
const cleanPhone = (phone) => String(phone || "").replace(/\D/g, "");

/**
 * Build the encoded email used for Supabase auth identity.
 * Byte-identical to main app's buildEmail in src/lib/auth.js.
 *
 * @param {string} countryCode — e.g., "+856" or "856" (the + is stripped)
 * @param {string} phone — raw phone input, any format
 * @returns {string} e.g., "85620559999@phanote.app"
 */
export const buildEmail = (countryCode, phone) => {
  const cleanedCountry = String(countryCode || "").replace("+", "");
  const cleanedPhone = cleanPhone(phone);
  return `${cleanedCountry}${cleanedPhone}@phanote.app`;
};
