// Onboarding screen — 5-step first-boot wizard.
// Extracted from App.jsx in Session 7.
//
// Pre-existing gaps flagged for cleanup backlog:
//   - placeholder "e.g. Kanya, Som, Alex" hardcoded English
//   - step subtitles "Select the ones that match your life" and
//     "Select your income sources" hardcoded English
//   - LANGS array missing Thai (only Lao + English offered)

import { useState } from "react";
import { T, S, CURR } from "../lib/theme";
import { t } from "../lib/i18n";
import { DEFAULT_EXPENSE_CATS, DEFAULT_INCOME_CATS, catLabel } from "../lib/categories";
import { AVATARS } from "../lib/constants";
import { AnimalBg } from "../components/AnimalBg";
import { Logo } from "../components/Logo";

export function OnboardingScreen({onComplete, onBack}){
  const[step,setStep]=useState(0);
  const[name,setName]=useState("");
  const[avatar,setAvatar]=useState("🦫");
  const[lang,setLang]=useState("lo"); // Lao default — user can change in step 1
  const[baseCurrency,setBaseCurrency]=useState("LAK");
  const[expCats,setExpCats]=useState(DEFAULT_EXPENSE_CATS.map(c=>c.id));
  const[incCats,setIncCats]=useState(DEFAULT_INCOME_CATS.map(c=>c.id));
  const toggleCat=(id,list,setList)=>{if(list.includes(id)){if(list.length>1)setList(list.filter(x=>x!==id));}else setList([...list,id]);};
  const canAdvance=()=>step===0?name.trim().length>0:true;
  const advance=()=>{if(!canAdvance())return;if(step<4){setStep(step+1);return;}onComplete({name:name.trim(),avatar,lang,baseCurrency,expCats,incCats,customCategories:[]});};
  const LANGS=[{code:"lo",flag:"🇱🇦",label:"ລາວ"},{code:"en",flag:"🇬🇧",label:"English"}];
  const catBtnStyle=(on)=>({display:"flex",alignItems:"center",gap:7,padding:"9px 14px",borderRadius:14,border:"none",cursor:"pointer",background:on?"rgba(172,225,175,0.25)":"rgba(45,45,58,0.05)",fontWeight:on?700:500,fontSize:13,color:T.dark,fontFamily:"'Noto Sans',sans-serif",transition:"all .2s ease"});
  return(
    <div style={{minHeight:"100dvh",background:T.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px 20px",position:"relative",overflow:"hidden"}}>
      <AnimalBg/>
      <div style={{textAlign:"center",marginBottom:28,zIndex:1,display:"flex",flexDirection:"column",alignItems:"center"}}>
        <Logo size={120} />
        <div style={{fontFamily:"'Noto Sans',sans-serif",fontSize:26,fontWeight:800,color:T.dark,letterSpacing:-1,marginTop:6}}>Phajot · ພາຈົດ</div>
        <div style={{fontSize:12,color:T.muted,marginTop:6,textAlign:"center",maxWidth:300,lineHeight:1.5,fontFamily:"'Noto Sans',sans-serif",fontWeight:400}}>{t(lang,"slogan")}</div>
      </div>
      <div style={{display:"flex",gap:5,marginBottom:24,zIndex:1}}>
        {[0,1,2,3,4].map(i=><div key={i} style={{height:5,width:i===step?26:6,borderRadius:3,background:i<=step?T.celadon:"rgba(172,225,175,0.25)",transition:"all .35s cubic-bezier(.34,1.56,.64,1)"}}/>)}
      </div>
      <div style={{background:T.surface,backdropFilter:"blur(20px)",borderRadius:28,padding:"28px 24px",width:"100%",maxWidth:400,boxShadow:T.shadowLg,zIndex:1,maxHeight:"70dvh",overflowY:"auto"}}>
        {step===0&&(<>
          {onBack&&(<button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,color:T.muted,marginBottom:12,padding:0,fontFamily:"'Noto Sans',sans-serif",display:"flex",alignItems:"center",gap:4}}>← Back to phone login</button>)}
          <h2 style={S.title}>{t(lang,"welcome")}</h2>
          <p style={S.sub}>{t(lang,"tagline")}</p>
          <label style={S.label}>{t(lang,"your_name")}</label>
          <input value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&advance()} placeholder="e.g. Kanya, Som, Alex" autoFocus style={{width:"100%",marginTop:8,padding:"13px 16px",borderRadius:14,border:`1.5px solid ${name.trim()?"#ACE1AF":"rgba(45,45,58,0.12)"}`,outline:"none",fontSize:15,fontFamily:"'Noto Sans',sans-serif",color:T.dark,background:"rgba(172,225,175,0.06)",boxSizing:"border-box"}}/>
          <label style={{...S.label,marginTop:20}}>{t(lang,"pick_avatar")}</label>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:8}}>
            {AVATARS.map(a=><button key={a} onClick={()=>setAvatar(a)} style={{width:52,height:52,borderRadius:16,border:"none",cursor:"pointer",fontSize:26,background:avatar===a?"rgba(172,225,175,0.3)":"rgba(45,45,58,0.05)",transform:avatar===a?"scale(1.15)":"scale(1)",boxShadow:avatar===a?"0 3px 12px rgba(172,225,175,0.4)":"none",transition:"all .2s ease"}}>{a}</button>)}
          </div>
        </>)}
        {step===1&&(<>
          <h2 style={S.title}>{t(lang,"pick_lang")}</h2>
          <div style={{display:"flex",gap:10,marginTop:16}}>
            {LANGS.map(({code,flag,label})=><button key={code} onClick={()=>setLang(code)} style={{flex:1,padding:"16px 8px",borderRadius:18,border:"none",cursor:"pointer",background:lang===code?"linear-gradient(145deg,#ACE1AF,#7BC8A4)":"rgba(172,225,175,0.1)",transform:lang===code?"scale(1.06)":"scale(1)",boxShadow:lang===code?"0 4px 16px rgba(172,225,175,0.4)":"none",transition:"all .25s ease"}}>
              <div style={{fontSize:26}}>{flag}</div>
              <div style={{fontSize:13,fontWeight:700,color:T.dark,marginTop:6,fontFamily:"'Noto Sans',sans-serif"}}>{label}</div>
            </button>)}
          </div>
        </>)}
        {step===2&&(<>
          <h2 style={S.title}>{t(lang,"pick_currency")}</h2>
          <div style={{display:"flex",flexDirection:"column",gap:10,marginTop:16}}>
            {Object.entries(CURR).map(([code,c])=><button key={code} onClick={()=>setBaseCurrency(code)} style={{display:"flex",alignItems:"center",gap:16,padding:"16px 18px",borderRadius:18,border:"none",cursor:"pointer",background:baseCurrency===code?c.bg:"rgba(172,225,175,0.08)",transition:"all .25s ease",boxShadow:baseCurrency===code?T.shadow:"none",transform:baseCurrency===code?"scale(1.02)":"scale(1)"}}>
              <div style={{width:44,height:44,borderRadius:14,background:"rgba(255,255,255,0.55)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,fontWeight:900,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>{c.symbol}</div>
              <div style={{textAlign:"left"}}><div style={{fontWeight:700,fontSize:16,color:T.dark}}>{code}</div><div style={{fontSize:12,color:T.muted}}>{c.name}</div></div>
              {baseCurrency===code&&<div style={{marginLeft:"auto",fontSize:18,color:"#2A7A40"}}>✓</div>}
            </button>)}
          </div>
        </>)}
        {step===3&&(<>
          <h2 style={S.title}>{t(lang,"pick_expense_cats")}</h2>
          <p style={S.sub}>Select the ones that match your life</p>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:16}}>
            {DEFAULT_EXPENSE_CATS.map(cat=>{const on=expCats.includes(cat.id);return(
              <button key={cat.id} onClick={()=>toggleCat(cat.id,expCats,setExpCats)} style={catBtnStyle(on)}>
                <span style={{fontSize:16}}>{cat.emoji}</span>{catLabel(cat,lang)}{on&&<span style={{fontSize:10,color:"#2A7A40",marginLeft:2}}>✓</span>}
              </button>
            );})}
          </div>
        </>)}
        {step===4&&(<>
          <h2 style={S.title}>{t(lang,"pick_income_cats")}</h2>
          <p style={S.sub}>Select your income sources</p>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:16}}>
            {DEFAULT_INCOME_CATS.map(cat=>{const on=incCats.includes(cat.id);return(
              <button key={cat.id} onClick={()=>toggleCat(cat.id,incCats,setIncCats)} style={catBtnStyle(on)}>
                <span style={{fontSize:16}}>{cat.emoji}</span>{catLabel(cat,lang)}{on&&<span style={{fontSize:10,color:"#2A7A40",marginLeft:2}}>✓</span>}
              </button>
            );})}
          </div>
        </>)}
      </div>
      <button onClick={advance} style={{marginTop:24,padding:"16px 52px",borderRadius:24,border:"none",cursor:"pointer",background:canAdvance()?"linear-gradient(145deg,#ACE1AF,#7BC8A4)":"rgba(172,225,175,0.3)",color:canAdvance()?"#1A4020":"#8FB898",fontWeight:800,fontSize:16,fontFamily:"'Noto Sans',sans-serif",boxShadow:canAdvance()?"0 6px 24px rgba(172,225,175,0.5)":"none",zIndex:1,transition:"all .2s ease"}}
        onPointerDown={e=>canAdvance()&&(e.currentTarget.style.transform="scale(0.96)")}
        onPointerUp={e=>(e.currentTarget.style.transform="scale(1)")}>
        {step<4?t(lang,"next"):t(lang,"start")}
      </button>
    </div>
  );
}
