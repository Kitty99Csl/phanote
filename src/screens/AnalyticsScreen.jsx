// Analytics screen — period/currency filters, income/expense/net
// cards, donut chart with drill-down, top expenses, income sources,
// Last 7 Days bar chart, heatmap calendar, biggest days, Monthly
// Wrap card, and day popover modal.
// Extracted from App.jsx in Session 7.
//
// Drill-down contract: calls onOpenTransactions(filter) upward
// with 2 shapes: {categoryId} from donut, {date} from heatmap/top5.
// App root passes filter to TransactionsScreen via initialFilters prop.
//
// Pre-existing gaps flagged for cleanup backlog:
//   - No useMemo despite ~10 filter/sort passes per render
//     (perf opportunity, not a correctness bug)
//   - Uses "en-US" locale for month name formatting (bundle with
//     i18n month helper)
//   - Minor hardcoded English fallback strings alongside 17 t() calls
//   - donutSlices uses `let cumulative = 0` mutation outside IIFE

import { useState } from "react";
import { T, fmt, fmtCompact } from "../lib/theme";
import { t } from "../lib/i18n";
import { findCat, catLabel } from "../lib/categories";
import { Flag } from "../components/Flag";
import { MonthlyWrapModal } from "../modals/MonthlyWrapModal";

