// src/screens/MigrationScreen.jsx
//
// Sprint C commit 5 — legacy password migration screen.
//
// Shown to users whose profile has legacy_auth=true after they sign in via
// the loginWithPassword derived-password fallback path. Collects a new
// password (pre-filled with whatever they just typed on LoginScreen) and
// calls migrateLegacyAccount() to flip them to a real password + clear
// the legacy_auth flag.
//
// Standalone in this commit — commit 6 wires it into App.jsx.

import { useState } from "react";
import Sheet from "../components/Sheet";
import { T, S } from "../lib/theme";
import { t } from "../lib/i18n";
import { migrateLegacyAccount } from "../lib/auth";
import { useClickGuard } from "../hooks/useClickGuard";
import { showToast } from "../lib/toast";

export default function MigrationScreen({
  profile,
  lang,
  prefillPassword,
  onMigrated,
  onClose,
}) {
  const [newPassword, setNewPassword] = useState(prefillPassword || "");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState("");
  const { busy, run } = useClickGuard();

  const displayName = profile?.name || "";

  const submit = () =>
    run(async () => {
      setLocalError("");

      if (!newPassword || newPassword.length < 6) {
        setLocalError(t(lang, "passwordTooShort"));
        return;
      }
      if (newPassword !== confirmPassword) {
        setLocalError(t(lang, "passwordMismatch"));
        return;
      }

      const { error } = await migrateLegacyAccount(newPassword);
      if (error) {
        showToast(t(lang, "toastGenericError"), "error");
        return;
      }

      onMigrated();
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
      title={t(lang, "migrationTitle")}
      footer={
        <button
          onClick={submit}
          disabled={busy}
          style={{
            width: "100%",
            padding: "15px",
            borderRadius: 18,
            border: "none",
            cursor: busy ? "default" : "pointer",
            background: busy
              ? "rgba(172,225,175,0.4)"
              : "linear-gradient(145deg,#ACE1AF,#7BC8A4)",
            color: "#1A4020",
            fontWeight: 800,
            fontSize: 16,
            fontFamily: "'Noto Sans', 'Noto Sans Lao', sans-serif",
            boxShadow: busy ? "none" : "0 6px 24px rgba(172,225,175,0.5)",
            transition: "all .2s ease",
          }}
        >
          {t(lang, "migrationContinue")}
        </button>
      }
    >
      <div style={{ paddingBottom: 8 }}>
        {displayName && (
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: T.dark,
              marginBottom: 6,
              fontFamily: "'Noto Sans', 'Noto Sans Lao', sans-serif",
            }}
          >
            {displayName} 🐾
          </div>
        )}

        <div
          style={{
            fontSize: 13,
            color: T.muted,
            marginBottom: 20,
            lineHeight: 1.6,
            fontFamily: "'Noto Sans', 'Noto Sans Lao', sans-serif",
          }}
        >
          {t(lang, "migrationMessage")}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>{t(lang, "migrationNewPassword")}</label>
          <div
            style={{
              fontSize: 12,
              color: T.muted,
              marginBottom: 8,
              lineHeight: 1.5,
              fontFamily: "'Noto Sans', 'Noto Sans Lao', sans-serif",
            }}
          >
            {t(lang, "migrationPrefilledHint")}
          </div>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoFocus
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>
            {t(lang, "migrationConfirmPassword")}
          </label>
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
