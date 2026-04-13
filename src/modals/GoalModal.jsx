// Goal modal for create / edit savings goals.
// Extracted from App.jsx in Session 7.
//
// Pre-existing issues flagged for cleanup backlog:
//   - hardcoded English strings (no i18n wiring)
//   - uses raw <div> overlay instead of shared Sheet
//   - `lang` destructured from profile but never read (dead)
import { useState } from "react";
import { T, CURR, fmt, fmtCompact } from "../lib/theme";
import { GOAL_EMOJIS } from "../lib/constants";
import { useKeyboardOffset } from "../hooks/useKeyboardOffset";
import { useClickGuard } from "../hooks/useClickGuard";
import { Flag } from "../components/Flag";

export function GoalModal({ goal, profile, onSave, onClose }) {
  const { lang } = profile;
  const kbOffset = useKeyboardOffset();
  const { busy, run } = useClickGuard();
  const [name,     setName]     = useState(goal?.name || "");
  const [emoji,    setEmoji]    = useState(goal?.emoji || "🎯");
  const [target,   setTarget]   = useState(goal ? String(goal.target_amount) : "");
  const [saved,    setSaved]    = useState(goal ? String(goal.saved_amount || 0) : "0");
  const [currency, setCurrency] = useState(goal?.currency || profile.baseCurrency || "LAK");
  const [deadline, setDeadline] = useState(goal?.deadline || "");
  const [showEmoji, setShowEmoji] = useState(false);
  const isEdit = !!goal;

  const monthsLeft = () => {
    if (!deadline) return null;
    const now = new Date();
    const dl  = new Date(deadline + "-01");
    return Math.max(1, (dl.getFullYear() - now.getFullYear()) * 12 + (dl.getMonth() - now.getMonth()));
  };
  const monthlyNeeded = () => {
    const t = parseFloat(target) || 0;
    const s = parseFloat(saved) || 0;
    const m = monthsLeft();
    if (!m || t <= s) return 0;
    return Math.ceil((t - s) / m);
  };

  const save = () => run(async () => {
    const t = parseFloat(String(target).replace(/,/g,""));
    const s = parseFloat(String(saved).replace(/,/g,"")) || 0;
    if (!name.trim() || !t || t <= 0) return;
    await onSave({ name: name.trim(), emoji, target_amount: t, saved_amount: s, currency, deadline: deadline || null });
    onClose();
  });

  const QUICK = { LAK:[1000000,5000000,10000000,50000000], THB:[1000,5000,10000,50000], USD:[100,500,1000,5000] };
  const sym = CURR[currency].symbol;

  return (
    <div style={{position:"fixed",inset:0,zIndex:2000,background:"rgba(30,30,40,0.6)",backdropFilter:"blur(4px)",display:"flex",alignItems:"flex-end",justifyContent:"center"}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:"#fff",borderRadius:"28px 28px 0 0",width:"100%",maxWidth:430,animation:"slideUp .3s ease",maxHeight:"88dvh",display:"flex",flexDirection:"column",
        transform:kbOffset>0?`translateY(-${kbOffset}px)`:undefined,transition:"transform .25s ease"}}>

        {/* Fixed header */}
        <div style={{padding:"18px 20px 12px",borderBottom:"1px solid rgba(45,45,58,0.07)",flexShrink:0,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontWeight:800,fontSize:17,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>{isEdit?"Edit Goal ✏️":"New Goal 🎯"}</div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:T.muted,padding:"4px 8px"}}>✕</button>
        </div>

        {/* Everything scrollable including the button */}
        <div style={{overflowY:"auto",flex:1,minHeight:0,padding:"16px 20px",WebkitOverflowScrolling:"touch"}}>

          <div style={{fontSize:11,fontWeight:700,color:T.muted,letterSpacing:0.8,textTransform:"uppercase",marginBottom:6}}>Goal name</div>
          <div style={{display:"flex",gap:8,marginBottom:14}}>
            <button onClick={()=>setShowEmoji(!showEmoji)} style={{width:48,height:48,borderRadius:13,border:"1.5px solid rgba(45,45,58,0.12)",background:"rgba(172,225,175,0.08)",fontSize:22,cursor:"pointer",flexShrink:0}}>{emoji}</button>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder='e.g. "Bali Trip", "New Phone"'
              style={{flex:1,padding:"11px 14px",borderRadius:13,border:"1.5px solid rgba(45,45,58,0.12)",outline:"none",fontSize:14,fontFamily:"'Noto Sans',sans-serif",color:T.dark,background:"rgba(172,225,175,0.05)"}}
              onFocus={e=>e.target.style.borderColor="#ACE1AF"} onBlur={e=>e.target.style.borderColor="rgba(45,45,58,0.12)"}/>
          </div>
          {showEmoji&&(
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12,padding:10,borderRadius:14,background:"rgba(45,45,58,0.04)"}}>
              {GOAL_EMOJIS.map(e=><button key={e} onClick={()=>{setEmoji(e);setShowEmoji(false);}} style={{fontSize:20,border:"none",background:emoji===e?"rgba(172,225,175,0.3)":"transparent",cursor:"pointer",borderRadius:8,padding:3,width:34,height:34}}>{e}</button>)}
            </div>
          )}

          <div style={{fontSize:11,fontWeight:700,color:T.muted,letterSpacing:0.8,textTransform:"uppercase",marginBottom:6}}>Currency</div>
          <div style={{display:"flex",gap:8,marginBottom:14}}>
            {["LAK","THB","USD"].map(c=>(
              <button key={c} onClick={()=>setCurrency(c)} style={{flex:1,padding:"8px 0",borderRadius:12,border:"none",cursor:"pointer",background:currency===c?T.celadon:"rgba(45,45,58,0.06)",fontWeight:700,fontSize:13,color:currency===c?"#1A4020":T.muted,display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
                <Flag code={c} size={14}/>{c}
              </button>
            ))}
          </div>

          <div style={{fontSize:11,fontWeight:700,color:T.muted,letterSpacing:0.8,textTransform:"uppercase",marginBottom:6}}>Target amount</div>
          <div style={{display:"flex",alignItems:"center",gap:8,background:"rgba(172,225,175,0.08)",borderRadius:13,padding:"4px 4px 4px 14px",border:"1.5px solid #ACE1AF",marginBottom:8}}>
            <span style={{fontSize:18,fontWeight:800,color:T.dark}}>{sym}</span>
            <input value={target} onChange={e=>setTarget(e.target.value)} onFocus={e=>e.target.select()} type="number" inputMode="decimal" placeholder="0"
              style={{flex:1,border:"none",outline:"none",background:"transparent",fontSize:22,fontWeight:800,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}/>
          </div>
          <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
            {QUICK[currency].map(v=>(
              <button key={v} onClick={()=>setTarget(String(v))} style={{padding:"6px 10px",borderRadius:10,border:"none",cursor:"pointer",background:Number(target)===v?"rgba(172,225,175,0.35)":"rgba(45,45,58,0.06)",fontWeight:700,fontSize:12,color:T.dark,boxShadow:Number(target)===v?"0 0 0 2px #ACE1AF":"none"}}>{fmtCompact(v,currency)}</button>
            ))}
          </div>

          {isEdit&&(<>
            <div style={{fontSize:11,fontWeight:700,color:T.muted,letterSpacing:0.8,textTransform:"uppercase",marginBottom:6}}>Already saved</div>
            <div style={{display:"flex",alignItems:"center",gap:8,background:"rgba(45,45,58,0.04)",borderRadius:13,padding:"4px 4px 4px 14px",border:"1.5px solid rgba(45,45,58,0.1)",marginBottom:14}}>
              <span style={{fontSize:16,fontWeight:800,color:T.muted}}>{sym}</span>
              <input value={saved} onChange={e=>setSaved(e.target.value)} onFocus={e=>e.target.select()} type="number" inputMode="decimal" placeholder="0"
                style={{flex:1,border:"none",outline:"none",background:"transparent",fontSize:18,fontWeight:700,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}/>
            </div>
          </>)}

          <div style={{fontSize:11,fontWeight:700,color:T.muted,letterSpacing:0.8,textTransform:"uppercase",marginBottom:6}}>Target month</div>
          <input type="month" value={deadline} onChange={e=>setDeadline(e.target.value)}
            min={new Date().toISOString().slice(0,7)}
            style={{width:"100%",padding:"11px 14px",borderRadius:13,border:"1.5px solid rgba(45,45,58,0.12)",outline:"none",fontSize:14,fontFamily:"'Noto Sans',sans-serif",color:T.dark,background:"rgba(172,225,175,0.05)",marginBottom:14,boxSizing:"border-box"}}
            onFocus={e=>e.target.style.borderColor="#ACE1AF"} onBlur={e=>e.target.style.borderColor="rgba(45,45,58,0.12)"}/>

          {parseFloat(target) > 0 && deadline && (
            <div style={{background:"rgba(172,225,175,0.12)",borderRadius:14,padding:"10px 14px",marginBottom:14}}>
              <div style={{fontSize:12,color:"#2A7A40",fontWeight:700}}>
                💚 Save {fmt(monthlyNeeded(), currency)}/month for {monthsLeft()} months to hit your goal
              </div>
            </div>
          )}

          <div style={{height:8}}/>
        </div>
        {/* Pinned save button */}
        <div style={{padding:"12px 20px",paddingBottom:"calc(env(safe-area-inset-bottom,0px) + 12px)",borderTop:"0.5px solid rgba(45,45,58,0.06)",flexShrink:0,background:"#fff"}}>
          <button onClick={save} disabled={busy} style={{width:"100%",padding:"16px",borderRadius:16,border:"none",cursor:busy?"wait":"pointer",background:"linear-gradient(145deg,#ACE1AF,#7BC8A4)",color:"#1A4020",fontWeight:800,fontSize:15,fontFamily:"'Noto Sans',sans-serif",boxShadow:"0 4px 16px rgba(172,225,175,0.4)",opacity:busy?0.6:1}}>
            {isEdit ? "Save Changes ✓" : "Create Goal 🎯"}
          </button>
        </div>
      </div>
    </div>
  );
}
