// Settings screen — central hub for profile, language, currency,
// PIN, statement scan, help, and logout/reset.
// Extracted from App.jsx in Session 7.
//
// Includes CategoryManager as a co-located non-exported sibling
// (only consumer is SettingsScreen itself — same precedent as
// MonthlyWrapModal's helpers in commit 15).
//
// Pre-existing gaps flagged for cleanup backlog:
//   - ~15 hardcoded English strings mixed with i18n keys
//     (Pro plan labels, PIN setup labels, help tile, etc.)
//   - bilingual "Security / ຄວາມປອດໄພ" header bypasses t()
//   - CategoryManager has mixed i18n like its parent
//   - LANGS array in settings has 🇱🇦🇹🇭🇬🇧 flag emojis

import { useState } from "react";
import { T, CURR } from "../lib/theme";
import { t } from "../lib/i18n";
import { AVATARS, EMOJI_PICKS } from "../lib/constants";
import { getLevel } from "../lib/streak";
import { Flag } from "../components/Flag";
import { Logo } from "../components/Logo";

function CategoryManager({lang,customCategories,onAdd,onRemove}){
  const[adding,setAdding]=useState(false);
  const[newEmoji,setNewEmoji]=useState("🌟");
  const[newName,setNewName]=useState("");
  const[newType,setNewType]=useState("expense");
  const[showEmoji,setShowEmoji]=useState(false);
  const submit=()=>{
    if(!newName.trim())return;
    const id=`custom_${Date.now()}`;
    onAdd({id,emoji:newEmoji,en:newName.trim(),lo:newName.trim(),th:newName.trim(),type:newType,isCustom:true});
    setNewName("");setNewEmoji("🌟");setAdding(false);setShowEmoji(false);
  };
  return(
    <div>
      <div style={{fontSize:10,fontWeight:700,letterSpacing:1.4,color:T.muted,textTransform:"uppercase",marginBottom:10,fontFamily:"'Noto Sans',sans-serif"}}>{t(lang,"manage_cats")}</div>
      <div style={{background:T.surface,backdropFilter:"blur(20px)",borderRadius:20,overflow:"hidden",boxShadow:T.shadow,marginBottom:12}}>
        {customCategories.length===0&&!adding&&(<div style={{padding:"16px 18px",fontSize:13,color:T.muted,fontFamily:"'Noto Sans',sans-serif"}}>No custom categories yet</div>)}
        {customCategories.map((cat,i)=>(
          <div key={cat.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 18px",borderTop:i>0?"1px solid rgba(45,45,58,0.05)":"none"}}>
            <span style={{fontSize:22}}>{cat.emoji}</span>
            <div style={{flex:1}}><div style={{fontSize:14,fontWeight:600,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>{cat.en}</div><div style={{fontSize:11,color:T.muted}}>{cat.type}</div></div>
            <button onClick={()=>onRemove(cat.id)} style={{fontSize:16,border:"none",background:"none",cursor:"pointer",color:"#FFB3A7",padding:"4px 8px"}}>✕</button>
          </div>
        ))}
        {adding&&(
          <div style={{padding:"14px 18px",borderTop:customCategories.length?"1px solid rgba(45,45,58,0.05)":"none"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <button onClick={()=>setShowEmoji(!showEmoji)} style={{width:46,height:46,borderRadius:14,border:"1.5px solid rgba(45,45,58,0.1)",background:"rgba(172,225,175,0.06)",fontSize:24,cursor:"pointer"}}>{newEmoji}</button>
              <input value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} placeholder={t(lang,"category_name")} autoFocus style={{flex:1,padding:"11px 14px",borderRadius:14,border:"1.5px solid rgba(45,45,58,0.1)",outline:"none",fontSize:13,fontFamily:"'Noto Sans',sans-serif",color:T.dark,background:"rgba(172,225,175,0.06)"}}
                onFocus={e=>e.target.style.borderColor="#ACE1AF"} onBlur={e=>e.target.style.borderColor="rgba(45,45,58,0.1)"}/>
            </div>
            {showEmoji&&(<div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10,padding:"10px",borderRadius:14,background:"rgba(45,45,58,0.04)"}}>
              {EMOJI_PICKS.map(e=><button key={e} onClick={()=>{setNewEmoji(e);setShowEmoji(false);}} style={{fontSize:22,border:"none",background:newEmoji===e?"rgba(172,225,175,0.3)":"transparent",cursor:"pointer",borderRadius:8,padding:"4px",width:36,height:36}}>{e}</button>)}
            </div>)}
            <div style={{display:"flex",gap:8,marginBottom:12}}>
              {["expense","income"].map(type=><button key={type} onClick={()=>setNewType(type)} style={{flex:1,padding:"9px",borderRadius:12,border:"none",cursor:"pointer",background:newType===type?"rgba(172,225,175,0.25)":"rgba(45,45,58,0.05)",fontWeight:newType===type?700:500,fontSize:13,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>{t(lang,type)}{newType===type&&" ✓"}</button>)}
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>{setAdding(false);setShowEmoji(false);}} style={{flex:1,padding:"10px",borderRadius:12,border:"none",cursor:"pointer",background:"rgba(45,45,58,0.06)",color:T.muted,fontWeight:700,fontSize:13,fontFamily:"'Noto Sans',sans-serif"}}>{t(lang,"cancel")}</button>
              <button onClick={submit} style={{flex:2,padding:"10px",borderRadius:12,border:"none",cursor:"pointer",background:"linear-gradient(145deg,#ACE1AF,#7BC8A4)",color:"#1A4020",fontWeight:800,fontSize:13,fontFamily:"'Noto Sans',sans-serif"}}>{t(lang,"save")}</button>
            </div>
          </div>
        )}
      </div>
      {!adding&&(<button onClick={()=>setAdding(true)} style={{width:"100%",padding:"12px",borderRadius:16,border:"1.5px dashed rgba(172,225,175,0.5)",cursor:"pointer",background:"transparent",color:"#5aae5f",fontWeight:700,fontSize:13,fontFamily:"'Noto Sans',sans-serif"}}>+ {t(lang,"add_category")}</button>)}
    </div>
  );
}

export function SettingsScreen({profile,transactions,onUpdateProfile,onReset,pinConfig={owner:null,guest:null},savePinConfig=()=>{},setPinRole=()=>{},setPinSetupMode=()=>{},onShowGuide=()=>{},onShowUpgrade=()=>{},onShowStatementScan=()=>{}}){
  const{lang,baseCurrency,name,avatar,customCategories=[]}=profile;
  const isPro = profile?.isPro || false;
  const[showLang,setShowLang]=useState(false);
  const[showCur,setShowCur]=useState(false);
  const[showAvatar,setShowAvatar]=useState(false);
  const LANGS=[{code:"lo",flag:"🇱🇦",label:"ລາວ"},{code:"th",flag:"🇹🇭",label:"ไทย"},{code:"en",flag:"🇬🇧",label:"English"}];
  const btnStyle=(active)=>({display:"flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:12,border:"none",cursor:"pointer",fontFamily:"'Noto Sans',sans-serif",background:active?"rgba(172,225,175,0.3)":"rgba(45,45,58,0.05)",fontWeight:active?700:500,fontSize:13,color:T.dark});
  return(
    <div style={{padding:"calc(env(safe-area-inset-top, 8px) + 8px) 20px 24px",position:"relative",zIndex:1}}>
      <div style={{fontWeight:800,fontSize:22,color:T.dark,fontFamily:"'Noto Sans',sans-serif",marginBottom:16}}>{t(lang,"settings")}</div>

      {/* ─── Plan banner ─── */}
      {isPro ? (
        <div style={{background:"#1A4020",borderRadius:18,padding:"13px 16px",marginBottom:20,display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:40,height:40,borderRadius:12,background:"rgba(172,225,175,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>⭐</div>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:700,color:"#fff",fontFamily:"'Noto Sans',sans-serif"}}>Pro plan</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.55)",marginTop:1}}>All features unlocked</div>
          </div>
          <div style={{fontSize:10,fontWeight:700,padding:"4px 10px",borderRadius:9999,background:"rgba(172,225,175,0.25)",color:"#ACE1AF"}}>Active</div>
        </div>
      ) : (
        <div style={{background:T.surface,backdropFilter:"blur(20px)",borderRadius:18,padding:"13px 16px",marginBottom:20,display:"flex",alignItems:"center",gap:12,boxShadow:T.shadow}}>
          <div style={{width:40,height:40,borderRadius:12,background:"rgba(45,45,58,0.06)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>🌱</div>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:700,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>Free plan</div>
            <div style={{fontSize:11,color:T.muted,marginTop:1}}>Upgrade to unlock AI Advisor & more</div>
          </div>
          <button onClick={onShowUpgrade} style={{fontSize:11,fontWeight:700,padding:"7px 13px",borderRadius:9999,border:"none",background:"#ACE1AF",color:"#1A4020",cursor:"pointer",fontFamily:"'Noto Sans',sans-serif",whiteSpace:"nowrap",flexShrink:0}}>Upgrade →</button>
        </div>
      )}
      {/* ────────────────── */}
      <div style={{background:T.surface,backdropFilter:"blur(20px)",borderRadius:24,padding:"20px",boxShadow:T.shadow,marginBottom:20}}>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <button onClick={()=>setShowAvatar(!showAvatar)} style={{width:64,height:64,borderRadius:20,background:"linear-gradient(145deg,#ACE1AF,#7BC8A4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,boxShadow:"0 4px 14px rgba(172,225,175,0.4)",border:"none",cursor:"pointer",position:"relative",flexShrink:0}}>
            {avatar}
            <div style={{position:"absolute",bottom:-4,right:-4,width:22,height:22,borderRadius:8,background:"#fff",boxShadow:"0 2px 6px rgba(0,0,0,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11}}>✏️</div>
          </button>
          <div>
            <div style={{fontWeight:800,fontSize:18,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>{name}</div>
            <div style={{fontSize:12,color:T.muted,marginTop:2}}>{transactions.length} transactions logged</div>
            <div style={{fontSize:11,color:"#5aae5f",marginTop:3,fontWeight:700}}>
              {(()=>{const lv=getLevel(profile.xp||0);return`${lv.emoji} Level ${lv.index} · ${profile.xp||0} XP · 🔥 ${profile.streakCount||0} day streak`;})()}
            </div>
            <div style={{fontSize:11,color:"#5aae5f",marginTop:2,cursor:"pointer"}} onClick={()=>setShowAvatar(!showAvatar)}>Tap avatar to change</div>
          </div>
        </div>
        {showAvatar&&(<div style={{marginTop:14,animation:"slideDown .2s ease"}}>
          <div style={{fontSize:11,color:T.muted,marginBottom:8,fontFamily:"'Noto Sans',sans-serif"}}>Choose your companion</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {AVATARS.map(a=><button key={a} onClick={()=>{onUpdateProfile({avatar:a});setShowAvatar(false);}} style={{width:48,height:48,borderRadius:14,border:"none",cursor:"pointer",fontSize:24,background:avatar===a?"rgba(172,225,175,0.3)":"rgba(45,45,58,0.05)",transform:avatar===a?"scale(1.15)":"scale(1)",boxShadow:avatar===a?"0 3px 10px rgba(172,225,175,0.4)":"none",transition:"all .2s ease"}}>{a}</button>)}
          </div>
        </div>)}
      </div>
      <div style={{fontSize:10,fontWeight:700,letterSpacing:1.4,color:T.muted,textTransform:"uppercase",marginBottom:10,fontFamily:"'Noto Sans',sans-serif"}}>{t(lang,"preferences")}</div>
      <div style={{background:T.surface,backdropFilter:"blur(20px)",borderRadius:20,boxShadow:T.shadow,marginBottom:20}}>
        <div onClick={()=>{setShowLang(!showLang);setShowCur(false);}} style={{display:"flex",alignItems:"center",gap:12,padding:"16px 18px",cursor:"pointer",borderBottom:"1px solid rgba(45,45,58,0.05)"}}>
          <div style={{width:40,height:40,borderRadius:12,background:"rgba(172,225,175,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🌐</div>
          <div style={{flex:1}}><div style={{fontSize:14,fontWeight:600,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>{t(lang,"language")}</div><div style={{fontSize:12,color:T.muted}}>{LANGS.find(l=>l.code===lang)?.label}</div></div>
          <div style={{fontSize:12,color:T.muted,transform:showLang?"rotate(180deg)":"none",transition:"transform .2s"}}>▾</div>
        </div>
        {showLang&&(<div style={{padding:"10px 18px 14px",display:"flex",gap:8,flexWrap:"wrap",borderBottom:"1px solid rgba(45,45,58,0.05)",animation:"slideDown .2s ease"}}>
          {LANGS.map(l=><button key={l.code} onClick={()=>{onUpdateProfile({lang:l.code});setShowLang(false);}} style={btnStyle(lang===l.code)}><span>{l.flag}</span>{l.label}{lang===l.code&&<span style={{fontSize:10,color:"#2A7A40"}}>✓</span>}</button>)}
        </div>)}
        <div onClick={()=>{setShowCur(!showCur);setShowLang(false);}} style={{display:"flex",alignItems:"center",gap:12,padding:"16px 18px",cursor:"pointer"}}>
          <div style={{width:40,height:40,borderRadius:12,background:"rgba(172,225,175,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>💱</div>
          <div style={{flex:1}}><div style={{fontSize:14,fontWeight:600,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>{t(lang,"base_currency")}</div><div style={{fontSize:12,color:T.muted}}>{CURR[baseCurrency].name}</div></div>
          <div style={{fontSize:12,color:T.muted,transform:showCur?"rotate(180deg)":"none",transition:"transform .2s"}}>▾</div>
        </div>
        {showCur&&(<div style={{padding:"10px 18px 14px",display:"flex",gap:8,flexWrap:"wrap",animation:"slideDown .2s ease"}}>
          {Object.entries(CURR).map(([code,c])=><button key={code} onClick={()=>{onUpdateProfile({baseCurrency:code});setShowCur(false);}} style={btnStyle(baseCurrency===code)}><Flag code={code} size={20}/>{code} {c.symbol}{baseCurrency===code&&<span style={{fontSize:10,color:"#2A7A40"}}>✓</span>}</button>)}
        </div>)}
      </div>
      <CategoryManager lang={lang} customCategories={customCategories}
        onAdd={(cat)=>onUpdateProfile({customCategories:[...customCategories,cat]})}
        onRemove={(id)=>onUpdateProfile({customCategories:customCategories.filter(c=>c.id!==id)})}/>
      <div style={{marginTop:24}}/>

      {/* ─── Tools ─── */}
      <div style={{fontSize:10,fontWeight:700,letterSpacing:1.4,color:T.muted,textTransform:"uppercase",marginBottom:10,fontFamily:"'Noto Sans',sans-serif"}}>{t(lang,"statementToolsSection")}</div>
      <div style={{background:T.surface,backdropFilter:"blur(20px)",borderRadius:20,boxShadow:T.shadow,marginBottom:20,overflow:"hidden"}}>
        <button onClick={()=>isPro?onShowStatementScan():onShowUpgrade()} style={{width:"100%",padding:"16px 18px",border:"none",cursor:"pointer",background:"transparent",display:"flex",alignItems:"center",gap:12,textAlign:"left"}}>
          <div style={{width:40,height:40,borderRadius:12,background:"rgba(172,225,175,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>📄</div>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:600,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>{t(lang,"statementScan")}</div>
            <div style={{fontSize:12,color:T.muted,marginTop:1}}>{t(lang,"statementScanSubtitle")}</div>
          </div>
          <div style={{fontSize:12,color:T.muted}}>{isPro?"›":"✨"}</div>
        </button>
      </div>

      {/* ─── Security / PIN ─── */}
      <div style={{fontSize:10,fontWeight:700,letterSpacing:1.4,color:T.muted,textTransform:"uppercase",marginBottom:10,fontFamily:"'Noto Sans',sans-serif"}}>Security / ຄວາມປອດໄພ</div>
      <div style={{background:T.surface,backdropFilter:"blur(20px)",borderRadius:20,boxShadow:T.shadow,marginBottom:20,overflow:"hidden"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,padding:"16px 18px"}}>
          <div style={{width:40,height:40,borderRadius:12,background:"rgba(172,225,175,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🔐</div>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:600,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>Owner PIN</div>
            <div style={{fontSize:12,color:T.muted}}>{pinConfig.owner ? "PIN is set · Full access" : "Not set — no PIN required"}</div>
          </div>
          <button onClick={()=>setPinSetupMode("set-owner")} style={{fontSize:12,fontWeight:700,color:"#2A7A40",background:"rgba(172,225,175,0.2)",border:"none",borderRadius:9999,padding:"6px 14px",cursor:"pointer",fontFamily:"'Noto Sans',sans-serif",whiteSpace:"nowrap"}}>
            {pinConfig.owner ? "Change" : "Set up"}
          </button>
        </div>
        <div style={{height:1,background:"rgba(45,45,58,0.05)"}}/>
        <div style={{display:"flex",alignItems:"center",gap:12,padding:"16px 18px"}}>
          <div style={{width:40,height:40,borderRadius:12,background:"rgba(255,179,167,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🔑</div>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:600,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>Guest PIN</div>
            <div style={{fontSize:12,color:T.muted}}>{pinConfig.guest ? "Set · Hides settings from guests" : "Not set"}</div>
          </div>
          <div style={{display:"flex",gap:6,flexShrink:0}}>
            {pinConfig.guest && (
              <button onClick={()=>savePinConfig({...pinConfig,guest:null})} style={{fontSize:12,fontWeight:700,color:"#C0392B",background:"rgba(255,179,167,0.2)",border:"none",borderRadius:9999,padding:"6px 12px",cursor:"pointer",fontFamily:"'Noto Sans',sans-serif"}}>Remove</button>
            )}
            <button onClick={()=>setPinSetupMode("set-guest")} style={{fontSize:12,fontWeight:700,color:"#2A7A40",background:"rgba(172,225,175,0.2)",border:"none",borderRadius:9999,padding:"6px 14px",cursor:"pointer",fontFamily:"'Noto Sans',sans-serif",whiteSpace:"nowrap"}}>
              {pinConfig.guest ? "Change" : "Set up"}
            </button>
          </div>
        </div>
        {pinConfig.owner && (<>
          <div style={{height:1,background:"rgba(45,45,58,0.05)"}}/>
          <button onClick={()=>setPinRole(null)} style={{width:"100%",padding:"14px 18px",display:"flex",alignItems:"center",gap:12,background:"none",border:"none",cursor:"pointer",fontFamily:"'Noto Sans',sans-serif",textAlign:"left"}}>
            <div style={{width:40,height:40,borderRadius:12,background:"rgba(45,45,58,0.06)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🔒</div>
            <div>
              <div style={{fontSize:14,fontWeight:600,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>Lock app now</div>
              <div style={{fontSize:12,color:T.muted}}>Requires PIN to unlock</div>
            </div>
            <div style={{marginLeft:"auto",fontSize:12,color:T.muted}}>›</div>
          </button>
        </>)}
      </div>
      {/* ─── Help ─── */}
      <div style={{fontSize:10,fontWeight:700,letterSpacing:1.4,color:T.muted,textTransform:"uppercase",marginBottom:10,fontFamily:"'Noto Sans',sans-serif"}}>Help</div>
      <div style={{background:T.surface,backdropFilter:"blur(20px)",borderRadius:20,boxShadow:T.shadow,marginBottom:20,overflow:"hidden"}}>
        <button onClick={()=>onShowGuide&&onShowGuide()} style={{width:"100%",padding:"16px 18px",border:"none",cursor:"pointer",background:"transparent",display:"flex",alignItems:"center",gap:12,textAlign:"left"}}>
          <div style={{width:40,height:40,borderRadius:12,background:"rgba(26,64,32,0.1)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Logo size={36} /></div>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:600,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>Phajot guide</div>
            <div style={{fontSize:12,color:T.muted,marginTop:1}}>How every feature works</div>
          </div>
          <div style={{fontSize:12,color:T.muted}}>›</div>
        </button>
      </div>
      <div style={{fontSize:10,fontWeight:700,letterSpacing:1.4,color:T.muted,textTransform:"uppercase",marginBottom:10,fontFamily:"'Noto Sans',sans-serif"}}>{t(lang,"account")}</div>
      <div style={{background:T.surface,backdropFilter:"blur(20px)",borderRadius:20,boxShadow:T.shadow,marginBottom:12,overflow:"hidden"}}>
        <button onClick={onReset} style={{width:"100%",padding:"16px 18px",border:"none",cursor:"pointer",background:"transparent",display:"flex",alignItems:"center",gap:12,textAlign:"left"}}>
          <div style={{width:40,height:40,borderRadius:12,background:"rgba(172,225,175,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>🔄</div>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:600,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>{t(lang,"logout")}</div>
            <div style={{fontSize:12,color:T.muted,marginTop:1}}>{t(lang,"logout_sub")}</div>
          </div>
          <div style={{fontSize:12,color:"#C0392B"}}>→</div>
        </button>
      </div>
      <div style={{fontSize:10,fontWeight:700,letterSpacing:1.4,color:"#C0392B",textTransform:"uppercase",marginBottom:10,fontFamily:"'Noto Sans',sans-serif"}}>{t(lang,"danger_zone")}</div>
      <button onClick={onReset} style={{width:"100%",padding:"14px",borderRadius:16,border:"1px solid rgba(192,57,43,0.2)",cursor:"pointer",background:"rgba(255,179,167,0.1)",color:"#C0392B",fontWeight:700,fontSize:14,fontFamily:"'Noto Sans',sans-serif"}}>{t(lang,"reset_all")}</button>
      <div style={{height:"calc(env(safe-area-inset-bottom,0px) + 80px)"}}/>
    </div>
  );
}
