// Edit Transaction modal. Allows changing amount, description,
// category, currency, and type (expense ↔ income).
// Extracted from App.jsx in Session 7.
//
// Pre-existing gaps flagged for cleanup backlog:
//   - hardcoded English strings (no i18n)
//   - uses raw div overlay instead of shared Sheet component

import { useState } from "react";
import { T, CURR } from "../lib/theme";
import { DEFAULT_EXPENSE_CATS, DEFAULT_INCOME_CATS, catLabel } from "../lib/categories";
import { useClickGuard } from "../hooks/useClickGuard";
import Sheet from "../components/Sheet";

export function EditTransactionModal({tx,lang,onSave,onClose,customCategories=[]}){
  const[amount,setAmount]=useState(String(tx.amount));
  const[desc,setDesc]=useState(tx.description||"");
  const[catId,setCatId]=useState(tx.categoryId);
  const[editCurrency,setEditCurrency]=useState(tx.currency||"LAK");
  const[editType,setEditType]=useState(tx.type||"expense");
  const { busy, run } = useClickGuard();
  const cats=editType==="income"
    ?[...DEFAULT_INCOME_CATS,...customCategories.filter(c=>c.type==="income")]
    :[...DEFAULT_EXPENSE_CATS,...customCategories.filter(c=>c.type==="expense")];
  const flipType=(newType)=>{
    setEditType(newType);
    const newCats=newType==="income"
      ?[...DEFAULT_INCOME_CATS,...customCategories.filter(c=>c.type==="income")]
      :[...DEFAULT_EXPENSE_CATS,...customCategories.filter(c=>c.type==="expense")];
    if(!newCats.find(c=>c.id===catId)) setCatId(newCats[0].id);
  };
  const save=()=>run(async()=>{
    const a=parseFloat(String(amount).replace(/,/g,""));
    if(!a||a<=0)return;
    await onSave({...tx,amount:a,categoryId:catId,description:desc.trim()||tx.description,currency:editCurrency,type:editType});
    onClose();
  });
  const pillBtn=(active,label,onClick,color)=>(<button onClick={onClick} style={{flex:1,padding:"8px 0",borderRadius:12,border:"none",cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"'Noto Sans',sans-serif",background:active?(color||"rgba(172,225,175,0.25)"):"rgba(45,45,58,0.06)",color:active?T.dark:T.muted,transition:"all .15s"}}>{label}</button>);
  return(
    <Sheet open={true} onClose={onClose} showCloseButton={false} footer={
      <button onClick={save} disabled={busy} style={{width:"100%",padding:"15px",borderRadius:16,border:"none",cursor:busy?"wait":"pointer",background:"linear-gradient(145deg,#ACE1AF,#7BC8A4)",color:"#1A4020",fontWeight:800,fontSize:15,fontFamily:"'Noto Sans',sans-serif",boxShadow:"0 4px 16px rgba(172,225,175,0.4)",opacity:busy?0.6:1}}>Save Changes ✓</button>
    }>
      <div style={{display:"flex",flexDirection:"column",gap:14,paddingTop:22,paddingBottom:8}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontWeight:800,fontSize:16,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>Edit Transaction</div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:T.muted}}>✕</button>
        </div>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:T.muted,letterSpacing:0.8,textTransform:"uppercase",marginBottom:6,fontFamily:"'Noto Sans',sans-serif"}}>Name</div>
          <input value={desc} onChange={e=>setDesc(e.target.value)} placeholder={tx.description}
            style={{width:"100%",padding:"12px 14px",borderRadius:12,border:"1.5px solid rgba(45,45,58,0.12)",outline:"none",fontSize:14,fontFamily:"'Noto Sans',sans-serif",color:T.dark,background:"rgba(172,225,175,0.05)",boxSizing:"border-box"}}
            onFocus={e=>e.target.style.borderColor="#ACE1AF"} onBlur={e=>e.target.style.borderColor="rgba(45,45,58,0.12)"}/>
        </div>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:T.muted,letterSpacing:0.8,textTransform:"uppercase",marginBottom:6,fontFamily:"'Noto Sans',sans-serif"}}>Type</div>
          <div style={{display:"flex",gap:6}}>
            {pillBtn(editType==="expense","− Expense",()=>flipType("expense"),"rgba(255,179,167,0.3)")}
            {pillBtn(editType==="income","+ Income",()=>flipType("income"),"rgba(172,225,175,0.3)")}
          </div>
        </div>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:T.muted,letterSpacing:0.8,textTransform:"uppercase",marginBottom:6,fontFamily:"'Noto Sans',sans-serif"}}>Currency</div>
          <div style={{display:"flex",gap:6}}>
            {Object.entries(CURR).map(([code,c])=>pillBtn(editCurrency===code,`${c.symbol} ${code}`,()=>setEditCurrency(code)))}
          </div>
        </div>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:T.muted,letterSpacing:0.8,textTransform:"uppercase",marginBottom:6,fontFamily:"'Noto Sans',sans-serif"}}>Amount ({editCurrency})</div>
          <div style={{display:"flex",alignItems:"center",gap:8,background:"rgba(172,225,175,0.08)",borderRadius:14,padding:"4px 4px 4px 16px",border:"1.5px solid #ACE1AF"}}>
            <span style={{fontSize:18,fontWeight:800,color:T.dark}}>{CURR[editCurrency]?.symbol}</span>
            <input value={amount} onChange={e=>setAmount(e.target.value)} onFocus={e=>e.target.select()} type="number" inputMode="decimal"
              style={{flex:1,border:"none",outline:"none",background:"transparent",fontSize:22,fontWeight:800,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}/>
          </div>
        </div>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:T.muted,letterSpacing:0.8,textTransform:"uppercase",marginBottom:8,fontFamily:"'Noto Sans',sans-serif"}}>Category</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
            {cats.map(cat=>(
              <button key={cat.id} onClick={()=>setCatId(cat.id)}
                style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",borderRadius:12,border:"none",cursor:"pointer",background:catId===cat.id?"rgba(172,225,175,0.25)":"rgba(45,45,58,0.04)",boxShadow:catId===cat.id?"0 0 0 2px #ACE1AF":"none",transition:"all .15s",textAlign:"left"}}>
                <span style={{fontSize:18}}>{cat.emoji}</span>
                <span style={{fontSize:12,fontWeight:600,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>{catLabel(cat,lang)}</span>
              </button>
            ))}
          </div>
        </div>
        <div style={{height:8}}/>
      </div>
    </Sheet>
  );
}
