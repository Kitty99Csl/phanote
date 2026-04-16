// 4-digit PIN lock screen — owner + guest modes.
// Pure controlled component: all state lives in App root,
// this component just renders based on 7 props.
// Extracted from App.jsx in Session 7.
//
// Pre-existing gaps flagged for cleanup backlog:
//   - hardcoded English on security-critical screens

import { T } from "../lib/theme";
import { t } from "../lib/i18n";
import { Logo } from "../components/Logo";

export function PinLock({ pinConfig, pinInput, pinShake, onKey, isSetup, setupMode, setupStep, lang = "lo" }) {
  const keys = ["1","2","3","4","5","6","7","8","9","","0","⌫"];
  const dots = pinInput.length;
  const title = isSetup
    ? (setupMode === "set-owner" ? t(lang, "pinSetupOwnerTitle") : t(lang, "pinSetupGuestTitle"))
    : t(lang, "pinWelcomeBack");
  const subtitle = isSetup
    ? (setupStep === "confirm" ? t(lang, "pinConfirm") : setupMode === "set-owner"
        ? t(lang, "pinSetupOwnerSub") : t(lang, "pinSetupGuestSub"))
    : t(lang, "pinEnterSub");
  return (
    <div style={{position:"fixed",inset:0,zIndex:9999,background:T.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:28}}>
      <div style={{marginBottom:6}}><Logo size={100} /></div>
      <div style={{fontSize:22,fontWeight:800,color:T.dark,letterSpacing:-0.5,fontFamily:"'Noto Sans',sans-serif"}}>Phajot</div>
      <div style={{fontSize:13,color:T.muted,marginTop:4,marginBottom:32,textAlign:"center",lineHeight:1.5,fontFamily:"'Noto Sans',sans-serif"}}>{subtitle}</div>
      <div style={{fontSize:17,fontWeight:700,color:T.dark,marginBottom:24,fontFamily:"'Noto Sans',sans-serif"}}>{title}</div>
      <div style={{display:"flex",gap:18,marginBottom:40,animation:pinShake?"shake .4s ease":"none"}}>
        {[0,1,2,3].map(i=>(
          <div key={i} style={{width:16,height:16,borderRadius:8,background:i<dots?T.celadon:"rgba(172,225,175,0.2)",transition:"background .12s, transform .12s",transform:i<dots?"scale(1.15)":"scale(1)",boxShadow:i<dots?"0 0 0 4px rgba(172,225,175,0.2)":"none"}}/>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3, 76px)",gap:14}}>
        {keys.map((k,i)=>(
          k===""?<div key={i}/>:
          <button key={i} onClick={()=>k&&onKey(k)}
            style={{width:76,height:76,borderRadius:22,border:"none",fontFamily:"'Noto Sans',sans-serif",background:k==="⌫"?"rgba(172,225,175,0.15)":T.surface,color:k==="⌫"?T.muted:T.dark,fontSize:k==="⌫"?20:26,fontWeight:k==="⌫"?400:500,cursor:"pointer",boxShadow:T.shadow,display:"flex",alignItems:"center",justifyContent:"center",WebkitTapHighlightColor:"transparent"}}
            onPointerDown={e=>{e.currentTarget.style.transform="scale(0.91)";e.currentTarget.style.boxShadow="none";}}
            onPointerUp={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.boxShadow=T.shadow;}}
          >{k}</button>
        ))}
      </div>
      {!isSetup&&pinConfig?.guest&&(
        <div style={{marginTop:28,fontSize:12,color:T.muted,textAlign:"center",fontFamily:"'Noto Sans',sans-serif"}}>{t(lang, "pinBothAccepted")}</div>
      )}
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}`}</style>
    </div>
  );
}
