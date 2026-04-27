// Monthly Wrap modal — AI-generated monthly story + stats.
// Pro feature. Fetches from api.phajot.com/monthly-report with
// caching via supabase monthly_reports table.
// Extracted from App.jsx in Session 7.
//
// Includes 3 module-scoped helpers consumed exclusively by this
// modal: getMonthName, buildMonthlyWrapPayload, computePrevMonthExpense
//
// Pre-existing gap flagged for cleanup backlog:
//   - uses supabase client directly instead of lib/db.js wrappers

import { useState, useEffect } from "react";
import Sheet from "../components/Sheet";
import { T, fmt, fmtCompact } from "../lib/theme";
import { i18n, t } from "../lib/i18n";
import { supabase, getAuthHeaders } from "../lib/supabase";
import { fetchWithTimeout, FetchTimeoutError } from "../lib/fetchWithTimeout";

const getMonthName = (month, lang) => {
  const mo = parseInt(month.split("-")[1], 10) - 1;
  return (i18n[lang]?.months || i18n.en.months)[mo];
};

const buildMonthlyWrapPayload = (transactions, month) =>
  transactions
    .filter(tx => tx.date.startsWith(month))
    .map(tx => ({
      d: tx.date,
      t: tx.type === "income" ? "in" : "ex",
      a: Math.round(tx.amount),
      c: tx.currency,
      cat: tx.categoryId || "other",
      n: (tx.description || tx.categoryId || "").slice(0, 40),
    }));

const computePrevMonthExpense = (transactions, month) => {
  const [y, m] = month.split("-").map(Number);
  const pm = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  const exp = {};
  transactions.forEach(tx => {
    if (tx.date.startsWith(pm) && tx.type === "expense")
      exp[tx.currency] = (exp[tx.currency] || 0) + tx.amount;
  });
  return exp;
};

