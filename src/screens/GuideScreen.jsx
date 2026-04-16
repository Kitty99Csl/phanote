// Guide / help screen — in-app tutorial with 9 topics.
// Extracted from App.jsx in Session 7.
//
// Contains Lao/Thai demo inputs in CONTENT (ກາເຟ 15,000,
// กาแฟ 45 บาท) — byte-slice preserves Unicode exactly.
// Demo visual mockups (SVG text, color labels) kept hardcoded —
// they're decorative, not instructive text.

import { useState } from "react";
import { T } from "../lib/theme";
import { t } from "../lib/i18n";

export function GuideScreen({ lang, onClose }) {
  const [topic, setTopic] = useState(null);

  const TOPICS = [
    { id:"log",      emoji:"💬", title:t(lang,"guideTopicLogTitle"),       sub:t(lang,"guideTopicLogSub") },
    { id:"ocr",      emoji:"📷", title:t(lang,"guideTopicOcrTitle"),       sub:t(lang,"guideTopicOcrSub") },
    { id:"budget",   emoji:"💰", title:t(lang,"guideTopicBudgetTitle"),    sub:t(lang,"guideTopicBudgetSub") },
    { id:"goals",    emoji:"🎯", title:t(lang,"guideTopicGoalsTitle"),     sub:t(lang,"guideTopicGoalsSub") },
    { id:"advisor",  emoji:"🤖", title:t(lang,"guideTopicAdvisorTitle"),   sub:t(lang,"guideTopicAdvisorSub") },
    { id:"analytics",emoji:"📊", title:t(lang,"guideTopicAnalyticsTitle"), sub:t(lang,"guideTopicAnalyticsSub") },
    { id:"streaks",  emoji:"🔥", title:t(lang,"guideTopicStreaksTitle"),   sub:t(lang,"guideTopicStreaksSub") },
    { id:"pin",      emoji:"🔐", title:t(lang,"guideTopicPinTitle"),       sub:t(lang,"guideTopicPinSub") },
    { id:"safe",     emoji:"✅", title:t(lang,"guideTopicSafeTitle"),      sub:t(lang,"guideTopicSafeSub") },
  ];

  const TipBox = ({label,children,warn})=>(
    <div style={{background:warn?"rgba(255,179,167,0.12)":"rgba(172,225,175,0.12)",borderRadius:"0 14px 14px 0",padding:"11px 14px",marginBottom:12,borderLeft:`3px solid ${warn?"#FFB3A7":"#ACE1AF"}`}}>
      {label&&<div style={{fontSize:10,fontWeight:700,color:warn?"#C0392B":"#2A7A40",textTransform:"uppercase",letterSpacing:0.8,marginBottom:4}}>{label}</div>}
      <div style={{fontSize:13,color:T.dark,lineHeight:1.65}}>{children}</div>
    </div>
  );

  const DemoBox = ({visual,title,children})=>(
    <div style={{background:T.surface,backdropFilter:"blur(20px)",borderRadius:18,overflow:"hidden",boxShadow:T.shadow,marginBottom:14}}>
      <div style={{height:96,background:"linear-gradient(135deg,#E9FFDB,#ddf5e8)",display:"flex",alignItems:"center",justifyContent:"center",padding:"0 16px",gap:10}}>
        {visual}
      </div>
      <div style={{padding:"10px 16px 4px",fontSize:10,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:0.8}}>{title}</div>
      <div style={{padding:"4px 16px 14px",fontSize:13,color:T.dark,lineHeight:1.65}}>{children}</div>
    </div>
  );

  const ExRow = ({input,result})=>(
    <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"0.5px solid rgba(45,45,58,0.05)"}}>
      <span style={{fontSize:11,fontWeight:600,background:"rgba(45,45,58,0.06)",padding:"3px 8px",borderRadius:6,color:T.dark}}>{input}</span>
      <span style={{fontSize:11,color:"#ACE1AF"}}>→</span>
      <span style={{fontSize:11,fontWeight:700,color:"#1A5A30"}}>{result}</span>
    </div>
  );

  const CONTENT = {
    log: (
      <>
        <DemoBox title={t(lang,"guideHowItWorks")}
          visual={<>
            <div style={{background:"#fff",borderRadius:9999,padding:"6px 12px",fontSize:11,color:T.dark,border:"1px solid rgba(172,225,175,0.4)"}}>ກາເຟ 15,000</div>
            <div style={{fontSize:18,color:"#ACE1AF"}}>→</div>
            <div style={{background:"#fff",borderRadius:10,padding:"6px 10px",fontSize:11,fontWeight:700,color:"#1A5A30",border:"1px solid #ACE1AF"}}>☕ −₭15,000</div>
          </>}>
          {t(lang,"guideLogBody")}
        </DemoBox>
        <TipBox label={t(lang,"guideTryExamples")}>
          <ExRow input="กาแฟ 45 บาท" result="☕ −฿45"/>
          <ExRow input="ເຂົ້າ 50,000" result="🍜 −₭50,000"/>
          <ExRow input="grab 89" result="🛵 −฿89"/>
          <ExRow input="เงินเดือน 50000" result="💼 +฿50,000"/>
        </TipBox>
        <TipBox label={t(lang,"guideTip")}>{t(lang,"guideLogTipCurrency")}</TipBox>
      </>
    ),
    ocr: (
      <>
        <DemoBox title={t(lang,"guideHowItWorks")}
          visual={<>
            <div style={{width:44,height:44,borderRadius:12,background:"rgba(172,225,175,0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>📷</div>
            <div style={{fontSize:18,color:"#ACE1AF"}}>→</div>
            <div style={{background:"#fff",borderRadius:8,padding:"6px 10px",fontSize:10,color:T.dark,lineHeight:1.7,boxShadow:"0 2px 8px rgba(0,0,0,0.08)"}}>Bill<br/>Coffee ×2<br/><strong>฿185</strong></div>
            <div style={{fontSize:18,color:"#ACE1AF"}}>→</div>
            <div style={{background:"#fff",borderRadius:10,padding:"6px 10px",fontSize:11,fontWeight:700,color:"#1A5A30",border:"1px solid #ACE1AF"}}>−฿185 ✓</div>
          </>}>
          {t(lang,"guideOcrBody")}
        </DemoBox>
        <TipBox label={t(lang,"guideBestResults")}>{t(lang,"guideOcrTipBest")}</TipBox>
        <TipBox label={t(lang,"guideProFeature")} warn>{t(lang,"guideOcrTipPro")}</TipBox>
      </>
    ),
    budget: (
      <>
        <DemoBox title={t(lang,"guideHowItWorks")}
          visual={<div style={{display:"flex",flexDirection:"column",gap:7,width:"75%"}}>
            {[["🍜","Food","65%","#3da873"],[" 🛍️","Shopping","90%","#d4993a"],["🛵","Transport","110%","#C0392B"]].map(([ic,nm,pct,cl])=>(
              <div key={nm} style={{display:"flex",alignItems:"center",gap:7}}>
                <span style={{fontSize:13}}>{ic}</span>
                <div style={{flex:1,height:6,background:"rgba(45,45,58,0.1)",borderRadius:99,overflow:"hidden"}}><div style={{height:"100%",width:pct,background:cl,borderRadius:99}}/></div>
                <span style={{fontSize:10,fontWeight:700,color:cl,width:28}}>{pct}</span>
              </div>
            ))}
          </div>}>
          {t(lang,"guideBudgetBody")}
        </DemoBox>
        <TipBox label={t(lang,"guideTip")}>{t(lang,"guideBudgetTipCurrency")}</TipBox>
        <TipBox label={t(lang,"guideSettingLimit")}>{t(lang,"guideBudgetTipSetting")}</TipBox>
      </>
    ),
    goals: (
      <>
        <DemoBox title={t(lang,"guideHowItWorks")}
          visual={<div style={{display:"flex",flexDirection:"column",gap:5,alignItems:"center"}}>
            <div style={{fontSize:12,fontWeight:800,color:"#1A4020"}}>✈️ Bali Trip</div>
            <div style={{width:140,height:6,background:"rgba(45,45,58,0.1)",borderRadius:99,overflow:"hidden"}}><div style={{height:"100%",width:"40%",background:"#ACE1AF",borderRadius:99}}/></div>
            <div style={{fontSize:10,color:T.muted}}>₭2M saved of ₭5M</div>
            <div style={{fontSize:10,fontWeight:700,color:"#1A4020"}}>Save ₭500K/mo → 6 months</div>
          </div>}>
          {t(lang,"guideGoalsBody")}
        </DemoBox>
        <TipBox label={t(lang,"guideAddingSavings")}>{t(lang,"guideGoalsTipAdding")}</TipBox>
        <TipBox label={t(lang,"guideSmartSuggestion")}>{t(lang,"guideGoalsTipSmart")}</TipBox>
      </>
    ),
    advisor: (
      <>
        <DemoBox title={t(lang,"guideHowItWorks")}
          visual={<div style={{display:"flex",flexDirection:"column",gap:5,alignItems:"flex-start",width:"90%"}}>
            <div style={{background:"#fff",borderRadius:"10px 10px 10px 2px",padding:"7px 10px",fontSize:11,color:T.dark,border:"0.5px solid rgba(45,45,58,0.1)",maxWidth:"80%"}}>Where am I spending the most?</div>
            <div style={{background:"#1A4020",borderRadius:"10px 10px 2px 10px",padding:"7px 10px",fontSize:11,color:"#fff",maxWidth:"85%",alignSelf:"flex-end"}}>🍜 Food at ₭450K — 42% of spending. Consider a ₭350K limit next month.</div>
          </div>}>
          {t(lang,"guideAdvisorBody")}
        </DemoBox>
        <TipBox label={t(lang,"guideThingsToAsk")}>
          {t(lang,"guideAdvisorQ1")}<br/>
          {t(lang,"guideAdvisorQ2")}<br/>
          {t(lang,"guideAdvisorQ3")}<br/>
          {t(lang,"guideAdvisorQ4")}
        </TipBox>
        <TipBox label={t(lang,"guideProFeature")} warn>{t(lang,"guideAdvisorTipPro")}</TipBox>
      </>
    ),
    analytics: (
      <>
        <DemoBox title={t(lang,"guideHowItWorks")}
          visual={<div style={{display:"flex",alignItems:"center",gap:14}}>
            <div style={{width:54,height:54,borderRadius:"50%",border:"9px solid #ACE1AF",borderTopColor:"#FFB3A7",borderRightColor:"#FFB3A7",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:T.dark,fontWeight:700}}>Total</div>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              {[["#ACE1AF","Food 58%"],["#FFB3A7","Transport 24%"],["#C9B8FF","Other 18%"]].map(([c,l])=>(
                <div key={l} style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:8,height:8,background:c,borderRadius:2}}/><span style={{fontSize:10,color:T.dark}}>{l}</span></div>
              ))}
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:10,color:T.muted}}>vs last mo</div>
              <div style={{fontSize:13,fontWeight:800,color:"#C0392B"}}>▲ +12%</div>
            </div>
          </div>}>
          {t(lang,"guideAnalyticsBody")}
        </DemoBox>
        <TipBox label={t(lang,"guideMonthComparison")}>{t(lang,"guideAnalyticsTipMonth")}</TipBox>
        <TipBox label={t(lang,"guideSavingsRate")}>{t(lang,"guideAnalyticsTipRate")}</TipBox>
      </>
    ),
    streaks: (
      <>
        <DemoBox title={t(lang,"guideHowItWorks")}
          visual={<div style={{display:"flex",alignItems:"center",gap:14}}>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:28,fontWeight:800,color:"#1A4020",lineHeight:1}}>7</div>
              <div style={{fontSize:10,color:T.muted}}>🔥 day streak</div>
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:T.dark,marginBottom:5}}>🌿 Level 2 · 120 XP</div>
              <div style={{width:110,height:7,background:"rgba(45,45,58,0.1)",borderRadius:99,overflow:"hidden"}}><div style={{height:"100%",width:"40%",background:"#ACE1AF",borderRadius:99}}/></div>
              <div style={{fontSize:10,color:T.muted,marginTop:3}}>180 XP to Level 3 🌳</div>
            </div>
          </div>}>
          {t(lang,"guideStreaksBody")}
        </DemoBox>
        <TipBox label={t(lang,"guideMilestoneBonuses")}>{t(lang,"guideStreaksTipMilestones")}</TipBox>
        <TipBox label={t(lang,"guide10Levels")}>{t(lang,"guideStreaksTipLevels")}</TipBox>
        <TipBox label={t(lang,"guideTip")}>{t(lang,"guideStreaksTip")}</TipBox>
      </>
    ),
    pin: (
      <>
        <DemoBox title={t(lang,"guideHowItWorks")}
          visual={<div style={{display:"flex",gap:10,alignItems:"center"}}>
            <div style={{background:"#fff",borderRadius:10,padding:"8px 12px",fontSize:11,color:"#1A4020",fontWeight:700,border:"1px solid #ACE1AF",textAlign:"center"}}>🔐 Owner<br/><span style={{fontWeight:400,color:T.muted,fontSize:10}}>Full access</span></div>
            <div style={{fontSize:14,color:"#ACE1AF",fontWeight:700}}>vs</div>
            <div style={{background:"#fff",borderRadius:10,padding:"8px 12px",fontSize:11,color:"#C0392B",fontWeight:700,border:"1px solid rgba(255,179,167,0.5)",textAlign:"center"}}>🔑 Guest<br/><span style={{fontWeight:400,color:T.muted,fontSize:10}}>No settings</span></div>
          </div>}>
          {t(lang,"guidePinBody")}
        </DemoBox>
        <TipBox label={t(lang,"guideForSharedUse")}>{t(lang,"guidePinTipShared")}</TipBox>
        <TipBox label={t(lang,"guideLockImmediately")}>{t(lang,"guidePinTipLock")}</TipBox>
      </>
    ),
    safe: (
      <>
        <DemoBox title={t(lang,"guideWhatThisMeans")}
          visual={<div style={{background:"#fff",borderRadius:12,padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",width:"85%",border:"0.5px solid rgba(45,45,58,0.08)"}}>
            <div><div style={{fontSize:9,color:T.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5}}>Safe to spend</div><div style={{fontSize:18,fontWeight:800,color:T.dark}}>₭1,200,000</div></div>
            <div style={{textAlign:"right"}}><div style={{fontSize:9,color:T.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5}}>Per day</div><div style={{fontSize:16,fontWeight:800,color:"#3da873"}}>₭54,500</div></div>
          </div>}>
          {t(lang,"guideSafeBody")}
        </DemoBox>
        <TipBox label={t(lang,"guideTheFormula")}>{t(lang,"guideSafeTipFormula")}</TipBox>
        <TipBox label={t(lang,"guideWhenDisappears")} warn>{t(lang,"guideSafeTipDisappears")}</TipBox>
      </>
    ),
  };

  const cur = topic ? TOPICS.find(t=>t.id===topic) : null;

  return (
    <div style={{position:"fixed",inset:0,zIndex:500,background:T.bg,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
      <div style={{padding:"calc(env(safe-area-inset-top,0px) + 16px) 20px 20px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div style={{fontWeight:800,fontSize:20,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>{topic ? cur?.title : t(lang,"settingsGuide")}</div>
          <button onClick={topic ? ()=>setTopic(null) : onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:T.muted,fontFamily:"'Noto Sans',sans-serif"}}>{topic ? "←" : "✕"}</button>
        </div>
        {!topic ? (
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {TOPICS.map(tp=>(
              <button key={tp.id} onClick={()=>setTopic(tp.id)}
                style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",borderRadius:18,border:"none",cursor:"pointer",background:T.surface,boxShadow:T.shadow,textAlign:"left",fontFamily:"'Noto Sans',sans-serif"}}>
                <div style={{width:44,height:44,borderRadius:14,background:"rgba(172,225,175,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{tp.emoji}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:14,color:T.dark}}>{tp.title}</div>
                  <div style={{fontSize:12,color:T.muted,marginTop:2}}>{tp.sub}</div>
                </div>
                <div style={{fontSize:12,color:T.muted}}>›</div>
              </button>
            ))}
          </div>
        ) : (
          <div>{CONTENT[topic]}</div>
        )}
      </div>
      <div style={{height:"calc(env(safe-area-inset-bottom,0px) + 20px)"}}/>
    </div>
  );
}
