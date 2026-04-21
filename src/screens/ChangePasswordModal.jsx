// ChangePasswordModal — in-Settings password change flow.
//
// Session 21.6 (R21-14). Distinct from MigrationScreen: Migration
// is the one-time legacy→new-password flow gated by
// profile.legacyAuth; this modal is for already-migrated users
// who want to rotate their password anytime from Settings.
//
// Uses supabase.auth.updateUser({ password, currentPassword })
// directly — the currentPassword param was added in supabase-js
// v2.102.0 (we bumped to 2.104+ this session). Supabase verifies
// the current password server-side; if wrong, returns an error
// object that we map to passwordCurrentWrong toast.
//
// Error mapping:
//   - Client-side: min length 6, confirm match
//   - Supabase "Invalid login credentials" or similar → passwordCurrentWrong
//   - Anything else → toastGenericError
//
// Same Sheet + useClickGuard + localError pattern as
// MigrationScreen (Session 11 Sprint C precedent).

import { useState } from "react";
import Sheet from "../components/Sheet";
import { T, S } from "../lib/theme";
import { t } from "../lib/i18n";
import { supabase } from "../lib/supabase";
import { useClickGuard } from "../hooks/useClickGuard";
import { showToast } from "../lib/toast";

export default function ChangePasswordModal({ lang = "lo", onClose }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState("");
  const { busy, run } = useClickGuard();

  // Disable submit on any empty field — UX nudge to fill in everything
  // before error messages fire. Cleaner than showing "Current password
  // incorrect" when nothing was entered yet.
  const allFilled = !!(currentPassword && newPassword && confirmPassword);

  const submit = () =>
    run(async () => {
      setLocalError("");

      // Client-side validation (matches Session 11 register rules).
      // Empty-field case guarded at button level above, but preserve
      // length check here since user could fill with <6 chars.
      if (newPassword.length < 6) {
        setLocalError(t(lang, "passwordTooShort"));
        return;
      }
      if (newPassword !== confirmPassword) {
        setLocalError(t(lang, "passwordsDontMatch"));
        return;
      }
      if (newPassword === currentPassword) {
        setLocalError(t(lang, "passwordSameAsCurrent"));
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
        // currentPassword requires supabase-js >= 2.102.0 (we use 2.104+)
        // Server-side verifies; wrong password returns { error } here.
        currentPassword,
      });

      if (error) {
        // Supabase returns different error messages depending on the
        // failure mode. "Invalid login credentials" is the typical
        // shape for wrong currentPassword. Weak-password / length
        // errors should be caught client-side above, but handle
        // server rejection defensively.
        const msg = (error.message || "").toLowerCase();
        if (/invalid login credentials|incorrect/i.test(msg)) {
          setLocalError(t(lang, "passwordCurrentWrong"));
        } else if (/weak|short|length/i.test(msg)) {
          setLocalError(t(lang, "passwordTooShort"));
        } else {
          console.error("ChangePasswordModal updateUser error:", error);
          showToast(t(lang, "toastGenericError"), "error");
        }
        return;
      }

      // Success — close modal + success toast. Supabase auth state
      // stays valid (same session, new password stored).
      showToast(t(lang, "passwordChanged"), "success");
      onClose();
    });

  const inputStyle = {
    width: "100%",
    padding: "13px 16px",
    borderRadius: 14,
    border: "1.5px solid rgba(45,45,58,0.12)",
    background: "rgba(172,225,175,0.06)",
    fontSize: 15,
    color: T.dark,
    fontFamily: "'Noto Sans', 'Noto Sans Lao', sans-serif",
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle = {
    ...S.label,
    display: "block",
    marginBottom: 8,
    fontFamily: "'Noto Sans', 'Noto Sans Lao', sans-serif",
  };

  return (
    <Sheet
      open={true}
      onClose={onClose}
      title={t(lang, "changePassword")}
      footer={
        <button
          onClick={submit}
          disabled={busy || !allFilled}
          style={{
            width: "100%",
            padding: "15px",
            borderRadius: 18,
            border: "none",
            cursor: (busy || !allFilled) ? "default" : "pointer",
            background: (busy || !allFilled)
              ? "rgba(172,225,175,0.4)"
              : "linear-gradient(145deg,#ACE1AF,#7BC8A4)",
            color: "#1A4020",
            fontWeight: 800,
            fontSize: 16,
            fontFamily: "'Noto Sans', 'Noto Sans Lao', sans-serif",
            boxShadow: (busy || !allFilled) ? "none" : "0 6px 24px rgba(172,225,175,0.5)",
            transition: "all .2s ease",
          }}
        >
          {t(lang, "changePassword")}
        </button>
      }
    >
      <div style={{ paddingBottom: 8 }}>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>{t(lang, "currentPasswordLabel")}</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoFocus
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>{t(lang, "newPasswordLabel")}</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>{t(lang, "confirmNewPasswordLabel")}</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            style={inputStyle}
          />
        </div>

        {localError && (
          <div
            style={{
              fontSize: 13,
              color: "#C0392B",
              marginBottom: 12,
              padding: "10px 14px",
              borderRadius: 12,
              background: "rgba(255,179,167,0.15)",
              fontFamily: "'Noto Sans', 'Noto Sans Lao', sans-serif",
            }}
          >
            {localError}
          </div>
        )}
      </div>
    </Sheet>
  );
}
