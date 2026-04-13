// Bottom nav — 5-tab router (home / analytics / budget /
// goals / settings). Guest-mode hides settings tab.
// Simplest leaf component in the codebase.
// Extracted from App.jsx in Session 7.

import { T } from "../lib/theme";
import { t } from "../lib/i18n";

export function BottomNav({active,onTab,lang,pinRole="owner"}){
  const allTabs=[{id:"home",icon:"🏠",label:t(lang,"home")},{id:"analytics",icon:"📊",label:t(lang,"analytics")},{id:"budget",icon:"💰",label:t(lang,"budget")},{id:"goals",icon:"🎯",label:t(lang,"goals")},{id:"settings",icon:"⚙️",label:t(lang,"settings")}];
  const tabs = pinRole === "guest" ? allTabs.filter(tab => tab.id !== "settings") : allTabs;
  return(<div style={{position:"sticky",bottom:0,background:"rgba(247,252,245,0.96)",backdropFilter:"blur(24px)",borderTop:"1px solid rgba(45,45,58,0.07)",display:"flex",zIndex:200,paddingBottom:"env(safe-area-inset-bottom,0px)"}}>
    {tabs.map(tab=>(<button key={tab.id} onClick={()=>onTab(tab.id)} style={{flex:1,padding:"10px 0 8px",border:"none",background:"transparent",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,position:"relative"}}>
      {active===tab.id&&<div style={{position:"absolute",top:-1,left:"50%",transform:"translateX(-50%)",width:32,height:2,borderRadius:2,background:T.celadon}}/>}
      <div style={{fontSize:22,filter:active!==tab.id?"grayscale(1) opacity(0.45)":"none"}}>{tab.icon}</div>
      <div style={{fontSize:10,fontWeight:700,color:active===tab.id?T.dark:T.muted,fontFamily:"'Noto Sans',sans-serif"}}>{tab.label}</div>
    </button>))}
  </div>);
}
