// SetNewPin — post-recovery-approval PIN entry screen.
//
// This screen only renders when pinRecoveryPending=true in App.jsx,
// which is only set after /recovery/status confirms
// pin_reset_required AND !expired. Worker gates further —
// pin_reset_required must be true at completion time. Entry path
// "user with no PIN goes through recovery" is nonsensical and
// blocked at both layers (App.jsx recovery-detection gate AND
// worker's /recovery/complete-pin-reset fail-closed gate).
//
// UX model (4 states):
//   "enter"      — user enters first 4-digit PIN
//   "confirm"    — user enters second PIN; must match firstPin
//   "submitting" — network call in flight (disabled UI)
//   "error"      — call returned non-ok; show i18n message + action
//
// Error branching:
//   code "not_approved" (403) → terminal  — admin never approved,
//                                            or approval was revoked.
//                                            Only "back to login" button.
//   code "expired"      (410) → terminal  — 30min window elapsed.
//                                            Only "back to login" button.
//   others (500/timeout/network) → retry  — both "try again" and
//                                           "back to login" offered.
//
// Mismatch on step="confirm" is a soft error: shake dots, reset
// to "enter", no message (matches PinLock's existing UX). We could
// surface setNewPinMismatch as a toast — deferred pending wife-
// review, keeping it subtle.
//
// Added Session 21 Sprint I Commit 3.

import { useState } from "react";
import { T } from "../lib/theme";
import { t } from "../lib/i18n";
import { Logo } from "../components/Logo";
import { completePinReset } from "../lib/recovery";

