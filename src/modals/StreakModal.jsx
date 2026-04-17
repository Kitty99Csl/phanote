// Streak modal — full card with XP, level, streak milestones.
// Extracted from App.jsx in Session 7.
//
// Pre-existing gaps flagged for cleanup backlog:
//   - hardcoded English strings (no i18n wiring)
//   - raw <div> overlay instead of shared Sheet
//   - dead `name` destructure from profile, never read

import { T } from "../lib/theme";
import { t } from "../lib/i18n";
import { getLevel, getNextLevel, getLevelProgress } from "../lib/streak";
import Sheet from "../components/Sheet";

export function StreakModal({ profile, onClose }) {
  const { streakCount = 0, xp = 0, lang = "lo" } = profile;
  const level    = getLevel(xp);
  const nextLevel = getNextLevel(xp);
  const pct      = getLevelProgress(xp);
  const xpToNext = nextLevel ? nextLevel.min - xp : 0;

  const milestones = [
    { days:3,   done: streakCount>=3,   labelKey:"streakMs3" },
    { days:7,   done: streakCount>=7,   labelKey:"streakMs7",   bonusXp:30 },
    { days:14,  done: streakCount>=14,  labelKey:"streakMs14",  bonusXp:60 },
    { days:30,  done: streakCount>=30,  labelKey:"streakMs30",  bonusXp:150 },
    { days:100, done: streakCount>=100, labelKey:"streakMs100", bonusXp:500 },
  ];

  return (
    <Sheet open={true} onClose={onClose} showCloseButton={false}>
      <div style={{paddingTop:24,paddingBottom:24}}>

        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
          <div style={{fontWeight:800,fontSize:18,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>
            {level.emoji} {t(lang,"streakTitle")}
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:T.muted}}>✕</button>
        </div>

        {/* Level card */}
        <div style={{background:"linear-gradient(145deg,#ACE1AF,#7BC8A4)",borderRadius:20,padding:"20px 20px 18px",marginBottom:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:"rgba(26,64,32,0.7)",textTransform:"uppercase",letterSpacing:0.8}}>{t(lang,"streakLevelN").replace("{n}",level.index)}</div>
              <div style={{fontSize:26,fontWeight:800,color:"#1A4020",fontFamily:"'Noto Sans',sans-serif",marginTop:2}}>{level.emoji} {t(lang,"level"+level.label)}</div>
              <div style={{fontSize:12,color:"rgba(26,64,32,0.7)",marginTop:2}}>{t(lang,"streakXpTotal").replace("{n}",xp)}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:11,fontWeight:700,color:"rgba(26,64,32,0.7)",textTransform:"uppercase",letterSpacing:0.8}}>{t(lang,"streakLabel")}</div>
              <div style={{fontSize:36,fontWeight:800,color:"#1A4020",fontFamily:"'Noto Sans',sans-serif",lineHeight:1}}>{streakCount}</div>
              <div style={{fontSize:11,color:"rgba(26,64,32,0.7)"}}>{t(lang,"streakDaysFire").replace("{n}",streakCount)}</div>
            </div>
          </div>
          {nextLevel ? (<>
            <div style={{height:8,background:"rgba(26,64,32,0.15)",borderRadius:99,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${pct}%`,background:"#1A4020",borderRadius:99,transition:"width .6s ease"}}/>
            </div>
            <div style={{marginTop:6,display:"flex",justifyContent:"space-between",fontSize:11,color:"rgba(26,64,32,0.7)"}}>
              <span>{t(lang,"streakPctToLevel").replace("{pct}",pct).replace("{n}",level.index+1)}</span>
              <span>{t(lang,"streakXpNeeded").replace("{n}",xpToNext)}</span>
            </div>
          </>) : (
            <div style={{fontSize:12,color:"rgba(26,64,32,0.8)",fontWeight:700}}>{t(lang,"streakMaxLevel")}</div>
          )}
        </div>

        {/* How to earn XP */}
        <div style={{background:T.bg,borderRadius:16,padding:"14px 16px",marginBottom:20}}>
          <div style={{fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:0.8,marginBottom:10}}>{t(lang,"streakEarnXp")}</div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13}}>
              <span style={{color:T.dark}}>{t(lang,"streakEarnLogTx")}</span>
              <span style={{fontWeight:700,color:"#2A7A40"}}>{t(lang,"streakEarnXpAmount").replace("{n}",10)}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13}}>
              <span style={{color:T.dark}}>{t(lang,"streakEarn7day")}</span>
              <span style={{fontWeight:700,color:"#2A7A40"}}>{t(lang,"streakEarnXpAmount").replace("{n}",30)}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13}}>
              <span style={{color:T.dark}}>{t(lang,"streakEarn30day")}</span>
              <span style={{fontWeight:700,color:"#2A7A40"}}>{t(lang,"streakEarnXpAmount").replace("{n}",150)}</span>
            </div>
          </div>
        </div>

        {/* Milestones */}
        <div style={{fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:0.8,marginBottom:10}}>{t(lang,"streakMilestones")}</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {milestones.map(m => (
            <div key={m.days} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",
              borderRadius:14,background:m.done?"rgba(172,225,175,0.2)":"rgba(45,45,58,0.04)",
              opacity:m.done?1:0.5}}>
              <div style={{width:32,height:32,borderRadius:10,background:m.done?T.celadon:"rgba(45,45,58,0.08)",
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>
                {m.done?"✓":"🔒"}
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>{t(lang,m.labelKey)}</div>
                {m.bonusXp&&<div style={{fontSize:11,color:"#2A7A40",marginTop:1}}>{t(lang,"streakBonusLabel").replace("{xp}",t(lang,"streakEarnXpAmount").replace("{n}",m.bonusXp))}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Sheet>
  );
}
