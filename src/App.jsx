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
import { SetNewPin } from "./screens/SetNewPin";
import { getRecoveryStatus, requestPinReset } from "./lib/recovery";
import ChangePasswordModal from "./screens/ChangePasswordModal";

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

  // ── PIN recovery flow state (Session 21 Sprint I) ──────────
  // pinRecoveryPending is set by handleLogin after /recovery/status
  // returns pin_reset_required=true AND !expired. Gates rendering of
  // <SetNewPin> BEFORE the PinLock conditional (R21-5: prevents any
  // bypass via null pin_config paths).
  const [pinRecoveryPending, setPinRecoveryPending] = useState(false);
  const [recoveryAccessToken, setRecoveryAccessToken] = useState(null);
  // Session 21.6 — account security settings
  const [showChangePassword, setShowChangePassword] = useState(false);
  // Defensive cleanup for the auto-logout timer in performForgotPinRequest.
  // App.jsx is the root component so this never actually fires in practice,
  // but documents the intent + future-proofs any refactor that moves this
  // handler into a child component.
  const forgotPinLogoutTimeoutRef = useRef(null);
  useEffect(() => () => {
    if (forgotPinLogoutTimeoutRef.current) clearTimeout(forgotPinLogoutTimeoutRef.current);
  }, []);

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

  // R21-13 (Session 21.5) fix — was fire-and-forget IIFE with
  // catch {} that swallowed all DB errors. Now async + checks the
  // { error } response shape + throws on failure. Callers are
  // responsible for reverting optimistic local state + surfacing
  // the error to the user (e.g. handleSetupKey uses a pinSaveFailed
  // toast + best-effort revert via a second savePinConfig call).
  //
  // Order: optimistic local update FIRST (user sees instant UI
  // feedback), then DB write awaited. On throw, caller reverts.
  // Supabase JS does NOT throw on RLS / constraint / permission
  // errors — those land in `error` on the returned object, so the
  // explicit shape check is necessary (a try/catch alone wouldn't
  // have caught the original bug).
  const savePinConfig = async (cfg) => {
    if (userId) store.set(`phanote_pins_${userId}`, cfg); // per-user, authoritative
    store.set("phanote_pins", cfg);                       // global, last-known-user cache
    setPinConfig(cfg);
    if (userId) {
      const { error } = await supabase
        .from("profiles")
        .update({ pin_config: cfg })
        .eq("id", userId);
      if (error) {
        console.error("savePinConfig DB write failed:", error);
        throw new Error(error.message || "pin_config_write_failed");
      }
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

    // Session 21.6 R21-15 — disable-confirm verify branch. MUST come
    // FIRST and early-return, otherwise the existing setup-step logic
    // below would (incorrectly) capture typed PIN as a new "first".
    // Verifies against pinConfig.owner specifically (guest PIN is NOT
    // accepted — disable is owner-only action). On match: clear both
    // owner + guest (D21.6-Q2 guest cascade). On mismatch: shake +
    // clear, stay in disable-confirm mode.
    if (pinSetupMode === "disable-confirm") {
      setTimeout(async () => {
        if (next === pinConfig.owner) {
          const previousCfg = pinConfig;
          try {
            await savePinConfig({ owner: null, guest: null });
            setPinSetupMode(null);
            setPinInput("");
            showToast(t(profile?.lang || "lo", "pinDisabled"), "success");
          } catch (e) {
            // Revert + toast, same pattern as Session 21.5 B2
            savePinConfig(previousCfg).catch(() => {});
            showToast(t(profile?.lang || "lo", "pinSaveFailed"), "error");
            setPinSetupMode(null);
            setPinInput("");
          }
        } else {
          setPinShake(true);
          setTimeout(() => { setPinShake(false); setPinInput(""); }, 600);
        }
      }, 80);
      return; // Do NOT fall through to existing setup-step logic
    }

    // setTimeout callback is now async so we can await savePinConfig
    // and handle DB errors properly (R21-13 fix).
    setTimeout(async () => {
      if (pinSetupStep === "enter") {
        setPinSetupFirst(next); setPinSetupStep("confirm"); setPinInput("");
      } else if (next === pinSetupFirst) {
        const newCfg = {...pinConfig};
        if (pinSetupMode === "set-owner") newCfg.owner = next;
        if (pinSetupMode === "set-guest") newCfg.guest = next;
        const previousCfg = pinConfig; // stash for revert on DB failure
        try {
          await savePinConfig(newCfg);
          setPinSetupMode(null); setPinSetupStep("enter"); setPinSetupFirst(""); setPinInput("");
        } catch (e) {
          // Revert optimistic local state to pre-save value. Best-effort —
          // if the revert DB write also fails (same underlying outage),
          // loadUserData reconciles on next login from the DB's actual
          // state. What matters is the user sees a toast + their UI
          // returns to the pre-attempt PIN state.
          savePinConfig(previousCfg).catch(() => {});
          showToast(t(profile?.lang || "lo", "pinSaveFailed"), "error");
          setPinSetupMode(null); setPinSetupStep("enter"); setPinSetupFirst(""); setPinInput("");
        }
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

  // options.skipPinRoleReset — Session 21 Sprint I: suppresses the
  //   `setPinRole(null)` call on line below so the user isn't re-
  //   routed to PinLock immediately after completing a PIN recovery.
  //   Default false preserves existing callers' behavior.
  const loadUserData = async (uid, { skipPinRoleReset = false } = {}) => {
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
      if (!skipPinRoleReset && pinCfg?.owner) setPinRole(null);
    } catch {
      const pinCfg = store.get(`phanote_pins_${uid}`) || store.get("phanote_pins");
      if (!skipPinRoleReset && pinCfg?.owner) setPinRole(null);
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

    // ── Recovery check (Session 21 Sprint I) ────────────────
    // Fail-closed (R21-7): any !ok result — 401 / 403 / 500 /
    // timeout / missing_token / thrown exception — falls through
    // identically to the normal loadUserData path below. The ONLY
    // route to <SetNewPin> is a fully successful status read with
    // pin_reset_required=true AND an unexpired expires_at. Single
    // if(ok) block, no else branch — structurally prevents any
    // error path from auto-allowing recovery flow.
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (accessToken) {
        const statusResult = await getRecoveryStatus(accessToken);
        if (statusResult.ok) {
          const status = statusResult.data;
          const notExpired = (iso) => iso && new Date(iso).getTime() > Date.now();
          if (status.pin_reset_required && notExpired(status.pin_reset_expires_at)) {
            setRecoveryAccessToken(accessToken);
            setPinRecoveryPending(true);
            setLoadingProfile(false);
            return; // Skip loadUserData — render chain → <SetNewPin>
          }
          if (status.password_reset_required && notExpired(status.password_reset_expires_at)) {
            // Schema-ready but dormant (Session 22/23 adds user-side flow).
            // Do NOT block login — user can still use the app. Admin
            // must complete the reset manually until then.
            console.warn("password reset required — user-side flow not yet live (Session 22/23)");
          }
        }
      }
    } catch (e) {
      console.warn("recovery status check failed, proceeding to normal login:", e?.message);
    }

    // Always try to load — if profile exists go home, if not show onboarding
    await loadUserData(user.id);
    // loadUserData sets loadingProfile=false at the end
    // if profile is still null after load → new user → OnboardingScreen shows
  };

  // ── PIN recovery handlers (Session 21 Sprint I) ────────────
  // Called by <SetNewPin> on successful completePinReset.
  // State flip is SYNC-first so <SetNewPin> unmounts on next render
  // tick (Phase 3C edge case #2). loadUserData fires without await
  // so this handler returns immediately — the loading splash renders
  // during the profile fetch, then HomeScreen mounts directly (we
  // pre-set pinRole="owner" so PinLock is skipped, and pass
  // skipPinRoleReset so loadUserData doesn't clobber that).
  const handlePinRecoveryComplete = (newPin) => {
    setPinRecoveryPending(false);
    // savePinConfig is now async (R21-13 fix). Use .catch() instead
    // of try/await so the SYNC state flips below (setPinRole,
    // setRecoveryAccessToken, loadUserData) preserve their ordering —
    // Phase 3C's SetNewPin unmount timing depends on pinRecoveryPending
    // flipping in the same render batch as the follow-ups.
    //
    // IMPORTANT: do NOT surface errors to the user here. The worker's
    // /recovery/complete-pin-reset endpoint already wrote pin_config
    // to the DB authoritatively via service role before this handler
    // runs. This savePinConfig call is for LOCAL state sync only
    // (localStorage + React state); its DB echo write is redundant-
    // and-idempotent (overwrites DB with same value the worker just
    // wrote). A failure here means the echo lost a race — console.warn
    // only; a user-facing "save failed" toast would be misleading
    // because the DB state is already correct.
    savePinConfig({
      owner: newPin,
      guest: pinConfig?.guest ?? null,
    }).catch(e => {
      console.warn(
        "post-recovery local sync DB echo failed (worker state is authoritative):",
        e?.message
      );
    });
    setPinRole("owner");
    setRecoveryAccessToken(null);
    loadUserData(userId, { skipPinRoleReset: true });
  };

  // Called by <SetNewPin> when user taps "Back to login" (terminal
  // error path — 403 not_approved / 410 expired). Signs them out
  // cleanly; on next login, /recovery/status will decide whether
  // recovery is still available or they need support to re-approve.
  const handlePinRecoveryCancel = async () => {
    setPinRecoveryPending(false);
    setRecoveryAccessToken(null);
    setProfile(null);
    setTransactions([]);
    try { await supabase.auth.signOut(); } catch {}
    setUserId(null);
  };

  // Called by ConfirmSheet for the "forgot-pin" kind after user
  // confirms they want to submit a reset request. Fresh session
  // fetch (no stale-token reliance). All three failure modes
  // (no session / non-ok worker response / network-or-timeout)
  // collapse to the same toast — request is idempotent worker-
  // side, user can retry from the same PinLock screen.
  const performForgotPinRequest = async () => {
    const lang = profile?.lang || "lo";
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      showToast(t(lang, "pinForgotFailed"), "error");
      return;
    }
    const result = await requestPinReset(session.access_token);
    if (!result.ok) {
      showToast(t(lang, "pinForgotFailed"), "error");
      return;
    }
    showToast(t(lang, "pinForgotRequestSent"), "success");
    // Auto-logout after 3s so user reads the toast on the
    // authenticated render tree (ToastContainer isn't rendered on
    // LoginScreen). Timer ref is tracked for defensive unmount
    // cleanup (see effect above).
    forgotPinLogoutTimeoutRef.current = setTimeout(async () => {
      setProfile(null);
      setTransactions([]);
      try { await supabase.auth.signOut(); } catch {}
      setUserId(null);
      forgotPinLogoutTimeoutRef.current = null;
    }, 3000);
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

  // Session 21.6 R21-15 — initiate owner-PIN disable flow.
  // ConfirmSheet confirm handler: closes the sheet, sets
  // pinSetupMode="disable-confirm" which triggers PinLock render
  // (existing gate: pinSetupMode truthy). User then enters current
  // owner PIN; handleSetupKey's leading disable-confirm branch
  // verifies + calls savePinConfig({owner:null, guest:null}) +
  // toasts. See handleSetupKey for verify + mismatch + error paths.
  const performDisableOwnerPin = () => {
    setPendingConfirm(null);
    setPinSetupMode("disable-confirm");
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

  // Session 21 Sprint I — recovery routing BEFORE PinLock render gate.
  // R21-5: explicit early-return prevents any bypass via null
  // pin_config paths; <SetNewPin> handles pin_config write + flag
  // clear via worker, then handlePinRecoveryComplete takes over.
  if (pinRecoveryPending) return (
    <SetNewPin
      lang={profile?.lang || "lo"}
      accessToken={recoveryAccessToken}
      onComplete={handlePinRecoveryComplete}
      onCancel={handlePinRecoveryCancel}
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
          onForgotPin={() => setPendingConfirm({ kind: "forgot-pin" })}
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
          onShowChangePassword={() => setShowChangePassword(true)}
          onDisableOwnerPin={() => setPendingConfirm({ kind: "disable-pin" })}
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
      {/* Session 21 Sprint I — Forgot PIN request confirmation */}
      <ConfirmSheet
        open={pendingConfirm?.kind === "forgot-pin"}
        onClose={()=>setPendingConfirm(null)}
        onConfirm={performForgotPinRequest}
        title={t(profile?.lang || "lo", "pinForgotConfirmTitle")}
        message={t(profile?.lang || "lo", "pinForgotConfirmMessage")}
        confirmLabel={t(profile?.lang || "lo", "pinForgotConfirmSend")}
        cancelLabel={t(profile?.lang || "lo", "confirmCancel")}
      />
      {/* Session 21.6 R21-15 — Disable owner PIN confirmation */}
      <ConfirmSheet
        open={pendingConfirm?.kind === "disable-pin"}
        onClose={()=>setPendingConfirm(null)}
        onConfirm={performDisableOwnerPin}
        title={t(profile?.lang || "lo", "pinDisableTitle")}
        message={t(profile?.lang || "lo", "pinDisableMessage")}
        confirmLabel={t(profile?.lang || "lo", "pinDisableConfirmBtn")}
        cancelLabel={t(profile?.lang || "lo", "pinDisableCancelBtn")}
        destructive
      />
      {/* Session 21.6 R21-14 — Change password modal */}
      {showChangePassword && (
        <ChangePasswordModal
          lang={profile?.lang || "lo"}
          onClose={() => setShowChangePassword(false)}
        />
      )}
    </>
  );
}