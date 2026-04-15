// HomeScreen — composition root for the authenticated app shell.
// Orchestrates 22 mount points: 8 always-on components + 6
// conditional screens + 8 conditional modals. Owns visibility
// state for all modals/screens; data + mutators come from App
// root as props.
// Extracted from App.jsx in Session 7.
//
// Pre-existing gaps flagged for cleanup backlog:
//   - Non-Pro Advisor fallback is inline JSX (should be
//     reusable ProGateModal)
//   - Guest settings lockout is inline JSX
//   - Multiple hardcoded English strings
//   - onImportDone UX opens TransactionsScreen but sets tab=home
//     in background (likely wrong)

import { useState, useRef } from "react";
import { T } from "../lib/theme";
import { t } from "../lib/i18n";
import { findCat } from "../lib/categories";
import { dbSaveMemory } from "../lib/db";

import { AnimalBg } from "../components/AnimalBg";
import { Toast } from "../components/Toast";
import { StreakBadge } from "../components/StreakBadge";
import { TransactionList } from "../components/TransactionList";
import { WalletCards } from "../components/WalletCards";
import { SafeToSpend } from "../components/SafeToSpend";
import { BottomNav } from "../components/BottomNav";
import { QuickAddBar } from "../components/QuickAddBar";

import { QuickEditToast } from "../modals/QuickEditToast";
import { EditTransactionModal } from "../modals/EditTransactionModal";
import { StreakModal } from "../modals/StreakModal";
import { AiAdvisorModal } from "../modals/AiAdvisorModal";

import { ProUpgradeScreen } from "./ProUpgradeScreen";
import { GuideScreen } from "./GuideScreen";
import { StatementScanFlow } from "./StatementScanFlow";
import { TransactionsScreen } from "./TransactionsScreen";
import { AnalyticsScreen } from "./AnalyticsScreen";
import { BudgetScreen } from "./BudgetScreen";
import { GoalsScreen } from "./GoalsScreen";
import { SettingsScreen } from "./SettingsScreen";

