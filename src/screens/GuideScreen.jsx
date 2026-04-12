// Guide / help screen — in-app tutorial with 9 topics.
// Extracted from App.jsx in Session 7.
//
// Pre-existing gaps flagged for cleanup backlog:
//   - receives `lang` prop but ignores it (100% English content)
//   - TOPICS + CONTENT arrays should be i18n'd (biggest i18n
//     gap in the app)
//   - includes inline sub-components: TipBox, DemoBox, ExRow
//
// Contains Lao/Thai demo inputs in CONTENT (ກາເຟ 15,000,
// กาแฟ 45 บาท) — byte-slice preserves Unicode exactly.

import { useState } from "react";
import { T } from "../lib/theme";

export function GuideScreen({ lang, onClose }) {
  const [topic, setTopic] = useState(null);

  const TOPICS = [
    { id:"log",      emoji:"💬", title:"Logging a transaction",  sub:"Type in any language" },
    { id:"ocr",      emoji:"📷", title:"Scanning a receipt",     sub:"Camera or gallery — auto-log" },
    { id:"budget",   emoji:"💰", title:"Setting a budget",       sub:"Limits per category" },
    { id:"goals",    emoji:"🎯", title:"Creating a goal",        sub:"Savings plan with timeline" },
    { id:"advisor",  emoji:"🤖", title:"AI Advisor",             sub:"Ask about your money" },
    { id:"analytics",emoji:"📊", title:"Reading analytics",      sub:"Charts & monthly comparison" },
    { id:"streaks",  emoji:"🔥", title:"Streaks & XP levels",    sub:"How to earn rewards" },
    { id:"pin",      emoji:"🔐", title:"PIN & guest access",      sub:"Share safely with family" },
    { id:"safe",     emoji:"✅", title:"Safe to spend",           sub:"What that number means" },
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
        <DemoBox title="How it works"
          visual={<>
            <div style={{background:"#fff",borderRadius:9999,padding:"6px 12px",fontSize:11,color:T.dark,border:"1px solid rgba(172,225,175,0.4)"}}>ກາເຟ 15,000</div>
            <div style={{fontSize:18,color:"#ACE1AF"}}>→</div>
            <div style={{background:"#fff",borderRadius:10,padding:"6px 10px",fontSize:11,fontWeight:700,color:"#1A5A30",border:"1px solid #ACE1AF"}}>☕ −₭15,000</div>
          </>}>
          Type what you spent in the bar at the bottom of the home screen. Just write naturally — Phajot reads the amount, currency and category automatically.
        </DemoBox>
        <TipBox label="Try these examples">
          <ExRow input="กาแฟ 45 บาท" result="☕ −฿45"/>
          <ExRow input="ເຂົ້າ 50,000" result="🍜 −₭50,000"/>
          <ExRow input="grab 89" result="🛵 −฿89"/>
          <ExRow input="เงินเดือน 50000" result="💼 +฿50,000"/>
        </TipBox>
        <TipBox label="💡 Tip">No currency written? Phajot uses your base currency. You can always edit a transaction by tapping it in the list.</TipBox>
      </>
    ),
    ocr: (
      <>
        <DemoBox title="How it works"
          visual={<>
            <div style={{width:44,height:44,borderRadius:12,background:"rgba(172,225,175,0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>📷</div>
            <div style={{fontSize:18,color:"#ACE1AF"}}>→</div>
            <div style={{background:"#fff",borderRadius:8,padding:"6px 10px",fontSize:10,color:T.dark,lineHeight:1.7,boxShadow:"0 2px 8px rgba(0,0,0,0.08)"}}>Bill<br/>Coffee ×2<br/><strong>฿185</strong></div>
            <div style={{fontSize:18,color:"#ACE1AF"}}>→</div>
            <div style={{background:"#fff",borderRadius:10,padding:"6px 10px",fontSize:11,fontWeight:700,color:"#1A5A30",border:"1px solid #ACE1AF"}}>−฿185 ✓</div>
          </>}>
          Tap the 📷 icon in the input bar. Take a photo or pick from gallery. Phajot reads the total and saves it — you just confirm.
        </DemoBox>
        <TipBox label="💡 Best results">Take the photo flat and well-lit. Make sure the total is visible. Works on restaurant bills, pharmacy receipts, and supermarket slips.</TipBox>
        <TipBox label="Pro feature" warn>Receipt scanning requires a Pro plan. Tap the 🔒 icon in the input bar to learn more.</TipBox>
      </>
    ),
    budget: (
      <>
        <DemoBox title="How it works"
          visual={<div style={{display:"flex",flexDirection:"column",gap:7,width:"75%"}}>
            {[["🍜","Food","65%","#3da873"],[" 🛍️","Shopping","90%","#d4993a"],["🛵","Transport","110%","#C0392B"]].map(([ic,nm,pct,cl])=>(
              <div key={nm} style={{display:"flex",alignItems:"center",gap:7}}>
                <span style={{fontSize:13}}>{ic}</span>
                <div style={{flex:1,height:6,background:"rgba(45,45,58,0.1)",borderRadius:99,overflow:"hidden"}}><div style={{height:"100%",width:pct,background:cl,borderRadius:99}}/></div>
                <span style={{fontSize:10,fontWeight:700,color:cl,width:28}}>{pct}</span>
              </div>
            ))}
          </div>}>
          Go to the Budget tab. Tap any category and set a monthly limit. The bar fills as you spend — green is fine, orange is nearly there, red is over budget.
        </DemoBox>
        <TipBox label="💡 Tip">Budgets are per currency. Your Food limit in LAK is separate from your Food limit in THB.</TipBox>
        <TipBox label="💡 Setting a limit">Tap any category row → type an amount → Save. You can remove or change it anytime.</TipBox>
      </>
    ),
    goals: (
      <>
        <DemoBox title="How it works"
          visual={<div style={{display:"flex",flexDirection:"column",gap:5,alignItems:"center"}}>
            <div style={{fontSize:12,fontWeight:800,color:"#1A4020"}}>✈️ Bali Trip</div>
            <div style={{width:140,height:6,background:"rgba(45,45,58,0.1)",borderRadius:99,overflow:"hidden"}}><div style={{height:"100%",width:"40%",background:"#ACE1AF",borderRadius:99}}/></div>
            <div style={{fontSize:10,color:T.muted}}>₭2M saved of ₭5M</div>
            <div style={{fontSize:10,fontWeight:700,color:"#1A4020"}}>Save ₭500K/mo → 6 months</div>
          </div>}>
          Go to Goals → tap +. Give your goal a name, a target amount, and a deadline month. Phajot shows how much to save each month to get there.
        </DemoBox>
        <TipBox label="💡 Adding savings">Tap "Add savings" on any goal card to record money set aside. The progress bar and timeline update instantly.</TipBox>
        <TipBox label="💡 Smart suggestion">Phajot suggests which spending category to cut to reach your goal faster — look for the 💡 tip on the goal card.</TipBox>
      </>
    ),
    advisor: (
      <>
        <DemoBox title="How it works"
          visual={<div style={{display:"flex",flexDirection:"column",gap:5,alignItems:"flex-start",width:"90%"}}>
            <div style={{background:"#fff",borderRadius:"10px 10px 10px 2px",padding:"7px 10px",fontSize:11,color:T.dark,border:"0.5px solid rgba(45,45,58,0.1)",maxWidth:"80%"}}>Where am I spending the most?</div>
            <div style={{background:"#1A4020",borderRadius:"10px 10px 2px 10px",padding:"7px 10px",fontSize:11,color:"#fff",maxWidth:"85%",alignSelf:"flex-end"}}>🍜 Food at ₭450K — 42% of spending. Consider a ₭350K limit next month.</div>
          </div>}>
          Tap the 🤖 icon in the input bar on the home screen. The AI has access to your real transaction data and answers in Lao, Thai or English.
        </DemoBox>
        <TipBox label="Things to ask">
          "How much did I spend on food this month?"<br/>
          "Am I on track for my Bali goal?"<br/>
          "Which expense should I cut first?"<br/>
          "How much can I safely spend today?"
        </TipBox>
        <TipBox label="Pro feature" warn>AI Advisor requires a Pro plan.</TipBox>
      </>
    ),
    analytics: (
      <>
        <DemoBox title="How it works"
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
          The Analytics tab shows spending by category. Use the Today / Week / Month / All Time pills to filter. Use ← → to compare previous months.
        </DemoBox>
        <TipBox label="Month comparison">The ▲▼ badge on each currency card shows if spending went up or down vs last month. Green ▼ = good. Red ▲ = went up.</TipBox>
        <TipBox label="💡 Savings rate">The % number in the Net card shows what portion of your income you kept. Aim for 20%+ as a healthy target.</TipBox>
      </>
    ),
    streaks: (
      <>
        <DemoBox title="How it works"
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
          Log at least one transaction every day to keep your streak. Each transaction gives +10 XP. Milestone streaks give bonus XP.
        </DemoBox>
        <TipBox label="Milestone bonuses">7 days +30 XP · 14 days +60 XP · 30 days +150 XP · 100 days +500 XP</TipBox>
        <TipBox label="10 levels">🌱 Seedling → 🌿 Sprout → 🌳 Grower → 💚 Guardian → ⭐ Star → 🌟 Legend → 👑 Master → 🔥 Elite → 💎 Diamond → 🏆 Champion</TipBox>
        <TipBox label="💡 Tip">Tap the streak pill (📅 7d · Lv.2) in the top-right of the home screen to see your full progress card.</TipBox>
      </>
    ),
    pin: (
      <>
        <DemoBox title="How it works"
          visual={<div style={{display:"flex",gap:10,alignItems:"center"}}>
            <div style={{background:"#fff",borderRadius:10,padding:"8px 12px",fontSize:11,color:"#1A4020",fontWeight:700,border:"1px solid #ACE1AF",textAlign:"center"}}>🔐 Owner<br/><span style={{fontWeight:400,color:T.muted,fontSize:10}}>Full access</span></div>
            <div style={{fontSize:14,color:"#ACE1AF",fontWeight:700}}>vs</div>
            <div style={{background:"#fff",borderRadius:10,padding:"8px 12px",fontSize:11,color:"#C0392B",fontWeight:700,border:"1px solid rgba(255,179,167,0.5)",textAlign:"center"}}>🔑 Guest<br/><span style={{fontWeight:400,color:T.muted,fontSize:10}}>No settings</span></div>
          </div>}>
          Go to Settings → Security. Set an Owner PIN for yourself and a Guest PIN for family. Both open the same account data — but guests cannot access Settings.
        </DemoBox>
        <TipBox label="💡 For shared use">Give your family member the Guest PIN. They can log transactions, view budgets and analytics — but cannot reset the app or change settings.</TipBox>
        <TipBox label="Lock immediately">Settings → Security → "Lock app now" shows the PIN screen right away without closing the app.</TipBox>
      </>
    ),
    safe: (
      <>
        <DemoBox title="What this number means"
          visual={<div style={{background:"#fff",borderRadius:12,padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",width:"85%",border:"0.5px solid rgba(45,45,58,0.08)"}}>
            <div><div style={{fontSize:9,color:T.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5}}>Safe to spend</div><div style={{fontSize:18,fontWeight:800,color:T.dark}}>₭1,200,000</div></div>
            <div style={{textAlign:"right"}}><div style={{fontSize:9,color:T.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5}}>Per day</div><div style={{fontSize:16,fontWeight:800,color:"#3da873"}}>₭54,500</div></div>
          </div>}>
          The strip at the top of the home screen shows how much you can still spend this month. It updates every time you log a transaction.
        </DemoBox>
        <TipBox label="The formula">Income this month minus what you've already spent minus what you need to save for your goals.</TipBox>
        <TipBox label="When it disappears" warn>This strip only shows when you have income logged for the current month. Log your salary first to see it.</TipBox>
      </>
    ),
  };

  const cur = topic ? TOPICS.find(t=>t.id===topic) : null;

  if (topic) {
    return (
      <div style={{padding:"0 0 32px",position:"relative",zIndex:1}}>
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"calc(env(safe-area-inset-top,8px) + 8px) 16px 12px",background:"rgba(247,252,245,0.97)",backdropFilter:"blur(16px)",borderBottom:"1px solid rgba(45,45,58,0.05)",position:"sticky",top:0,zIndex:10}}>
          <button onClick={()=>setTopic(null)} style={{fontSize:13,color:T.muted,background:"rgba(45,45,58,0.07)",border:"none",cursor:"pointer",fontFamily:"'Noto Sans',sans-serif",borderRadius:9999,padding:"6px 12px",fontWeight:700}}>← Guide</button>
          <div style={{fontSize:15,fontWeight:800,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>{cur?.emoji} {cur?.title}</div>
        </div>
        <div style={{padding:"16px 16px 0"}}>
          {CONTENT[topic]}
        </div>
      </div>
    );
  }

  return (
    <div style={{position:"relative",zIndex:1}}>
      <div style={{background:"#1A4020",padding:"calc(env(safe-area-inset-top,8px) + 14px) 16px 20px"}}>
        <button onClick={onClose} style={{fontSize:13,color:"rgba(255,255,255,0.5)",background:"none",border:"none",cursor:"pointer",fontFamily:"'Noto Sans',sans-serif",marginBottom:12,padding:0}}>← Settings</button>
        <div style={{fontSize:22,fontWeight:800,color:"#fff",fontFamily:"'Noto Sans',sans-serif"}}>Phajot guide</div>
        <div style={{fontSize:13,color:"rgba(255,255,255,0.55)",marginTop:4}}>Tap any feature to learn how it works</div>
      </div>
      <div style={{padding:"16px 16px 32px"}}>
        <div style={{background:T.surface,backdropFilter:"blur(20px)",borderRadius:20,overflow:"hidden",boxShadow:T.shadow}}>
          {TOPICS.map((tp,i)=>(
            <button key={tp.id} onClick={()=>setTopic(tp.id)}
              style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"14px 16px",background:"transparent",border:"none",cursor:"pointer",borderTop:i>0?"1px solid rgba(45,45,58,0.05)":"none",textAlign:"left",fontFamily:"'Noto Sans',sans-serif"}}>
              <div style={{width:38,height:38,borderRadius:12,background:"rgba(172,225,175,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{tp.emoji}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:700,color:T.dark}}>{tp.title}</div>
                <div style={{fontSize:12,color:T.muted,marginTop:1}}>{tp.sub}</div>
              </div>
              <div style={{fontSize:13,color:"#C5C5D0"}}>›</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