export function SetNewPin({ lang = "lo", accessToken, onComplete, onCancel }) {
  const [step, setStep] = useState("enter");     // "enter" | "confirm" | "submitting" | "error"
  const [pinInput, setPinInput] = useState("");
  const [firstPin, setFirstPin] = useState("");
  const [shake, setShake] = useState(false);
  const [mismatch, setMismatch] = useState(false); // inline label after a failed confirm
  const [errorKey, setErrorKey] = useState(null);
  const [terminal, setTerminal] = useState(false);

  const keys = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

  const handleKey = (key) => {
    if (step === "submitting" || step === "error") return;
    // Clear the mismatch label as soon as user starts re-typing —
    // they've acknowledged the message by taking action.
    if (mismatch) setMismatch(false);
    if (key === "⌫") { setPinInput(p => p.slice(0, -1)); return; }
    if (pinInput.length >= 4) return;
    const next = pinInput + key;
    setPinInput(next);
    if (next.length < 4) return;
    setTimeout(() => handleFourDigits(next), 80);
  };

  const handleFourDigits = async (pin) => {
    if (step === "enter") {
      setFirstPin(pin);
      setPinInput("");
      setStep("confirm");
      return;
    }
    if (step !== "confirm") return;
    if (pin !== firstPin) {
      // Mismatch — shake + surface inline setNewPinMismatch label
      // (unlike PinLock which stays silent: here the user is
      // *creating* a new PIN so "did I mistype just now, or earlier?"
      // ambiguity needs resolving. Label persists until next key press.)
      setShake(true);
      setMismatch(true);
      setTimeout(() => {
        setShake(false);
        setPinInput("");
        setFirstPin("");
        setStep("enter");
      }, 600);
      return;
    }
    // Match — submit
    setStep("submitting");
    const result = await completePinReset(accessToken, pin);
    if (result.ok) {
      onComplete(pin);
      return; // Component will unmount as parent clears pinRecoveryPending
    }
    // Map worker error code → i18n key + terminal flag
    if (result.code === "not_approved") {
      setErrorKey("setNewPinNotApproved");
      setTerminal(true);
    } else if (result.code === "expired") {
      setErrorKey("setNewPinExpired");
      setTerminal(true);
    } else {
      // db_error, timeout, network, bad_pin (shouldn't happen), http_*
      setErrorKey("setNewPinGenericError");
      setTerminal(false);
    }
    setStep("error");
  };

  const retry = () => {
    setStep("enter");
    setPinInput("");
    setFirstPin("");
    setErrorKey(null);
    setTerminal(false);
  };

  // ─── Error state render ──────────────────────────────────────
  if (step === "error") {
    return (
      <div style={containerStyle}>
        <div style={{ marginBottom: 6 }}><Logo size={100} /></div>
        <div style={brandStyle}>Phajot</div>
        <div style={{ ...subtitleStyle, maxWidth: 320 }}>{t(lang, errorKey)}</div>
        <div style={{ display: "flex", gap: 12, marginTop: 32, flexDirection: "column", width: 240 }}>
          {!terminal && (
            <button onClick={retry} style={primaryButtonStyle}>
              {t(lang, "pinRetry")}
            </button>
          )}
          <button onClick={onCancel} style={terminal ? primaryButtonStyle : secondaryButtonStyle}>
            {t(lang, "pinBackToLogin")}
          </button>
        </div>
      </div>
    );
  }

  // ─── Keypad render (enter | confirm | submitting) ────────────
  const dots = pinInput.length;
  const title = t(lang, "setNewPinTitle");
  const subtitle = step === "confirm"
    ? t(lang, "setNewPinConfirmSub")
    : step === "submitting"
      ? "…"
      : t(lang, "setNewPinSub");
  const disabled = step === "submitting";

  return (
    <div style={containerStyle}>
      <div style={{ marginBottom: 6 }}><Logo size={100} /></div>
      <div style={brandStyle}>Phajot</div>
      <div style={{ ...subtitleStyle, maxWidth: 320 }}>{subtitle}</div>
      <div style={titleStyle}>{title}</div>
      <div style={{ display: "flex", gap: 18, marginBottom: step === "enter" && mismatch ? 12 : 40, animation: shake ? "shake .4s ease" : "none" }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{
            width: 16, height: 16, borderRadius: 8,
            background: i < dots ? T.celadon : "rgba(172,225,175,0.2)",
            transition: "background .12s, transform .12s",
            transform: i < dots ? "scale(1.15)" : "scale(1)",
            boxShadow: i < dots ? "0 0 0 4px rgba(172,225,175,0.2)" : "none",
          }} />
        ))}
      </div>
      {step === "enter" && mismatch && (
        <div style={{
          fontSize: 13,
          color: "#C0392B",
          marginBottom: 20,
          fontFamily: "'Noto Sans','Noto Sans Lao',sans-serif",
          textAlign: "center",
        }}>
          {t(lang, "setNewPinMismatch")}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 76px)", gap: 14, opacity: disabled ? 0.5 : 1 }}>
        {keys.map((k, i) =>
          k === "" ? <div key={i} /> :
          <button
            key={i}
            onClick={() => !disabled && k && handleKey(k)}
            disabled={disabled}
            style={{
              width: 76, height: 76, borderRadius: 22, border: "none",
              fontFamily: "'Noto Sans',sans-serif",
              background: k === "⌫" ? "rgba(172,225,175,0.15)" : T.surface,
              color: k === "⌫" ? T.muted : T.dark,
              fontSize: k === "⌫" ? 20 : 26,
              fontWeight: k === "⌫" ? 400 : 500,
              cursor: disabled ? "default" : "pointer",
              boxShadow: T.shadow,
              display: "flex", alignItems: "center", justifyContent: "center",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {k}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Styles (kept local; PinLock has parallel styles — candidate
//     for future shared primitive extraction, see Session 22 backlog) ──
const containerStyle = {
  position: "fixed", inset: 0, zIndex: 9999, background: T.bg,
  display: "flex", flexDirection: "column", alignItems: "center",
  justifyContent: "center", padding: 28,
};
const brandStyle = {
  fontSize: 22, fontWeight: 800, color: T.dark, letterSpacing: -0.5,
  fontFamily: "'Noto Sans',sans-serif",
};
const subtitleStyle = {
  fontSize: 13, color: T.muted, marginTop: 4, marginBottom: 32,
  textAlign: "center", lineHeight: 1.5, fontFamily: "'Noto Sans',sans-serif",
};
const titleStyle = {
  fontSize: 17, fontWeight: 700, color: T.dark, marginBottom: 24,
  fontFamily: "'Noto Sans',sans-serif",
};
const primaryButtonStyle = {
  width: "100%", padding: "13px", borderRadius: 14, border: "none",
  cursor: "pointer", background: T.celadon, color: T.dark,
  fontWeight: 700, fontSize: 15, fontFamily: "'Noto Sans',sans-serif",
};
const secondaryButtonStyle = {
  width: "100%", padding: "13px", borderRadius: 14, border: "none",
  cursor: "pointer", background: "rgba(172,225,175,0.15)", color: T.muted,
  fontWeight: 600, fontSize: 14, fontFamily: "'Noto Sans',sans-serif",
};
