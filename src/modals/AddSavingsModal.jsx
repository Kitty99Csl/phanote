// Add savings to an existing goal.
// Extracted from App.jsx in Session 7.
import { useState } from "react";
import { T, CURR, fmt, fmtCompact } from "../lib/theme";
import { t } from "../lib/i18n";
import Sheet from "../components/Sheet";
import { useClickGuard } from "../hooks/useClickGuard";

export function AddSavingsModal({ goal, lang = "lo", onSave, onClose }) {
  const [amount, setAmount] = useState("");
  const remaining = Math.max(0, goal.target_amount - goal.saved_amount);
  const QUICK = { LAK:[500000,1000000,2000000], THB:[500,1000,2000], USD:[50,100,200] };
  const { busy, run } = useClickGuard();
  const save = () => run(async () => {
    const a = parseFloat(String(amount).replace(/,/g,""));
    if (!a || a <= 0) return;
    await onSave(Math.min(a, remaining));
    onClose();
  });
  return (
    <Sheet open={true} onClose={onClose} showCloseButton={false} footer={
      <button onClick={save} disabled={busy} style={{width:"100%",padding:"15px",borderRadius:16,border:"none",cursor:busy?"wait":"pointer",background:"linear-gradient(145deg,#ACE1AF,#7BC8A4)",color:"#1A4020",fontWeight:800,fontSize:15,fontFamily:"'Noto Sans',sans-serif",boxShadow:"0 4px 16px rgba(172,225,175,0.4)",opacity:busy?0.6:1}}>{t(lang,"savingsAddBtn")}</button>
    }>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,paddingTop:8}}>
        <div>
          <div style={{fontWeight:800,fontSize:17,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>{goal.emoji} {t(lang,"savingsAddTo").replace("{name}",goal.name)}</div>
          <div style={{fontSize:12,color:T.muted,marginTop:2}}>{t(lang,"savingsProgress").replace("{saved}",fmt(goal.saved_amount,goal.currency)).replace("{remaining}",fmt(remaining,goal.currency))}</div>
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:T.muted}}>✕</button>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8,background:"rgba(172,225,175,0.08)",borderRadius:14,padding:"4px 4px 4px 16px",border:"1.5px solid #ACE1AF",marginBottom:12}}>
        <span style={{fontSize:18,fontWeight:800,color:T.dark}}>{CURR[goal.currency].symbol}</span>
        <input value={amount} onChange={e=>setAmount(e.target.value)} onFocus={e=>e.target.select()} type="number" inputMode="decimal" placeholder="0" autoFocus
          style={{flex:1,border:"none",outline:"none",background:"transparent",fontSize:26,fontWeight:800,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}/>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
        {(QUICK[goal.currency]||[]).map(v=>(
          <button key={v} onClick={()=>setAmount(String(Math.min(v,remaining)))} style={{padding:"7px 12px",borderRadius:10,border:"none",cursor:"pointer",background:"rgba(45,45,58,0.06)",fontWeight:700,fontSize:12,color:T.dark}}>{fmtCompact(v,goal.currency)}</button>
        ))}
        <button onClick={()=>setAmount(String(remaining))} style={{padding:"7px 12px",borderRadius:10,border:"none",cursor:"pointer",background:"rgba(172,225,175,0.2)",fontWeight:700,fontSize:12,color:"#1A5A30"}}>{t(lang,"savingsAll")}</button>
      </div>
    </Sheet>
  );
}
