// Add savings to an existing goal.
// Extracted from App.jsx in Session 7.
//
// Pre-existing issues flagged for cleanup backlog:
//   - hardcoded English strings (no i18n wiring)
//   - uses raw <div> overlay instead of shared Sheet
import { useState } from "react";
import { T, CURR, fmt, fmtCompact } from "../lib/theme";
import { useKeyboardOffset } from "../hooks/useKeyboardOffset";

export function AddSavingsModal({ goal, onSave, onClose }) {
  const [amount, setAmount] = useState("");
  const kbOffset = useKeyboardOffset();
  const remaining = Math.max(0, goal.target_amount - goal.saved_amount);
  const QUICK = { LAK:[500000,1000000,2000000], THB:[500,1000,2000], USD:[50,100,200] };
  const save = () => {
    const a = parseFloat(String(amount).replace(/,/g,""));
    if (!a || a <= 0) return;
    onSave(Math.min(a, remaining));
  };
  return (
    <div style={{position:"fixed",inset:0,zIndex:2000,background:"rgba(30,30,40,0.6)",backdropFilter:"blur(4px)",display:"flex",alignItems:"flex-end",justifyContent:"center"}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:"#fff",borderRadius:"28px 28px 0 0",width:"100%",maxWidth:430,animation:"slideUp .3s ease",maxHeight:"80dvh",display:"flex",flexDirection:"column",
        transform:kbOffset>0?`translateY(-${kbOffset}px)`:undefined,transition:"transform .25s ease"}}>
        <div style={{overflowY:"auto",flex:1,minHeight:0,padding:"20px 20px 8px",WebkitOverflowScrolling:"touch"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div>
            <div style={{fontWeight:800,fontSize:17,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>{goal.emoji} Add to {goal.name}</div>
            <div style={{fontSize:12,color:T.muted,marginTop:2}}>{fmt(goal.saved_amount,goal.currency)} saved · {fmt(remaining,goal.currency)} to go</div>
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
          <button onClick={()=>setAmount(String(remaining))} style={{padding:"7px 12px",borderRadius:10,border:"none",cursor:"pointer",background:"rgba(172,225,175,0.2)",fontWeight:700,fontSize:12,color:"#1A5A30"}}>All ✓</button>
        </div>
        </div>{/* end scroll */}
        <div style={{padding:"12px 20px",paddingBottom:"calc(env(safe-area-inset-bottom,0px) + 12px)",borderTop:"0.5px solid rgba(45,45,58,0.06)",flexShrink:0,background:"#fff"}}>
          <button onClick={save} style={{width:"100%",padding:"15px",borderRadius:16,border:"none",cursor:"pointer",background:"linear-gradient(145deg,#ACE1AF,#7BC8A4)",color:"#1A4020",fontWeight:800,fontSize:15,fontFamily:"'Noto Sans',sans-serif",boxShadow:"0 4px 16px rgba(172,225,175,0.4)"}}>Add Savings 💚</button>
        </div>
      </div>
    </div>
  );
}
