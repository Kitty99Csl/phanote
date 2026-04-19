import { useState, useEffect, useRef } from "react";
import { T } from "./lib/theme";
import { store } from "./lib/store";
import { supabase } from "./lib/supabase";
import {
  dbUpsertProfile, dbTrackEvent,
  dbInsertTransaction, dbUpdateTransaction
} from "./lib/db";
import { updateStreak } from "./lib/streak";
import { DEFAULT_EXPENSE_CATS, DEFAULT_INCOME_CATS, findCat } from "./lib/categories";
import { t } from "./lib/i18n";
import { initTranslations } from "./lib/translations";
import { showToast } from "./lib/toast";
import { Logo } from "./components/Logo";
import { ToastContainer } from "./components/Toast";
import { ConfirmSheet } from "./components/ConfirmSheet";
import { PinLock } from "./screens/PinLock";
import { LoginScreen } from "./screens/LoginScreen";
import { OnboardingScreen } from "./screens/OnboardingScreen";
import { HomeScreen } from "./screens/HomeScreen";
import MigrationScreen from "./screens/MigrationScreen";

// ═══ ROOT APP ════════════════════════════════════════════════
export default function App(){
  const [profile, setProfile]           = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [booting, setBooting]           = useState(true);
  const [userId, setUserId]             = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [streakToast, setStreakToast]   = useState(null);
  const [pendingConfirm, setPendingConfirm] = useState(null); // null | {kind:'delete-tx', txId} | {kind:'reset'}
  const [migrationPrefill, setMigrationPrefill] = useState(""); // one-hop forward of typed password to MigrationScreen

  // ── Migration guard ────────────────────────────────────────
  // Ref tracks whether the legacy migration gate is active, so the
  // TOKEN_REFRESHED handler can skip loadUserData during mid-migration
  // password updates (which fire TOKEN_REFRESHED and race with the
  // profiles.update that clears legacy_auth).
  const migratingRef = useRef(false);
  useEffect(() => { migratingRef.current = profile?.legacyAuth === true; }, [profile]);

  // ── PIN state ──────────────────────────────────────────────
  const [pinConfig, setPinConfig] = useState(() => {
    try { return JSON.parse(localStorage.getItem("phanote_pins") || "null") || {owner:null,guest:null}; }
    catch { return {owner:null,guest:null}; }
  });
  const [pinRole, setPinRole] = useState(() => {
    const cfg = JSON.parse(localStorage.getItem("phanote_pins") || "null");
    return cfg?.owner ? null : "owner";
  });
  const [pinInput, setPinInput]     = useState("");
  const [pinShake, setPinShake]     = useState(false);
  const [pinSetupMode, setPinSetupMode] = useState(null);
  const [pinSetupStep, setPinSetupStep] = useState("enter");
  const [pinSetupFirst, setPinSetupFirst] = useState("");

  const savePinConfig = (cfg) => {
    if (userId) store.set(`phanote_pins_${userId}`, cfg); // per-user, authoritative
    store.set("phanote_pins", cfg);                       // global, last-known-user cache
    setPinConfig(cfg);
    if (userId) {
      (async () => {
        try { await supabase.from("profiles").update({ pin_config: cfg }).eq("id", userId); }
        catch {}
      })();
    }
  };
  const handlePinKey = (key) => {
    if (key === "⌫") { setPinInput(p => p.slice(0,-1)); return; }
    const next = pinInput + key; setPinInput(next);
    if (next.length < 4) return;
    setTimeout(() => {
      if (next === pinConfig.owner) { setPinRole("owner"); setPinInput(""); }
      else if (pinConfig.guest && next === pinConfig.guest) { setPinRole("guest"); setPinInput(""); }
      else { setPinShake(true); setTimeout(() => { setPinShake(false); setPinInput(""); }, 600); }
    }, 80);
  };
  const handleSetupKey = (key) => {
    if (key === "⌫") { setPinInput(p => p.slice(0,-1)); return; }
    const next = pinInput + key; setPinInput(next);
    if (next.length < 4) return;
    setTimeout(() => {
      if (pinSetupStep === "enter") {
        setPinSetupFirst(next); setPinSetupStep("confirm"); setPinInput("");
      } else if (next === pinSetupFirst) {
        const newCfg = {...pinConfig};
        if (pinSetupMode === "set-owner") newCfg.owner = next;
        if (pinSetupMode === "set-guest") newCfg.guest = next;
        savePinConfig(newCfg);
        setPinSetupMode(null); setPinSetupStep("enter"); setPinSetupFirst(""); setPinInput("");
      } else {
        setPinShake(true);
        setTimeout(() => { setPinShake(false); setPinInput(""); setPinSetupStep("enter"); setPinSetupFirst(""); }, 600);
      }
    }, 80);
  };
  // ───────────────────────────────────────────────────────────

  useEffect(()=>{
    const link=document.createElement("link");
    link.rel="stylesheet";
    link.href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;600;700;800&family=Noto+Sans+Lao:wght@400;700&display=swap";
    document.head.appendChild(link);
  },[]);

  useEffect(()=>{
    const style=document.createElement("style");
    style.textContent=`*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}body{background:#F7FCF5;overscroll-behavior:none;font-family:'Noto Sans','Noto Sans Lao',system-ui,sans-serif}input,select,textarea{-webkit-appearance:none;font-size:16px !important}input:focus,select:focus,textarea:focus{font-size:16px !important}::-webkit-scrollbar{display:none}@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}@keyframes slideUp{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}@keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}`;
    document.head.appendChild(style);
  },[]);

  useEffect(()=>{
    const init = async () => {
      try {
        const timeout = new Promise(resolve => setTimeout(resolve, 6000));
        const { data: { session } } = await Promise.race([
          supabase.auth.getSession(),
          timeout.then(() => ({ data: { session: null } }))
        ]);
        if (session?.user) await loadUserData(session.user.id);
      } catch (e) { console.error("Init error:", e); }
      setBooting(false);
    };
    init();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "TOKEN_REFRESHED" && session?.user && !migratingRef.current) await loadUserData(session.user.id);
    });
    return () => subscription.unsubscribe();
  },[]);

  const loadUserData = async (uid) => {
    setUserId(uid); setLoadingProfile(true);
    try {
      const { data: dbProfile } = await supabase.from("profiles").select("*").eq("id", uid).single();
      if (dbProfile?.onboarding_complete) {
        setProfile({
          name: dbProfile.display_name || "User", lang: dbProfile.language || "lo",
          baseCurrency: dbProfile.base_currency || "LAK", avatar: dbProfile.avatar || "🦫",
          customCategories: dbProfile.custom_categories || [],
          expCats: dbProfile.exp_cats || [], incCats: dbProfile.inc_cats || [],
          phone: dbProfile.phone || "", countryCode: dbProfile.phone_country_code || "",
          streakCount: dbProfile.streak_count || 0,
          streakLastDate: dbProfile.streak_last_date || "",
          xp: dbProfile.xp || 0,
          isPro: dbProfile.is_pro || false,
          legacyAuth: dbProfile.legacy_auth === true,
          userId: uid,
        });
        supabase.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", uid).then(()=>{});
        dbTrackEvent(uid, "app_open").then(()=>{});
        initTranslations(); // fire and forget — DB wins per D19-Q1
      } else if (!dbProfile) {
        await supabase.auth.signOut(); setUserId(null);
      }
      const { data: dbTxs } = await supabase.from("transactions").select("*")
        .eq("user_id", uid).eq("is_deleted", false).order("created_at", { ascending: false });
      if (dbTxs) {
        setTransactions(dbTxs.map(tx => ({
          id: tx.id, amount: parseFloat(tx.amount), currency: tx.currency, type: tx.type,
          categoryId: tx.category_name
            ? ([...DEFAULT_EXPENSE_CATS,...DEFAULT_INCOME_CATS].find(c=>c.en===tx.category_name)?.id || "other")
            : "other",
          description: tx.description || "", note: tx.note || "",
          date: tx.date, confidence: tx.ai_confidence, createdAt: tx.created_at,
          batch_id: tx.batch_id || null,
        })));
      }
    } catch (e) { console.error("Load error:", e); }
    // ── Load PIN from Supabase (survives private browsing) ──
    try {
      const { data: pinRow } = await supabase.from("profiles")
        .select("pin_config").eq("id", uid).single();
      const pinCfg = pinRow?.pin_config || store.get(`phanote_pins_${uid}`) || store.get("phanote_pins") || {owner:null,guest:null};
      setPinConfig(pinCfg);
      store.set(`phanote_pins_${uid}`, pinCfg); // per-user, authoritative
      store.set("phanote_pins", pinCfg);        // global, last-known-user cache
      if (pinCfg?.owner) setPinRole(null);
    } catch {
      const pinCfg = store.get(`phanote_pins_${uid}`) || store.get("phanote_pins");
      if (pinCfg?.owner) setPinRole(null);
    }
    setLoadingProfile(false);
  };

  const handleLogin = async (user, isNew, phone, countryCode, authMeta = {}) => {
    setUserId(user.id);
    // Forward the typed password one hop to MigrationScreen if the login
    // path fell back to the derived legacy password. Cleared in onMigrated
    // and in the migration cancel/sign-out path.
    if (authMeta.fellBackToLegacy && authMeta.typedPassword) {
      setMigrationPrefill(authMeta.typedPassword);
    } else {
      setMigrationPrefill("");
    }
    // Show loading immediately — prevents flash of OnboardingScreen for existing users
    setLoadingProfile(true);
    try {
      await supabase.from("profiles").upsert({ id: user.id, phone: phone || null, phone_country_code: countryCode || null, last_seen_at: new Date().toISOString() }, { onConflict: "id" });
      await dbTrackEvent(user.id, "login", { phone, countryCode, isNew });
    } catch (e) { console.error("Login profile update:", e); }
    // Always try to load — if profile exists go home, if not show onboarding
    await loadUserData(user.id);
    // loadUserData sets loadingProfile=false at the end
    // if profile is still null after load → new user → OnboardingScreen shows
  };

  // Migration flow handlers — called by MigrationScreen.
  const handleMigrated = () => {
    setMigrationPrefill("");
    // Optimistic flip: the password has been updated in auth.users and the
    // legacy_auth flag cleared in profiles. Avoid a loading-spinner flash by
    // updating the in-memory profile directly. TOKEN_REFRESHED will reconcile.
    setProfile(p => p ? { ...p, legacyAuth: false } : p);
  };
  const handleMigrationCancel = async () => {
    // User tapped backdrop on MigrationScreen = "not now". Sign them out
    // cleanly — their legacy_auth flag is still true, so they'll land on
    // MigrationScreen again next login. No escape hatch that leaves them
    // logged-in-but-unmigrated.
    setMigrationPrefill("");
    setProfile(null);
    setTransactions([]);
    try { await supabase.auth.signOut(); } catch {}
    setUserId(null);
  };

  const handleOnboarding = async (data) => {
    const p = { ...data, createdAt: new Date().toISOString() };
    setProfile(p);
    try {
      await dbUpsertProfile(userId, p);
      await dbTrackEvent(userId, "onboarding_complete", { lang: p.lang, baseCurrency: p.baseCurrency });
    } catch (e) { console.error(e); }
  };

  const handleAddTransaction = async (tx) => {
    // If _update flag, just update the existing transaction category (AI correction)
    if (tx._update) {
      setTransactions(prev => prev.map(t => t.id === tx.id ? { ...t, categoryId: tx.categoryId } : t));
      // Also update in DB if it's been saved (has a real UUID)
      if (tx.id && !tx.id.startsWith("tx_")) {
        const cat = findCat(tx.categoryId, profile?.customCategories || []);
        const updates = { category_name: cat.en, category_emoji: cat.emoji };
        if (tx.confidence != null) updates.ai_confidence = tx.confidence;
        try { await dbUpdateTransaction(tx.id, updates); } catch {}
      }
      return;
    }
    // Normal add — optimistic UI first
    setTransactions(prev => [tx, ...prev]);
    try {
      const cat = findCat(tx.categoryId, profile?.customCategories || []);
      const saved = await dbInsertTransaction(userId, { ...tx, categoryName: cat.en, categoryEmoji: cat.emoji, rawInput: tx.rawInput || tx.description });
      // Replace temp ID with real DB ID
      setTransactions(prev => prev.map(t => t.id === tx.id ? { ...t, id: saved.id } : t));
      await dbTrackEvent(userId, "transaction_added", { type: tx.type, currency: tx.currency, category: tx.categoryId, amount: tx.amount });
      const bonusToast = await updateStreak(userId, profile, setProfile);
      if (bonusToast) {
        const lang = profile?.lang || "lo";
        let msg = t(lang, bonusToast.key);
        for (const [k, v] of Object.entries(bonusToast.params)) msg = msg.replace(`{${k}}`, v);
        setStreakToast(msg);
      }
    } catch (e) {
      console.error("Save tx error:", e);
      showToast(t(profile?.lang || "en", "toastSaveError"), "error");
    }
  };

  const handleUpdateProfile = async (changes) => {
    const updated = { ...profile, ...changes };
    setProfile(updated);
    try {
      await dbUpsertProfile(userId, updated);
      store.set(`phanote_extra_${userId}`, { avatar: updated.avatar, customCategories: updated.customCategories || [], expCats: updated.expCats, incCats: updated.incCats });
    } catch (e) { console.error(e); }
  };

  const handleUpdateNote = async (txId, note) => {
    setTransactions(prev => prev.map(tx => tx.id === txId ? { ...tx, note } : tx));
    if (txId.startsWith("tx_")) return;
    try { await dbUpdateTransaction(txId, { note, edited_at: new Date().toISOString() }); } catch (e) { console.error(e); }
  };

  const handleUpdateCategory = async (txId, newCatId, newAmount=null, newDesc=null, newCurrency=null, newType=null) => {
    setTransactions(prev => prev.map(tx => {
      if(tx.id !== txId) return tx;
      return { ...tx, categoryId: newCatId, ...(newAmount ? {amount: newAmount} : {}), ...(newDesc ? {description: newDesc} : {}), ...(newCurrency ? {currency: newCurrency} : {}), ...(newType ? {type: newType} : {}) };
    }));
    if (txId.startsWith("tx_")) return;
    try {
      const cat = findCat(newCatId, profile?.customCategories || []);
      const updates = { category_name: cat.en, category_emoji: cat.emoji, edited_at: new Date().toISOString() };
      if (newAmount) updates.amount = newAmount;
      if (newDesc) updates.description = newDesc;
      if (newCurrency) updates.currency = newCurrency;
      if (newType) updates.type = newType;
      await dbUpdateTransaction(txId, updates);
    } catch (e) {
      console.error("Update error:", e);
      showToast(t(profile?.lang || "en", "toastSaveError"), "error");
      throw e;
    }
  };

  const handleDeleteTransaction = (txId) => setPendingConfirm({ kind: "delete-tx", txId });

  const performDeleteTransaction = async () => {
    const txId = pendingConfirm?.txId;
    if (!txId) return;
    setTransactions(prev => prev.filter(tx => tx.id !== txId));
    try {
      await dbUpdateTransaction(txId, { is_deleted: true, deleted_at: new Date().toISOString() });
      await dbTrackEvent(userId, "transaction_deleted", { txId });
    } catch (e) { console.error(e); }
  };

  const handleDeleteBatch = (batchId) => {
    setTransactions(prev => prev.filter(tx => tx.batchId !== batchId && tx.batch_id !== batchId));
  };

  const handleReset = () => setPendingConfirm({ kind: "reset" });

  const performReset = async () => {
    setProfile(null); setTransactions([]);
    store.del(`phanote_extra_${userId}`);
    await supabase.auth.signOut(); setUserId(null);
  };

  // ── Loading splash ──
  if (booting) return (
    <div style={{ minHeight:"100dvh", display:"flex", alignItems:"center", justifyContent:"center",
      background:"linear-gradient(135deg, #ACE1AF 0%, #7BC8A4 50%, #A8D8B9 100%)" }}>
      <div style={{ width:300, background:"#ffffff", borderRadius:16, padding:"32px 24px",
        filter:"drop-shadow(2px 4px 14px rgba(40,90,40,0.2))", display:"flex", flexDirection:"column", alignItems:"center", gap:20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <Logo size={64} />
          <div>
            <div style={{ fontSize:20, fontWeight:800, color:"#1a2e1a", fontFamily:"'Noto Sans',sans-serif", letterSpacing:-0.5 }}>PHAJOT</div>
            <div style={{ fontSize:10, color:"#9B9BAD", fontFamily:"'Noto Sans',sans-serif", letterSpacing:1 }}>ພາຈົດ</div>
          </div>
        </div>
        <div style={{ height:10, width:"90%", background:"#E9FFDB", borderRadius:5, overflow:"hidden" }}>
          <div style={{ height:"100%", width:"70%", background:"linear-gradient(90deg, #5aae5f, #ACE1AF)", borderRadius:5, animation:"phanoteLoad 1.8s ease infinite" }}/>
        </div>
      </div>
      <style>{`@keyframes phanoteLoad { 0% { transform: translateX(-150%); } 100% { transform: translateX(280%); } }`}</style>
    </div>
  );

  if (!userId) return <LoginScreen onLogin={handleLogin} />;

  if (loadingProfile) return (
    <div style={{ minHeight:"100dvh", background:"#F7FCF5", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16 }}>
      <Logo size={140} />
      <div style={{ fontSize:14, color:"#9B9BAD", fontFamily:"'Noto Sans',sans-serif" }}>Loading your data…</div>
    </div>
  );

  if (!profile) return (
    <OnboardingScreen
      onComplete={handleOnboarding}
      onBack={() => { supabase.auth.signOut(); setUserId(null); setProfile(null); setTransactions([]); }}
    />
  );

  if (profile.legacyAuth) return (
    <MigrationScreen
      profile={profile}
      lang={profile.lang || "lo"}
      prefillPassword={migrationPrefill}
      onMigrated={handleMigrated}
      onClose={handleMigrationCancel}
    />
  );

  return (
    <>
      {((pinRole === null && pinConfig?.owner) || pinSetupMode) && (
        <PinLock
          pinConfig={pinConfig}
          pinInput={pinInput}
          pinShake={pinShake}
          onKey={pinSetupMode ? handleSetupKey : handlePinKey}
          isSetup={!!pinSetupMode}
          setupMode={pinSetupMode}
          setupStep={pinSetupStep}
          lang={profile?.lang || "lo"}
        />
      )}
      {pinSetupMode && (
        <button
          onClick={()=>{ setPinSetupMode(null); setPinInput(""); setPinSetupStep("enter"); setPinSetupFirst(""); }}
          style={{position:"fixed",top:"calc(env(safe-area-inset-top,0px) + 56px)",right:24,zIndex:10000,fontSize:14,color:T.muted,background:"none",border:"none",cursor:"pointer",fontFamily:"'Noto Sans',sans-serif"}}>
          Cancel
        </button>
      )}
      {pinRole !== null && !pinSetupMode && (
        <HomeScreen
          profile={profile}
          transactions={transactions}
          onAdd={handleAddTransaction}
          onReset={handleReset}
          onUpdateProfile={handleUpdateProfile}
          onUpdateNote={handleUpdateNote}
          onUpdateCategory={handleUpdateCategory}
          onDeleteTx={handleDeleteTransaction}
          onDeleteBatch={handleDeleteBatch}
          streakToast={streakToast}
          onStreakToastDone={()=>setStreakToast(null)}
          pinRole={pinRole}
          pinConfig={pinConfig}
          savePinConfig={savePinConfig}
          setPinRole={setPinRole}
          setPinSetupMode={(mode)=>{ setPinSetupMode(mode); setPinInput(""); setPinSetupStep("enter"); setPinSetupFirst(""); }}
        />
      )}
      <ToastContainer />
      <ConfirmSheet
        open={pendingConfirm?.kind === "delete-tx"}
        onClose={()=>setPendingConfirm(null)}
        onConfirm={performDeleteTransaction}
        title={t(profile?.lang || "lo", "confirmDeleteTransaction")}
        confirmLabel={t(profile?.lang || "lo", "confirmDelete")}
        cancelLabel={t(profile?.lang || "lo", "confirmCancel")}
        destructive
      />
      <ConfirmSheet
        open={pendingConfirm?.kind === "reset"}
        onClose={()=>setPendingConfirm(null)}
        onConfirm={performReset}
        title={t(profile?.lang || "lo", "reset_all")}
        message={t(profile?.lang || "lo", "reset_confirm")}
        confirmLabel={t(profile?.lang || "lo", "confirmDelete")}
        cancelLabel={t(profile?.lang || "lo", "confirmCancel")}
        destructive
      />
    </>
  );
}