export function AnalyticsScreen({ profile, transactions, onOpenTransactions = () => {} }) {
  const { lang, baseCurrency, customCategories = [] } = profile;
  const [selectedCur, setSelectedCur] = useState(baseCurrency || "LAK");
  // period: "today" | "week" | "month" | "all"
  const [period, setPeriod] = useState("month");
  const [monthOffset, setMonthOffset] = useState(0);
  const [showWrap, setShowWrap] = useState(false);
  const [popoverDay, setPopoverDay] = useState(null);

  const now = new Date();

  // Find earliest month with data for selected currency
  const earliestTx = transactions
    .filter(tx => tx.currency === selectedCur)
    .map(tx => tx.date)
    .sort()[0];
  const earliestDate = earliestTx ? new Date(earliestTx) : now;
  const earliestOffset = (earliestDate.getFullYear() - now.getFullYear()) * 12 + (earliestDate.getMonth() - now.getMonth());
  const canGoBack = monthOffset > earliestOffset;
  const canGoForward = monthOffset < 0;

  // Check if previous month has data
  const hasPrevData = (offset) => {
    const d = new Date(now.getFullYear(), now.getMonth() + offset - 1, 1);
    return transactions.some(tx => {
      const txDate = new Date(tx.date);
      return tx.currency === selectedCur && txDate.getMonth() === d.getMonth() && txDate.getFullYear() === d.getFullYear();
    });
  };

  // Compute date range based on period
  const getRange = () => {
    if (period === "today") {
      const d = now.toISOString().split("T")[0];
      return { label: "Today", filter: tx => tx.date === d };
    }
    if (period === "week") {
      const start = new Date(now); start.setDate(now.getDate() - now.getDay());
      const startStr = start.toISOString().split("T")[0];
      return { label: "This Week", filter: tx => tx.date >= startStr };
    }
    if (period === "month") {
      const targetDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
      const m = targetDate.getMonth(), y = targetDate.getFullYear();
      const label = targetDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      return { label, filter: tx => { const d = new Date(tx.date); return d.getMonth()===m && d.getFullYear()===y; }, canNav: true, targetDate };
    }
    // all time
    return { label: "All Time", filter: () => true };
  };

  const range = getRange();
  const filteredTxs = transactions.filter(tx => tx.currency === selectedCur && range.filter(tx));

  const income   = filteredTxs.filter(x => x.type==="income").reduce((s,x) => s+x.amount, 0);
  const expenses = filteredTxs.filter(x => x.type==="expense").reduce((s,x) => s+x.amount, 0);
  const net      = income - expenses;
  const savingsRate = income > 0 ? Math.round(((income-expenses)/income)*100) : 0;
  const momDelta = (() => {
    if (period !== "month") return null;
    const prevDate = new Date(now.getFullYear(), now.getMonth() + monthOffset - 1, 1);
    const pm = prevDate.getMonth(), py = prevDate.getFullYear();
    const prevTxs = transactions.filter(tx => {
      const d = new Date(tx.date);
      return tx.currency === selectedCur && d.getMonth() === pm && d.getFullYear() === py;
    });
    const prevExp = prevTxs.filter(x=>x.type==="expense").reduce((s,x)=>s+x.amount,0);
    const prevInc = prevTxs.filter(x=>x.type==="income").reduce((s,x)=>s+x.amount,0);
    if (!prevExp && !prevInc) return null;
    return {
      expense: prevExp > 0 ? Math.round(((expenses-prevExp)/prevExp)*100) : null,
      income:  prevInc > 0 ? Math.round(((income-prevInc)/prevInc)*100) : null,
    };
  })();

  const spentByCat = {};
  filteredTxs.filter(x=>x.type==="expense").forEach(tx => {
    spentByCat[tx.categoryId] = (spentByCat[tx.categoryId]||0) + tx.amount;
  });
  const catBreakdown = Object.entries(spentByCat)
    .map(([id,amount]) => ({ cat: findCat(id, customCategories), amount }))
    .sort((a,b) => b.amount - a.amount);

  const earnedByCat = {};
  filteredTxs.filter(x=>x.type==="income").forEach(tx => {
    earnedByCat[tx.categoryId] = (earnedByCat[tx.categoryId]||0) + tx.amount;
  });
  const incBreakdown = Object.entries(earnedByCat)
    .map(([id,amount]) => ({ cat: findCat(id, customCategories), amount }))
    .sort((a,b) => b.amount - a.amount);

  const DONUT_R = 54, DONUT_C = 2 * Math.PI * DONUT_R;
  const COLORS = ["#ACE1AF","#7BC8A4","#FFAA5E","#C9B8FF","#FFB3A7","#A8C5FF","#FFE27D","#b8e0d4","#f7c5bb","#d4e8ff"];
  let cumulative = 0;
  const donutSlices = catBreakdown.slice(0,8).map((item,i) => {
    const pct = item.amount/(expenses||1);
    const offset = DONUT_C*(1-cumulative);
    const dash = DONUT_C*pct;
    cumulative += pct;
    return { ...item, dash, offset, color: COLORS[i%COLORS.length] };
  });

  const isEmpty = filteredTxs.length === 0;

  const PERIODS = [
    { id:"today", label:t(lang,"period_today") },
    { id:"week",  label:t(lang,"period_week")  },
    { id:"month", label:t(lang,"period_month") },
    { id:"all",   label:t(lang,"period_all")   },
  ];

  return (
    <div style={{ padding:"calc(env(safe-area-inset-top, 8px) + 8px) 16px calc(env(safe-area-inset-bottom,0px) + 80px)", position:"relative", zIndex:1 }}>

      {/* Title */}
      <div style={{ fontWeight:800, fontSize:22, color:T.dark, fontFamily:"'Noto Sans',sans-serif", marginBottom:16 }}>Analytics 📊</div>

      {/* Period filter pills */}
      <div style={{ display:"flex", gap:6, marginBottom:12, background:T.surface, borderRadius:16, padding:4, boxShadow:T.shadow }}>
        {PERIODS.map(p => (
          <button key={p.id} onClick={()=>{ setPeriod(p.id); setMonthOffset(0); }} style={{
            flex:1, padding:"8px 0", borderRadius:12, border:"none", cursor:"pointer",
            background: period===p.id ? T.celadon : "transparent",
            fontWeight:700, fontSize:12, color: period===p.id ? "#1A4020" : T.muted,
            fontFamily:"'Noto Sans',sans-serif", transition:"all .2s",
          }}>{p.label}</button>
        ))}
      </div>

      {/* Month nav — only shown in Monthly view */}
      {period === "month" && (
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <div style={{ fontSize:13, fontWeight:700, color:T.dark, fontFamily:"'Noto Sans',sans-serif" }}>{range.label}</div>
          <div style={{ display:"flex", gap:6 }}>
            {/* Back button — only show if previous month has data */}
            {hasPrevData(monthOffset) && (
              <button onClick={()=>setMonthOffset(o=>o-1)} style={{ width:32,height:32,borderRadius:10,border:"none",cursor:"pointer",background:T.surface,boxShadow:T.shadow,fontSize:15,color:T.dark }}>←</button>
            )}
            {/* Forward button — only show if not at current month */}
            {canGoForward && (
              <button onClick={()=>setMonthOffset(o=>Math.min(0,o+1))} style={{ width:32,height:32,borderRadius:10,border:"none",cursor:"pointer",background:T.surface,boxShadow:T.shadow,fontSize:15,color:T.dark }}>→</button>
            )}
          </div>
        </div>
      )}

      {/* Period label for non-month views */}
      {period !== "month" && (
        <div style={{ fontSize:12, color:T.muted, marginBottom:14 }}>{range.label} · {selectedCur}</div>
      )}

      {/* Currency tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:20 }}>
        {["LAK","THB","USD"].map(cur => (
          <button key={cur} onClick={()=>setSelectedCur(cur)} style={{
            flex:1, padding:"9px 0", borderRadius:14, border:"none", cursor:"pointer",
            background: selectedCur===cur ? T.celadon : "rgba(45,45,58,0.06)",
            fontWeight:700, fontSize:13, color: selectedCur===cur ? "#1A4020" : T.muted,
            fontFamily:"'Noto Sans',sans-serif", transition:"all .2s",
            display:"flex", alignItems:"center", justifyContent:"center", gap:5,
          }}>
            <Flag code={cur} size={16}/> {cur}
          </button>
        ))}
      </div>

      {isEmpty ? (
        <div style={{ textAlign:"center", padding:"60px 24px", display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
          <div style={{ fontSize:52 }}>📊</div>
          <div style={{ fontWeight:700, fontSize:17, color:T.dark, fontFamily:"'Noto Sans',sans-serif" }}>No data for {range.label}</div>
          <div style={{ fontSize:13, color:T.muted }}>Log some {selectedCur} transactions to see analytics</div>
        </div>
      ) : (<>

        {/* Income / Expense / Net cards */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
          <div style={{ background:T.surface, borderRadius:18, padding:"14px 16px", boxShadow:T.shadow }}>
            <div style={{ fontSize:10, fontWeight:700, color:"#2A7A40", textTransform:"uppercase", letterSpacing:0.8 }}>Income</div>
            <div style={{ fontSize:18, fontWeight:800, color:"#1A5A30", fontFamily:"'Noto Sans',sans-serif", marginTop:4 }}>+{fmt(income, selectedCur)}</div>
            <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>{filteredTxs.filter(x=>x.type==="income").length} transactions</div>
            {momDelta?.income != null && (
              <div style={{ marginTop:6, display:"inline-flex", alignItems:"center", gap:3, padding:"2px 8px", borderRadius:9999, fontSize:10, fontWeight:700,
                background: momDelta.income >= 0 ? "rgba(172,225,175,0.2)" : "rgba(255,179,167,0.2)",
                color: momDelta.income >= 0 ? "#1A5A30" : "#C0392B" }}>
                {momDelta.income >= 0 ? "▲" : "▼"} {momDelta.income > 0 ? "+" : ""}{momDelta.income}% vs last mo
              </div>
            )}
          </div>
          <div style={{ background:T.surface, borderRadius:18, padding:"14px 16px", boxShadow:T.shadow }}>
            <div style={{ fontSize:10, fontWeight:700, color:"#A03020", textTransform:"uppercase", letterSpacing:0.8 }}>Expenses</div>
            <div style={{ fontSize:18, fontWeight:800, color:"#C0392B", fontFamily:"'Noto Sans',sans-serif", marginTop:4 }}>−{fmt(expenses, selectedCur)}</div>
            <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>{filteredTxs.filter(x=>x.type==="expense").length} transactions</div>
            {momDelta?.expense != null && (
              <div style={{ marginTop:6, display:"inline-flex", alignItems:"center", gap:3, padding:"2px 8px", borderRadius:9999, fontSize:10, fontWeight:700,
                background: momDelta.expense <= 0 ? "rgba(172,225,175,0.2)" : "rgba(255,179,167,0.2)",
                color: momDelta.expense <= 0 ? "#1A5A30" : "#C0392B" }}>
                {momDelta.expense > 0 ? "▲" : "▼"} {momDelta.expense > 0 ? "+" : ""}{momDelta.expense}% vs last mo
              </div>
            )}
          </div>
        </div>

        {/* Net + savings rate */}
        <div style={{ background:T.surface, borderRadius:18, padding:"14px 18px", boxShadow:T.shadow, marginBottom:20, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:10, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:0.8 }}>Net</div>
            <div style={{ fontSize:22, fontWeight:800, color: net>=0?"#1A5A30":"#C0392B", fontFamily:"'Noto Sans',sans-serif", marginTop:4 }}>
              {net>=0?"+":""}{fmt(net, selectedCur)}
            </div>
          </div>
          {income > 0 && (
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:10, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:0.8 }}>Savings Rate</div>
              <div style={{ fontSize:28, fontWeight:800, fontFamily:"'Noto Sans',sans-serif", marginTop:4,
                color: savingsRate>=20?"#1A5A30":savingsRate>=0?"#d4993a":"#C0392B" }}>
                {savingsRate}%
              </div>
            </div>
          )}
        </div>

        {/* Donut chart */}
        {catBreakdown.length > 0 && (
          <div style={{ background:T.surface, borderRadius:22, padding:"20px 18px", boxShadow:T.shadow, marginBottom:20 }}>
            <div style={{ fontSize:12, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:1, marginBottom:16 }}>Spending Breakdown</div>
            <div style={{ display:"flex", alignItems:"center", gap:20 }}>
              <div style={{ flexShrink:0, position:"relative", width:130, height:130 }}>
                <svg width="130" height="130" viewBox="0 0 130 130">
                  <circle cx="65" cy="65" r={DONUT_R} fill="none" stroke="rgba(45,45,58,0.06)" strokeWidth="18"/>
                  {donutSlices.map((slice,i)=>(
                    <circle key={i} cx="65" cy="65" r={DONUT_R} fill="none"
                      stroke={slice.color} strokeWidth="18"
                      strokeDasharray={`${slice.dash} ${DONUT_C-slice.dash}`}
                      strokeDashoffset={slice.offset}
                      strokeLinecap="round"
                      onClick={() => onOpenTransactions({ categoryId: slice.cat.id })}
                      onMouseEnter={e=>e.target.setAttribute("stroke-width","22")}
                      onMouseLeave={e=>e.target.setAttribute("stroke-width","18")}
                      style={{transform:"rotate(-90deg)",transformOrigin:"65px 65px",cursor:"pointer",transition:"stroke-width .15s"}}/>
                  ))}
                </svg>
                <div style={{ position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center" }}>
                  <div style={{ fontSize:10,color:T.muted,fontWeight:600 }}>Total</div>
                  <div style={{ fontSize:12,fontWeight:800,color:T.dark,fontFamily:"'Noto Sans',sans-serif",textAlign:"center",lineHeight:1.2 }}>{fmtCompact(expenses,selectedCur)}</div>
                </div>
              </div>
              <div style={{ flex:1,display:"flex",flexDirection:"column",gap:8 }}>
                {donutSlices.map((slice,i)=>(
                  <div key={i} onClick={() => onOpenTransactions({ categoryId: slice.cat.id })} style={{ display:"flex",alignItems:"center",gap:8,cursor:"pointer",borderRadius:6,padding:"2px 4px",margin:"-2px -4px",transition:"background .15s" }}
                    onMouseEnter={e=>e.currentTarget.style.background="rgba(172,225,175,0.15)"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <div style={{ width:10,height:10,borderRadius:3,background:slice.color,flexShrink:0 }}/>
                    <div style={{ flex:1,fontSize:12,color:T.dark,fontWeight:600,fontFamily:"'Noto Sans',sans-serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{slice.cat.emoji} {catLabel(slice.cat,lang)}</div>
                    <div style={{ fontSize:11,fontWeight:700,color:T.muted,flexShrink:0 }}>{Math.round((slice.amount/expenses)*100)}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Top expenses bars */}
        {catBreakdown.length > 0 && (
          <div style={{ background:T.surface, borderRadius:22, padding:"20px 18px", boxShadow:T.shadow, marginBottom:20 }}>
            <div style={{ fontSize:12, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:1, marginBottom:16 }}>Top Expenses</div>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {catBreakdown.slice(0,6).map((item,i)=>{
                const pct = (item.amount/(catBreakdown[0]?.amount||1))*100;
                return(
                  <div key={i}>
                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5 }}>
                      <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                        <span style={{ fontSize:18 }}>{item.cat.emoji}</span>
                        <span style={{ fontSize:13,fontWeight:600,color:T.dark,fontFamily:"'Noto Sans',sans-serif" }}>{catLabel(item.cat,lang)}</span>
                      </div>
                      <span style={{ fontSize:13,fontWeight:800,color:"#C0392B",fontFamily:"'Noto Sans',sans-serif" }}>−{fmt(item.amount,selectedCur)}</span>
                    </div>
                    <div style={{ height:6,background:"rgba(45,45,58,0.07)",borderRadius:99,overflow:"hidden" }}>
                      <div style={{ height:"100%",width:`${pct}%`,borderRadius:99,background:i===0?"#C0392B":i===1?"#e8857a":"#FFAA5E",transition:"width .6s ease" }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Income sources */}
        {incBreakdown.length > 0 && (
          <div style={{ background:T.surface, borderRadius:22, padding:"20px 18px", boxShadow:T.shadow, marginBottom:20 }}>
            <div style={{ fontSize:12, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:1, marginBottom:16 }}>Income Sources</div>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {incBreakdown.map((item,i)=>(
                <div key={i} style={{ display:"flex",alignItems:"center",gap:12 }}>
                  <div style={{ width:40,height:40,borderRadius:13,background:"rgba(172,225,175,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0 }}>{item.cat.emoji}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13,fontWeight:600,color:T.dark,fontFamily:"'Noto Sans',sans-serif" }}>{catLabel(item.cat,lang)}</div>
                    <div style={{ height:4,background:"rgba(45,45,58,0.07)",borderRadius:99,marginTop:5,overflow:"hidden" }}>
                      <div style={{ height:"100%",width:`${(item.amount/income)*100}%`,borderRadius:99,background:"#3da873" }}/>
                    </div>
                  </div>
                  <div style={{ fontSize:13,fontWeight:800,color:"#1A5A30",fontFamily:"'Noto Sans',sans-serif",flexShrink:0 }}>+{fmt(item.amount,selectedCur)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Last 7 days bar chart — only in month/all view */}
        {(period === "month" || period === "all") && (()=>{
          const days = Array.from({length:7},(_,i)=>{
            const d = new Date(); d.setDate(d.getDate()-(6-i));
            const dateStr = d.toISOString().split("T")[0];
            const dayTxs = transactions.filter(tx=>tx.date===dateStr&&tx.currency===selectedCur);
            return { label:d.toLocaleDateString("en-US",{weekday:"short"}), date:dateStr, spent:dayTxs.filter(x=>x.type==="expense").reduce((s,x)=>s+x.amount,0), earned:dayTxs.filter(x=>x.type==="income").reduce((s,x)=>s+x.amount,0) };
          });
          const maxDay = Math.max(...days.map(d=>Math.max(d.spent,d.earned)),1);
          const todayStr = now.toISOString().split("T")[0];
          return(
            <div style={{ background:T.surface,borderRadius:22,padding:"20px 18px",boxShadow:T.shadow }}>
              <div style={{ fontSize:12,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:16 }}>Last 7 Days</div>
              <div style={{ display:"flex",gap:6,alignItems:"flex-end",height:80 }}>
                {days.map((day,i)=>(
                  <div key={i} style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4 }}>
                    <div style={{ width:"100%",display:"flex",flexDirection:"column",justifyContent:"flex-end",gap:2,height:60 }}>
                      {day.earned>0&&<div style={{ width:"100%",height:`${(day.earned/maxDay)*60}px`,borderRadius:"4px 4px 0 0",background:"#3da873",minHeight:3 }}/>}
                      {day.spent>0&&<div style={{ width:"100%",height:`${(day.spent/maxDay)*60}px`,borderRadius:"4px 4px 0 0",background:"#e8857a",minHeight:3 }}/>}
                      {day.spent===0&&day.earned===0&&<div style={{ width:"100%",height:3,borderRadius:2,background:"rgba(45,45,58,0.08)" }}/>}
                    </div>
                    <div style={{ fontSize:9,fontWeight:700,color:day.date===todayStr?T.dark:T.muted }}>{day.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:"flex",gap:16,marginTop:12,justifyContent:"center" }}>
                <div style={{ display:"flex",alignItems:"center",gap:5 }}><div style={{ width:10,height:10,borderRadius:3,background:"#3da873" }}/><span style={{ fontSize:11,color:T.muted }}>Income</span></div>
                <div style={{ display:"flex",alignItems:"center",gap:5 }}><div style={{ width:10,height:10,borderRadius:3,background:"#e8857a" }}/><span style={{ fontSize:11,color:T.muted }}>Expenses</span></div>
              </div>
            </div>
          );
        })()}

        {/* Daily spend heatmap + biggest days — only in month view */}
        {period === "month" && (()=>{
          const targetDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
          const yr = targetDate.getFullYear(), mo = targetDate.getMonth();
          const daysInMonth = new Date(yr, mo + 1, 0).getDate();
          const firstDow = new Date(yr, mo, 1).getDay();
          const todayStr = now.toISOString().split("T")[0];
          const spendByDay = {};
          const txCountByDay = {};
          transactions.forEach(tx => {
            if (tx.currency !== selectedCur || tx.type !== "expense") return;
            const d = new Date(tx.date);
            if (d.getMonth() !== mo || d.getFullYear() !== yr) return;
            spendByDay[tx.date] = (spendByDay[tx.date] || 0) + tx.amount;
            txCountByDay[tx.date] = (txCountByDay[tx.date] || 0) + 1;
          });
          const maxSpend = Math.max(...Object.values(spendByDay), 0);
          const activeDays = Object.keys(spendByDay).length;
          const totalSpend = Object.values(spendByDay).reduce((s,v) => s+v, 0);
          const entries = Object.entries(spendByDay).sort((a,b) => b[1] - a[1]);
          const biggestEntry = entries[0];
          const daysElapsed = monthOffset === 0 ? Math.min(now.getDate(), daysInMonth) : daysInMonth;
          const avgPerDay = daysElapsed > 0 ? totalSpend / daysElapsed : 0;
          const aboveAvgThreshold = avgPerDay * 1.5;
          const fmtDate = (ds) => new Date(ds+"T00:00:00").toLocaleDateString(lang==="th"?"th-TH":lang==="lo"?"lo-LA":"en-US",{month:"short",day:"numeric"});
          const getColor = (amt) => {
            if (!amt || amt <= 0) return "rgba(172,225,175,0.08)";
            const r = amt / maxSpend;
            if (r <= 0.25) return "rgba(172,225,175,0.3)";
            if (r <= 0.5) return "rgba(172,225,175,0.5)";
            if (r <= 0.75) return "rgba(172,225,175,0.75)";
            return "#ACE1AF";
          };
          const cells = [];
          for (let i = 0; i < firstDow; i++) cells.push(null);
          for (let d = 1; d <= daysInMonth; d++) {
            const ds = `${yr}-${String(mo+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
            cells.push({ day: d, dateStr: ds, isFuture: ds > todayStr, spend: spendByDay[ds] || 0 });
          }
          const hasAny = activeDays > 0;
          const top5 = entries.slice(0, 5);
          return(<>
            <div style={{ background:T.surface,borderRadius:22,padding:"20px 18px",boxShadow:T.shadow,marginTop:20 }}>
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:hasAny?8:14 }}>
                <div style={{ fontSize:12,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:1 }}>{t(lang,"dailySpend")}</div>
                <div style={{ display:"flex",alignItems:"center",gap:4,fontSize:10,color:T.muted }}>
                  <span>{t(lang,"heatmapLegendLess")}</span>
                  {[0.08,0.3,0.5,0.75,1].map((op,i)=>(
                    <div key={i} style={{ width:10,height:10,borderRadius:2,background:i===4?"#ACE1AF":`rgba(172,225,175,${op})` }}/>
                  ))}
                  <span>{t(lang,"heatmapLegendMore")}</span>
                </div>
              </div>
              {hasAny && (
                <div style={{ fontSize:12,color:T.muted,marginBottom:10,lineHeight:1.5 }}>
                  {t(lang,"heatmapSummary").replace("{n}",activeDays).replace("{date}",fmtDate(biggestEntry[0])).replace("{biggest}",fmtCompact(biggestEntry[1],selectedCur)).replace("{avg}",fmtCompact(avgPerDay,selectedCur))}
                </div>
              )}
              <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:4 }}>
                {["S","M","T","W","T","F","S"].map((dh,i)=>(
                  <div key={i} style={{ textAlign:"center",fontSize:10,fontWeight:700,color:T.muted }}>{dh}</div>
                ))}
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4 }}>
                {cells.map((cell,i) => {
                  if (!cell) return <div key={i}/>;
                  const isToday = cell.dateStr === todayStr;
                  const tappable = !cell.isFuture && cell.spend > 0;
                  const aboveAvg = cell.spend >= aboveAvgThreshold && cell.spend > 0;
                  return(
                    <div key={i}
                      onClick={() => { if (tappable) setPopoverDay(cell.dateStr); }}
                      style={{
                        position:"relative",aspectRatio:"1",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",
                        fontSize:11,fontWeight:600,fontFamily:"'Noto Sans',sans-serif",
                        cursor:tappable?"pointer":"default",
                        background:cell.isFuture?"rgba(45,45,58,0.04)":getColor(cell.spend),
                        color:cell.isFuture?"rgba(45,45,58,0.25)":T.dark,
                        opacity:cell.isFuture?0.3:1,
                        border:isToday?`2px solid ${T.celadon}`:"2px solid transparent",
                        transition:"all .15s",
                      }}>
                      {cell.day}
                      {!cell.isFuture && aboveAvg && <div style={{ position:"absolute",top:3,right:3,width:4,height:4,borderRadius:2,background:"#fff" }}/>}
                    </div>
                  );
                })}
              </div>
              {!hasAny && <div style={{ textAlign:"center",fontSize:12,color:T.muted,marginTop:12 }}>{t(lang,"noActivityMonth")}</div>}
            </div>
            {top5.length > 0 && (
              <div style={{ background:T.surface,borderRadius:22,padding:"20px 18px",boxShadow:T.shadow,marginTop:12 }}>
                <div style={{ fontSize:12,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:14 }}>🔥 {t(lang,"biggestDays")}</div>
                <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                  {top5.map(([date,amount],i) => (
                    <div key={i} onClick={() => onOpenTransactions({ date })}
                      style={{ display:"flex",alignItems:"center",gap:12,cursor:"pointer",padding:"8px 12px",borderRadius:12,background:"rgba(45,45,58,0.03)",transition:"background .15s" }}
                      onMouseEnter={e=>e.currentTarget.style.background="rgba(172,225,175,0.12)"}
                      onMouseLeave={e=>e.currentTarget.style.background="rgba(45,45,58,0.03)"}>
                      <div style={{ width:28,height:28,borderRadius:8,background:i===0?"rgba(192,57,43,0.1)":"rgba(45,45,58,0.06)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:i===0?"#C0392B":T.muted,flexShrink:0 }}>{i+1}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13,fontWeight:700,color:T.dark,fontFamily:"'Noto Sans',sans-serif" }}>{fmtDate(date)}</div>
                        <div style={{ fontSize:11,color:T.muted }}>{t(lang,"txCount").replace("{n}",txCountByDay[date]||0)}</div>
                      </div>
                      <div style={{ fontSize:14,fontWeight:800,color:"#C0392B",fontFamily:"'Noto Sans',sans-serif",flexShrink:0 }}>−{fmtCompact(amount,selectedCur)}</div>
                      <div style={{ fontSize:14,color:T.muted,flexShrink:0 }}>›</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>);
        })()}

        {/* Monthly Wrap card — only in month view */}
        {period === "month" && (
          <div onClick={() => setShowWrap(true)} style={{
            marginTop:20, background:"linear-gradient(135deg, rgba(172,225,175,0.25) 0%, rgba(233,255,219,0.4) 100%)",
            border:"1px solid rgba(172,225,175,0.4)", borderRadius:22, padding:"16px 18px",
            boxShadow:T.shadow, cursor:"pointer", display:"flex", alignItems:"center", gap:14,
          }}>
            <div style={{ width:42, height:42, borderRadius:14, background:"rgba(172,225,175,0.3)",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>📖</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:800, color:T.dark, fontFamily:"'Noto Sans',sans-serif" }}>{t(lang,"wrap_title")}</div>
              <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>{t(lang,"wrap_subtitle")}</div>
            </div>
            <div style={{ fontSize:18, color:T.muted, flexShrink:0 }}>›</div>
          </div>
        )}

      </>)}

      {showWrap && <MonthlyWrapModal open={showWrap} onClose={() => setShowWrap(false)} profile={profile} transactions={transactions} />}

      {popoverDay && (()=>{
        const dayTxs = transactions.filter(tx => tx.date === popoverDay && tx.currency === selectedCur && tx.type === "expense");
        const dayTotal = dayTxs.reduce((s,tx) => s + tx.amount, 0);
        const dayCats = {};
        dayTxs.forEach(tx => {
          const cat = findCat(tx.categoryId, customCategories);
          if (!dayCats[cat.id]) dayCats[cat.id] = { cat, amount: 0 };
          dayCats[cat.id].amount += tx.amount;
        });
        const topCats = Object.values(dayCats).sort((a,b) => b.amount - a.amount).slice(0, 3);
        const formattedDate = new Date(popoverDay+"T00:00:00").toLocaleDateString(lang==="th"?"th-TH":lang==="lo"?"lo-LA":"en-US",{month:"long",day:"numeric",year:"numeric"});
        return(
          <div onClick={() => setPopoverDay(null)} style={{ position:"fixed",inset:0,zIndex:600,background:"rgba(0,0,0,0.4)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center" }}>
            <div onClick={e => e.stopPropagation()} style={{ background:"#fff",borderRadius:20,padding:20,maxWidth:320,width:"calc(100% - 48px)",boxShadow:"0 20px 60px rgba(0,0,0,0.25)" }}>
              <div style={{ fontSize:16,fontWeight:800,color:T.dark,fontFamily:"'Noto Sans',sans-serif",marginBottom:4 }}>{formattedDate}</div>
              <div style={{ fontSize:22,fontWeight:800,color:"#C0392B",fontFamily:"'Noto Sans',sans-serif",marginBottom:4 }}>−{fmt(dayTotal,selectedCur)}</div>
              <div style={{ fontSize:12,color:T.muted,marginBottom:12 }}>{t(lang,"txCount").replace("{n}",dayTxs.length)}</div>
              {topCats.length > 0 && (
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:0.8,marginBottom:6 }}>{t(lang,"dayPopoverTop")}</div>
                  {topCats.map((item,i) => (
                    <div key={i} style={{ display:"flex",alignItems:"center",gap:8,marginBottom:4 }}>
                      <span style={{ fontSize:14 }}>{item.cat.emoji}</span>
                      <span style={{ fontSize:13,fontWeight:600,color:T.dark,flex:1,fontFamily:"'Noto Sans',sans-serif" }}>{catLabel(item.cat,lang)}</span>
                      <span style={{ fontSize:13,fontWeight:700,color:"#C0392B",fontFamily:"'Noto Sans',sans-serif" }}>−{fmtCompact(item.amount,selectedCur)}</span>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => { onOpenTransactions({ date: popoverDay }); setPopoverDay(null); }} style={{ width:"100%",padding:"13px",borderRadius:14,border:"none",background:T.celadon,color:"#1A4020",fontSize:14,fontWeight:800,cursor:"pointer",fontFamily:"'Noto Sans',sans-serif",marginBottom:8 }}>{t(lang,"viewTransactionsBtn")} →</button>
              <button onClick={() => setPopoverDay(null)} style={{ width:"100%",padding:"11px",borderRadius:14,border:"none",background:"rgba(45,45,58,0.06)",color:T.muted,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Noto Sans',sans-serif" }}>{t(lang,"cancel")}</button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
