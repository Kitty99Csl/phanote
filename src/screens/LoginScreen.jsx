// Login screen — phone auth entry point.
// First-impression screen with Lao-first positioning
// (slogan rendered in Lao via hardcoded lang = "lo").
// Extracted from App.jsx in Session 7.
//
// Pre-existing gaps flagged for cleanup backlog:
//   - missing section header in App.jsx (the misplaced header
//     at L2711 is unrelated and stays as a tombstone orphan)
//   - all strings hardcoded English except the slogan
//   - CODES array contains Unicode regional indicator flag
//     emojis — byte-slice preserves them exactly

import { useState } from "react";
import { T } from "../lib/theme";
import { t } from "../lib/i18n";
import { signInWithPhone } from "../lib/supabase";
import { useKeyboardOffset } from "../hooks/useKeyboardOffset";
import { AnimalBg } from "../components/AnimalBg";
import { Logo } from "../components/Logo";

export function LoginScreen({ onLogin }) {
  // Public-facing screen — default to Lao per OQ-012 Lao-first positioning
  const lang = "lo";
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("+856");
  const kbOffset = useKeyboardOffset();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const CODES = [
    { flag:"🇱🇦", code:"+856", name:"Laos" },{ flag:"🇹🇭", code:"+66", name:"Thailand" },
    { flag:"🇺🇸", code:"+1", name:"USA" },{ flag:"🇬🇧", code:"+44", name:"UK" },
    { flag:"🇸🇬", code:"+65", name:"Singapore" },{ flag:"🇨🇳", code:"+86", name:"China" },
    { flag:"🇯🇵", code:"+81", name:"Japan" },{ flag:"🇰🇷", code:"+82", name:"Korea" },
    { flag:"🇻🇳", code:"+84", name:"Vietnam" },{ flag:"🇰🇭", code:"+855", name:"Cambodia" },
    { flag:"🇲🇲", code:"+95", name:"Myanmar" },{ flag:"🇦🇺", code:"+61", name:"Australia" },
  ];
  const submit = async () => {
    if (!phone.trim() || phone.trim().length < 6) { setError("Please enter a valid phone number"); return; }
    setLoading(true); setError("");
    try {
      const { user, isNew, phone: fullPhone, countryCode } = await signInWithPhone(phone.trim(), code);
      onLogin(user, isNew, fullPhone, countryCode);
    } catch (e) {
      setError(e.message?.includes("422") ? "Invalid phone number format." : "Could not sign in. Please try again.");
      setLoading(false);
    }
  };
  return (
    <div style={{ minHeight:"100dvh", background:T.bg, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", padding:"24px 20px", position:"relative", overflow:"hidden" }}>
      <AnimalBg />
      <div style={{ textAlign:"center", marginBottom:36, zIndex:1, display:"flex", flexDirection:"column", alignItems:"center" }}>
        <Logo size={180} />
        <div style={{ fontFamily:"'Noto Sans',sans-serif", fontSize:28, fontWeight:800, color:T.dark, letterSpacing:-1, marginTop:8 }}>Phajot · ພາຈົດ</div>
        <div style={{ fontSize:13, color:T.muted, marginTop:6, textAlign:"center", maxWidth:320, lineHeight:1.5, fontFamily:"'Noto Sans',sans-serif", fontWeight:400 }}>{t(lang,"slogan")}</div>
      </div>
      <div style={{ background:T.surface, backdropFilter:"blur(20px)", borderRadius:28,
        padding:"28px 24px", width:"100%", maxWidth:380, boxShadow:T.shadowLg, zIndex:1,
        transform:kbOffset>0?`translateY(-${Math.min(kbOffset*0.6,180)}px)`:undefined,
        transition:"transform .3s ease" }}>
        <div style={{ fontWeight:800, fontSize:18, color:T.dark, marginBottom:6, fontFamily:"'Noto Sans',sans-serif" }}>Welcome back 👋</div>
        <div style={{ fontSize:13, color:T.muted, marginBottom:22, lineHeight:1.5 }}>
          Enter your phone number to continue. First time? We'll set you up automatically.
        </div>
        <div style={{ display:"flex", gap:8, marginBottom:14 }}>
          <select value={code} onChange={e=>setCode(e.target.value)} style={{ padding:"13px 10px", borderRadius:14, border:"1.5px solid rgba(45,45,58,0.12)", background:"rgba(172,225,175,0.06)", fontSize:14, color:T.dark, fontFamily:"'Noto Sans',sans-serif", outline:"none", cursor:"pointer", flexShrink:0 }}>
            {CODES.map(c=><option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
          </select>
          <input value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,""))} onKeyDown={e=>e.key==="Enter"&&submit()}
            placeholder="20 123 4567" type="tel" autoFocus
            style={{ flex:1, padding:"13px 16px", borderRadius:14, border:`1.5px solid ${phone.length>5?"#ACE1AF":"rgba(45,45,58,0.12)"}`, background:"rgba(172,225,175,0.06)", fontSize:15, color:T.dark, fontFamily:"'Noto Sans',sans-serif", outline:"none", transition:"border-color .2s ease" }}/>
        </div>
        {error&&(<div style={{ fontSize:13, color:"#C0392B", marginBottom:12, padding:"8px 12px", borderRadius:10, background:"rgba(255,179,167,0.15)" }}>{error}</div>)}
        <button onClick={submit} disabled={loading} style={{ width:"100%", padding:"15px", borderRadius:18, border:"none", cursor:"pointer", background:loading?"rgba(172,225,175,0.4)":"linear-gradient(145deg,#ACE1AF,#7BC8A4)", color:"#1A4020", fontWeight:800, fontSize:16, fontFamily:"'Noto Sans',sans-serif", boxShadow:loading?"none":"0 6px 24px rgba(172,225,175,0.5)", transition:"all .2s ease" }}>
          {loading ? "Signing in…" : "Continue →"}
        </button>
        <div style={{ textAlign:"center", marginTop:16, fontSize:11, color:T.muted, lineHeight:1.6 }}>
          Your phone number is your identity. No password needed.<br/>Your data is saved securely and syncs across all your devices.
        </div>
      </div>
    </div>
  );
}
