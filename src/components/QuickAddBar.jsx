// QuickAddBar — primary transaction entry input + OCR button.
// Implements the LOCKED Session 4 parse pipeline:
//   - Fast path: local confidence ≥ 0.60 saves instantly,
//     AI corrects in background via _update flag
//   - Slow path: local confidence < 0.60, wait up to 3000ms
//     for AI, pick best result, save once
//   - No-local path: show ConfirmModal with AI result
// The 0.60 threshold and 3000ms timeout are LOAD-BEARING per
// CLAUDE.md project_parse_pipeline memory.
//
// Renders OcrButton inline with compact={true} for receipt scans.
// submit() is wrapped in useCallback — the wrap is load-bearing
// because submit is used as an Enter key handler.
//
// Extracted from App.jsx in Session 7.
//
// Pre-existing gaps flagged for cleanup backlog:
//   - Income-mode placeholder "salary, ເງິນເດືອນ, รายรับ..."
//     is trilingual but hardcoded, should be t() key

import { useState, useRef, useCallback } from "react";
import { T } from "../lib/theme";
import { t } from "../lib/i18n";
import { findCat, normalizeCategory } from "../lib/categories";
import { localParse } from "../lib/parser";
import { dbSaveMemory } from "../lib/db";
import { ConfirmModal } from "../modals/ConfirmModal";
import { OcrButton } from "./OcrButton";

