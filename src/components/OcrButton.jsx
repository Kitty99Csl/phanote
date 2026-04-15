// OCR Button + Flow — Pro feature for scanning receipts.
// Inline 5-state machine: idle → picker → scanning → confirm → error.
// Fetches from api.phajot.com/ocr (Gemini Vision backend).
// Rendered inline inside QuickAddBar with compact={true}.
// Extracted from App.jsx in Session 7.
//
// Pre-existing gaps flagged for cleanup backlog:
//   - Stale comment at L236 (original) says "Claude Vision"
//     but fetch goes to /ocr which uses Gemini Vision
//   - Hardcoded "Receipt" English fallback for description
//   - Hardcoded "✓ High confidence" / "⚠ Please verify" labels
//   - Pro gate uses alert() native dialog
//
// Intentional (NOT backlog): inline lang === "lo" ? "..." :
// ternaries for ~12 long contextual messages. These are long
// error explanations that work better as inline strings than
// i18n keys.

import { useState, useRef } from "react";
import { T, fmt } from "../lib/theme";
import { findCat, catLabel, normalizeCategory } from "../lib/categories";
import Sheet from "./Sheet";
import { ConfirmSheet } from "./ConfirmSheet";
import { useClickGuard } from "../hooks/useClickGuard";
import { fetchWithTimeout, FetchTimeoutError } from "../lib/fetchWithTimeout";
import { t } from "../lib/i18n";

