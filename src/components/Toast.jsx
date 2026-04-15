// Bottom toast notification with auto-dismiss.
// Extracted from App.jsx in Session 7.
//
// Exports:
//   Toast — legacy dark-background toast used for streak/quick notifications
//     (HomeScreen imperative state). API: { msg, onDone }.
//   ToastContainer — store-driven error/status toast mounted once at App root.
//     Reads from src/lib/toast.js. Shows whatever showToast() publishes.

import { useEffect } from "react";
import { useToast, dismissToast } from "../lib/toast";

export const Toast=({msg,onDone})=>{
  useEffect(()=>{const id=setTimeout(onDone,4500);return()=>clearTimeout(id);},[onDone]);
  return(<div style={{position:"fixed",bottom:90,left:"50%",transform:"translateX(-50%)",background:"rgba(30,30,40,0.93)",backdropFilter:"blur(14px)",color:"#fff",borderRadius:18,padding:"12px 22px",fontSize:13,lineHeight:1.5,maxWidth:320,textAlign:"center",zIndex:999,boxShadow:"0 6px 28px rgba(0,0,0,0.22)",animation:"toastIn .3s cubic-bezier(.34,1.56,.64,1)",fontFamily:"'Noto Sans',sans-serif"}}>{msg}</div>);
};

const PALETTE = {
  error:   { bg: "#FFF4F4", border: "#F5C5C5", text: "#7A2020", icon: "⚠️" },
  success: { bg: "#F0FDF4", border: "#BBF7D0", text: "#166534", icon: "✓"  },
  info:    { bg: "#F7FCF5", border: "#D1F0D5", text: "#2D2D3A", icon: "ℹ"  },
};

function StatusToast({ message, type = "error", onDismiss }) {
  const colors = PALETTE[type] || PALETTE.error;
  return (
    <div
      role="alert"
      onClick={onDismiss}
      style={{
        position: "fixed",
        left: "50%",
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)",
        transform: "translateX(-50%)",
        maxWidth: "calc(100% - 32px)",
        minWidth: 240,
        zIndex: 10001,
        background: colors.bg,
        border: `1.5px solid ${colors.border}`,
        color: colors.text,
        padding: "14px 18px",
        borderRadius: 18,
        fontSize: 14,
        fontFamily: "'Noto Sans','Noto Sans Lao',sans-serif",
        fontWeight: 600,
        lineHeight: 1.4,
        boxShadow: "0 10px 30px rgba(30,30,40,0.18)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 10,
        animation: "phStatusToastIn .28s cubic-bezier(.34,1.2,.64,1)",
      }}
    >
      <style>{`@keyframes phStatusToastIn { from { transform: translate(-50%, 20px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }`}</style>
      <span style={{ fontSize: 16, flexShrink: 0 }}>{colors.icon}</span>
      <span>{message}</span>
    </div>
  );
}

export function ToastContainer() {
  const toast = useToast();
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => dismissToast(), toast.duration || 4000);
    return () => clearTimeout(timer);
  }, [toast?.id]);
  if (!toast) return null;
  return <StatusToast message={toast.message} type={toast.type} onDismiss={dismissToast} />;
}
