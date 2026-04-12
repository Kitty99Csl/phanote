// Transactions screen — search + 3-axis filter + pagination.
// Session 6 addition with drill-down wiring from AnalyticsScreen
// (heatmap day tap, donut slice click) via initialFilters prop.
// Extracted from App.jsx in Session 7.
//
// Pre-existing gaps flagged for cleanup backlog:
//   - dead `profile` prop destructure, never read
//   - inline trilingual period/type/currency filter labels
//     (lo/th/en) should move to lib/i18n.js as proper keys
//   - introduces `tpl` closure for {var} i18n interpolation —
//     consider hoisting to lib/i18n.js

import { useState, useEffect } from "react";
import { T, fmt } from "../lib/theme";
import { t } from "../lib/i18n";
import { catLabel, findCat } from "../lib/categories";
import { TransactionList } from "../components/TransactionList";

export function TransactionsScreen({ lang, profile, customCategories=[], transactions, onClose, onEditTx, onDeleteTx, onUpdateNote, initialFilters=null }) {
  const [txFilter, setTxFilter] = useState("all");
  const [curFilter, setCurFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("both");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(50);
  const [customDate, setCustomDate] = useState(null);
  const [customCategoryId, setCustomCategoryId] = useState(null);
  useEffect(() => { setVisibleCount(50); }, [txFilter, curFilter, typeFilter, searchQuery, customDate, customCategoryId]);
  useEffect(() => {
    if (initialFilters?.date) { setCustomDate(initialFilters.date); setTxFilter("all"); }
    if (initialFilters?.categoryId) { setCustomCategoryId(initialFilters.categoryId); setTxFilter("all"); }
  }, [initialFilters]);

  const tpl = (key, vars={}) => { let s = t(lang, key); Object.entries(vars).forEach(([k,v]) => { s = s.replace(`{${k}}`, v); }); return s; };

  const todayStr = new Date().toISOString().split("T")[0];
  const yestStr = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const weekAgoStr = new Date(Date.now() - 7*86400000).toISOString().split("T")[0];
  const monthPrefix = todayStr.slice(0, 7);

  let filtered = transactions;
  if (txFilter === "today") filtered = filtered.filter(tx => tx.date === todayStr);
  else if (txFilter === "yesterday") filtered = filtered.filter(tx => tx.date === yestStr);
  else if (txFilter === "week") filtered = filtered.filter(tx => tx.date >= weekAgoStr);
  else if (txFilter === "month") filtered = filtered.filter(tx => tx.date >= monthPrefix + "-01");
  if (curFilter !== "all") filtered = filtered.filter(tx => tx.currency === curFilter);
  if (typeFilter !== "both") filtered = filtered.filter(tx => tx.type === typeFilter);
  if (searchQuery.trim()) { const q = searchQuery.toLowerCase().trim(); filtered = filtered.filter(tx => (tx.description || "").toLowerCase().includes(q)); }
  if (customDate) filtered = filtered.filter(tx => tx.date === customDate);
  if (customCategoryId) filtered = filtered.filter(tx => tx.categoryId === customCategoryId);

  const totalFiltered = filtered.length;
  const visible = filtered.slice(0, visibleCount);
  const hasMore = totalFiltered > visibleCount;
  const fIncome = {}, fExpense = {};
  filtered.forEach(tx => { if (tx.type === "income") fIncome[tx.currency] = (fIncome[tx.currency] || 0) + tx.amount; else fExpense[tx.currency] = (fExpense[tx.currency] || 0) + tx.amount; });

  const pill = (active, color) => ({ padding:"6px 12px", borderRadius:9999, border:"none", cursor:"pointer", background: active ? (color || T.celadon) : "transparent", color: active ? "#1A4020" : T.muted, fontWeight: active ? 700 : 500, fontSize:12, fontFamily:"'Noto Sans',sans-serif", transition:"all .2s" });

  return (
    <div style={{ position:"fixed", inset:0, zIndex:500, background:"#F7FCF5", display:"flex", flexDirection:"column" }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, padding:"calc(env(safe-area-inset-top,8px) + 12px) 16px 10px", background:"rgba(247,252,245,0.97)", backdropFilter:"blur(16px)", flexShrink:0 }}>
        <button onClick={onClose} style={{ width:36, height:36, borderRadius:12, border:"none", background:"rgba(45,45,58,0.06)", cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>←</button>
        <div style={{ flex:1, fontWeight:800, fontSize:18, color:T.dark, fontFamily:"'Noto Sans',sans-serif" }}>{t(lang, "txScreenTitle")}</div>
        <div style={{ fontSize:11, color:T.muted }}>{transactions.length} {t(lang, "total")}</div>
      </div>
      <div style={{ padding:"0 16px 8px", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, background:T.surface, borderRadius:14, padding:"8px 14px", boxShadow:T.shadow }}>
          <span style={{ fontSize:14, color:T.muted, flexShrink:0 }}>🔍</span>
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={t(lang, "searchTx")} style={{ flex:1, border:"none", outline:"none", background:"transparent", fontSize:14, color:T.dark, fontFamily:"'Noto Sans',sans-serif" }} />
          {searchQuery && <button onClick={() => setSearchQuery("")} style={{ border:"none", background:"none", cursor:"pointer", fontSize:16, color:T.muted, padding:0 }}>×</button>}
        </div>
      </div>
      {(customDate || customCategoryId) && (
        <div style={{ padding:"0 16px 8px", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 14px", borderRadius:12, background:"rgba(172,225,175,0.15)", border:"1px solid rgba(172,225,175,0.3)" }}>
            <div style={{ flex:1, fontSize:13, fontWeight:600, color:T.dark, fontFamily:"'Noto Sans',sans-serif" }}>
              {customDate && tpl("showingDate", { date: new Date(customDate+"T00:00:00").toLocaleDateString(lang==="th"?"th-TH":lang==="lo"?"lo-LA":"en-US", {month:"long",day:"numeric",year:"numeric"}) })}
              {customCategoryId && tpl("showingCategory", { category: catLabel(findCat(customCategoryId, customCategories), lang) })}
            </div>
            <button onClick={() => { setCustomDate(null); setCustomCategoryId(null); }} style={{ border:"none", background:"rgba(45,45,58,0.08)", borderRadius:8, padding:"4px 10px", fontSize:12, fontWeight:600, color:T.muted, cursor:"pointer", fontFamily:"'Noto Sans',sans-serif", flexShrink:0 }}>× {t(lang,"clearFilter")}</button>
          </div>
        </div>
      )}
      <div style={{ padding:"0 16px 10px", flexShrink:0, display:"flex", flexDirection:"column", gap:6 }}>
        <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
          {[{id:"today",lo:"ມື້ນີ້",th:"วันนี้",en:"Today"},{id:"yesterday",lo:"ມື້ວານ",th:"เมื่อวาน",en:"Yesterday"},{id:"week",lo:"ອາທິດ",th:"สัปดาห์",en:"Week"},{id:"month",lo:"ເດືອນ",th:"เดือน",en:"Month"},{id:"all",lo:"ທັງໝົດ",th:"ทั้งหมด",en:"All"}].map(f =>
            <button key={f.id} onClick={() => { setTxFilter(f.id); setCustomDate(null); setCustomCategoryId(null); }} style={pill(txFilter === f.id)}>{lang === "lo" ? f.lo : lang === "th" ? f.th : f.en}</button>)}
        </div>
        <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
          {[{id:"all",label:lang==="lo"?"ທັງໝົດ":"All"},{id:"LAK",label:"₭ LAK"},{id:"THB",label:"฿ THB"},{id:"USD",label:"$ USD"}].map(c =>
            <button key={c.id} onClick={() => setCurFilter(c.id)} style={{...pill(curFilter === c.id), fontSize:11}}>{c.label}</button>)}
          <div style={{ width:8 }} />
          {[{id:"both",label:t(lang,"typeBoth")},{id:"expense",label:t(lang,"expense")},{id:"income",label:t(lang,"income")}].map(tp =>
            <button key={tp.id} onClick={() => setTypeFilter(tp.id)} style={{...pill(typeFilter === tp.id, tp.id === "expense" ? "rgba(255,179,167,0.3)" : tp.id === "income" ? "rgba(172,225,175,0.3)" : undefined), fontSize:11}}>{tp.label}</button>)}
        </div>
      </div>
      <div style={{ flex:1, overflowY:"auto", WebkitOverflowScrolling:"touch" }}>
        {totalFiltered > 0 ? (<>
          <div style={{ margin:"0 16px 8px", padding:"10px 14px", borderRadius:12, background:"rgba(172,225,175,0.08)", border:"0.5px solid rgba(172,225,175,0.2)" }}>
            <div style={{ fontSize:11, color:T.muted, fontWeight:600, marginBottom:4, fontFamily:"'Noto Sans',sans-serif" }}>{tpl("showingCount", { visible: visible.length, total: totalFiltered })}</div>
            <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
              {Object.entries(fIncome).map(([cur, amt]) => <span key={"i"+cur} style={{ fontSize:13, fontWeight:700, color:"#2A7A40" }}>+{fmt(amt, cur)}</span>)}
              {Object.entries(fExpense).map(([cur, amt]) => <span key={"e"+cur} style={{ fontSize:13, fontWeight:700, color:"#C0392B" }}>−{fmt(amt, cur)}</span>)}
            </div>
          </div>
          <TransactionList transactions={visible} lang={lang} customCategories={customCategories} onEditCategory={onEditTx} onDeleteTx={onDeleteTx} onUpdateNote={onUpdateNote} />
          {hasMore && <div style={{ textAlign:"center", padding:"12px 0" }}><button onClick={() => setVisibleCount(c => c + 50)} style={{ background:"transparent", border:"none", color:"#2A7A40", fontSize:13, fontWeight:600, cursor:"pointer", padding:"8px 16px", fontFamily:"'Noto Sans',sans-serif" }}>{t(lang, "loadMore")} ↓</button></div>}
        </>) : (
          <div style={{ padding:"48px 16px", textAlign:"center", color:T.muted }}><div style={{ fontSize:40, marginBottom:12 }}>🌿</div><div style={{ fontSize:14, fontFamily:"'Noto Sans',sans-serif" }}>{t(lang, "emptyStateFilter")}</div></div>
        )}
        <div style={{ height:16 }} />
      </div>
    </div>
  );
}
