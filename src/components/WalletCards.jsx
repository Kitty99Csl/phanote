// Wallet cards — 3-currency (LAK/THB/USD) balance overview
// with expandable detail showing monthly income/expenses.
// Includes inline CircleFlag sub-component for the tabs.
// Extracted from App.jsx in Session 7.
//
// Pre-existing gap flagged for cleanup backlog:
//   - inline CircleFlag duplicates Flag.jsx logic; could be
//     a Flag shape="circle" prop in a future cleanup

import { useState } from "react";
import { T, CURR, fmt, fmtCompact } from "../lib/theme";
import { t } from "../lib/i18n";
import { Flag } from "./Flag";

export function WalletCards({transactions, lang = "lo"}){
  const[expanded,setExpanded]=useState(null);
  const getStats=(cur)=>{
    const now=new Date(),mo=now.getMonth(),yr=now.getFullYear();
    const monthly=transactions.filter(tx=>{const d=new Date(tx.date);return d.getMonth()===mo&&d.getFullYear()===yr&&tx.currency===cur;});
    const allCur=transactions.filter(tx=>tx.currency===cur);
    const allIn=allCur.filter(x=>x.type==="income").reduce((s,x)=>s+x.amount,0);
    const allOut=allCur.filter(x=>x.type==="expense").reduce((s,x)=>s+x.amount,0);
    const moIn=monthly.filter(x=>x.type==="income").reduce((s,x)=>s+x.amount,0);
    const moOut=monthly.filter(x=>x.type==="expense").reduce((s,x)=>s+x.amount,0);
    return{balance:allIn-allOut,income:moIn,expenses:moOut};
  };
  const CircleFlag=({code})=>(
    <div style={{width:16,height:16,borderRadius:"50%",overflow:"hidden",flexShrink:0,display:"inline-flex",border:"0.5px solid rgba(45,45,58,0.15)"}}>
      <svg viewBox="0 0 24 24" width="22" height="22" style={{margin:"-3px"}}>
        {code==="LAK"&&<><rect width="24" height="24" fill="#CE1126"/><rect y="6" width="24" height="12" fill="#002868"/><circle cx="12" cy="12" r="4" fill="#fff"/></>}
        {code==="THB"&&<><rect width="24" height="24" fill="#A51931"/><rect y="4" width="24" height="4" fill="#F4F5F8"/><rect y="8" width="24" height="8" fill="#2D2A4A"/><rect y="16" width="24" height="4" fill="#F4F5F8"/></>}
        {code==="USD"&&<><rect width="24" height="24" fill="#B22234"/><rect y="2" width="24" height="2" fill="#fff"/><rect y="6" width="24" height="2" fill="#fff"/><rect y="10" width="24" height="2" fill="#fff"/><rect y="14" width="24" height="2" fill="#fff"/><rect y="18" width="24" height="2" fill="#fff"/><rect y="22" width="24" height="2" fill="#fff"/><rect width="11" height="13" fill="#3C3B6E"/></>}
      </svg>
    </div>
  );
  return(
    <div style={{padding:"0 16px"}}>
      <div style={{background:T.surface,backdropFilter:"blur(20px)",borderRadius:18,boxShadow:T.shadow,overflow:"hidden"}}>
        <div style={{display:"flex",alignItems:"stretch"}}>
          {["LAK","THB","USD"].map((cur,i)=>{
            const stats=getStats(cur),open=expanded===cur,bal=stats.balance;
            return(
              <div key={cur} onClick={()=>setExpanded(open?null:cur)}
                style={{flex:1,padding:"9px 8px",cursor:"pointer",
                  borderLeft:i>0?"1px solid rgba(45,45,58,0.07)":"none",
                  background:open?"rgba(172,225,175,0.08)":"transparent",
                  transition:"background .15s",textAlign:"center"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:4,marginBottom:3}}>
                  <CircleFlag code={cur}/>
                  <span style={{fontSize:10,fontWeight:700,color:T.muted,letterSpacing:0.3}}>{cur}</span>
                </div>
                <div style={{fontSize:13,fontWeight:800,color:bal<0?"#C0392B":T.dark,fontFamily:"'Noto Sans',sans-serif",letterSpacing:-0.3}}>
                  {bal<0?"−":""}{fmtCompact(Math.abs(bal),cur)}
                </div>
              </div>
            );
          })}
        </div>
        {expanded&&(()=>{
          const stats=getStats(expanded),cfg=CURR[expanded];
          return(
            <div style={{borderTop:"1px solid rgba(45,45,58,0.07)",padding:"10px 14px",animation:"slideDown .2s ease",background:"rgba(172,225,175,0.04)"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <Flag code={expanded} size={16}/>
                  <span style={{fontSize:12,fontWeight:700,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>{cfg.name}</span>
                </div>
                <button onClick={()=>setExpanded(null)} style={{fontSize:14,color:T.muted,background:"none",border:"none",cursor:"pointer"}}>✕</button>
              </div>
              <div style={{display:"flex",gap:8}}>
                <div style={{flex:1,padding:"8px 10px",borderRadius:12,background:"rgba(172,225,175,0.15)"}}>
                  <div style={{fontSize:10,fontWeight:700,color:"#2A7A40",textTransform:"uppercase",letterSpacing:0.8}}>{t(lang,"income")}</div>
                  <div style={{fontSize:14,fontWeight:800,color:"#1A5A30",marginTop:3,fontFamily:"'Noto Sans',sans-serif"}}>+{fmt(stats.income,expanded)}</div>
                </div>
                <div style={{flex:1,padding:"8px 10px",borderRadius:12,background:"rgba(255,179,167,0.12)"}}>
                  <div style={{fontSize:10,fontWeight:700,color:"#A03020",textTransform:"uppercase",letterSpacing:0.8}}>{t(lang,"expense")}</div>
                  <div style={{fontSize:14,fontWeight:800,color:"#C0392B",marginTop:3,fontFamily:"'Noto Sans',sans-serif"}}>−{fmt(stats.expenses,expanded)}</div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
