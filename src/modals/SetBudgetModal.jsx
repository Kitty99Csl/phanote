// Set monthly budget for a category.
// Extracted from App.jsx in Session 7.
//
// Pre-existing issues flagged for cleanup backlog:
//   - hardcoded English strings (no i18n wiring)
//   - uses raw <div> overlay instead of shared Sheet
//   - no section header comment in App.jsx (inconsistency)
import { useState } from "react";
import { T, CURR, fmt, fmtCompact } from "../lib/theme";
import { catLabel } from "../lib/categories";
import { useKeyboardOffset } from "../hooks/useKeyboardOffset";

export function SetBudgetModal({ cat, currency, currentLimit, spent, lang, onSave, onClose }) {
  const [amount, setAmount] = useState(currentLimit > 0 ? String(currentLimit) : "");
  const kbOffset = useKeyboardOffset();
  const sym = CURR[currency].symbol;
  const pct = currentLimit > 0 ? Math.min((spent / currentLimit) * 100, 100) : 0;
  const barColor = pct >= 100 ? "#C0392B" : pct >= 80 ? "#d4993a" : "#3da873";
  const save = () => {
    const a = parseFloat(String(amount).replace(/,/g, ""));
    if (!a || a <= 0) return;
    onSave(a);
  };
  const QUICK = {
    LAK: [500000, 1000000, 2000000, 5000000],
    THB: [500, 1000, 2000, 5000],
    USD: [50, 100, 200, 500],
  };
  return (
    <div style={{ position:"fixed", inset:0, zIndex:2000, background:"rgba(30,30,40,0.6)",
      backdropFilter:"blur(4px)", display:"flex", alignItems:"flex-end", justifyContent:"center" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:"#fff", borderRadius:"28px 28px 0 0",
        width:"100%", maxWidth:430, animation:"slideUp .3s ease", maxHeight:"88dvh", display:"flex", flexDirection:"column",
        transform: kbOffset > 0 ? `translateY(-${kbOffset}px)` : undefined, transition:"transform .25s ease" }}>
        {/* Scrollable content */}
        <div style={{overflowY:"auto",flex:1,minHeight:0,padding:"20px 20px 8px",WebkitOverflowScrolling:"touch"}}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:30 }}>{cat.emoji}</span>
            <div>
              <div style={{ fontWeight:800, fontSize:17, color:T.dark, fontFamily:"'Noto Sans',sans-serif" }}>{catLabel(cat, lang)}</div>
              <div style={{ fontSize:12, color:T.muted, marginTop:1 }}>Monthly budget · {currency}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", fontSize:22, color:T.muted }}>✕</button>
        </div>
        {spent > 0 && (
          <div style={{ background:T.bg, borderRadius:16, padding:"14px 16px", marginBottom:20 }}>
            <div style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:0.8, marginBottom:4 }}>Spent this month</div>
            <div style={{ fontSize:22, fontWeight:800, color:"#C0392B", fontFamily:"'Noto Sans',sans-serif" }}>{fmt(spent, currency)}</div>
            {currentLimit > 0 && (<>
              <div style={{ marginTop:10, height:6, background:"rgba(45,45,58,0.08)", borderRadius:99, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${pct}%`, background:barColor, borderRadius:99 }} />
              </div>
              <div style={{ marginTop:5, fontSize:11, color:barColor, fontWeight:700 }}>
                {pct >= 100 ? "⚠️ Over budget" : pct >= 80 ? "⚡ Almost at limit" : `${Math.round(pct)}% of ${fmt(currentLimit, currency)}`}
              </div>
            </>)}
          </div>
        )}
        <div style={{ fontSize:11, fontWeight:700, color:T.muted, letterSpacing:0.8, textTransform:"uppercase", marginBottom:8, fontFamily:"'Noto Sans',sans-serif" }}>Monthly Limit</div>
        <div style={{ display:"flex", alignItems:"center", gap:8, background:"rgba(172,225,175,0.08)",
          borderRadius:14, padding:"4px 4px 4px 16px", border:"1.5px solid #ACE1AF", marginBottom:16 }}>
          <span style={{ fontSize:20, fontWeight:800, color:T.dark }}>{sym}</span>
          <input value={amount} onChange={e => setAmount(e.target.value)}
            onFocus={e => e.target.select()} onKeyDown={e => e.key === "Enter" && save()}
            type="number" inputMode="decimal" placeholder="0" autoFocus
            style={{ flex:1, border:"none", outline:"none", background:"transparent",
              fontSize:26, fontWeight:800, color:T.dark, fontFamily:"'Noto Sans',sans-serif" }} />
        </div>
        <div style={{ display:"flex", gap:8, marginBottom:8, flexWrap:"wrap" }}>
          {QUICK[currency].map(v => (
            <button key={v} onClick={() => setAmount(String(v))} style={{
              padding:"8px 14px", borderRadius:12, border:"none", cursor:"pointer",
              background: Number(amount) === v ? "rgba(172,225,175,0.35)" : "rgba(45,45,58,0.06)",
              fontWeight:700, fontSize:12, color:T.dark, fontFamily:"'Noto Sans',sans-serif",
              boxShadow: Number(amount) === v ? "0 0 0 2px #ACE1AF" : "none",
            }}>{fmtCompact(v, currency)}</button>
          ))}
        </div>
        </div>{/* end scroll */}
        {/* Pinned buttons — always above keyboard */}
        <div style={{padding:"12px 20px", paddingBottom:"calc(env(safe-area-inset-bottom,0px) + 12px)",
          borderTop:"0.5px solid rgba(45,45,58,0.06)", flexShrink:0, background:"#fff"}}>
          <div style={{display:"flex",gap:10}}>
            {currentLimit > 0 && (
              <button onClick={() => onSave(0)} style={{ flex:1, padding:"14px", borderRadius:16,
                border:"none", cursor:"pointer", background:"rgba(255,179,167,0.15)", color:"#C0392B",
                fontWeight:700, fontSize:13, fontFamily:"'Noto Sans',sans-serif" }}>Remove</button>
            )}
            <button onClick={save} style={{ flex:2, padding:"14px", borderRadius:16, border:"none",
              cursor:"pointer", background:"linear-gradient(145deg,#ACE1AF,#7BC8A4)", color:"#1A4020",
              fontWeight:800, fontSize:15, fontFamily:"'Noto Sans',sans-serif",
              boxShadow:"0 4px 16px rgba(172,225,175,0.4)" }}>Save Budget ✓</button>
          </div>
        </div>
      </div>
    </div>
  );
}
