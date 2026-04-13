// Confirm transaction parse modal. Shows AI-parsed result with 'Did you mean?' prompt. Extracted from App.jsx in Session 7.

import { useState } from "react";
import { useClickGuard } from "../hooks/useClickGuard";
import Sheet from "../components/Sheet";
import { T, fmt } from "../lib/theme";
import { t } from "../lib/i18n";
import { findCat, catLabel } from "../lib/categories";

export function ConfirmModal({parsed,lang,onConfirm,onEdit}){
  const[note,setNote]=useState("");
  const cat=findCat(parsed.category||parsed.categoryId);
  const aiDone=parsed._aiDone;
  const aiUpdated=parsed._aiUpdated;
  const { busy, run } = useClickGuard();
  const confirm = () => run(async () => { await onConfirm({...parsed,note:note.trim()}); });
  return(
    <Sheet open={true} onClose={onEdit} showCloseButton={false} footer={
      <div style={{display:"flex",gap:10}}>
        <button onClick={onEdit} style={{flex:1,padding:"14px",borderRadius:16,border:"none",cursor:"pointer",background:"rgba(155,155,173,0.12)",color:T.muted,fontWeight:700,fontSize:14,fontFamily:"'Noto Sans',sans-serif"}}>{t(lang,"confirm_edit")}</button>
        <button onClick={confirm} disabled={busy} style={{flex:2,padding:"14px",borderRadius:16,border:"none",cursor:busy?"default":"pointer",background:"linear-gradient(145deg,#ACE1AF,#7BC8A4)",color:"#1A4020",fontWeight:800,fontSize:14,fontFamily:"'Noto Sans',sans-serif",boxShadow:"0 4px 16px rgba(172,225,175,0.4)",opacity:busy?0.5:1}}>{t(lang,"confirm_yes")}</button>
      </div>
    }>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,paddingTop:20}}>
        <div style={{fontSize:13,color:T.muted,fontWeight:600}}>{t(lang,"confirm_q")}</div>
        {!aiDone&&(
          <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#2A7A40",fontWeight:700,background:"rgba(172,225,175,0.15)",padding:"3px 9px",borderRadius:9999}}>
            <div style={{width:6,height:6,borderRadius:3,background:"#ACE1AF",animation:"pulse 1s infinite"}}/>
            AI checking…
          </div>
        )}
        {aiDone&&aiUpdated&&(
          <div style={{fontSize:11,color:"#2A7A40",fontWeight:700,background:"rgba(172,225,175,0.15)",padding:"3px 9px",borderRadius:9999}}>
            ✦ AI corrected
          </div>
        )}
        {aiDone&&!aiUpdated&&(
          <div style={{fontSize:11,color:T.muted,padding:"3px 9px"}}>✓ AI confirmed</div>
        )}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:14,background:T.bg,borderRadius:20,padding:"14px 16px",marginBottom:14}}>
        <div style={{width:48,height:48,borderRadius:15,fontSize:24,background:parsed.type==="expense"?"rgba(255,179,167,0.25)":"rgba(172,225,175,0.25)",display:"flex",alignItems:"center",justifyContent:"center"}}>{cat.emoji}</div>
        <div style={{flex:1}}>
          <div style={{fontWeight:700,fontSize:15,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>{parsed.description}</div>
          <div style={{fontSize:12,color:T.muted,marginTop:2}}>{catLabel(cat,lang)} · {parsed.currency}</div>
        </div>
        <div style={{fontWeight:800,fontSize:18,fontFamily:"'Noto Sans',sans-serif",color:parsed.type==="expense"?"#C0392B":"#1A5A30"}}>{parsed.type==="expense"?"-":"+"}{fmt(parsed.amount,parsed.currency)}</div>
      </div>
      <input value={note} onChange={e=>setNote(e.target.value)} placeholder={t(lang,"note_placeholder")}
        style={{width:"100%",padding:"11px 14px",borderRadius:14,border:"1.5px solid rgba(45,45,58,0.1)",outline:"none",fontSize:13,fontFamily:"'Noto Sans',sans-serif",color:T.dark,background:"rgba(172,225,175,0.06)",boxSizing:"border-box"}}
        onFocus={e=>e.target.style.borderColor="#ACE1AF"} onBlur={e=>e.target.style.borderColor="rgba(45,45,58,0.1)"}/>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </Sheet>
  );
}
