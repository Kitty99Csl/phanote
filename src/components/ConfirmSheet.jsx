// Shared confirm / alert / upgrade dialog built on top of Sheet.
// Replaces native window.confirm() and alert() across the app.
//
// Props:
//   open         — boolean, controls visibility
//   onClose      — () => void, called on cancel, backdrop click, or after confirm
//   onConfirm    — optional () => void. Omit for alert-style (one-button).
//   title        — string, required
//   message      — string, optional body text under the title
//   confirmLabel — string, defaults to "OK"
//   cancelLabel  — string, defaults to "Cancel"
//   destructive  — boolean, renders the confirm button in red (for deletes)
//   variant      — "confirm" | "alert" | "upgrade"
//
// Behavior:
//   - "confirm" → Cancel (grey) + Confirm (celadon or red if destructive)
//   - "alert"   → single full-width button, calls onClose
//   - "upgrade" → Cancel + Confirm with sparkle ✨ suffix, celadon styling

import Sheet from "./Sheet";
import { T } from "../lib/theme";

export function ConfirmSheet({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "OK",
  cancelLabel = "Cancel",
  destructive = false,
  variant = "confirm",
}) {
  if (!open) return null;

  const isAlert = variant === "alert" || !onConfirm;
  const isUpgrade = variant === "upgrade";

  const confirmBg = destructive
    ? "linear-gradient(145deg, #E74C3C, #C0392B)"
    : "linear-gradient(145deg, #ACE1AF, #7BC8A4)";
  const confirmFg = destructive ? "#FFFFFF" : "#1A4020";
  const confirmShadow = destructive
    ? "0 4px 16px rgba(192,57,43,0.30)"
    : "0 4px 16px rgba(172,225,175,0.40)";
  const confirmText = isUpgrade ? `${confirmLabel} ✨` : confirmLabel;

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    onClose();
  };

  const cancelBtn = (
    <button onClick={onClose} style={{
      flex: 1, padding: "14px", borderRadius: 16, border: "none",
      cursor: "pointer", background: "rgba(45,45,58,0.06)", color: T.muted,
      fontWeight: 700, fontSize: 14, fontFamily: "'Noto Sans','Noto Sans Lao',sans-serif",
    }}>{cancelLabel}</button>
  );

  const confirmBtn = (
    <button onClick={isAlert ? onClose : handleConfirm} style={{
      flex: isAlert ? 1 : 2, padding: "14px", borderRadius: 16, border: "none",
      cursor: "pointer", background: confirmBg, color: confirmFg,
      fontWeight: 800, fontSize: 15, fontFamily: "'Noto Sans','Noto Sans Lao',sans-serif",
      boxShadow: confirmShadow,
    }}>{confirmText}</button>
  );

  return (
    <Sheet open={open} onClose={onClose} showCloseButton={false} footer={
      <div style={{ display: "flex", gap: 10 }}>
        {!isAlert && cancelBtn}
        {confirmBtn}
      </div>
    }>
      <div style={{ paddingTop: 28, paddingBottom: 12 }}>
        <div style={{
          fontWeight: 800, fontSize: 18, color: T.dark,
          fontFamily: "'Noto Sans','Noto Sans Lao',sans-serif",
          marginBottom: message ? 12 : 0,
        }}>{title}</div>
        {message && (
          <div style={{
            fontSize: 14, color: T.muted, lineHeight: 1.55,
            fontFamily: "'Noto Sans','Noto Sans Lao',sans-serif",
          }}>{message}</div>
        )}
      </div>
    </Sheet>
  );
}
