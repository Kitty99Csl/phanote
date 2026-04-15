// Budget screen — per-category-per-currency monthly budget tracking.
// Extracted from App.jsx in Session 7.
//
// Pre-existing gaps flagged for cleanup backlog:
//   - 100% hardcoded English (ZERO i18n keys — worst offender in app)
//   - uses "en-US" locale for month name formatting
//   - direct supabase usage instead of lib/db.js wrappers

import { useState, useEffect } from "react";
import { T, fmt } from "../lib/theme";
import { DEFAULT_EXPENSE_CATS, catLabel } from "../lib/categories";
import { supabase } from "../lib/supabase";
import { Flag } from "../components/Flag";
import { SetBudgetModal } from "../modals/SetBudgetModal";

export function BudgetScreen({ profile, transactions }) {
  const { lang, baseCurrency, customCategories = [], userId } = profile;
  const [selectedCur, setSelectedCur] = useState(baseCurrency || "LAK");
  const [budgets, setBudgets] = useState({});
  const [editCat, setEditCat] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    supabase.from("budgets").select("*").eq("user_id", userId)
      .then(({ data }) => {
        if (data) {
          const map = {};
          data.forEach(b => { map[`${b.category_id}_${b.currency}`] = Number(b.monthly_limit); });
          setBudgets(map);
        }
        setLoading(false);
      });
  }, [userId]);

  const saveBudget = async (catId, currency, amount) => {
    const key = `${catId}_${currency}`;
    setBudgets(prev => amount > 0
      ? { ...prev, [key]: amount }
      : Object.fromEntries(Object.entries(prev).filter(([k]) => k !== key))
    );
    try {
      const res = amount > 0
        ? await supabase.from("budgets").upsert({
            user_id: userId, category_id: catId, currency, monthly_limit: amount,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id,category_id,currency" })
        : await supabase.from("budgets").delete().eq("user_id", userId).eq("category_id", catId).eq("currency", currency);
      if (res.error) throw res.error;
    } catch (e) {
      console.error("Budget save error:", e);
      throw e;
    }
  };

  const now = new Date();
  const monthlyExpenses = transactions.filter(tx => {
    const d = new Date(tx.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      && tx.currency === selectedCur && tx.type === "expense";
  });
  const spentByCat = {};
  monthlyExpenses.forEach(tx => { spentByCat[tx.categoryId] = (spentByCat[tx.categoryId] || 0) + tx.amount; });
  const totalSpent = monthlyExpenses.reduce((s, tx) => s + tx.amount, 0);
  const totalBudget = Object.entries(budgets).filter(([k]) => k.endsWith(`_${selectedCur}`)).reduce((s, [, v]) => s + v, 0);
  const totalPct = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;
  const getColor = (pct) => pct >= 100 ? "#C0392B" : pct >= 80 ? "#d4993a" : "#3da873";
  const getStatus = (pct) => pct >= 100 ? "⚠️ Over budget" : pct >= 80 ? "⚡ Almost there" : "✓ On track";
  const allExpCats = [...DEFAULT_EXPENSE_CATS, ...customCategories.filter(c => c.type === "expense")];
  const monthName = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div style={{ padding:"calc(env(safe-area-inset-top, 8px) + 8px) 16px calc(env(safe-area-inset-bottom,0px) + 80px)", position:"relative", zIndex:1 }}>
      <div style={{ fontWeight:800, fontSize:22, color:T.dark, fontFamily:"'Noto Sans',sans-serif", marginBottom:2 }}>Budget 💰</div>
      <div style={{ fontSize:12, color:T.muted, marginBottom:20 }}>{monthName}</div>
      <div style={{ display:"flex", gap:8, marginBottom:20 }}>
        {["LAK","THB","USD"].map(cur => (
          <button key={cur} onClick={() => setSelectedCur(cur)} style={{
            flex:1, padding:"9px 0", borderRadius:14, border:"none", cursor:"pointer",
            background: selectedCur === cur ? T.celadon : "rgba(45,45,58,0.06)",
            fontWeight:700, fontSize:13, color: selectedCur === cur ? "#1A4020" : T.muted,
            fontFamily:"'Noto Sans',sans-serif", transition:"all .2s",
            display:"flex", alignItems:"center", justifyContent:"center", gap:5,
          }}>
            <Flag code={cur} size={16}/> {cur}
          </button>
        ))}
      </div>
      {totalBudget > 0 && (
        <div style={{ background:T.surface, backdropFilter:"blur(20px)", borderRadius:22,
          padding:"18px 20px", boxShadow:T.shadow, marginBottom:18 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:14 }}>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:0.8 }}>Total Spent</div>
              <div style={{ fontSize:26, fontWeight:800, color:T.dark, fontFamily:"'Noto Sans',sans-serif", marginTop:3 }}>{fmt(totalSpent, selectedCur)}</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:0.8 }}>of</div>
              <div style={{ fontSize:17, fontWeight:700, color:T.dark, fontFamily:"'Noto Sans',sans-serif", marginTop:3 }}>{fmt(totalBudget, selectedCur)}</div>
            </div>
          </div>
          <div style={{ height:10, background:"rgba(45,45,58,0.08)", borderRadius:99, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${totalPct}%`, borderRadius:99,
              background:getColor(totalPct), transition:"width .6s cubic-bezier(.34,1.2,.64,1)" }} />
          </div>
          <div style={{ marginTop:8, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ fontSize:12, color:getColor(totalPct), fontWeight:700 }}>{getStatus(totalPct)}</div>
            <div style={{ fontSize:12, color:T.muted }}>{fmt(Math.max(totalBudget - totalSpent, 0), selectedCur)} left</div>
          </div>
        </div>
      )}
      <div style={{ fontSize:10, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:1.2, marginBottom:10, fontFamily:"'Noto Sans',sans-serif" }}>Categories</div>
      <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:16 }}>
        {allExpCats.map(cat => {
          const key = `${cat.id}_${selectedCur}`;
          const limit = budgets[key] || 0;
          const spent = spentByCat[cat.id] || 0;
          const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
          const color = getColor(pct);
          const hasActivity = spent > 0 || limit > 0;
          return (
            <div key={cat.id} onClick={() => setEditCat(cat)}
              style={{ background:T.surface, backdropFilter:"blur(20px)", borderRadius:18,
                padding:"13px 16px", boxShadow:T.shadow, cursor:"pointer",
                opacity: hasActivity ? 1 : 0.55, transition:"all .15s" }}
              onPointerDown={e => e.currentTarget.style.transform = "scale(0.985)"}
              onPointerUp={e => e.currentTarget.style.transform = "scale(1)"}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:42, height:42, borderRadius:14, flexShrink:0,
                  background: hasActivity ? "rgba(255,179,167,0.2)" : "rgba(45,45,58,0.05)",
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>{cat.emoji}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:14, color:T.dark, fontFamily:"'Noto Sans',sans-serif" }}>{catLabel(cat, lang)}</div>
                  <div style={{ fontSize:11, color:T.muted, marginTop:1 }}>
                    {limit > 0 ? `${fmt(spent, selectedCur)} / ${fmt(limit, selectedCur)}` : spent > 0 ? `${fmt(spent, selectedCur)} spent` : "Tap to set limit"}
                  </div>
                </div>
                <div style={{ flexShrink:0, textAlign:"right" }}>
                  {limit > 0
                    ? <div style={{ fontSize:14, fontWeight:800, color, fontFamily:"'Noto Sans',sans-serif" }}>{Math.round(pct)}%</div>
                    : <div style={{ fontSize:11, color:"#ACE1AF", fontWeight:700 }}>+ Set</div>}
                </div>
              </div>
              {limit > 0 && (
                <div style={{ marginTop:10, height:5, background:"rgba(45,45,58,0.08)", borderRadius:99, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${pct}%`, background:color, borderRadius:99,
                    transition:"width .6s cubic-bezier(.34,1.2,.64,1)" }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {!loading && totalBudget === 0 && (
        <div style={{ textAlign:"center", padding:"8px 0 16px" }}>
          <div style={{ fontSize:13, color:T.muted, lineHeight:1.6 }}>Tap any category above to set a monthly spending limit 👆</div>
        </div>
      )}
      {editCat && (
        <SetBudgetModal cat={editCat} currency={selectedCur}
          currentLimit={budgets[`${editCat.id}_${selectedCur}`] || 0}
          spent={spentByCat[editCat.id] || 0} lang={lang}
          onSave={amount => saveBudget(editCat.id, selectedCur, amount)}
          onClose={() => setEditCat(null)} />
      )}
    </div>
  );
}
