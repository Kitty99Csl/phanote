// Goals screen — list + progress + timeline + create/edit flow.
// Extracted from App.jsx in Session 7.
//
// Pre-existing gaps flagged for cleanup backlog:
//   - mixed i18n (5 t() calls, rest hardcoded English)
//   - uses window.confirm() for delete with English prompt
//   - direct supabase usage instead of lib/db.js wrappers
//   - dead `baseCurrency` destructure from profile

import { useState, useEffect } from "react";
import { T, fmt, fmtCompact } from "../lib/theme";
import { t } from "../lib/i18n";
import { showToast } from "../lib/toast";
import { DEFAULT_EXPENSE_CATS, catLabel } from "../lib/categories";
import { supabase } from "../lib/supabase";
import { Flag } from "../components/Flag";
import { GoalModal } from "../modals/GoalModal";
import { AddSavingsModal } from "../modals/AddSavingsModal";

export function GoalsScreen({ profile, transactions }) {
  const { lang, baseCurrency, userId } = profile;
  const [goals,      setGoals]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editGoal,   setEditGoal]   = useState(null);
  const [addToGoal,  setAddToGoal]  = useState(null);

  // Load goals from Supabase
  useEffect(() => {
    if (!userId) return;
    supabase.from("goals").select("*").eq("user_id", userId).eq("is_completed", false)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error("Goals load error:", error);
        if (data) setGoals(data);
        setLoading(false);
      });
  }, [userId]);

  const createGoal = async (data) => {
    const { data: saved, error } = await supabase.from("goals")
      .insert({ user_id: userId, ...data }).select().single();
    if (error) { console.error("Goal create error:", error); alert("Could not save goal: " + error.message); return; }
    if (saved) setGoals(prev => [...prev, saved]);
    setShowCreate(false);
  };

  const updateGoal = async (id, data) => {
    try {
      const { error } = await supabase.from("goals").update(data).eq("id", id);
      if (error) throw error;
      setGoals(prev => prev.map(g => g.id === id ? { ...g, ...data } : g));
      setEditGoal(null);
    } catch (e) {
      console.error("Goal update error:", e);
      showToast(t(lang, "toastGoalError"), "error");
      throw e;
    }
  };

  const addSavings = async (goalId, amount) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    const newSaved = goal.saved_amount + amount;
    const isComplete = newSaved >= goal.target_amount;
    await supabase.from("goals").update({ saved_amount: newSaved, is_completed: isComplete }).eq("id", goalId);
    if (isComplete) {
      setGoals(prev => prev.filter(g => g.id !== goalId));
    } else {
      setGoals(prev => prev.map(g => g.id === goalId ? { ...g, saved_amount: newSaved } : g));
    }
    setAddToGoal(null);
  };

  const deleteGoal = async (id) => {
    if (!window.confirm("Delete this goal?")) return;
    await supabase.from("goals").delete().eq("id", id);
    setGoals(prev => prev.filter(g => g.id !== id));
  };

  // Smart suggestion: which expense category to cut
  const getSuggestion = (goal) => {
    const now = new Date();
    const monthTxs = transactions.filter(tx => {
      const d = new Date(tx.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
        && tx.currency === goal.currency && tx.type === "expense";
    });
    const spentByCat = {};
    monthTxs.forEach(tx => { spentByCat[tx.categoryId] = (spentByCat[tx.categoryId]||0) + tx.amount; });
    const top = Object.entries(spentByCat).sort((a,b) => b[1]-a[1])[0];
    if (!top) return null;
    const cat = [...DEFAULT_EXPENSE_CATS,...(profile.customCategories||[])].find(c=>c.id===top[0]);
    const cutBy = Math.round(top[1] * 0.2); // suggest 20% cut
    if (!cat || cutBy <= 0) return null;
    return `Cut ${cat.emoji} ${catLabel(cat,lang)} by ${fmtCompact(cutBy,goal.currency)}/mo to save faster`;
  };

  const monthsLeft = (goal) => {
    if (!goal.deadline) return null;
    const now = new Date();
    const dl  = new Date(goal.deadline);
    const m   = (dl.getFullYear()-now.getFullYear())*12+(dl.getMonth()-now.getMonth());
    return Math.max(1, m);
  };

  const monthlyNeeded = (goal) => {
    const remaining = goal.target_amount - goal.saved_amount;
    const m = monthsLeft(goal);
    if (!m || remaining <= 0) return 0;
    return Math.ceil(remaining / m);
  };

  const deadlineLabel = (goal) => {
    if (!goal.deadline) return null;
    const m = monthsLeft(goal);
    if (m <= 1) return "Due this month ⚡";
    if (m <= 3) return `${m} months left`;
    return new Date(goal.deadline).toLocaleDateString("en-US", { month:"short", year:"numeric" });
  };

  return (
    <div style={{padding:"calc(env(safe-area-inset-top, 8px) + 8px) 16px calc(env(safe-area-inset-bottom,0px) + 80px)",position:"relative",zIndex:1}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
        <div>
          <div style={{fontWeight:800,fontSize:22,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>{t(lang,"goals")} 🎯</div>
          <div style={{fontSize:12,color:T.muted,marginTop:2}}>{t(lang,"goals_tagline")}</div>
        </div>
        <button onClick={()=>setShowCreate(true)} style={{padding:"9px 16px",borderRadius:14,border:"none",cursor:"pointer",background:"linear-gradient(145deg,#ACE1AF,#7BC8A4)",color:"#1A4020",fontWeight:800,fontSize:13,fontFamily:"'Noto Sans',sans-serif",boxShadow:"0 3px 10px rgba(172,225,175,0.4)"}}>+</button>
      </div>

      {loading && <div style={{textAlign:"center",padding:40,color:T.muted,fontSize:14}}>Loading…</div>}

      {!loading && goals.length === 0 && (
        <div style={{textAlign:"center",padding:"48px 24px",display:"flex",flexDirection:"column",alignItems:"center",gap:14}}>
          <div style={{fontSize:56}}>🎯</div>
          <div style={{fontWeight:700,fontSize:17,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>{t(lang,"no_goals")}</div>
          <div style={{fontSize:13,color:T.muted,lineHeight:1.6,maxWidth:220}}>{t(lang,"no_goals_sub")}</div>
          <button onClick={()=>setShowCreate(true)} style={{marginTop:8,padding:"12px 28px",borderRadius:16,border:"none",cursor:"pointer",background:"linear-gradient(145deg,#ACE1AF,#7BC8A4)",color:"#1A4020",fontWeight:800,fontSize:14,fontFamily:"'Noto Sans',sans-serif",boxShadow:"0 4px 16px rgba(172,225,175,0.4)"}}>{t(lang,"create_first")}</button>
        </div>
      )}

      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {goals.map(goal => {
          const pct      = Math.min(100, Math.round((goal.saved_amount / goal.target_amount) * 100));
          const remaining = goal.target_amount - goal.saved_amount;
          const monthly  = monthlyNeeded(goal);
          const dlLabel  = deadlineLabel(goal);
          const suggestion = getSuggestion(goal);
          const barColor = pct >= 100 ? "#3da873" : pct >= 60 ? "#5aae5f" : "#ACE1AF";

          return (
            <div key={goal.id} style={{background:T.surface,backdropFilter:"blur(20px)",borderRadius:22,padding:"18px 18px 16px",boxShadow:T.shadow}}>
              {/* Header row */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:46,height:46,borderRadius:15,background:"rgba(172,225,175,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>{goal.emoji}</div>
                  <div>
                    <div style={{fontWeight:800,fontSize:15,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>{goal.name}</div>
                    <div style={{fontSize:11,color:T.muted,marginTop:1,display:"flex",alignItems:"center",gap:6}}>
                      <Flag code={goal.currency} size={12}/>
                      {dlLabel && <span>{dlLabel}</span>}
                    </div>
                  </div>
                </div>
                <div style={{display:"flex",gap:6}}>
                  <button onClick={()=>setEditGoal(goal)} style={{width:30,height:30,borderRadius:9,border:"none",cursor:"pointer",background:"rgba(45,45,58,0.06)",fontSize:13,color:T.muted}}>✏️</button>
                  <button onClick={()=>deleteGoal(goal.id)} style={{width:30,height:30,borderRadius:9,border:"none",cursor:"pointer",background:"rgba(255,179,167,0.15)",fontSize:13,color:"#C0392B"}}>✕</button>
                </div>
              </div>

              {/* Progress */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:8}}>
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:0.8}}>Saved</div>
                  <div style={{fontSize:22,fontWeight:800,color:"#1A5A30",fontFamily:"'Noto Sans',sans-serif"}}>{fmt(goal.saved_amount,goal.currency)}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:0.8}}>Target</div>
                  <div style={{fontSize:16,fontWeight:700,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>{fmt(goal.target_amount,goal.currency)}</div>
                </div>
              </div>
              <div style={{height:10,background:"rgba(45,45,58,0.07)",borderRadius:99,overflow:"hidden",marginBottom:5}}>
                <div style={{height:"100%",width:`${pct}%`,background:barColor,borderRadius:99,transition:"width .6s cubic-bezier(.34,1.2,.64,1)"}}/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:14}}>
                <span style={{color:barColor,fontWeight:700}}>{pct}% complete</span>
                <span style={{color:T.muted}}>{fmt(remaining,goal.currency)} remaining</span>
              </div>

              {/* Savings plan — always visible */}
              <div style={{background:"rgba(172,225,175,0.10)",borderRadius:14,padding:"13px 14px",marginBottom:10}}>
                {monthly > 0 && goal.deadline ? (<>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <div>
                      <div style={{fontSize:10,fontWeight:700,color:"#2A7A40",textTransform:"uppercase",letterSpacing:0.8}}>Save / month</div>
                      <div style={{fontSize:20,fontWeight:800,color:"#1A4020",fontFamily:"'Noto Sans',sans-serif",marginTop:2}}>{fmt(monthly,goal.currency)}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:10,fontWeight:700,color:"#2A7A40",textTransform:"uppercase",letterSpacing:0.8}}>Months left</div>
                      <div style={{fontSize:20,fontWeight:800,color:"#1A4020",fontFamily:"'Noto Sans',sans-serif",marginTop:2}}>{monthsLeft(goal)}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:10,fontWeight:700,color:"#2A7A40",textTransform:"uppercase",letterSpacing:0.8}}>Goal date</div>
                      <div style={{fontSize:13,fontWeight:700,color:"#1A4020",fontFamily:"'Noto Sans',sans-serif",marginTop:2}}>{new Date(goal.deadline).toLocaleDateString("en-US",{month:"short",year:"numeric"})}</div>
                    </div>
                  </div>
                  {/* Mini month timeline */}
                  {(()=>{
                    const m = Math.min(monthsLeft(goal), 6);
                    const months = Array.from({length:m},(_,i)=>{
                      const d = new Date(); d.setMonth(d.getMonth()+i+1);
                      return d.toLocaleDateString("en-US",{month:"short"});
                    });
                    return(
                      <div style={{display:"flex",gap:4,alignItems:"flex-end",height:40}}>
                        {months.map((mo,i)=>{
                          const projected = Math.min(goal.saved_amount+(monthly*(i+1)), goal.target_amount);
                          const p = Math.min(100, Math.round((projected/goal.target_amount)*100));
                          const isGoal = projected >= goal.target_amount;
                          return(
                            <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                              <div style={{width:"100%",height:28,borderRadius:"4px 4px 0 0",background:"rgba(26,64,32,0.08)",display:"flex",alignItems:"flex-end",overflow:"hidden"}}>
                                <div style={{width:"100%",height:`${p}%`,background:isGoal?"#3da873":"#7BC8A4",borderRadius:"3px 3px 0 0",minHeight:3,transition:"height .4s ease"}}/>
                              </div>
                              <div style={{fontSize:8,fontWeight:700,color:isGoal?"#1A5A30":"#5aae5f"}}>{mo}</div>
                            </div>
                          );
                        })}
                        {monthsLeft(goal)>6&&<div style={{display:"flex",alignItems:"flex-end",paddingBottom:12,fontSize:12,color:"#2A7A40",fontWeight:700}}>···</div>}
                      </div>
                    );
                  })()}
                  <div style={{fontSize:11,color:"#2A7A40",fontWeight:700,marginTop:8}}>🎯 On track for {new Date(goal.deadline).toLocaleDateString("en-US",{month:"long",year:"numeric"})}</div>
                </>) : remaining > 0 ? (
                  <div style={{fontSize:12,color:"#2A7A40",lineHeight:1.6}}>
                    <div style={{fontWeight:700,marginBottom:2}}>No deadline set</div>
                    <div style={{color:"#5aae5f",fontSize:11}}>Tap ✏️ to add a target month — we'll show your monthly savings plan</div>
                  </div>
                ) : (
                  <div style={{fontSize:13,fontWeight:700,color:"#1A5A30"}}>🎉 Almost there! Keep going.</div>
                )}
              </div>

              {/* Smart suggestion */}
              {suggestion && remaining > 0 && (
                <div style={{background:"rgba(255,179,167,0.08)",borderRadius:12,padding:"10px 12px",marginBottom:12,display:"flex",gap:8,alignItems:"flex-start"}}>
                  <span style={{fontSize:14,flexShrink:0}}>💡</span>
                  <div style={{fontSize:12,color:"#A03020",fontWeight:700,lineHeight:1.5}}>{suggestion}</div>
                </div>
              )}

              {/* Add savings button */}
              <button onClick={()=>setAddToGoal(goal)} style={{width:"100%",padding:"11px",borderRadius:14,border:"none",cursor:"pointer",background:"linear-gradient(145deg,#ACE1AF,#7BC8A4)",color:"#1A4020",fontWeight:800,fontSize:13,fontFamily:"'Noto Sans',sans-serif",boxShadow:"0 3px 10px rgba(172,225,175,0.3)"}}>+ Add savings</button>
            </div>
          );
        })}
      </div>

      {showCreate && <GoalModal profile={profile} onSave={createGoal} onClose={()=>setShowCreate(false)}/>}
      {editGoal   && <GoalModal goal={editGoal} profile={profile} onSave={d=>updateGoal(editGoal.id,d)} onClose={()=>setEditGoal(null)}/>}
      {addToGoal  && <AddSavingsModal goal={addToGoal} onSave={amt=>addSavings(addToGoal.id,amt)} onClose={()=>setAddToGoal(null)}/>}
    </div>
  );
}
