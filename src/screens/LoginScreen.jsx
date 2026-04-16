// Login screen — phone + password auth entry point.
//
// Sprint C commit 6: replaces the legacy phone-only signInWithPhone flow
// with a two-mode login/register screen that drives src/lib/auth.js.
//
// Modes:
//   - "login":    [phone][password]         → loginWithPassword()
//                 On fellBackToLegacy=true, forwards the typedPassword up
//                 to App.jsx so MigrationScreen can pre-fill it.
//   - "register": [phone][password][confirm] → registerWithPassword()
//
// First-impression screen with Lao-first positioning
// (slogan rendered in Lao via hardcoded lang = "lo").

import { useState } from "react";
import { T } from "../lib/theme";
import { t } from "../lib/i18n";
import { loginWithPassword, registerWithPassword } from "../lib/auth";
import { useKeyboardOffset } from "../hooks/useKeyboardOffset";
import { AnimalBg } from "../components/AnimalBg";
import { Logo } from "../components/Logo";

export function LoginScreen({ onLogin }) {
  // Public-facing screen — default to Lao per OQ-012 Lao-first positioning
  const lang = "lo";
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("+856");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const kbOffset = useKeyboardOffset();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [forgotOpen, setForgotOpen] = useState(false);

  const CODES = [
    { flag:"🇱🇦", code:"+856", name:"Laos" },{ flag:"🇹🇭", code:"+66", name:"Thailand" },
    { flag:"🇺🇸", code:"+1", name:"USA" },{ flag:"🇬🇧", code:"+44", name:"UK" },
    { flag:"🇸🇬", code:"+65", name:"Singapore" },{ flag:"🇨🇳", code:"+86", name:"China" },
    { flag:"🇯🇵", code:"+81", name:"Japan" },{ flag:"🇰🇷", code:"+82", name:"Korea" },
    { flag:"🇻🇳", code:"+84", name:"Vietnam" },{ flag:"🇰🇭", code:"+855", name:"Cambodia" },
    { flag:"🇲🇲", code:"+95", name:"Myanmar" },{ flag:"🇦🇺", code:"+61", name:"Australia" },
  ];

  const switchMode = (next) => {
    setMode(next);
    setError("");
    setConfirmPassword("");
  };

  const submit = async () => {
    setError("");

    if (!phone.trim() || phone.trim().length < 6) {
      setError(t(lang, "authInvalidPhone"));
      return;
    }
    if (!password || password.length < 6) {
      setError(t(lang, "passwordTooShort"));
      return;
    }
    if (mode === "register" && password !== confirmPassword) {
      setError(t(lang, "passwordMismatch"));
      return;
    }

    setLoading(true);
    try {
      if (mode === "login") {
        const result = await loginWithPassword(phone.trim(), code, password);
        if (result.error || !result.user) {
          setError(t(lang, "authWrongPassword"));
          setLoading(false);
          return;
        }
        // fellBackToLegacy=true means the user's typed password didn't match
        // but the derived legacy password did — App.jsx will route them to
        // MigrationScreen with the typed password pre-filled.
        onLogin(
          result.user,
          false,
          phone.trim(),
          code,
          {
            fellBackToLegacy: result.fellBackToLegacy === true,
            typedPassword: result.fellBackToLegacy ? result.typedPassword : "",
          }
        );
      } else {
        const result = await registerWithPassword(phone.trim(), code, password);
        if (result.error || !result.user) {
          const msg = result.error?.message || "";
          // Supabase returns "User already registered" for duplicate email —
          // that means this phone already has an account, nudge to Sign in.
          if (/already registered|already exists/i.test(msg)) {
            setError(t(lang, "authUnknownPhone"));
          } else {
            setError(t(lang, "toastGenericError"));
          }
          setLoading(false);
          return;
        }
        onLogin(
          result.user,
          true,
          phone.trim(),
          code,
          { fellBackToLegacy: false, typedPassword: "" }
        );
      }
    } catch (e) {
      setError(
        e.message?.includes("422")
          ? t(lang, "authPhoneFormatError")
          : t(lang, "authGenericError")
      );
      setLoading(false);
    }
  };

  const inputBaseStyle = {
    padding: "13px 16px",
    borderRadius: 14,
    border: "1.5px solid rgba(45,45,58,0.12)",
    background: "rgba(172,225,175,0.06)",
    fontSize: 15,
    color: T.dark,
    fontFamily: "'Noto Sans', 'Noto Sans Lao', sans-serif",
    outline: "none",
    transition: "border-color .2s ease",
    boxSizing: "border-box",
  };

  return (
    <div style={{ minHeight:"100dvh", background:T.bg, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", padding:"24px 20px", position:"relative", overflow:"hidden" }}>
      <AnimalBg />
      <div style={{ textAlign:"center", marginBottom:28, zIndex:1, display:"flex", flexDirection:"column", alignItems:"center" }}>
        <Logo size={160} />
        <div style={{ fontFamily:"'Noto Sans','Noto Sans Lao',sans-serif", fontSize:28, fontWeight:800, color:T.dark, letterSpacing:-1, marginTop:8 }}>Phajot · ພາຈົດ</div>
        <div style={{ fontSize:13, color:T.muted, marginTop:6, textAlign:"center", maxWidth:320, lineHeight:1.5, fontFamily:"'Noto Sans','Noto Sans Lao',sans-serif", fontWeight:400 }}>{t(lang,"slogan")}</div>
      </div>

      <div style={{ background:T.surface, backdropFilter:"blur(20px)", borderRadius:28,
        padding:"24px 22px", width:"100%", maxWidth:380, boxShadow:T.shadowLg, zIndex:1,
        transform:kbOffset>0?`translateY(-${Math.min(kbOffset*0.6,180)}px)`:undefined,
        transition:"transform .3s ease" }}>

        {/* ── Mode toggle ── */}
        <div style={{ display:"flex", gap:6, padding:4, borderRadius:14, background:"rgba(172,225,175,0.10)", marginBottom:18 }}>
          <button
            type="button"
            onClick={()=>switchMode("login")}
            style={{
              flex:1, padding:"10px", borderRadius:10, border:"none", cursor:"pointer",
              background: mode==="login" ? "#fff" : "transparent",
              color: mode==="login" ? T.dark : T.muted,
              fontWeight: mode==="login" ? 800 : 600,
              fontSize:13, fontFamily:"'Noto Sans','Noto Sans Lao',sans-serif",
              boxShadow: mode==="login" ? "0 2px 8px rgba(45,45,58,0.08)" : "none",
              transition:"all .2s ease",
            }}
          >
            {t(lang,"authModeSignIn")}
          </button>
          <button
            type="button"
            onClick={()=>switchMode("register")}
            style={{
              flex:1, padding:"10px", borderRadius:10, border:"none", cursor:"pointer",
              background: mode==="register" ? "#fff" : "transparent",
              color: mode==="register" ? T.dark : T.muted,
              fontWeight: mode==="register" ? 800 : 600,
              fontSize:13, fontFamily:"'Noto Sans','Noto Sans Lao',sans-serif",
              boxShadow: mode==="register" ? "0 2px 8px rgba(45,45,58,0.08)" : "none",
              transition:"all .2s ease",
            }}
          >
            {t(lang,"authModeCreate")}
          </button>
        </div>

        {/* ── Phone ── */}
        <div style={{ display:"flex", gap:8, marginBottom:12 }}>
          <select
            value={code}
            onChange={e=>setCode(e.target.value)}
            style={{ ...inputBaseStyle, padding:"13px 10px", fontSize:14, cursor:"pointer", flexShrink:0 }}
          >
            {CODES.map(c=><option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
          </select>
          <input
            value={phone}
            onChange={e=>setPhone(e.target.value.replace(/\D/g,""))}
            placeholder="20 123 4567"
            type="tel"
            autoFocus
            style={{ ...inputBaseStyle, flex:1, borderColor: phone.length>5 ? "#ACE1AF" : "rgba(45,45,58,0.12)" }}
          />
        </div>

        {/* ── Password ── */}
        <input
          value={password}
          onChange={e=>setPassword(e.target.value)}
          placeholder={t(lang,"loginPassword")}
          type="password"
          onKeyDown={e=>e.key==="Enter" && mode==="login" && submit()}
          style={{ ...inputBaseStyle, width:"100%", marginBottom: mode==="register" ? 12 : 14 }}
        />

        {/* ── Confirm password (register only) ── */}
        {mode==="register" && (
          <>
            <input
              value={confirmPassword}
              onChange={e=>setConfirmPassword(e.target.value)}
              placeholder={t(lang,"registerPasswordConfirm")}
              type="password"
              onKeyDown={e=>e.key==="Enter" && submit()}
              style={{ ...inputBaseStyle, width:"100%", marginBottom:8 }}
            />
            <div style={{ fontSize:11, color:T.muted, marginBottom:14, lineHeight:1.5, fontFamily:"'Noto Sans','Noto Sans Lao',sans-serif" }}>
              {t(lang,"registerPasswordHint")}
            </div>
          </>
        )}

        {/* ── Inline error ── */}
        {error && (
          <div style={{ fontSize:13, color:"#C0392B", marginBottom:12, padding:"8px 12px", borderRadius:10, background:"rgba(255,179,167,0.15)", fontFamily:"'Noto Sans','Noto Sans Lao',sans-serif" }}>
            {error}
          </div>
        )}

        {/* ── Submit ── */}
        <button
          onClick={submit}
          disabled={loading}
          style={{
            width:"100%", padding:"15px", borderRadius:18, border:"none",
            cursor: loading ? "default" : "pointer",
            background: loading ? "rgba(172,225,175,0.4)" : "linear-gradient(145deg,#ACE1AF,#7BC8A4)",
            color:"#1A4020", fontWeight:800, fontSize:16,
            fontFamily:"'Noto Sans','Noto Sans Lao',sans-serif",
            boxShadow: loading ? "none" : "0 6px 24px rgba(172,225,175,0.5)",
            transition:"all .2s ease",
          }}
        >
          {loading
            ? "…"
            : mode==="login"
              ? t(lang,"loginSignIn")
              : t(lang,"registerButton")}
        </button>

        {/* ── Forgot link (login mode only) ── */}
        {mode==="login" && (
          <div style={{ textAlign:"center", marginTop:14 }}>
            <button
              type="button"
              onClick={()=>setForgotOpen(v=>!v)}
              style={{ background:"none", border:"none", color:T.muted, fontSize:12, cursor:"pointer", fontFamily:"'Noto Sans','Noto Sans Lao',sans-serif" }}
            >
              {t(lang,"loginForgot")}
            </button>
            {forgotOpen && (
              <div style={{ marginTop:10, fontSize:12, color:T.muted, lineHeight:1.6, padding:"10px 14px", borderRadius:12, background:"rgba(172,225,175,0.10)", fontFamily:"'Noto Sans','Noto Sans Lao',sans-serif" }}>
                {t(lang,"authForgotMessage")}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
