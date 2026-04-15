// Statement Scan Flow — Pro feature for importing bank statements.
// Full-screen 6-step flow: currency → upload → loading → review → saving → done.
// Launched from Settings → Tools → Bank statement scan (Pro only).
// Supports LDB, JDB, and BCEL via Gemini Vision OCR.
// Extracted from App.jsx in Session 7.
//
// Pre-existing gaps flagged for cleanup backlog:
//   - Mid-function useState declarations (catPickerIdx, editingField)
//     are at L1421-1422 of original App.jsx (inside the function body,
//     after several closures). React hook order depends on their
//     current position. DO NOT hoist to top without testing.
//   - Direct supabase client usage (load batch history + delete batch)
//     instead of lib/db.js wrappers (5th file in the migration cleanup).
//   - Inline `tpl` i18n template helper — duplicate of TransactionsScreen's
//     pattern. Hoist both to lib/i18n.js in a shared utility.
//   - Hardcoded English strings mixed with i18n keys (see cleanup notes).
//   - Uses crypto.randomUUID() with no fallback (modern browsers only).
//   - Bulk insert loops onAdd with 50ms throttle — slow for 100+ tx.

import { useState, useEffect, useRef } from "react";
import { useClickGuard } from "../hooks/useClickGuard";
import { fetchWithTimeout, FetchTimeoutError } from "../lib/fetchWithTimeout";
import { T, CURR, fmt } from "../lib/theme";
import { t } from "../lib/i18n";
import {
  DEFAULT_EXPENSE_CATS,
  DEFAULT_INCOME_CATS,
  findCat,
  catLabel,
  normalizeCategory,
} from "../lib/categories";
import { txDedupKey } from "../lib/constants";
import { supabase } from "../lib/supabase";
import { Flag } from "../components/Flag";
import { ConfirmSheet } from "../components/ConfirmSheet";

