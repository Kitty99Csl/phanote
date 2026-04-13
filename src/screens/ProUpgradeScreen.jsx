// Pro upgrade screen — full-screen Pro tier upsell.
// Extracted from App.jsx in Session 7.
//
// Pre-existing gaps flagged for cleanup backlog:
//   - hardcoded English strings (no i18n wiring)
//   - bypasses theme tokens (uses raw hex values)
//   - CTA button has no onClick handler (dead button)
//   - includes inline sub-component FeatRow

import { useState } from "react";
import { Logo } from "../components/Logo";

export function ProUpgradeScreen({ onClose }) {
  const [billing, setBilling] = useState("monthly");
  const isAnnual = billing === "annual";

  const price    = isAnnual ? "$29.99" : "$2.99";
  const period   = isAnnual ? "/ year" : "/ month";
  const alts     = isAnnual ? "฿999 / year  ·  ₭699,000 / year" : "฿99 / month  ·  ₭69,000 / month";
  const ctaLabel = isAnnual ? "Start Pro — $29.99 / year" : "Start Pro — $2.99 / month";

  const FeatRow = ({emoji, title, desc, free, pro, coming})=>(
    <div style={{display:"flex",alignItems:"center",gap:12,padding:"11px 16px",borderBottom:"0.5px solid rgba(45,45,58,0.05)"}}>
      <div style={{width:32,height:32,borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0,background:free?"rgba(172,225,175,0.15)":"rgba(26,64,32,0.08)"}}>{emoji}</div>
      <div style={{flex:1}}>
        <div style={{fontSize:13,fontWeight:600,color:"#2D2D3A",fontFamily:"'Noto Sans',sans-serif"}}>{title}</div>
        <div style={{fontSize:11,color:"#9B9BAD",marginTop:1}}>{desc}</div>
      </div>
      <div style={{display:"flex",gap:18,flexShrink:0,width:60,justifyContent:"space-between"}}>
        <span style={{fontSize:14,color:free?"#3da873":"#ddd",width:20,textAlign:"center"}}>{free?"✓":"—"}</span>
        <span style={{fontSize:14,color:pro?"#3da873":"#ddd",width:20,textAlign:"center"}}>
          {coming ? <span style={{fontSize:9,fontWeight:700,background:"rgba(172,225,175,0.2)",color:"#2A7A40",padding:"2px 5px",borderRadius:4}}>Soon</span> : pro?"✓":"—"}
        </span>
      </div>
    </div>
  );

  return (
    <div style={{position:"fixed",inset:0,zIndex:600,background:"#F7FCF5",overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
      {/* Hero */}
      <div style={{background:"#1A4020",padding:"calc(env(safe-area-inset-top,0px) + 24px) 20px 22px"}}>
        <button onClick={onClose} style={{fontSize:13,color:"rgba(255,255,255,0.5)",background:"none",border:"none",cursor:"pointer",fontFamily:"'Noto Sans',sans-serif",padding:0,marginBottom:14}}>← Settings</button>
        <div style={{marginBottom:6}}><Logo size={96} /></div>
        <div style={{fontSize:21,fontWeight:800,color:"#fff",letterSpacing:-0.5,fontFamily:"'Noto Sans',sans-serif"}}>Phajot Pro</div>
        <div style={{fontSize:12,color:"rgba(255,255,255,0.55)",marginTop:5,lineHeight:1.6}}>Everything you need to track money across LAK, THB & USD — every day.</div>
      </div>

      <div style={{padding:"14px 16px 0"}}>
        {/* Billing toggle */}
        <div style={{display:"flex",background:"rgba(45,45,58,0.07)",borderRadius:12,padding:3,marginBottom:14}}>
          {["monthly","annual"].map(m=>(
            <button key={m} onClick={()=>setBilling(m)}
              style={{flex:1,padding:"8px 0",borderRadius:10,border:"none",background:billing===m?"#fff":"transparent",color:billing===m?"#2D2D3A":"#9B9BAD",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Noto Sans',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
              {m==="monthly"?"Monthly":<>Annual <span style={{fontSize:9,fontWeight:700,background:"#ACE1AF",color:"#1A4020",padding:"1px 5px",borderRadius:4}}>-17%</span></>}
            </button>
          ))}
        </div>

        {/* Price box */}
        <div style={{background:"#fff",borderRadius:18,padding:"16px",border:"1.5px solid #ACE1AF",marginBottom:14}}>
          <div style={{display:"flex",alignItems:"flex-end",gap:6,marginBottom:3}}>
            <span style={{fontSize:32,fontWeight:800,color:"#2D2D3A",letterSpacing:-1,fontFamily:"'Noto Sans',sans-serif"}}>{price}</span>
            <span style={{fontSize:13,color:"#9B9BAD",paddingBottom:6}}>{period}</span>
          </div>
          <div style={{fontSize:11,color:"#9B9BAD"}}>{alts}</div>
          {isAnnual&&<div style={{fontSize:11,color:"#3da873",fontWeight:700,marginTop:6}}>Save $5.89 compared to monthly</div>}
        </div>

        {/* Comparison table */}
        <div style={{marginBottom:14}}>
          {/* Column headers */}
          <div style={{display:"flex",alignItems:"center",padding:"0 16px 8px"}}>
            <div style={{flex:1}}/>
            <div style={{display:"flex",gap:18,width:60,justifyContent:"space-between"}}>
              <span style={{fontSize:10,fontWeight:700,color:"#9B9BAD",width:20,textAlign:"center"}}>Free</span>
              <span style={{fontSize:10,fontWeight:700,color:"#1A4020",width:20,textAlign:"center"}}>Pro</span>
            </div>
          </div>

          <div style={{background:"#fff",borderRadius:18,overflow:"hidden",border:"0.5px solid rgba(45,45,58,0.07)"}}>
            <FeatRow emoji="💬" title="Text logging"       desc="Lao, Thai, English"           free pro />
            <FeatRow emoji="📊" title="Analytics & budgets" desc="Charts, MoM comparison"       free pro />
            <FeatRow emoji="🎯" title="Goals & streaks"    desc="10 XP levels"                  free pro />
            <FeatRow emoji="🔐" title="PIN & guest access"  desc="Share safely with family"     free pro />
            <FeatRow emoji="🤖" title="AI Advisor chat"    desc="Personal finance assistant"    pro />
            <FeatRow emoji="📷" title="Receipt OCR"        desc="Scan & auto-log bills"         pro />
            <FeatRow emoji="🧠" title="AI memory"          desc="Learns your spending habits"   pro />
            <div style={{display:"flex",alignItems:"center",gap:12,padding:"11px 16px"}}>
              <div style={{width:32,height:32,borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0,background:"rgba(26,64,32,0.08)"}}>📥</div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:"#2D2D3A",fontFamily:"'Noto Sans',sans-serif"}}>Export CSV / Excel</div>
                <div style={{fontSize:11,color:"#9B9BAD",marginTop:1}}>Download your data anytime</div>
              </div>
              <div style={{display:"flex",gap:18,flexShrink:0,width:60,justifyContent:"space-between"}}>
                <span style={{fontSize:14,color:"#ddd",width:20,textAlign:"center"}}>—</span>
                <span style={{fontSize:9,fontWeight:700,background:"rgba(172,225,175,0.2)",color:"#2A7A40",padding:"2px 5px",borderRadius:4}}>Soon</span>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <button style={{width:"100%",padding:"15px",borderRadius:16,border:"none",background:"#1A4020",color:"#fff",fontSize:15,fontWeight:800,cursor:"pointer",fontFamily:"'Noto Sans',sans-serif",marginBottom:10}}>{ctaLabel}</button>
        <div style={{textAlign:"center",fontSize:11,color:"#9B9BAD",lineHeight:1.7,marginBottom:32}}>
          Cancel anytime · No hidden fees<br/>PromptPay · BCEL · International card
        </div>
      </div>
    </div>
  );
}