export function MonthlyWrapModal({ open, onClose, profile, transactions }) {
  const { lang, userId } = profile;
  const [narrative, setNarrative] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthName = getMonthName(month, lang);

  const generate = async () => {
    setLoading(true);
    setError(null);
    setNarrative(null);
    setStats(null);

    try {
      // Check cache first
      const { data: cached } = await supabase.from("monthly_reports")
        .select("*").eq("user_id", userId).eq("month", month).maybeSingle();

      const langCol = `narrative_${lang}`;
      if (cached && cached[langCol]) {
        setNarrative(cached[langCol]);
        setStats(cached.stats);
        setLoading(false);
        return;
      }

      // Build payload
      const monthTxs = buildMonthlyWrapPayload(transactions, month);
      if (!monthTxs.length) {
        setError("empty");
        setLoading(false);
        return;
      }

      const prevExp = computePrevMonthExpense(transactions, month);

      const authHeaders = await getAuthHeaders(profile);
      const res = await fetchWithTimeout("https://api.phajot.com/monthly-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          month, lang,
          transactions: monthTxs,
          prev_month_expense: Object.keys(prevExp).length ? prevExp : undefined,
        }),
      }, 30000);
      const data = await res.json();

      if (data.narrative) {
        setNarrative(data.narrative);
        setStats(data.stats);
        // Cache result (upsert handles both insert + update via unique constraint)
        await supabase.from("monthly_reports").upsert({
          user_id: userId, month,
          [langCol]: data.narrative, stats: data.stats,
          generated_at: new Date().toISOString(), generation_model: data.model,
        }, { onConflict: "user_id,month" });
      } else if (data.stats) {
        setStats(data.stats);
        setError("partial");
      } else {
        setError("failed");
      }
    } catch (e) {
      setError(e instanceof FetchTimeoutError ? "timeout" : "failed");
    }
    setLoading(false);
  };

  useEffect(() => { if (open) generate(); }, [open]);

  const modalTitle = lang === "lo" ? `ສະຫຼຸບ${monthName}` : lang === "th" ? `สรุป${monthName}` : `${monthName} Wrap`;

  const StatCard = ({ label, value, sub }) => (
    <div style={{ background:"rgba(45,45,58,0.04)", borderRadius:16, padding:"12px 14px" }}>
      <div style={{ fontSize:10, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:0.6 }}>{label}</div>
      <div style={{ fontSize:15, fontWeight:800, color:T.dark, fontFamily:"'Noto Sans',sans-serif", marginTop:4 }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>{sub}</div>}
    </div>
  );

  return (
    <Sheet open={open} onClose={onClose} title={`📖 ${modalTitle}`} footer={
      <button onClick={onClose} style={{ width:"100%", padding:14, borderRadius:16, border:"none", cursor:"pointer",
        background:"linear-gradient(145deg,#ACE1AF,#7BC8A4)", color:"#1A4020", fontWeight:800, fontSize:14,
        fontFamily:"'Noto Sans',sans-serif", boxShadow:"0 4px 16px rgba(172,225,175,0.4)" }}>
        {t(lang,"wrap_close")}
      </button>
    }>
      <div style={{ paddingBottom:16 }}>
        {/* Loading */}
        {loading && (
          <div style={{ textAlign:"center", padding:"48px 16px" }}>
            <div style={{ fontSize:14, color:T.muted, fontWeight:600, fontFamily:"'Noto Sans',sans-serif", marginBottom:12 }}>
              {t(lang,"wrap_generating")}
            </div>
            <div style={{ display:"flex", gap:5, justifyContent:"center" }}>
              {[0,1,2].map(i => <div key={i} style={{ width:7, height:7, borderRadius:"50%", background:T.muted, animation:`bounce .9s ease ${i*0.2}s infinite` }}/>)}
            </div>
          </div>
        )}

        {/* Empty month */}
        {error === "empty" && (
          <div style={{ textAlign:"center", padding:"48px 16px" }}>
            <div style={{ fontSize:40, marginBottom:12 }}>📖</div>
            <div style={{ fontSize:14, color:T.muted, fontFamily:"'Noto Sans',sans-serif", lineHeight:1.6 }}>
              {t(lang,"wrap_empty")}
            </div>
          </div>
        )}

        {/* Error with retry */}
        {error === "failed" && (
          <div style={{ textAlign:"center", padding:"48px 16px" }}>
            <div style={{ fontSize:14, color:T.muted, fontFamily:"'Noto Sans',sans-serif", marginBottom:16 }}>
              {t(lang,"wrap_error")}
            </div>
            <button onClick={generate} style={{ padding:"10px 24px", borderRadius:14, border:"none", cursor:"pointer",
              background:T.celadon, fontWeight:700, fontSize:13, color:"#1A4020", fontFamily:"'Noto Sans',sans-serif" }}>
              {t(lang,"wrap_retry")}
            </button>
          </div>
        )}

        {error === "timeout" && (
          <div style={{ textAlign:"center", padding:"48px 16px" }}>
            <div style={{ fontSize:14, color:T.muted, fontFamily:"'Noto Sans',sans-serif", marginBottom:16 }}>
              {t(lang,"wrap_timeout")}
            </div>
            <button onClick={generate} style={{ padding:"10px 24px", borderRadius:14, border:"none", cursor:"pointer",
              background:T.celadon, fontWeight:700, fontSize:13, color:"#1A4020", fontFamily:"'Noto Sans',sans-serif" }}>
              {t(lang,"wrap_retry")}
            </button>
          </div>
        )}

        {/* Partial success — stats but no narrative */}
        {error === "partial" && (
          <div style={{ fontSize:13, color:T.muted, fontFamily:"'Noto Sans',sans-serif", textAlign:"center",
            padding:"12px 16px", background:"rgba(172,225,175,0.1)", borderRadius:14, marginBottom:16 }}>
            {t(lang,"wrap_partial")}
          </div>
        )}

        {/* Narrative */}
        {narrative && (
          <div style={{ fontSize:14, lineHeight:1.7, color:T.dark, fontFamily:"'Noto Sans',sans-serif",
            padding:"8px 0 20px", fontWeight:400 }}>
            {narrative}
          </div>
        )}

        {/* Stats grid */}
        {stats && !loading && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <StatCard label={t(lang,"wrap_total_expense")}
              value={Object.entries(stats.total_expense).map(([c,a]) => fmtCompact(a,c)).join(", ") || "—"} />
            <StatCard label={t(lang,"wrap_total_income")}
              value={Object.entries(stats.total_income).map(([c,a]) => fmtCompact(a,c)).join(", ") || "—"} />
            {stats.top_category && (
              <StatCard label={t(lang,"wrap_top_category")}
                value={`${stats.top_category.name}`}
                sub={fmt(stats.top_category.amount, stats.top_category.currency)} />
            )}
            {stats.biggest_day && (
              <StatCard label={t(lang,"wrap_biggest_day")}
                value={stats.biggest_day.date.slice(5)}
                sub={fmt(stats.biggest_day.amount, stats.biggest_day.currency)} />
            )}
            <StatCard label={t(lang,"wrap_active_days")}
              value={`${stats.active_days} / ${stats.days_in_month}`} />
            {stats.vs_last_month && Object.keys(stats.vs_last_month).length > 0 && (
              <StatCard label={t(lang,"wrap_vs_last")}
                value={Object.entries(stats.vs_last_month).map(([c,pct]) =>
                  `${pct > 0 ? "+" : ""}${pct}%`
                ).join(", ")}
                sub={Object.keys(stats.vs_last_month).join(", ")} />
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
}