export function QuickAddBar({lang,onAdd,customCategories=[],userId=null,onShowAdvisor=null,profile=null}){
  const[input,setInput]=useState("");
  const[status,setStatus]=useState("idle");
  const[pending,setPending]=useState(null);
  const[mode,setMode]=useState("expense");
  const inputRef=useRef();

  const submit=useCallback(async()=>{
    if(!input.trim()||status==="parsing")return;
    const text=input.trim();
    setStatus("parsing");

    // Start AI in background immediately — don't wait
    const aiPromise=fetch("https://api.phajot.com/parse",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({text,userId})
    }).then(r=>r.json()).catch(()=>null);

    const local=localParse(text);
    const customCatIds=customCategories.map(c=>c.id);

    if(local&&local.amount>0){
      local.type=mode;
      local.category=normalizeCategory(local.category,mode);

      // Confident local parse (≥0.60) → save instantly, AI corrects silently in background
      if(local.confidence>=0.60){
        const catId=normalizeCategory(local.category,local.type);
        const cat=findCat(catId,customCategories);
        const txId="tx_"+Date.now()+"_"+Math.random().toString(36).slice(2);
        const tx={id:txId,amount:local.amount,currency:local.currency,type:local.type,categoryId:cat.id,description:local.description||text,note:"",date:new Date().toISOString().split("T")[0],confidence:local.confidence,createdAt:new Date().toISOString()};
        onAdd(tx);
        setInput("");setStatus("idle");inputRef.current?.focus();
        aiPromise.then(ai=>{
          if(ai&&ai.amount&&ai.category){
            const aiCat=normalizeCategory(ai.category,mode);
            if(aiCat!==catId&&(ai.confidence||0)>local.confidence){onAdd({...tx,categoryId:aiCat,confidence:ai.confidence||0.8,_update:true});}
            if(userId){dbSaveMemory(userId,text,ai.category,mode,ai.confidence||0.8).catch(()=>{});}
          }
        });
        return;
      }

      // Low confidence (<0.60) → wait for AI up to 3s, pick best result, save once
      const ai=await Promise.race([aiPromise,new Promise(r=>setTimeout(()=>r(null),3000))]);
      const useAi=ai&&ai.amount>0&&(ai.confidence||0)>local.confidence;
      const best=useAi
        ?{amount:ai.amount,currency:ai.currency||local.currency,type:mode,category:normalizeCategory(ai.category,mode),description:ai.description||local.description||text,confidence:ai.confidence}
        :{amount:local.amount,currency:local.currency,type:local.type,category:local.category,description:local.description||text,confidence:local.confidence};
      const catId=normalizeCategory(best.category,best.type||mode);
      const cat=findCat(catId,customCategories);
      const txId="tx_"+Date.now()+"_"+Math.random().toString(36).slice(2);
      const tx={id:txId,amount:best.amount,currency:best.currency,type:best.type||mode,categoryId:cat.id,description:best.description,note:"",date:new Date().toISOString().split("T")[0],confidence:best.confidence,createdAt:new Date().toISOString()};
      onAdd(tx);
      setInput("");setStatus("idle");inputRef.current?.focus();
      if(useAi&&userId){dbSaveMemory(userId,text,ai.category,mode,ai.confidence||0.8).catch(()=>{});}
      return;
    }

    // No local result → wait for AI fully then show confirm
    const result=await aiPromise;
    if(!result||!result.amount||result.amount<=0){setStatus("error");setTimeout(()=>setStatus("idle"),2500);return;}
    result.type=mode;
    result.category=normalizeCategory(result.category,mode);
    setPending({...result,rawInput:text,_aiDone:true});
    setStatus("confirm");
    setInput("");
  },[input,status,customCategories,mode,onAdd,userId]);

  const finalizeAdd=(parsed)=>{
    const catId=normalizeCategory(parsed.category||parsed.categoryId,parsed.type);
    const cat=findCat(catId,customCategories);
    const _nv=parsed.items&&parsed.items.length>0?JSON.stringify({items:parsed.items,note:parsed.note||""}):parsed.note||"";
    onAdd({id:`tx_${Date.now()}_${Math.random().toString(36).slice(2)}`,amount:parsed.amount,currency:parsed.currency,type:parsed.type,categoryId:cat.id,description:parsed.description||parsed.rawInput||"",note:_nv,date:new Date().toISOString().split("T")[0],confidence:parsed.confidence,createdAt:new Date().toISOString()});
    setInput("");setStatus("idle");setPending(null);inputRef.current?.focus();
  };
  const isIncome=mode==="income";
  return(<>
    <div style={{background:"rgba(255,255,255,0.95)",borderRadius:18,padding:"6px 8px",boxShadow:T.shadow,display:"flex",alignItems:"center",gap:6,border:`1.5px solid ${isIncome?"rgba(172,225,175,0.4)":"rgba(255,179,167,0.3)"}`}}>
      <button onClick={()=>setMode(isIncome?"expense":"income")} style={{flexShrink:0,padding:"5px 8px",borderRadius:9,border:"none",cursor:"pointer",background:isIncome?"rgba(172,225,175,0.25)":"rgba(255,179,167,0.25)",color:isIncome?"#1A5A30":"#C0392B",fontWeight:800,fontSize:11,fontFamily:"'Noto Sans',sans-serif",transition:"all .2s ease",whiteSpace:"nowrap"}}>{isIncome?"+ In":"− Out"}</button>
      <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()}
        placeholder={isIncome?"salary, ເງິນເດືອນ, รายรับ…":t(lang,"placeholder")}
        style={{flex:1,border:"none",outline:"none",background:"transparent",fontSize:13,color:T.dark,fontFamily:"'Noto Sans',sans-serif",minWidth:0}}/>
      {/* AI button inline */}
      {onShowAdvisor && (profile?.isPro
        ? <button onClick={onShowAdvisor} title="Ask AI" style={{width:32,height:32,borderRadius:10,border:"none",cursor:"pointer",flexShrink:0,background:"rgba(172,225,175,0.18)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>🤖</button>
        : <button onClick={onShowAdvisor} title="AI Advisor — Pro feature" style={{width:32,height:32,borderRadius:10,border:"none",cursor:"pointer",flexShrink:0,background:"rgba(45,45,58,0.06)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,position:"relative"}}>
            🤖<span style={{position:"absolute",top:-3,right:-3,fontSize:8,background:"#C0392B",color:"#fff",borderRadius:9999,padding:"1px 3px",fontWeight:700,lineHeight:1.2}}>Pro</span>
          </button>
      )}
      {/* OCR button inline */}
      {profile&&<OcrButton profile={profile} onAdd={onAdd} lang={lang} compact={true}/>}
      {/* Send button */}
      <button onClick={submit} disabled={status==="parsing"} style={{width:32,height:32,borderRadius:10,border:"none",cursor:"pointer",flexShrink:0,background:status==="error"?"#FFB3A7":status==="parsing"?"rgba(172,225,175,0.4)":T.celadon,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,transition:"all .2s ease",boxShadow:status==="parsing"?"none":"0 3px 8px rgba(172,225,175,0.4)"}}>
        {status==="parsing"?"⏳":status==="error"?"✗":"↑"}
      </button>
    </div>
    {status==="parsing"&&<div style={{fontSize:11,color:T.muted,textAlign:"center",marginTop:4,fontFamily:"'Noto Sans',sans-serif"}}>{t(lang,"parsing")}</div>}
    {status==="confirm"&&pending&&<ConfirmModal parsed={pending} lang={lang} onConfirm={finalizeAdd} onEdit={()=>{setStatus("idle");setPending(null);}}/>}
  </>);
}