export function HomeScreen({profile,transactions,onAdd,onReset,onUpdateProfile,onUpdateNote,onUpdateCategory,onDeleteTx,streakToast,onStreakToastDone,pinRole="owner",pinConfig={},savePinConfig,setPinRole,setPinSetupMode,onDeleteBatch}){
  const[tab,setTab]=useState("home");
  const[toast,setToast]=useState(null);
  const[editTx,setEditTx]=useState(null);
  const[showEdit,setShowEdit]=useState(false);
  const[showStreak,setShowStreak]=useState(false);
  const[showAdvisor,setShowAdvisor]=useState(false);
  const[showGuide,setShowGuide]=useState(false);
  const[showUpgrade,setShowUpgrade]=useState(false);
  const[showStatementScan,setShowStatementScan]=useState(false);
  const[showTransactions,setShowTransactions]=useState(false);
  const[txScreenFilters,setTxScreenFilters]=useState(null);
  const{lang,customCategories=[]}=profile;
  const greet=()=>{const h=new Date().getHours();if(h<12)return t(lang,"morning");if(h<17)return t(lang,"afternoon");return t(lang,"evening");};
  const dateStr=new Date().toLocaleDateString(lang==="th"?"th-TH":lang==="lo"?"lo-LA":"en-US",{weekday:"long",month:"long",day:"numeric"});
  const scrollRef=useRef();
  const handleAdd=(tx)=>{
    onAdd(tx);
    // Skip QuickEditToast for AI background corrections (_update flag)
    if(!tx._update){
      setEditTx(tx);
    }
    setToast(null);
    // Scroll list to top so new transaction is visible
    setTimeout(()=>scrollRef.current?.scrollTo({top:scrollRef.current.scrollHeight,behavior:"smooth"}),120);
  };
  const handleEditSave=async(updated)=>{
    if(!editTx)return;
    try {
      await onUpdateCategory(editTx.id,updated.categoryId,updated.amount,updated.description,updated.currency,updated.type);
    } catch (e) {
      console.error("Edit transaction error:", e);
      throw e;
    }
    const cat=findCat(updated.categoryId,customCategories);
    if(profile?.userId){
      dbSaveMemory(profile.userId,updated.description||editTx.description||"",cat.id,updated.type||editTx.type,0.99)
        .catch(e=>console.error("dbSaveMemory error:",e));
    }
    setShowEdit(false);
    setEditTx(null);
  };
  return(
    <div style={{height:"100dvh",background:T.bg,display:"flex",flexDirection:"column",maxWidth:430,margin:"0 auto",position:"relative",overflow:"hidden"}}>
      <AnimalBg/>
      {tab==="home"&&(
        <div style={{flexShrink:0,zIndex:10,background:"rgba(247,252,245,0.97)",backdropFilter:"blur(16px)"}}>
          {/* Header — respects iOS safe area */}
          <div style={{padding:"calc(env(safe-area-inset-top, 8px) + 8px) 16px 10px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <div style={{fontSize:17,fontWeight:800,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>{greet()}, {profile.name} 👋</div>
              <div style={{fontSize:11,color:T.muted,marginTop:1}}>{dateStr}</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              {pinRole==="guest"&&<div style={{fontSize:10,fontWeight:800,padding:"3px 9px",borderRadius:9999,background:"rgba(255,179,167,0.25)",color:"#C0392B",letterSpacing:0.5,fontFamily:"'Noto Sans',sans-serif"}}>GUEST</div>}
              <StreakBadge profile={profile} onPress={()=>setShowStreak(true)}/>
              <button onClick={()=>setTab("settings")} style={{width:36,height:36,borderRadius:12,border:"none",cursor:"pointer",background:"linear-gradient(145deg,#ACE1AF,#7BC8A4)",fontSize:20,boxShadow:"0 3px 10px rgba(172,225,175,0.4)",flexShrink:0}}>{profile.avatar}</button>
            </div>
          </div>
          <div style={{paddingBottom:6}}><WalletCards transactions={transactions}/></div>
          <SafeToSpend transactions={transactions} profile={profile}/>
        </div>
      )}
      <div ref={scrollRef} style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
        {tab==="home"&&(()=>{
          const sortedTxs = [...transactions].sort((a, b) => {
            if (b.date !== a.date) return b.date.localeCompare(a.date);
            const aCreated = new Date(a.created_at || a.createdAt || 0).getTime();
            const bCreated = new Date(b.created_at || b.createdAt || 0).getTime();
            return bCreated - aCreated;
          });
          const todayStr = new Date().toISOString().split("T")[0];
          const todayTxs = sortedTxs.filter(tx => tx.date === todayStr);
          const homeDisplay = todayTxs.length > 0 ? todayTxs : sortedTxs.slice(0, 5);
          const isShowingToday = todayTxs.length > 0;
          return(<>
            <div style={{paddingTop:4}}/>
            {homeDisplay.length > 0 ? (<>
              <div style={{ fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:1.4,marginBottom:8,marginTop:16,paddingLeft:4 }}>
                {isShowingToday ? `${t(lang,"todayLabel")} (${todayTxs.length})` : t(lang,"recentLabel")}
              </div>
              <TransactionList transactions={homeDisplay} lang={lang} onUpdateNote={onUpdateNote} onDeleteTx={onDeleteTx} onEditCategory={(tx)=>{setEditTx(tx);setShowEdit(true);}} customCategories={customCategories}/>
            </>) : (
              <div style={{textAlign:"center",padding:"40px 24px",color:T.muted,fontSize:13}}>{lang==="lo"?"ຍັງບໍ່ມີລາຍການ":"No transactions yet — start logging below!"}</div>
            )}
            {transactions.length > 0 && (
              <div style={{textAlign:"center",padding:"12px 0"}}>
                <button onClick={()=>setShowTransactions(true)} style={{background:"transparent",border:"none",color:"#2A7A40",fontSize:14,fontWeight:600,cursor:"pointer",padding:"10px 20px",fontFamily:"'Noto Sans',sans-serif"}}>{t(lang,"viewAllTx")} →</button>
              </div>
            )}
            <div style={{height:16}}/>
          </>);
        })()}
        {tab==="analytics"&&<AnalyticsScreen profile={profile} transactions={transactions} onOpenTransactions={(filters)=>{setTxScreenFilters(filters);setShowTransactions(true);}}/>}
        {tab==="budget"&&<BudgetScreen profile={profile} transactions={transactions}/>}
        {tab==="goals"&&<GoalsScreen profile={profile} transactions={transactions}/>}
        {tab==="settings" && (pinRole === "owner"
          ? <SettingsScreen profile={profile} transactions={transactions} onUpdateProfile={onUpdateProfile} onReset={onReset} pinConfig={pinConfig} savePinConfig={savePinConfig} setPinRole={setPinRole} setPinSetupMode={setPinSetupMode} onShowGuide={()=>setShowGuide(true)} onShowUpgrade={()=>setShowUpgrade(true)} onShowStatementScan={()=>setShowStatementScan(true)}/>
          : <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"80px 24px",textAlign:"center"}}>
              <div style={{fontSize:44,marginBottom:16}}>🔒</div>
              <div style={{fontSize:18,fontWeight:700,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>Settings unavailable</div>
              <div style={{fontSize:13,color:T.muted,marginTop:8,lineHeight:1.6}}>You're using a guest session.<br/>Ask the account owner for full access.</div>
            </div>
        )}
      </div>
      {tab==="home"&&(
        <div style={{flexShrink:0,zIndex:150,background:"rgba(247,252,245,0.97)",borderTop:"1px solid rgba(45,45,58,0.06)",padding:"6px 12px",paddingBottom:"calc(env(safe-area-inset-bottom,0px) + 6px)"}}>
          <QuickAddBar lang={lang} onAdd={handleAdd} customCategories={customCategories} userId={profile?.userId}
            onShowAdvisor={()=>setShowAdvisor(true)} profile={profile}/>
        </div>
      )}
      <BottomNav active={tab} onTab={setTab} lang={lang} pinRole={pinRole}/>
      {toast&&<Toast msg={toast} onDone={()=>setToast(null)}/>}
      {editTx&&!showEdit&&(<QuickEditToast tx={editTx} lang={lang} onChangeCategory={()=>setShowEdit(true)} onDone={()=>setEditTx(null)} customCategories={customCategories}/>)}
      {showEdit&&editTx&&(<EditTransactionModal tx={editTx} lang={lang} onSave={handleEditSave} onClose={()=>{setShowEdit(false);setEditTx(null);}} customCategories={customCategories}/>)}
      {showStreak&&<StreakModal profile={profile} onClose={()=>setShowStreak(false)}/>}
      {showAdvisor && (profile?.isPro
        ? <AiAdvisorModal profile={profile} transactions={transactions} onClose={()=>setShowAdvisor(false)}/>
        : <div style={{position:"fixed",inset:0,zIndex:2000,background:"rgba(30,30,40,0.6)",backdropFilter:"blur(4px)",display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setShowAdvisor(false)}>
            <div style={{background:"#fff",borderRadius:"28px 28px 0 0",width:"100%",maxWidth:430,padding:"28px 24px 40px"}} onClick={e=>e.stopPropagation()}>
              <div style={{textAlign:"center",marginBottom:20}}>
                <div style={{fontSize:42,marginBottom:8}}>🤖</div>
                <div style={{fontSize:18,fontWeight:800,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>AI Advisor</div>
                <div style={{fontSize:13,color:T.muted,marginTop:6,lineHeight:1.6}}>Ask anything about your finances.<br/>Available on the Pro plan.</div>
              </div>
              <button onClick={()=>{setShowAdvisor(false);setShowUpgrade(true);}} style={{width:"100%",padding:"15px",borderRadius:16,border:"none",background:"#1A4020",color:"#fff",fontSize:15,fontWeight:800,cursor:"pointer",fontFamily:"'Noto Sans',sans-serif",marginBottom:10}}>Upgrade to Pro</button>
              <button onClick={()=>setShowAdvisor(false)} style={{width:"100%",padding:"12px",borderRadius:16,border:"none",background:"rgba(45,45,58,0.06)",color:T.muted,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"'Noto Sans',sans-serif"}}>Maybe later</button>
            </div>
          </div>
      )}
      {showUpgrade&&<ProUpgradeScreen onClose={()=>setShowUpgrade(false)}/>}
      {showGuide&&(
        <div style={{position:"fixed",inset:0,zIndex:500,background:"#F7FCF5",overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
          <GuideScreen lang={lang} onClose={()=>setShowGuide(false)}/>
        </div>
      )}
      {showStatementScan&&(
        <StatementScanFlow profile={profile} lang={lang} onClose={()=>setShowStatementScan(false)} onAdd={onAdd} customCategories={customCategories} transactions={transactions}
          onImportDone={(n)=>{setShowStatementScan(false);setShowTransactions(true);setTab("home");}}
          onDeleteBatch={onDeleteBatch}/>
      )}
      {showTransactions&&(
        <TransactionsScreen lang={lang} profile={profile} customCategories={customCategories} transactions={transactions}
          onClose={()=>{setShowTransactions(false);setTxScreenFilters(null);}} onEditTx={(tx)=>{setEditTx(tx);setShowEdit(true);}} onDeleteTx={onDeleteTx} onUpdateNote={onUpdateNote} initialFilters={txScreenFilters}/>
      )}
      {streakToast&&<Toast msg={streakToast} onDone={onStreakToastDone}/>}
    </div>
  );
}
