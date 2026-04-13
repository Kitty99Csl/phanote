// Safe-to-spend component — shows how much user can still
// spend this month based on income, expenses, and goal
// commitments.
// Extracted from App.jsx in Session 7.
//
// Pre-existing gaps flagged for cleanup backlog:
//   - DEAD STATE: `budgets` loaded from supabase but never read
//     in the calculation. Either remove or wire into math.
//   - direct supabase usage (6th file for lib/db.js migration)
//   - redundant emoji strip on statusText at ~L571

import { useState, useEffect } from "react";
import { T, fmtCompact } from "../lib/theme";
import { t } from "../lib/i18n";
import { supabase } from "../lib/supabase";

export function SafeToSpend({ transactions, profile }) {
  const { baseCurrency = "LAK", userId, lang = "lo" } = profile;
  const [budgets, setBudgets] = useState([]);
  const [goals,   setGoals]   = useState([]);
  useEffect(() => {
    if (!userId) return;
    supabase.from("budgets").select("*").eq("user_id", userId).then(({ data }) => { if (data) setBudgets(data); });
    supabase.from("goals").select("*").eq("user_id", userId).eq("is_completed", false).then(({ data }) => { if (data) setGoals(data); });
  }, [userId]);
  const cur = baseCurrency;
  const now = new Date();
  const mo = now.getMonth(), yr = now.getFullYear();
  const monthTxs = transactions.filter(tx => { const d = new Date(tx.date); return d.getMonth()===mo && d.getFullYear()===yr && tx.currency===cur; });
  const income   = monthTxs.filter(x=>x.type==="income").reduce((s,x)=>s+x.amount,0);
  const expenses = monthTxs.filter(x=>x.type==="expense").reduce((s,x)=>s+x.amount,0);
  const goalSavings = goals.filter(g=>g.currency===cur&&g.deadline).reduce((g2,g)=>{
    const dl = new Date(g.deadline);
    const mLeft = Math.max(1,(dl.getFullYear()-now.getFullYear())*12+(dl.getMonth()-now.getMonth()));
    return g2 + Math.ceil((g.target_amount-g.saved_amount)/mLeft);
  },0);
  const daysInMonth = new Date(yr,mo+1,0).getDate();
  const daysLeft = daysInMonth - now.getDate() + 1;
  const safeTotal = income - expenses - goalSavings;
  const safePerDay = daysLeft > 0 ? Math.floor(safeTotal / daysLeft) : 0;
  if (income === 0) return null;
  const isNegative = safeTotal < 0;
  const isWarning  = !isNegative && safeTotal < income * 0.1;
  const barColor   = isNegative ? "#C0392B" : isWarning ? "#d4993a" : "#3da873";
  const barPct     = Math.min(100, Math.max(0, (safeTotal/income)*100));
  const statusText = isNegative
    ? `⚠️ ${t(lang,"over_capacity")} ${fmtCompact(Math.abs(safeTotal),cur)}`
    : isWarning
    ? `⚡ ${t(lang,"almost_out")} — ${daysLeft} ${t(lang,"days_left")}`
    : `✓ ${daysLeft} ${t(lang,"days_left")} · ${goalSavings>0?`${t(lang,"incl_goals")} ${fmtCompact(goalSavings,cur)}`:t(lang,"on_track")}`;
  return (
    <div style={{padding:"0 16px 8px"}}>
      <div style={{background:T.surface,backdropFilter:"blur(20px)",borderRadius:14,padding:"8px 14px",boxShadow:T.shadow,display:"flex",alignItems:"center",gap:10}}>
        <div style={{fontSize:14}}>{isNegative?"⚠️":isWarning?"⚡":"✓"}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:10,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:0.8}}>{t(lang,"safe_to_spend")}</div>
          <div style={{fontSize:13,fontWeight:800,color:isNegative?"#C0392B":T.dark,fontFamily:"'Noto Sans',sans-serif"}}>
            {isNegative?"−":""}{fmtCompact(Math.abs(safeTotal),cur)}
            <span style={{fontSize:10,fontWeight:600,color:T.muted,marginLeft:6}}>{statusText.replace(/[⚠️⚡✓]/g,"").trim()}</span>
          </div>
        </div>
        <div style={{textAlign:"right",flexShrink:0}}>
          <div style={{fontSize:10,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:0.8}}>{t(lang,"per_day")}</div>
          <div style={{fontSize:13,fontWeight:800,color:barColor,fontFamily:"'Noto Sans',sans-serif"}}>
            {isNegative||safePerDay<=0?"—":fmtCompact(safePerDay,cur)}
          </div>
        </div>
      </div>
    </div>
  );
}
