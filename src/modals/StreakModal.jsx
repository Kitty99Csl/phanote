// Streak modal — full card with XP, level, streak milestones.
// Extracted from App.jsx in Session 7.
//
// Pre-existing gaps flagged for cleanup backlog:
//   - hardcoded English strings (no i18n wiring)
//   - raw <div> overlay instead of shared Sheet
//   - dead `name` destructure from profile, never read

import { T } from "../lib/theme";
import { getLevel, getNextLevel, getLevelProgress } from "../lib/streak";
import { useKeyboardOffset } from "../hooks/useKeyboardOffset";

export function StreakModal({ profile, onClose }) {
  const kbOffset = useKeyboardOffset();
  const { streakCount = 0, xp = 0, name = "" } = profile;
  const level    = getLevel(xp);
  const nextLevel = getNextLevel(xp);
  const pct      = getLevelProgress(xp);
  const xpToNext = nextLevel ? nextLevel.min - xp : 0;

  const milestones = [
    { days:3,   done: streakCount>=3,   label:"3-day starter" },
    { days:7,   done: streakCount>=7,   label:"7-day habit",   bonus:"+30 XP" },
    { days:14,  done: streakCount>=14,  label:"2-week warrior", bonus:"+60 XP" },
    { days:30,  done: streakCount>=30,  label:"30-day legend",  bonus:"+150 XP" },
    { days:100, done: streakCount>=100, label:"100-day master",  bonus:"+500 XP" },
  ];

  return (
    <div style={{position:"fixed",inset:0,zIndex:3000,background:"rgba(30,30,40,0.6)",
      backdropFilter:"blur(4px)",display:"flex",alignItems:"flex-end",justifyContent:"center"}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:"#fff",borderRadius:"28px 28px 0 0",width:"100%",maxWidth:430,animation:"slideUp .3s ease",maxHeight:"88dvh",display:"flex",flexDirection:"column",
        transform:kbOffset>0?`translateY(-${kbOffset}px)`:undefined,transition:"transform .25s ease"}}>
        <div style={{overflowY:"auto",flex:1,minHeight:0,padding:"24px 24px 24px",WebkitOverflowScrolling:"touch"}}>

        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
          <div style={{fontWeight:800,fontSize:18,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>
            {level.emoji} Your Progress
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:T.muted}}>✕</button>
        </div>

        {/* Level card */}
        <div style={{background:"linear-gradient(145deg,#ACE1AF,#7BC8A4)",borderRadius:20,padding:"20px 20px 18px",marginBottom:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:"rgba(26,64,32,0.7)",textTransform:"uppercase",letterSpacing:0.8}}>Level {level.index}</div>
              <div style={{fontSize:26,fontWeight:800,color:"#1A4020",fontFamily:"'Noto Sans',sans-serif",marginTop:2}}>{level.emoji} {level.label}</div>
              <div style={{fontSize:12,color:"rgba(26,64,32,0.7)",marginTop:2}}>{xp} XP total</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:11,fontWeight:700,color:"rgba(26,64,32,0.7)",textTransform:"uppercase",letterSpacing:0.8}}>Streak</div>
              <div style={{fontSize:36,fontWeight:800,color:"#1A4020",fontFamily:"'Noto Sans',sans-serif",lineHeight:1}}>{streakCount}</div>
              <div style={{fontSize:11,color:"rgba(26,64,32,0.7)"}}>days 🔥</div>
            </div>
          </div>
          {nextLevel ? (<>
            <div style={{height:8,background:"rgba(26,64,32,0.15)",borderRadius:99,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${pct}%`,background:"#1A4020",borderRadius:99,transition:"width .6s ease"}}/>
            </div>
            <div style={{marginTop:6,display:"flex",justifyContent:"space-between",fontSize:11,color:"rgba(26,64,32,0.7)"}}>
              <span>{pct}% to Level {level.index+1}</span>
              <span>{xpToNext} XP needed</span>
            </div>
          </>) : (
            <div style={{fontSize:12,color:"rgba(26,64,32,0.8)",fontWeight:700}}>🏆 Maximum level reached!</div>
          )}
        </div>

        {/* How to earn XP */}
        <div style={{background:T.bg,borderRadius:16,padding:"14px 16px",marginBottom:20}}>
          <div style={{fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:0.8,marginBottom:10}}>Earn XP</div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13}}>
              <span style={{color:T.dark}}>Log any transaction</span>
              <span style={{fontWeight:700,color:"#2A7A40"}}>+10 XP</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13}}>
              <span style={{color:T.dark}}>7-day streak milestone</span>
              <span style={{fontWeight:700,color:"#2A7A40"}}>+30 XP</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13}}>
              <span style={{color:T.dark}}>30-day streak milestone</span>
              <span style={{fontWeight:700,color:"#2A7A40"}}>+150 XP</span>
            </div>
          </div>
        </div>

        {/* Milestones */}
        <div style={{fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:0.8,marginBottom:10}}>Streak milestones</div>
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
                <div style={{fontSize:13,fontWeight:600,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>{m.days} days — {m.label}</div>
                {m.bonus&&<div style={{fontSize:11,color:"#2A7A40",marginTop:1}}>{m.bonus} bonus</div>}
              </div>
            </div>
          ))}
        </div>
        </div>{/* end scroll */}
      </div>
    </div>
  );
}
