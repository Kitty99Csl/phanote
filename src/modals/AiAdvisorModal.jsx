// AI Advisor modal — Pro chat interface with Claude Haiku 4.5.
// Fetches from api.phajot.com/advise with conversation context
// built from recent transactions + goals + budgets.
// Extracted from App.jsx in Session 7.
//
// Pre-existing gaps flagged for cleanup backlog:
//   - uses supabase client directly instead of lib/db.js wrappers
//   - dead `baseCurrency` destructure from profile, never read
//   - mixed i18n: some t() keys, some hardcoded English fallbacks

import { useState, useEffect, useRef } from "react";
import { T } from "../lib/theme";
import { t } from "../lib/i18n";
import { supabase } from "../lib/supabase";
import Sheet from "../components/Sheet";
import { fetchWithTimeout, FetchTimeoutError } from "../lib/fetchWithTimeout";

export function AiAdvisorModal({ profile, transactions, onClose }) {
  const { lang, baseCurrency, userId } = profile;
  const [messages, setMessages] = useState([
    { role:"assistant", text: lang==="lo"
        ? "ສະບາຍດີ! 👋 ຂ້ອຍແມ່ນທີ່ປຶກສາການເງິນ AI ຂອງ Phajot. ຖາມຂ້ອຍໄດ້ເລີຍ!"
        : lang==="th"
        ? "สวัสดี! 👋 ฉันคือที่ปรึกษาการเงิน AI ของ Phajot ถามได้เลยนะ!"
        : "Hi! 👋 I'm Phajot's AI advisor. Ask me anything about your finances!" }
  ]);
  const [input,    setInput]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [goals,    setGoals]    = useState([]);
  const [budgets,  setBudgets]  = useState([]);
  const bottomRef = useRef();
  const inputRef  = useRef();

  // Load goals + budgets for context
  useEffect(() => {
    if (!userId) return;
    supabase.from("goals").select("*").eq("user_id", userId).eq("is_completed", false)
      .then(({ data }) => { if (data) setGoals(data); });
    supabase.from("budgets").select("*").eq("user_id", userId)
      .then(({ data }) => { if (data) setBudgets(data); });
  }, [userId]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [messages, loading]);

  const QUICK_QUESTIONS = lang === "lo" ? [
    "ຂ້ອຍໃຊ້ຈ່າຍຫຼາຍທີ່ສຸດໃນໝວດໃດ?",
    "ຂ້ອຍຄວນຕັດຄ່າໃຊ້ຈ່າຍໃດ?",
    "ຈະຮອດເປົ້າໝາຍໄວຂຶ້ນໄດ້ແນວໃດ?",
    "ເດືອນນີ້ຂ້ອຍເໝາະສົມໃຊ້ຈ່າຍໄດ້ຈັກ?",
  ] : lang === "th" ? [
    "ฉันใช้จ่ายมากสุดหมวดไหน?",
    "ควรลดค่าใช้จ่ายด้านไหน?",
    "จะถึงเป้าหมายเร็วขึ้นได้ยังไง?",
    "เดือนนี้ใช้ได้อีกเท่าไหร่?",
  ] : [
    "Where am I spending the most?",
    "Which expense should I cut first?",
    "How can I reach my goal faster?",
    "How much can I safely spend this month?",
  ];

  const buildSummary = () => {
    const now = new Date();
    const mo = now.getMonth(), yr = now.getFullYear();
    const sym = c => c==="LAK"?"₭":c==="THB"?"฿":"$";
    const byCur = {};
    transactions.forEach(tx => {
      const d = new Date(tx.date);
      if (d.getMonth()!==mo||d.getFullYear()!==yr) return;
      if (!byCur[tx.currency]) byCur[tx.currency]={inc:0,exp:0,cats:{}};
      if (tx.type==="income") byCur[tx.currency].inc+=tx.amount;
      if (tx.type==="expense"){
        byCur[tx.currency].exp+=tx.amount;
        byCur[tx.currency].cats[tx.categoryId]=(byCur[tx.currency].cats[tx.categoryId]||0)+tx.amount;
      }
    });
    const lines=[];
    lines.push(`=== ${now.toLocaleDateString("en-US",{month:"long",year:"numeric"})} ===`);
    Object.entries(byCur).forEach(([cur,d])=>{
      const s=sym(cur);
      const top=Object.entries(d.cats).sort((a,b)=>b[1]-a[1]).slice(0,5)
        .map(([cat,amt])=>`${cat}:${s}${Math.round(amt).toLocaleString()}`).join(", ");
      lines.push(`${cur}: income ${s}${Math.round(d.inc).toLocaleString()}, expenses ${s}${Math.round(d.exp).toLocaleString()}, net ${s}${Math.round(d.inc-d.exp).toLocaleString()}`);
      if(top) lines.push(`  Top: ${top}`);
    });
    if(!Object.keys(byCur).length) lines.push("No transactions this month yet.");
    lines.push(`\n=== Goals ===`);
    goals.length ? goals.forEach(g=>{
      const s=sym(g.currency);
      const pct=Math.round((g.saved_amount/g.target_amount)*100);
      const mLeft=g.deadline?Math.max(1,Math.round((new Date(g.deadline)-now)/2628000000)):null;
      lines.push(`"${g.name}": target ${s}${Math.round(g.target_amount).toLocaleString()}, saved ${s}${Math.round(g.saved_amount).toLocaleString()} (${pct}%)${mLeft?`, ${mLeft} months left`:""}`);
    }) : lines.push("No goals.");
    lines.push(`\n=== Budgets ===`);
    budgets.length ? budgets.forEach(b=>{
      const s=sym(b.currency);
      const spent=byCur[b.currency]?.cats?.[b.category_id]||0;
      lines.push(`${b.category_id} (${b.currency}): ${s}${Math.round(spent).toLocaleString()} of ${s}${Math.round(b.monthly_limit).toLocaleString()} (${Math.round((spent/b.monthly_limit)*100)}%)`);
    }) : lines.push("No budgets.");
    return lines.join("\n");
  };

  const buildRecentTransactions = () => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    cutoff.setHours(0, 0, 0, 0);
    return transactions
      .filter(tx => new Date(tx.date) >= cutoff)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 50)
      .map(tx => ({
        d: tx.date,
        t: tx.type === "income" ? "in" : "ex",
        a: Math.round(tx.amount),
        c: tx.currency,
        cat: tx.categoryId || "other",
        n: (tx.description || tx.categoryId || "").slice(0, 40),
      }));
  };

  const ask = async (question) => {
    if (!question.trim() || loading) return;
    const q = question.trim();
    setInput("");
    setMessages(prev => [...prev, { role:"user", text: q }]);
    setLoading(true);
    try {
      const res = await fetchWithTimeout("https://api.phajot.com/advise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, lang, summary: buildSummary(), recentTransactions: buildRecentTransactions() }),
      }, 30000);
      const data = await res.json();
      const reply = data.reply || data.error || "Sorry, couldn't get a response. Try again!";
      setMessages(prev => [...prev, { role:"assistant", text: reply }]);
    } catch (e) {
      const errText = e instanceof FetchTimeoutError
        ? (lang==="lo"?"ຊ້າເກີນໄປ ⏳ ລອງໃໝ່":lang==="th"?"ช้าเกินไป ⏳ ลองใหม่":"Taking too long ⏳ Please try again")
        : "Connection issue — check your internet and try again.";
      setMessages(prev => [...prev, { role:"assistant", text: errText }]);
    }
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  return (
    <>
      <Sheet open={true} onClose={onClose} showCloseButton={false} maxHeight="80dvh" footer={
        <div style={{borderTop:"1px solid rgba(45,45,58,0.07)",paddingTop:8}}>
          <div style={{display:"flex",gap:8,alignItems:"center",background:"rgba(45,45,58,0.05)",borderRadius:16,padding:"6px 6px 6px 14px"}}>
            <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&ask(input)}
              placeholder={t(lang,"ask_placeholder")}
              style={{flex:1,border:"none",outline:"none",background:"transparent",fontSize:14,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}/>
            <button onClick={()=>ask(input)} disabled={loading||!input.trim()} style={{
              width:36,height:36,borderRadius:11,border:"none",cursor:"pointer",flexShrink:0,
              background:input.trim()?"linear-gradient(145deg,#ACE1AF,#7BC8A4)":"rgba(45,45,58,0.1)",
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,
              color:input.trim()?"#1A4020":T.muted,transition:"all .2s",
            }}>↑</button>
          </div>
        </div>
      }>
        {/* Rich header with icon + title + tagline + close */}
        <div style={{paddingTop:20,paddingBottom:14,borderBottom:"1px solid rgba(45,45,58,0.07)",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:38,height:38,borderRadius:12,background:"linear-gradient(145deg,#ACE1AF,#7BC8A4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🤖</div>
            <div>
              <div style={{fontWeight:800,fontSize:16,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>Ask Phajot AI</div>
              <div style={{fontSize:11,color:"#5aae5f",marginTop:1}}>{t(lang,"ai_tagline")}</div>
            </div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:T.muted}}>✕</button>
        </div>

        {/* Messages */}
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {messages.map((msg, i) => (
            <div key={i} style={{display:"flex",justifyContent:msg.role==="user"?"flex-end":"flex-start"}}>
              {msg.role==="assistant" && (
                <div style={{width:28,height:28,borderRadius:9,background:"linear-gradient(145deg,#ACE1AF,#7BC8A4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0,marginRight:8,marginTop:2}}>🤖</div>
              )}
              <div style={{
                maxWidth:"78%",padding:"11px 14px",borderRadius:msg.role==="user"?"18px 18px 4px 18px":"18px 18px 18px 4px",
                background:msg.role==="user"?"linear-gradient(145deg,#ACE1AF,#7BC8A4)":"rgba(45,45,58,0.06)",
                color:msg.role==="user"?"#1A4020":T.dark,
                fontSize:14,lineHeight:1.55,fontFamily:"'Noto Sans',sans-serif",fontWeight:msg.role==="user"?600:400,
              }}>
                {msg.text.split(/\*\*(.*?)\*\*/g).map((part, i) =>
                  i % 2 === 1
                    ? <strong key={i} style={{fontWeight:700}}>{part}</strong>
                    : part
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:28,height:28,borderRadius:9,background:"linear-gradient(145deg,#ACE1AF,#7BC8A4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>🤖</div>
              <div style={{padding:"11px 16px",borderRadius:"18px 18px 18px 4px",background:"rgba(45,45,58,0.06)",display:"flex",gap:5,alignItems:"center"}}>
                {[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:T.muted,animation:`bounce .9s ease ${i*0.2}s infinite`}}/>)}
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>

        {/* Quick questions — show only at start */}
        {messages.length <= 1 && (
          <div style={{paddingTop:10,paddingBottom:10,display:"flex",gap:6,flexWrap:"wrap"}}>
            {QUICK_QUESTIONS.map((q,i) => (
              <button key={i} onClick={()=>ask(q)} style={{
                padding:"7px 12px",borderRadius:20,border:"1px solid rgba(172,225,175,0.5)",
                background:"rgba(172,225,175,0.1)",color:"#2A7A40",fontSize:12,fontWeight:600,
                cursor:"pointer",fontFamily:"'Noto Sans',sans-serif",textAlign:"left",lineHeight:1.3,
              }}>{q}</button>
            ))}
          </div>
        )}
      </Sheet>
      <style>{`@keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}`}</style>
    </>
  );
}