export function OcrButton({ profile, onAdd, lang, compact=false }) {
  const [status,     setStatus]     = useState("idle"); // idle | picker | scanning | confirm | error
  const [result,     setResult]     = useState(null);
  const [errMsg,     setErrMsg]     = useState("");
  const [showProLock, setShowProLock] = useState(false);
  const cameraRef  = useRef(); // capture=environment
  const galleryRef = useRef(); // gallery pick
  const { busy, run } = useClickGuard();

  const isPro = profile?.isPro || false;
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be picked again
    e.target.value = "";

    setStatus("scanning");
    setResult(null);

    try {
      // Convert to base64
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve(reader.result.split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetchWithTimeout("https://api.phajot.com/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64,
          mimeType: file.type || "image/jpeg",
          userId: profile?.userId,
        }),
      }, 20000);

      const data = await res.json();
      if (data.error || !data.amount) {
        // Friendly error messages by status code
        const s = res.status;
        const msg = s === 503 || s === 500 || /UNAVAILABLE|overloaded/i.test(data.error||"")
          ? (lang==="lo"?"AI ຍັງນອນຢູ່ 😴 ກະລຸນາລອງໃໝ່ອີກຄັ້ງ":lang==="th"?"AI กำลังงีบอยู่ 😴 ลองใหม่อีกครั้งนะคะ":"Gemini is a bit sleepy right now 😴 Please try again in a minute.")
          : s === 429
          ? (lang==="lo"?"ຊ້ຳມື້ນີ້ແລ້ວ! ພັກຜ່ອນໜ້ອຍໜຶ່ງ 🌿":lang==="th"?"วันนี้ใช้เยอะแล้ว! พักสักครู่นะคะ 🌿":"You've used OCR a lot today! Take a short break 🌿")
          : (lang==="lo"?"ອ່ານໃບບິນບໍ່ໄດ້ 😕 ລອງຖ່າຍຮູບໃໝ່":lang==="th"?"อ่านใบเสร็จไม่ได้ 😕 ลองถ่ายใหม่":"Couldn't read this receipt 😕 Try a clearer photo?");
        setErrMsg(msg);
        setStatus("error");
        return;
      }
      setResult(data);
      setStatus("confirm");

    } catch (e) {
      if (e instanceof FetchTimeoutError) {
        setErrMsg(lang==="lo"?"ອ່ານໃບບິນຊ້າເກີນໄປ ⏳ ລອງໃໝ່":lang==="th"?"อ่านใบเสร็จช้าเกินไป ⏳ ลองใหม่":"Scan is taking too long ⏳ Please try again");
      } else {
        setErrMsg(lang==="lo"?"ເຊື່ອມຕໍ່ບໍ່ໄດ້ 😕 ລອງໃໝ່":lang==="th"?"เชื่อมต่อไม่ได้ 😕 ลองใหม่":"Connection error 😕 Please try again.");
      }
      setStatus("error");
    }
  };

  const confirmAdd = () => run(async () => {
    if (!result) return;
    const catId = normalizeCategory(result.category || "other", "expense");
    // Store items as JSON in note if OCR extracted line items
    const noteVal = result.items && result.items.length > 0
      ? JSON.stringify({items: result.items, note: "", source: "ocr"})
      : JSON.stringify({items: [], note: "", source: "ocr"});
    const tx = {
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      amount: result.amount,
      currency: result.currency || "LAK",
      type: "expense",
      categoryId: catId,
      description: result.description || "Receipt",
      note: noteVal,
      date: new Date().toISOString().split("T")[0],
      confidence: result.confidence || 0.8,
      createdAt: new Date().toISOString(),
      rawInput: "OCR",
    };
    setStatus("idle");
    setResult(null);
    await onAdd(tx);
  });

  // Pro gate — show lock if not Pro
  if (!isPro) {
    return (
      <>
        <button
          onClick={() => setShowProLock(true)}
          style={{ width:compact?32:36, height:compact?32:36, borderRadius:compact?10:11, border:"1px dashed rgba(45,45,58,0.2)", cursor:"pointer", background:"rgba(45,45,58,0.04)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:compact?13:16, flexShrink:0 }}>
          🔒
        </button>
        <ConfirmSheet
          open={showProLock}
          onClose={()=>setShowProLock(false)}
          onConfirm={()=>{ /* Sprint K+: navigate to Pro upgrade flow */ }}
          title={t(lang,"proLockTitle")}
          message={t(lang,"proLockMessage")}
          confirmLabel={t(lang,"proLockUpgrade")}
          cancelLabel={t(lang,"proLockNotNow")}
          variant="upgrade"
        />
      </>
    );
  }

  return (
    <>
      {/* Hidden inputs */}
      <input ref={cameraRef}  type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={handleFile}/>
      <input ref={galleryRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleFile}/>

      {/* Trigger button */}
      <button
        onClick={() => {
          if (status === "scanning") return;
          if (isMobile) { setStatus("picker"); }
          else { galleryRef.current?.click(); }
        }}
        style={{ width:compact?32:36, height:compact?32:36, borderRadius:compact?10:11, border:"none", cursor:"pointer", flexShrink:0,
          background: status==="scanning" ? "rgba(172,225,175,0.4)" : "rgba(172,225,175,0.18)",
          display:"flex", alignItems:"center", justifyContent:"center", fontSize:compact?14:18, transition:"all .2s" }}>
        {status === "scanning" ? "⏳" : "📷"}
      </button>

      {/* Mobile picker sheet */}
      {status === "picker" && (
        <div style={{position:"fixed",inset:0,zIndex:3000,background:"rgba(30,30,40,0.5)",backdropFilter:"blur(4px)",display:"flex",alignItems:"flex-end",justifyContent:"center"}}
          onClick={e=>{if(e.target===e.currentTarget)setStatus("idle");}}>
          <div style={{background:"#fff",borderRadius:"24px 24px 0 0",width:"100%",maxWidth:430,padding:"20px 20px",paddingBottom:"calc(env(safe-area-inset-bottom,0px) + 20px)",animation:"slideUp .25s ease"}}>
            <div style={{fontSize:13,fontWeight:700,color:T.muted,textAlign:"center",marginBottom:14}}>
              {lang==="lo"?"ເລືອກຮູບໃບບິນ":lang==="th"?"เลือกรูปใบเสร็จ":"Scan a receipt"}
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>{setStatus("idle");setTimeout(()=>cameraRef.current?.click(),50);}}
                style={{flex:1,padding:"16px 10px",borderRadius:16,border:"1.5px solid rgba(172,225,175,0.4)",cursor:"pointer",background:"rgba(172,225,175,0.08)",display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
                <span style={{fontSize:28}}>📷</span>
                <span style={{fontSize:13,fontWeight:700,color:"#1A4020",fontFamily:"'Noto Sans',sans-serif"}}>
                  {lang==="lo"?"ຖ່າຍຮູບ":lang==="th"?"ถ่ายรูป":"Take photo"}
                </span>
              </button>
              <button onClick={()=>{setStatus("idle");setTimeout(()=>galleryRef.current?.click(),50);}}
                style={{flex:1,padding:"16px 10px",borderRadius:16,border:"1.5px solid rgba(45,45,58,0.1)",cursor:"pointer",background:"rgba(45,45,58,0.04)",display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
                <span style={{fontSize:28}}>🖼️</span>
                <span style={{fontSize:13,fontWeight:700,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>
                  {lang==="lo"?"ເລືອກຈາກຄັງ":lang==="th"?"เลือกจากคลัง":"Choose photo"}
                </span>
              </button>
            </div>
            <button onClick={()=>setStatus("idle")}
              style={{width:"100%",marginTop:10,padding:"12px",borderRadius:14,border:"none",cursor:"pointer",background:"rgba(45,45,58,0.06)",color:T.muted,fontWeight:700,fontSize:14,fontFamily:"'Noto Sans',sans-serif"}}>
              {lang==="lo"?"ຍົກເລີກ":lang==="th"?"ยกเลิก":"Cancel"}
            </button>
          </div>
        </div>
      )}

      {/* Scanning overlay */}
      {status === "scanning" && (
        <div style={{ position:"fixed", inset:0, zIndex:3000, background:"rgba(30,30,40,0.7)", backdropFilter:"blur(4px)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16 }}>
          <div style={{ fontSize:52 }}>📷</div>
          <div style={{ fontSize:16, fontWeight:700, color:"#fff", fontFamily:"'Noto Sans',sans-serif" }}>
            {lang==="lo"?"ກຳລັງອ່ານໃບບິນ…":lang==="th"?"กำลังอ่านใบเสร็จ…":"Reading receipt…"}
          </div>
          <div style={{ fontSize:13, color:"rgba(255,255,255,0.6)" }}>Claude Vision</div>
        </div>
      )}

      {/* Error */}
      {status === "error" && (
        <div style={{ position:"fixed", inset:0, zIndex:3000, background:"rgba(30,30,40,0.6)", backdropFilter:"blur(4px)", display:"flex", alignItems:"flex-end", justifyContent:"center" }}
          onClick={() => setStatus("idle")}>
          <div style={{ background:"#fff", borderRadius:"28px 28px 0 0", padding:"28px 24px 52px", width:"100%", maxWidth:430, animation:"slideUp .3s ease" }}>
            <div style={{ fontSize:40, textAlign:"center", marginBottom:12 }}>😕</div>
            <div style={{ fontWeight:700, fontSize:16, color:T.dark, textAlign:"center", marginBottom:8, fontFamily:"'Noto Sans',sans-serif" }}>
              {lang==="lo"?"ອ່ານໃບບິນບໍ່ໄດ້":lang==="th"?"อ่านใบเสร็จไม่ได้":"Couldn't read receipt"}
            </div>
            <div style={{ fontSize:13, color:T.muted, textAlign:"center", marginBottom:24 }}>{errMsg}</div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => { setStatus(isMobile ? "picker" : "idle"); if (!isMobile) galleryRef.current?.click(); }}
                style={{ flex:1, padding:"14px", borderRadius:16, border:"none", cursor:"pointer", background:"rgba(172,225,175,0.2)", color:"#1A5A30", fontWeight:700, fontSize:14, fontFamily:"'Noto Sans',sans-serif" }}>
                {lang==="lo"?"ລອງໃໝ່":lang==="th"?"ลองใหม่":"Try again"}
              </button>
              <button onClick={() => setStatus("idle")}
                style={{ flex:1, padding:"14px", borderRadius:16, border:"none", cursor:"pointer", background:"rgba(45,45,58,0.06)", color:T.muted, fontWeight:700, fontSize:14, fontFamily:"'Noto Sans',sans-serif" }}>
                {lang==="lo"?"ຍົກເລີກ":lang==="th"?"ยกเลิก":"Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm modal — uses Sheet for pinned footer + scroll fix */}
      {status === "confirm" && result && (
        <Sheet open={true} onClose={() => setStatus("idle")} showCloseButton={false} maxHeight="calc(85dvh - 90px)" footer={
          <div style={{ borderTop:"0.5px solid rgba(45,45,58,0.06)", paddingTop:12 }}>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setStatus("idle")}
                style={{ flex:1, padding:"14px", borderRadius:16, border:"none", cursor:"pointer", background:"rgba(45,45,58,0.06)", color:T.muted, fontWeight:700, fontSize:14, fontFamily:"'Noto Sans',sans-serif" }}>
                {lang==="lo"?"ຍົກເລີກ":lang==="th"?"ยกเลิก":"Cancel"}
              </button>
              <button onClick={confirmAdd} disabled={busy}
                style={{ flex:2, padding:"14px", borderRadius:16, border:"none", cursor:busy?"wait":"pointer", background:"linear-gradient(145deg,#ACE1AF,#7BC8A4)", color:"#1A4020", fontWeight:800, fontSize:15, fontFamily:"'Noto Sans',sans-serif", boxShadow:"0 4px 16px rgba(172,225,175,0.4)", opacity:busy?0.6:1 }}>
                {lang==="lo"?"ບັນທຶກ ✓":lang==="th"?"บันทึก ✓":"Save ✓"}
              </button>
            </div>
          </div>
        }>
          <div style={{ textAlign:"center", marginBottom:16, paddingTop:24 }}>
            <div style={{ fontSize:14, color:T.muted, marginBottom:6, fontWeight:600 }}>
              {lang==="lo"?"📷 ອ່ານໃບບິນໄດ້!":lang==="th"?"📷 อ่านใบเสร็จได้!":"📷 Receipt scanned!"}
            </div>
            <div style={{ display:"inline-block", padding:"2px 10px", borderRadius:8, fontSize:11, fontWeight:700,
              background: result.confidence >= 0.8 ? "rgba(172,225,175,0.2)" : "rgba(255,179,167,0.2)",
              color: result.confidence >= 0.8 ? "#1A5A30" : "#A03020" }}>
              {result.confidence >= 0.8 ? "✓ High confidence" : "⚠ Please verify"}
            </div>
          </div>

          {/* Transaction preview */}
          <div style={{ background:T.bg, borderRadius:20, padding:"16px 18px", marginBottom:16 }}>
            <div style={{ display:"flex", alignItems:"center", gap:14 }}>
              <div style={{ width:52, height:52, borderRadius:16, background:"rgba(255,179,167,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, flexShrink:0 }}>
                {findCat(result.category || "other", profile?.customCategories || []).emoji}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:16, color:T.dark, fontFamily:"'Noto Sans',sans-serif" }}>{result.description}</div>
                <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>
                  {catLabel(findCat(result.category || "other", profile?.customCategories || []), lang)} · {result.currency}
                </div>
              </div>
              <div style={{ fontWeight:800, fontSize:20, color:"#C0392B", fontFamily:"'Noto Sans',sans-serif" }}>
                −{fmt(result.amount, result.currency || "LAK")}
              </div>
            </div>
            {/* Item list if OCR extracted line items */}
            {result.items && result.items.length > 0 && (
              <div style={{ marginTop:12, borderTop:"0.5px solid rgba(45,45,58,0.07)", paddingTop:10 }}>
                <div style={{ fontSize:10, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:0.8, marginBottom:7 }}>
                  {result.items.length} items detected
                </div>
                {result.items.map((item, i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"4px 0", borderBottom: i < result.items.length-1 ? "0.5px solid rgba(45,45,58,0.05)" : "none" }}>
                    <span style={{ fontSize:12, color:T.dark }}>{item.name}</span>
                    <span style={{ fontSize:12, fontWeight:700, color:T.muted }}>{fmt(item.amount, result.currency || "LAK")}</span>
                  </div>
                ))}
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:7, paddingTop:7, borderTop:"0.5px solid rgba(45,45,58,0.1)" }}>
                  <span style={{ fontSize:12, fontWeight:800, color:T.dark }}>Total</span>
                  <span style={{ fontSize:12, fontWeight:800, color:"#C0392B" }}>{fmt(result.amount, result.currency || "LAK")}</span>
                </div>
              </div>
            )}
          </div>
        </Sheet>
      )}
    </>
  );
}