export function StatementScanFlow({ profile, lang, onClose, onAdd, customCategories=[], onImportDone=()=>{}, onDeleteBatch=()=>{}, transactions=[] }) {
  const [step, setStep] = useState("currency"); // currency | upload | loading | review | saving | done
  const [currency, setCurrency] = useState(null);
  const [images, setImages] = useState([]); // [{file, preview, data, mimeType}]
  const [error, setError] = useState(null);
  const [txs, setTxs] = useState([]);
  const [stats, setStats] = useState(null);
  const [bank, setBank] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [saveProgress, setSaveProgress] = useState(0);
  const [detectedCurrency, setDetectedCurrency] = useState(null);
  const [currencyMismatch, setCurrencyMismatch] = useState(false);
  const [batchHistory, setBatchHistory] = useState([]);
  const [viewBatchId, setViewBatchId] = useState(null);
  const [pendingDeleteBatch, setPendingDeleteBatch] = useState(null);
  const fileRef = useRef();
  const imagesRef = useRef(images);
  const { busy: importing, run: runImport } = useClickGuard();

  // ── Load batch import history ──
  useEffect(() => {
    if (!profile?.userId) return;
    supabase.from("transactions").select("batch_id,created_at,description,currency,type,amount")
      .eq("user_id", profile.userId).eq("is_deleted", false).not("batch_id", "is", null)
      .order("created_at", { ascending: false }).limit(100)
      .then(({ data }) => {
        if (!data || data.length === 0) { setBatchHistory([]); return; }
        const groups = {};
        data.forEach(tx => {
          if (!groups[tx.batch_id]) groups[tx.batch_id] = { batch_id: tx.batch_id, imported_at: tx.created_at, tx_count: 0, currency: tx.currency, txs: [] };
          groups[tx.batch_id].tx_count++;
          groups[tx.batch_id].txs.push(tx);
        });
        setBatchHistory(Object.values(groups).sort((a, b) => new Date(b.imported_at) - new Date(a.imported_at)).slice(0, 10));
      }).catch(() => {});
  }, [profile?.userId, step === "done"]);

  const deleteBatch = async (batchId) => {
    try {
      await supabase.from("transactions").update({ is_deleted: true }).eq("batch_id", batchId).eq("user_id", profile?.userId);
      setBatchHistory(prev => prev.filter(b => b.batch_id !== batchId));
      onDeleteBatch(batchId);
      setViewBatchId(null);
    } catch (e) { console.error("Delete batch error:", e); }
  };

  const fmtRelative = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return mins <= 1 ? "just now" : `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  const tpl = (key, vars={}) => {
    let s = t(lang, key);
    Object.entries(vars).forEach(([k,v]) => { s = s.replace(`{${k}}`, v); });
    return s;
  };

  // ── Step 1: Currency picker ──
  const handleCurrencyNext = () => { if (currency) setStep("upload"); };

  // ── Step 2: File handling ──
  const handleFiles = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    const remaining = 10 - images.length;
    const batch = files.slice(0, remaining);
    const newImgs = batch.map(file => ({
      file, preview: URL.createObjectURL(file),
      mimeType: file.type || "image/jpeg",
    }));
    setImages(prev => [...prev, ...newImgs]);
  };
  const removeImage = (idx) => {
    const removed = images[idx];
    if (removed?.preview) URL.revokeObjectURL(removed.preview);
    setImages(prev => prev.filter((_, i) => i !== idx));
  };

  // Keep ref in sync + cleanup blob URLs on unmount
  useEffect(() => { imagesRef.current = images; }, [images]);
  useEffect(() => () => { imagesRef.current.forEach(img => { if (img?.preview) URL.revokeObjectURL(img.preview); }); }, []);

  // ── Step 3: Scan ──
  const handleScan = async () => {
    setStep("loading");
    setError(null);
    try {
      // Convert all images to base64
      const encoded = await Promise.all(images.map(img =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve({ data: reader.result.split(",")[1], mimeType: img.mimeType });
          reader.onerror = reject;
          reader.readAsDataURL(img.file);
        })
      ));

      const res = await fetchWithTimeout("https://api.phajot.com/parse-statement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: encoded, currency, userId: profile?.userId }),
      }, 60000);

      const data = await res.json();
      if (!res.ok || data.error) {
        const s = res.status;
        setError(s === 429 ? tpl("statementErrorRateLimit")
          : s >= 500 ? tpl("statementErrorParse")
          : tpl("statementErrorParse"));
        setStep("upload");
        return;
      }

      // Check currency mismatch
      if (data.currency && data.currency !== currency) {
        setDetectedCurrency(data.currency);
        setCurrencyMismatch(true);
      }

      // Cross-session dedup: mark transactions that already exist in user's records
      const existingKeys = new Set(transactions.map(tx => txDedupKey(tx)));
      const parsed = (data.transactions || []).map((tx, i) => ({
        ...tx,
        _idx: i,
        currency: data.currency || currency,
        categoryId: normalizeCategory(tx.category || "other", tx.type || "expense"),
        _isDuplicate: existingKeys.has(txDedupKey({ ...tx, amount: tx.amount, description: tx.description, date: tx.date })),
      }));
      setTxs(parsed);
      setStats({ ...(data.stats || {}), alreadyImported: parsed.filter(t => t._isDuplicate).length });
      setBank(data.bank);
      setSelected(new Set(parsed.map((tx, i) => tx._isDuplicate ? null : i).filter(i => i !== null)));
      setStep("review");

    } catch (e) {
      setError(e instanceof FetchTimeoutError ? tpl("statementErrorTimeout") : tpl("statementErrorNetwork"));
      setStep("upload");
    }
  };

  // ── Currency mismatch resolution ──
  const resolveCurrency = (chosen) => {
    setCurrencyMismatch(false);
    if (chosen !== currency) {
      setCurrency(chosen);
      setTxs(prev => prev.map(tx => ({ ...tx, currency: chosen })));
    }
  };

  // ── Step 4: Toggle selection ──
  const toggleSelect = (idx) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  // ── Inline editing helpers ──
  const [catPickerIdx, setCatPickerIdx] = useState(null);
  const [editingField, setEditingField] = useState(null); // {idx, field, value}
  const updateTx = (idx, updates) => setTxs(prev => prev.map((t, i) => i === idx ? { ...t, ...updates } : t));
  const changeCat = (idx, catId) => { updateTx(idx, { categoryId: catId }); setCatPickerIdx(null); };
  const commitEdit = () => {
    if (!editingField) return;
    const { idx, field, value } = editingField;
    if (field === "amount") {
      const n = parseFloat(String(value).replace(/,/g, ""));
      if (isFinite(n) && n > 0) updateTx(idx, { amount: n });
    } else if (field === "description") {
      updateTx(idx, { description: value });
    }
    setEditingField(null);
  };
  const toggleType = (idx) => {
    const tx = txs[idx];
    const newType = tx.type === "expense" ? "income" : "expense";
    const newCats = newType === "income" ? DEFAULT_INCOME_CATS : DEFAULT_EXPENSE_CATS;
    const catValid = newCats.find(c => c.id === tx.categoryId);
    updateTx(idx, { type: newType, ...(catValid ? {} : { categoryId: newCats[0].id }) });
  };

  // ── Step 5: Bulk save ──
  const handleImport = () => runImport(async () => {
    const toSave = txs.filter((_, i) => selected.has(i));
    const batchId = crypto.randomUUID();
    setStep("saving");
    setSaveProgress(0);
    for (let i = 0; i < toSave.length; i++) {
      const tx = toSave[i];
      const cat = findCat(tx.categoryId, customCategories);
      const txObj = {
        id: `tx_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        amount: tx.amount,
        currency: tx.currency || currency,
        type: tx.type || "expense",
        categoryId: tx.categoryId,
        description: tx.description || "",
        note: JSON.stringify({ source: "statement", bank: bank, ref: tx.ref_number || null }),
        date: tx.date || new Date().toISOString().split("T")[0],
        confidence: 0.9,
        createdAt: new Date().toISOString(),
        rawInput: "statement-scan",
        batchId,
      };
      onAdd(txObj);
      setSaveProgress(i + 1);
      // Small delay to avoid UI freeze
      if (i % 5 === 4) await new Promise(r => setTimeout(r, 50));
    }
    setStep("done");
  });

  // ── Shared styles ──
  const headerStyle = { display:"flex", alignItems:"center", gap:12, padding:"calc(env(safe-area-inset-top,8px) + 12px) 20px 12px" };
  const backBtn = (action) => (
    <button onClick={action} style={{ width:36, height:36, borderRadius:12, border:"none", background:"rgba(45,45,58,0.06)", cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>←</button>
  );
  const primaryBtn = (label, onClick, disabled=false) => (
    <button onClick={onClick} disabled={disabled} style={{ width:"100%", padding:"16px", borderRadius:18, border:"none", background:disabled?"rgba(45,45,58,0.1)":"#1A4020", color:disabled?T.muted:"#fff", fontSize:15, fontWeight:800, cursor:disabled?"default":"pointer", fontFamily:"'Noto Sans',sans-serif", opacity:disabled?0.5:1 }}>{label}</button>
  );

  return (
    <div style={{ position:"fixed", inset:0, zIndex:500, background:"#F7FCF5", overflowY:"auto", WebkitOverflowScrolling:"touch", display:"flex", flexDirection:"column" }}>

      {/* ── STEP 1: Currency picker ── */}
      {step === "currency" && (<>
        <div style={headerStyle}>
          {backBtn(onClose)}
          <div style={{ flex:1, fontWeight:800, fontSize:18, color:T.dark, fontFamily:"'Noto Sans',sans-serif" }}>{tpl("statementPickCurrency")}</div>
        </div>
        <div style={{ padding:"0 20px", flex:1 }}>
          <div style={{ fontSize:13, color:T.muted, marginBottom:20, lineHeight:1.5 }}>{tpl("statementPickCurrencyHint")}</div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {Object.entries(CURR).map(([code, c]) => (
              <button key={code} onClick={() => setCurrency(code)} style={{
                display:"flex", alignItems:"center", gap:14, padding:"16px 18px", borderRadius:18, border:"none", cursor:"pointer",
                background: currency === code ? "rgba(172,225,175,0.25)" : T.surface, boxShadow: currency === code ? "0 2px 12px rgba(172,225,175,0.4)" : T.shadow,
                transform: currency === code ? "scale(1.02)" : "scale(1)", transition:"all .2s ease",
              }}>
                <Flag code={code} size={28} />
                <div style={{ flex:1, textAlign:"left" }}>
                  <div style={{ fontSize:16, fontWeight:700, color:T.dark, fontFamily:"'Noto Sans',sans-serif" }}>{code}</div>
                  <div style={{ fontSize:12, color:T.muted }}>{c.name}</div>
                </div>
                {currency === code && <div style={{ fontSize:18, color:"#2A7A40" }}>✓</div>}
              </button>
            ))}
          </div>
          {/* ── Recent imports history ── */}
          {batchHistory.length > 0 && (
            <div style={{ marginTop:24, padding:16, borderRadius:16, background:"rgba(172,225,175,0.08)", border:"1px solid rgba(172,225,175,0.2)" }}>
              <div style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:1.4, marginBottom:10, fontFamily:"'Noto Sans',sans-serif" }}>
                📋 {lang === "lo" ? "ການນຳເຂົ້າຫຼ້າສຸດ" : "Recent imports"}
              </div>
              {batchHistory.slice(0, 3).map(batch => (
                <button key={batch.batch_id} onClick={() => setViewBatchId(batch.batch_id)} style={{
                  width:"100%", padding:"12px", borderRadius:12, background:"#fff", marginBottom:8, cursor:"pointer", border:"none",
                  display:"flex", justifyContent:"space-between", alignItems:"center", textAlign:"left", fontFamily:"'Noto Sans',sans-serif",
                }}>
                  <div>
                    <div style={{ fontWeight:600, fontSize:14, color:T.dark }}>{batch.currency || "?"} · {batch.tx_count} tx</div>
                    <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>{fmtRelative(batch.imported_at)}</div>
                  </div>
                  <div style={{ color:T.muted, fontSize:14 }}>›</div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div style={{ padding:"16px 20px calc(env(safe-area-inset-bottom,0px) + 16px)" }}>
          {primaryBtn(tpl("statementNext"), handleCurrencyNext, !currency)}
        </div>

        {/* ── Batch detail modal ── */}
        {viewBatchId && (() => {
          const batch = batchHistory.find(b => b.batch_id === viewBatchId);
          if (!batch) return null;
          return (
            <div style={{ position:"fixed", inset:0, zIndex:600, background:"rgba(30,30,40,0.6)", backdropFilter:"blur(4px)", display:"flex", alignItems:"flex-end", justifyContent:"center" }}
              onClick={() => setViewBatchId(null)}>
              <div onClick={e => e.stopPropagation()} style={{ width:"100%", maxWidth:420, background:"#fff", borderRadius:"24px 24px 0 0", padding:"20px 20px calc(env(safe-area-inset-bottom,0px) + 20px)", maxHeight:"70vh", overflowY:"auto" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                  <div style={{ fontWeight:800, fontSize:18, color:T.dark, fontFamily:"'Noto Sans',sans-serif" }}>
                    {lang === "lo" ? "ລາຍລະອຽດການນຳເຂົ້າ" : "Import details"}
                  </div>
                  <button onClick={() => setViewBatchId(null)} style={{ border:"none", background:"none", fontSize:20, color:T.muted, cursor:"pointer" }}>×</button>
                </div>
                <div style={{ display:"flex", gap:12, marginBottom:16 }}>
                  <div style={{ background:"rgba(172,225,175,0.15)", borderRadius:12, padding:"8px 14px", fontSize:13, fontWeight:600, color:T.dark }}>{batch.currency}</div>
                  <div style={{ background:"rgba(172,225,175,0.15)", borderRadius:12, padding:"8px 14px", fontSize:13, fontWeight:600, color:T.dark }}>{batch.tx_count} transactions</div>
                  <div style={{ background:"rgba(45,45,58,0.06)", borderRadius:12, padding:"8px 14px", fontSize:13, color:T.muted }}>{fmtRelative(batch.imported_at)}</div>
                </div>
                {batch.txs.slice(0, 5).map((tx, i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid rgba(45,45,58,0.06)", fontSize:13 }}>
                    <div style={{ color:T.dark, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{tx.description || "—"}</div>
                    <div style={{ color: tx.type === "expense" ? "#C0392B" : "#2A7A40", fontWeight:700, flexShrink:0, marginLeft:12 }}>
                      {tx.type === "expense" ? "-" : "+"}{fmt(tx.amount, tx.currency)}
                    </div>
                  </div>
                ))}
                {batch.tx_count > 5 && <div style={{ fontSize:12, color:T.muted, padding:"8px 0", textAlign:"center" }}>+{batch.tx_count - 5} more</div>}
                <div style={{ display:"flex", gap:10, marginTop:20 }}>
                  <button onClick={() => setViewBatchId(null)} style={{ flex:1, padding:"14px", borderRadius:16, border:"none", background:"rgba(45,45,58,0.08)", color:T.dark, fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"'Noto Sans',sans-serif" }}>
                    {lang === "lo" ? "ປິດ" : "Close"}
                  </button>
                  <button onClick={() => setPendingDeleteBatch(batch)}
                    style={{ flex:1, padding:"14px", borderRadius:16, border:"none", background:"rgba(192,57,43,0.1)", color:"#C0392B", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"'Noto Sans',sans-serif" }}>
                    {lang === "lo" ? `ລົບທັງໝົດ (${batch.tx_count})` : `Delete all (${batch.tx_count})`}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </>)}

      {/* ── STEP 2: Upload images ── */}
      {step === "upload" && (<>
        <div style={headerStyle}>
          {backBtn(() => setStep("currency"))}
          <div style={{ flex:1, fontWeight:800, fontSize:18, color:T.dark, fontFamily:"'Noto Sans',sans-serif" }}>{tpl("statementUploadTitle")}</div>
          <div style={{ fontSize:12, color:T.muted, fontWeight:600 }}>{images.length}/10</div>
        </div>
        <div style={{ padding:"0 20px", flex:1 }}>
          <div style={{ fontSize:13, color:T.muted, marginBottom:16, lineHeight:1.5 }}>{tpl("statementUploadHint")}</div>
          {error && (
            <div style={{ background:"rgba(255,179,167,0.15)", borderRadius:14, padding:"12px 16px", marginBottom:16, fontSize:13, color:"#C0392B", lineHeight:1.4 }}>
              {error}
            </div>
          )}
          {/* Thumbnail grid */}
          {images.length > 0 && (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:16 }}>
              {images.map((img, i) => (
                <div key={i} style={{ position:"relative", borderRadius:12, overflow:"hidden", aspectRatio:"3/4", background:"rgba(45,45,58,0.06)" }}>
                  <img src={img.preview} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                  <button onClick={() => removeImage(i)} style={{ position:"absolute", top:4, right:4, width:24, height:24, borderRadius:12, border:"none", background:"rgba(0,0,0,0.5)", color:"#fff", fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
                </div>
              ))}
            </div>
          )}
          {/* Add button */}
          {images.length < 10 && (
            <button onClick={() => fileRef.current?.click()} style={{
              width:"100%", padding:"20px", borderRadius:18, border:"2px dashed rgba(172,225,175,0.5)", background:"rgba(172,225,175,0.08)",
              cursor:"pointer", fontSize:14, fontWeight:600, color:"#2A7A40", fontFamily:"'Noto Sans',sans-serif", textAlign:"center",
            }}>
              📷 {tpl("statementUploadButton")}
            </button>
          )}
          {images.length >= 10 && (
            <div style={{ fontSize:12, color:T.muted, textAlign:"center", padding:8 }}>{tpl("statementMaxImages")}</div>
          )}
          <input ref={fileRef} type="file" accept="image/*" multiple style={{ display:"none" }} onChange={handleFiles} />
        </div>
        <div style={{ padding:"16px 20px calc(env(safe-area-inset-bottom,0px) + 16px)" }}>
          {primaryBtn(tpl("statementScanButton"), handleScan, images.length === 0)}
        </div>
      </>)}

      {/* ── STEP 3: Loading ── */}
      {step === "loading" && (
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:40, gap:16 }}>
          <div style={{ width:60, height:60, borderRadius:20, background:"rgba(172,225,175,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, animation:"pulse 1.5s ease infinite" }}>📄</div>
          <div style={{ fontSize:16, fontWeight:700, color:T.dark, fontFamily:"'Noto Sans',sans-serif" }}>{tpl("statementScanning", { n: images.length })}</div>
          <div style={{ fontSize:13, color:T.muted }}>{tpl("statementScanningHint")}</div>
          <style>{`@keyframes pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.6; transform:scale(0.95); } }`}</style>
        </div>
      )}

      {/* ── STEP 4: Review ── */}
      {step === "review" && (<>
        <div style={headerStyle}>
          {backBtn(() => { setStep("upload"); setTxs([]); setStats(null); })}
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:800, fontSize:18, color:T.dark, fontFamily:"'Noto Sans',sans-serif" }}>{tpl("statementReviewTitle")}</div>
            <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>
              {bank && <span style={{ fontWeight:700, marginRight:6 }}>{bank}</span>}
              {tpl("statementReviewStats", { n: txs.length })}
              {stats?.duplicates_removed > 0 && <span> {tpl("statementReviewDuplicates", { n: stats.duplicates_removed })}</span>}
              {stats?.alreadyImported > 0 && <span> · {tpl("alreadyImported", { n: stats.alreadyImported })}</span>}
            </div>
          </div>
        </div>

        {/* All duplicates banner */}
        {txs.length > 0 && txs.every(tx => tx._isDuplicate) && (
          <div style={{ margin:"0 20px 12px", padding:"14px 16px", borderRadius:12, background:"rgba(245,197,24,0.12)", border:"1px solid rgba(245,197,24,0.3)", fontSize:13, color:"#5C4500", lineHeight:1.4 }}>
            ⚠️ {t(lang, "allDuplicatesWarning")}
          </div>
        )}

        {/* Currency mismatch warning */}
        {currencyMismatch && detectedCurrency && (
          <div style={{ margin:"0 20px 12px", background:"rgba(245,197,24,0.15)", borderRadius:14, padding:"14px 16px" }}>
            <div style={{ fontSize:13, fontWeight:600, color:"#7A5A00", marginBottom:10, lineHeight:1.4 }}>
              {tpl("statementCurrencyMismatch", { detected: detectedCurrency, selected: currency })}
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => resolveCurrency(detectedCurrency)} style={{ flex:1, padding:"10px", borderRadius:12, border:"none", background:"#F5C518", color:"#7A3E00", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"'Noto Sans',sans-serif" }}>
                {tpl("statementCurrencyUseDetected", { detected: detectedCurrency })}
              </button>
              <button onClick={() => resolveCurrency(currency)} style={{ flex:1, padding:"10px", borderRadius:12, border:"none", background:"rgba(45,45,58,0.08)", color:T.dark, fontWeight:600, fontSize:12, cursor:"pointer", fontFamily:"'Noto Sans',sans-serif" }}>
                {tpl("statementCurrencyUseSelected", { selected: currency })}
              </button>
            </div>
          </div>
        )}

        {/* Transaction list */}
        <div style={{ flex:1, overflowY:"auto", padding:"0 20px" }}>
          {txs.length === 0 ? (
            <div style={{ padding:40, textAlign:"center" }}>
              <div style={{ fontSize:40, marginBottom:12 }}>📭</div>
              <div style={{ fontSize:16, fontWeight:600, color:T.dark, marginBottom:6, fontFamily:"'Noto Sans',sans-serif" }}>
                {lang === "lo" ? "ບໍ່ພົບທຸລະກຳ" : "No transactions found"}
              </div>
              <div style={{ fontSize:13, color:T.muted, lineHeight:1.5 }}>
                {lang === "lo" ? "ລອງອັບໂຫຼດຮູບທີ່ຊັດເຈນກວ່າ ຫຼື ເລືອກທະນາຄານອື່ນ" : "Try clearer images or a different bank app screenshot"}
              </div>
              <button onClick={() => { setStep("upload"); setTxs([]); setStats(null); }} style={{ marginTop:16, padding:"10px 24px", borderRadius:14, border:"none", background:"rgba(45,45,58,0.08)", color:T.dark, fontWeight:600, fontSize:13, cursor:"pointer", fontFamily:"'Noto Sans',sans-serif" }}>
                {lang === "lo" ? "ລອງໃໝ່" : "Try again"}
              </button>
            </div>
          ) : txs.map((tx, i) => {
            const cat = findCat(tx.categoryId, customCategories);
            const isExp = tx.type === "expense";
            const on = selected.has(i);
            const isEditingDesc = editingField?.idx === i && editingField?.field === "description";
            const isEditingAmt = editingField?.idx === i && editingField?.field === "amount";
            return (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 0", borderBottom:"1px solid rgba(45,45,58,0.06)", opacity: on ? 1 : 0.4 }}>
                <button onClick={() => toggleSelect(i)} style={{ width:24, height:24, borderRadius:8, border: on ? "none" : "2px solid rgba(45,45,58,0.2)", background: on ? "#2A7A40" : "transparent", color:"#fff", fontSize:12, cursor:"pointer", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {on && "✓"}
                </button>
                <button onClick={() => setCatPickerIdx(catPickerIdx === i ? null : i)} style={{ width:36, height:36, borderRadius:10, border:"none", background:"rgba(172,225,175,0.15)", cursor:"pointer", fontSize:18, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  {cat.emoji}
                </button>
                <div style={{ flex:1, minWidth:0 }}>
                  {isEditingDesc ? (
                    <input autoFocus value={editingField.value} onChange={e => setEditingField(prev => ({ ...prev, value: e.target.value }))}
                      onBlur={commitEdit} onKeyDown={e => e.key === "Enter" && commitEdit()}
                      style={{ width:"100%", fontSize:13, fontWeight:600, color:T.dark, fontFamily:"'Noto Sans',sans-serif", border:"none", borderBottom:"2px solid #ACE1AF", outline:"none", background:"transparent", padding:"2px 0", boxSizing:"border-box" }} />
                  ) : (
                    <div onClick={() => setEditingField({ idx: i, field: "description", value: tx.description || "" })}
                      style={{ fontSize:13, fontWeight:600, color:T.dark, fontFamily:"'Noto Sans',sans-serif", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", cursor:"text", borderBottom:"1px dashed transparent" }}
                      onMouseEnter={e => e.target.style.borderBottomColor = "rgba(172,225,175,0.5)"} onMouseLeave={e => e.target.style.borderBottomColor = "transparent"}>
                      {tx.description || catLabel(cat, lang)}
                      {tx._isDuplicate && <span style={{ fontSize:9, fontWeight:700, padding:"2px 6px", borderRadius:6, background:"rgba(245,197,24,0.2)", color:"#7A5A00", marginLeft:6, textTransform:"uppercase", letterSpacing:0.5 }}>{t(lang,"duplicate")}</span>}
                    </div>
                  )}
                  <div style={{ fontSize:11, color:T.muted, marginTop:1 }}>{tx.date}{tx.time ? ` · ${tx.time.slice(0,5)}` : ""}</div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:4, flexShrink:0 }}>
                  <button onClick={() => toggleType(i)} style={{ border:"none", background:"none", cursor:"pointer", fontSize:12, fontWeight:800, color: isExp ? "#C0392B" : "#2A7A40", padding:"2px 4px", fontFamily:"'Noto Sans',sans-serif" }}>
                    {isExp ? "−" : "+"}
                  </button>
                  {isEditingAmt ? (
                    <input autoFocus value={editingField.value} onChange={e => setEditingField(prev => ({ ...prev, value: e.target.value }))}
                      onBlur={commitEdit} onKeyDown={e => e.key === "Enter" && commitEdit()} type="number" inputMode="decimal"
                      style={{ width:80, fontSize:14, fontWeight:700, color: isExp ? "#C0392B" : "#2A7A40", fontFamily:"'Noto Sans',sans-serif", border:"none", borderBottom:"2px solid #ACE1AF", outline:"none", background:"transparent", textAlign:"right", padding:"2px 0" }} />
                  ) : (
                    <div onClick={() => setEditingField({ idx: i, field: "amount", value: String(tx.amount) })}
                      style={{ fontSize:14, fontWeight:700, color: isExp ? "#C0392B" : "#2A7A40", fontFamily:"'Noto Sans',sans-serif", cursor:"text", borderBottom:"1px dashed transparent" }}
                      onMouseEnter={e => e.target.style.borderBottomColor = "rgba(172,225,175,0.5)"} onMouseLeave={e => e.target.style.borderBottomColor = "transparent"}>
                      {fmt(tx.amount, tx.currency || currency)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Category picker bottom sheet */}
        {catPickerIdx !== null && (
          <div style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:600, background:"#fff", borderRadius:"24px 24px 0 0", boxShadow:"0 -4px 24px rgba(0,0,0,0.12)", maxHeight:"50vh", overflowY:"auto", padding:"16px 20px calc(env(safe-area-inset-bottom,0px) + 16px)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <div style={{ fontSize:14, fontWeight:700, color:T.dark, fontFamily:"'Noto Sans',sans-serif" }}>Category</div>
              <button onClick={() => setCatPickerIdx(null)} style={{ border:"none", background:"none", fontSize:18, color:T.muted, cursor:"pointer" }}>×</button>
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {[...DEFAULT_EXPENSE_CATS, ...DEFAULT_INCOME_CATS].map(c => (
                <button key={c.id} onClick={() => changeCat(catPickerIdx, c.id)} style={{
                  padding:"6px 12px", borderRadius:12, border:"none", cursor:"pointer", fontSize:12, fontWeight:600,
                  background: txs[catPickerIdx]?.categoryId === c.id ? "rgba(172,225,175,0.3)" : "rgba(45,45,58,0.06)",
                  color:T.dark, fontFamily:"'Noto Sans',sans-serif", display:"flex", alignItems:"center", gap:4,
                }}>
                  <span>{c.emoji}</span> {catLabel(c, lang)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Import button */}
        <div style={{ padding:"16px 20px calc(env(safe-area-inset-bottom,0px) + 16px)", borderTop:"1px solid rgba(45,45,58,0.06)" }}>
          {primaryBtn(tpl("statementImportButton", { n: selected.size }), handleImport, selected.size === 0 || importing)}
        </div>
      </>)}

      {/* ── STEP 5: Saving ── */}
      {step === "saving" && (
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:40, gap:16 }}>
          <div style={{ width:60, height:60, borderRadius:20, background:"rgba(172,225,175,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28 }}>💾</div>
          <div style={{ fontSize:16, fontWeight:700, color:T.dark, fontFamily:"'Noto Sans',sans-serif" }}>
            {tpl("statementImporting", { current: saveProgress, total: selected.size })}
          </div>
          <div style={{ width:200, height:6, borderRadius:3, background:"rgba(45,45,58,0.1)", overflow:"hidden" }}>
            <div style={{ width:`${(saveProgress / selected.size) * 100}%`, height:"100%", background:"#2A7A40", borderRadius:3, transition:"width .2s ease" }} />
          </div>
        </div>
      )}

      {/* ── STEP 6: Done ── */}
      {step === "done" && (
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:40, gap:16 }}>
          <div style={{ fontSize:48 }}>✅</div>
          <div style={{ fontSize:18, fontWeight:800, color:T.dark, fontFamily:"'Noto Sans',sans-serif" }}>
            {tpl("statementSuccess", { n: saveProgress })}
          </div>
          <div style={{ fontSize:13, color:T.muted }}>{bank ? `${bank} · ` : ""}{currency}</div>
          <div style={{ marginTop:12 }}>
            {primaryBtn("Done", () => onImportDone(saveProgress))}
          </div>
        </div>
      )}
      <ConfirmSheet
        open={!!pendingDeleteBatch}
        onClose={()=>setPendingDeleteBatch(null)}
        onConfirm={()=>{ if (pendingDeleteBatch) deleteBatch(pendingDeleteBatch.batch_id); }}
        title={t(lang,"confirmDeleteBatchWithCount").replace("{n}", pendingDeleteBatch?.tx_count ?? 0)}
        confirmLabel={t(lang,"confirmDelete")}
        cancelLabel={t(lang,"confirmCancel")}
        destructive
      />
    </div>
  );
}
