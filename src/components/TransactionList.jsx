// Transaction list component — grouped by date, expandable rows,
// note editing, delete. Shared between HomeScreen and
// TransactionsScreen. Extracted from App.jsx in Session 7.

import { useState, useRef } from "react";
import { T, fmt, CURR } from "../lib/theme";
import { t } from "../lib/i18n";
import { findCat, catLabel } from "../lib/categories";
import { Logo } from "./Logo";

export function TransactionList({transactions,lang,onUpdateNote,onDeleteTx,onEditCategory,customCategories=[]}){
  const[editingNote,setEditingNote]=useState(null);
  const[noteInput,setNoteInput]=useState("");
  const[expandedTx,setExpandedTx]=useState(null);
  const[expandedItems,setExpandedItems]=useState(null);
  const noteRef=useRef();
  const startEdit=(tx)=>{setEditingNote(tx.id);setNoteInput(tx.note||"");setTimeout(()=>noteRef.current?.focus(),50);};
  const saveNote=(txId)=>{
    // Find the tx to check if it has items
    const tx = transactions?.find ? transactions.find(t=>t.id===txId) : null;
    let finalNote = noteInput.trim();
    if (tx?.note) {
      try {
        const parsed = JSON.parse(tx.note);
        if (parsed && Array.isArray(parsed.items)) {
          finalNote = JSON.stringify({...parsed, note: noteInput.trim()});
        }
      } catch {}
    }
    onUpdateNote(txId, finalNote);
    setEditingNote(null);
    setNoteInput("");
  };
  const cancelEdit=()=>{setEditingNote(null);setNoteInput("");};

  if(transactions.length===0)return(
    <div style={{textAlign:"center",padding:"calc(env(safe-area-inset-top, 8px) + 8px) 24px",display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
      <Logo size={140} />
      <div style={{fontWeight:700,fontSize:17,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>{t(lang,"empty")}</div>
      <div style={{fontSize:13,color:T.muted,maxWidth:220,lineHeight:1.6}}>{t(lang,"empty_sub")}</div>
    </div>
  );

  const todayStr=new Date().toISOString().split("T")[0];
  const yestStr=new Date(Date.now()-86400000).toISOString().split("T")[0];
  const groups={};
  [...transactions].reverse().forEach(tx=>{ // oldest-first within groups → newest at bottom (journal style)
    const key=tx.date===todayStr?t(lang,"today"):tx.date===yestStr?t(lang,"yesterday"):tx.date;
    (groups[key]=groups[key]||[]).push(tx);
  });

  return(
    <div style={{padding:"0 16px"}}>
      {Object.entries(groups).map(([date,txs])=>(
        <div key={date} style={{marginBottom:20}}>
          <div style={{fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:1.2,marginBottom:8,fontFamily:"'Noto Sans',sans-serif"}}>{date}</div>
          <div style={{background:T.surface,backdropFilter:"blur(20px)",borderRadius:20,overflow:"hidden",boxShadow:T.shadow}}>
            {txs.map((tx,i)=>{
              const cat=findCat(tx.categoryId,customCategories);
              // Parse note — could be plain text or JSON with items
              let txItems=[], txNote="", isOcr=false;
              try {
                const parsed = tx.note ? JSON.parse(tx.note) : null;
                if (parsed && Array.isArray(parsed.items)) {
                  txItems = parsed.items;
                  txNote = parsed.note || "";
                  isOcr = parsed.source === "ocr";
                }
              } catch { txNote = tx.note || ""; }
              const hasNote = txNote.trim().length > 0;
              const hasItems = txItems.length > 0;
              const isEditing=editingNote===tx.id;
              const itemsExpanded = expandedItems===tx.id;
              return(
                <div key={tx.id} style={{borderBottom:i<txs.length-1?"1px solid rgba(45,45,58,0.05)":"none"}}>
                  <div style={{padding:"13px 16px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:12,cursor:"pointer"}}
                      onClick={()=>setExpandedTx(expandedTx===tx.id?null:tx.id)}
                      onPointerEnter={e=>e.currentTarget.style.opacity="0.85"}
                      onPointerLeave={e=>e.currentTarget.style.opacity="1"}>
                      <div style={{width:44,height:44,borderRadius:15,flexShrink:0,background:tx.type==="expense"?"rgba(255,179,167,0.2)":"rgba(172,225,175,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,position:"relative"}}>
                        {cat.emoji}
                        {isOcr&&<div style={{position:"absolute",top:-3,right:-3,width:14,height:14,borderRadius:7,background:"#1A4020",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:"#ACE1AF",fontWeight:700}}>✦</div>}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                          <span style={{fontWeight:600,fontSize:14,color:T.dark,fontFamily:"'Noto Sans',sans-serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tx.description||catLabel(cat,lang)}</span>
                          {hasItems&&(
                            <button onClick={e=>{e.stopPropagation();setExpandedItems(itemsExpanded?null:tx.id);}}
                              style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:9999,border:"none",cursor:"pointer",background:isOcr?"rgba(26,64,32,0.1)":"rgba(172,225,175,0.2)",color:isOcr?"#1A4020":"#2A7A40",flexShrink:0,fontFamily:"'Noto Sans',sans-serif",whiteSpace:"nowrap"}}>
                              {txItems.length} items {itemsExpanded?"▴":"▾"}
                            </button>
                          )}
                        </div>
                        <div style={{fontSize:12,color:T.muted,marginTop:2}}>{catLabel(cat,lang)}</div>
                      </div>
                      <div style={{textAlign:"right",flexShrink:0}}>
                        <div style={{fontSize:15,fontWeight:800,letterSpacing:-0.3,color:tx.type==="expense"?"#C0392B":"#1A5A30",fontFamily:"'Noto Sans',sans-serif"}}>{tx.type==="expense"?"−":"+"}{fmt(tx.amount,tx.currency)}</div>
                        <div style={{display:"inline-block",marginTop:3,fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:6,background:CURR[tx.currency].pill,color:CURR[tx.currency].pillText}}>{tx.currency}</div>
                      </div>
                    </div>

                    {/* Expandable item list */}
                    {hasItems&&itemsExpanded&&(
                      <div style={{marginTop:10,background:"rgba(247,252,245,0.8)",borderRadius:12,padding:"10px 12px"}}>
                        {txItems.map((item,j)=>(
                          <div key={j} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:j<txItems.length-1?"0.5px solid rgba(45,45,58,0.05)":"none"}}>
                            <span style={{fontSize:12,color:T.dark,fontFamily:"'Noto Sans',sans-serif",flex:1,paddingRight:8}}>{item.name}</span>
                            <span style={{fontSize:12,fontWeight:700,color:T.muted,flexShrink:0}}>{fmt(item.amount,tx.currency)}</span>
                          </div>
                        ))}
                        <div style={{display:"flex",justifyContent:"space-between",marginTop:6,paddingTop:6,borderTop:"0.5px solid rgba(45,45,58,0.1)"}}>
                          <span style={{fontSize:12,fontWeight:800,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>Total</span>
                          <span style={{fontSize:12,fontWeight:800,color:"#C0392B"}}>{fmt(tx.amount,tx.currency)}</span>
                        </div>
                      </div>
                    )}

                    {expandedTx===tx.id&&(
                      <div style={{display:"flex",gap:8,marginTop:10,paddingTop:10,borderTop:"0.5px solid rgba(45,45,58,0.05)"}}>
                        <button onClick={e=>{e.stopPropagation();onEditCategory&&onEditCategory(tx);setExpandedTx(null);}} style={{flex:1,padding:"10px 8px",borderRadius:12,border:"none",cursor:"pointer",background:"rgba(172,225,175,0.2)",color:"#1A5A30",fontWeight:700,fontSize:12,fontFamily:"'Noto Sans',sans-serif"}}>✏️ {lang==="lo"?"ແກ້ໄຂ":lang==="th"?"แก้ไข":"Edit"}</button>
                        <button onClick={e=>{e.stopPropagation();onDeleteTx(tx.id);setExpandedTx(null);}} style={{flex:1,padding:"10px 8px",borderRadius:12,border:"none",cursor:"pointer",background:"rgba(255,179,167,0.2)",color:"#C0392B",fontWeight:700,fontSize:12,fontFamily:"'Noto Sans',sans-serif"}}>🗑️ {lang==="lo"?"ລຶບ":lang==="th"?"ลบ":"Delete"}</button>
                        <button onClick={e=>{e.stopPropagation();setExpandedTx(null);}} style={{padding:"10px 14px",borderRadius:12,border:"none",cursor:"pointer",background:"rgba(45,45,58,0.06)",color:T.muted,fontWeight:700,fontSize:13}}>✕</button>
                      </div>
                    )}

                    {isEditing?(
                      <div style={{marginTop:8,display:"flex",gap:6,alignItems:"center"}}>
                        <input ref={noteRef} value={noteInput} onChange={e=>setNoteInput(e.target.value)}
                          onKeyDown={e=>{if(e.key==="Enter")saveNote(tx.id);if(e.key==="Escape")cancelEdit();}}
                          placeholder={t(lang,"note_placeholder")}
                          style={{flex:1,padding:"8px 12px",borderRadius:10,border:"1.5px solid #ACE1AF",outline:"none",fontSize:13,fontFamily:"'Noto Sans',sans-serif",color:T.dark,background:"rgba(172,225,175,0.08)"}}/>
                        <button onClick={()=>saveNote(tx.id)} style={{padding:"7px 12px",borderRadius:10,border:"none",cursor:"pointer",background:"#ACE1AF",color:"#1A4020",fontWeight:700,fontSize:12,fontFamily:"'Noto Sans',sans-serif"}}>✓</button>
                        <button onClick={cancelEdit} style={{padding:"7px 10px",borderRadius:10,border:"none",cursor:"pointer",background:"rgba(45,45,58,0.08)",color:T.muted,fontWeight:700,fontSize:12}}>✕</button>
                      </div>
                    ):(
                      <div style={{marginTop:5,display:"flex",alignItems:"center",gap:6}}>
                        {hasNote?(
                          <span onClick={()=>startEdit(tx)} style={{fontSize:12,color:"#5aae5f",cursor:"pointer",padding:"2px 8px",borderRadius:8,background:"rgba(172,225,175,0.15)",fontFamily:"'Noto Sans',sans-serif"}}>
                            📝 {txNote.length>35?txNote.slice(0,35)+"…":txNote}
                          </span>
                        ):(
                          <button onClick={()=>startEdit(tx)} style={{fontSize:11,color:T.muted,border:"none",cursor:"pointer",background:"transparent",padding:"2px 0",fontFamily:"'Noto Sans',sans-serif",letterSpacing:0.3}}>{t(lang,"add_note")}</button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
