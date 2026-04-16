// Small bottom-right toast pill shown after optimistic transaction save, lets user quickly change category or confirm. Extracted from App.jsx in Session 7.

import { useState, useEffect } from "react";
import { findCat } from "../lib/categories";
import { t } from "../lib/i18n";

export function QuickEditToast({tx,lang,onChangeCategory,onDone,customCategories=[]}){
  const cat=findCat(tx.categoryId,customCategories);
  const[visible,setVisible]=useState(true);
  // Auto-dismiss after 2.5s — short enough to not block view
  useEffect(()=>{const timer=setTimeout(()=>{setVisible(false);setTimeout(onDone,250);},2500);return()=>clearTimeout(timer);},[]);
  return(
    <div style={{
      position:"fixed",
      // Sit just above the bottom nav bar (56px) + quick add bar (~58px) + 8px gap
      bottom:"calc(env(safe-area-inset-bottom,0px) + 122px)",
      right:16,
      zIndex:400,
      opacity:visible?1:0,
      transform:visible?"translateY(0)":"translateY(8px)",
      transition:"opacity .25s ease, transform .25s ease",
      pointerEvents:visible?"auto":"none",
    }}>
      <div style={{
        background:"rgba(26,46,26,0.95)",
        backdropFilter:"blur(8px)",
        borderRadius:14,
        padding:"8px 12px 8px 10px",
        display:"flex",alignItems:"center",gap:8,
        boxShadow:"0 4px 16px rgba(0,0,0,0.18)",
        maxWidth:200,
      }}>
        <span style={{fontSize:16,flexShrink:0}}>{cat.emoji}</span>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:11,fontWeight:700,color:"#fff",fontFamily:"'Noto Sans',sans-serif",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
            {t(lang,"quickEditSaved")} ✓
          </div>
          <div style={{fontSize:10,color:"rgba(255,255,255,0.55)",marginTop:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{tx.description}</div>
        </div>
        <button onClick={()=>{setVisible(false);onChangeCategory();}}
          style={{padding:"4px 8px",borderRadius:8,border:"1px solid rgba(255,255,255,0.2)",background:"transparent",color:"#ACE1AF",fontSize:10,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",fontFamily:"'Noto Sans',sans-serif",flexShrink:0}}>
          ✏️
        </button>
      </div>
    </div>
  );
}
