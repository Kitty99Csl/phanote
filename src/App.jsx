/**
 * PHAJOT — App.jsx
 * Phase 2: Budget + Analytics + Streaks + XP
 *
 * SQL migration (run once in Supabase SQL editor):
 * ALTER TABLE profiles
 *   ADD COLUMN IF NOT EXISTS streak_count int DEFAULT 0,
 *   ADD COLUMN IF NOT EXISTS streak_last_date date,
 *   ADD COLUMN IF NOT EXISTS xp int DEFAULT 0;
 */
import { useState, useEffect, useRef, useCallback } from "react";
import Sheet from "./components/Sheet";
import { T, CURR, fmt, fmtCompact, S } from "./lib/theme";
import { txDedupKey, AVATARS, EMOJI_PICKS, GOAL_EMOJIS, TOASTS } from "./lib/constants";
import { store } from "./lib/store";
import { supabase, signInWithPhone } from "./lib/supabase";

// ─── AI MEMORY HELPERS ───────────────────────────────────────
const dbCheckMemory = async (userId, pattern) => {
  const key = pattern.toLowerCase()
    .replace(/[\d,]+(?:\.\d+)?(k|m)?/gi, "")
    .replace(/lak|thb|usd|baht|บาท|กีบ|kip/gi, "")
    .replace(/\s+/g, " ").trim().slice(0, 50);
  if (!key) return null;
  const { data } = await supabase.from("ai_memory")
    .select("*")
    .ilike("input_pattern", `%${key}%`)
    .order("usage_count", { ascending: false })
    .limit(1);
  return data?.[0] || null;
};

const dbSaveMemory = async (userId, pattern, categoryName, type, confidence) => {
  const key = pattern.toLowerCase()
    .replace(/[\d,]+(?:\.\d+)?(k|m)?/gi, "")
    .replace(/lak|thb|usd|baht|บาท|กีบ|kip/gi, "")
    .replace(/\s+/g, " ").trim().slice(0, 50);
  if (!key || key.length < 2) return;
  const { data: existing } = await supabase.from("ai_memory")
    .select("id, usage_count")
    .eq("user_id", userId)
    .eq("input_pattern", key)
    .maybeSingle();
  if (existing) {
    await supabase.from("ai_memory")
      .update({ usage_count: existing.usage_count + 1, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    await supabase.from("ai_memory").insert({
      user_id: userId, input_pattern: key, category_name: categoryName,
      type, confidence, usage_count: 1,
    });
  }
};

const dbUpsertProfile = async (userId, p) => {
  await supabase.from("profiles").upsert({
    id: userId, display_name: p.name, language: p.lang || "lo",
    base_currency: p.baseCurrency || "LAK", onboarding_complete: true,
    phone: p.phone || null, phone_country_code: p.countryCode || null,
    avatar: p.avatar || "🦫", custom_categories: p.customCategories || [],
    exp_cats: p.expCats || [], inc_cats: p.incCats || [],
    last_seen_at: new Date().toISOString(), app_version: "1.0.0",
  }, { onConflict: "id" });
};

const dbTrackEvent = async (userId, eventType, eventData = {}) => {
  try {
    await supabase.from("app_events").insert({
      user_id: userId, event_type: eventType, event_data: eventData,
      app_version: "1.0.0", platform: "web",
    });
  } catch {}
};

const dbInsertTransaction = async (userId, tx) => {
  const { data, error } = await supabase.from("transactions").insert({
    user_id: userId, amount: tx.amount, currency: tx.currency, type: tx.type,
    description: tx.description, date: tx.date, source: "web",
    ai_confidence: tx.confidence || null, note: tx.note || null,
    category_name: tx.categoryName || null, category_emoji: tx.categoryEmoji || null,
    raw_input: tx.rawInput || null, is_deleted: false,
    ...(tx.batchId ? { batch_id: tx.batchId } : {}),
  }).select().single();
  if (error) throw error;
  return data;
};

const dbUpdateTransaction = async (txId, updates) => {
  await supabase.from("transactions").update(updates).eq("id", txId);
};

// ─── STREAK + XP SYSTEM ──────────────────────────────────────
const XP_PER_TX = 10;
const STREAK_BONUS = { 7:30, 14:60, 30:150, 100:500 };
const LEVELS = [
  {min:0,    label:"Seedling", emoji:"🌱"},
  {min:100,  label:"Sprout",   emoji:"🌿"},
  {min:300,  label:"Grower",   emoji:"🌳"},
  {min:600,  label:"Guardian", emoji:"💚"},
  {min:1000, label:"Star",     emoji:"⭐"},
  {min:1500, label:"Legend",   emoji:"🌟"},
  {min:2100, label:"Master",   emoji:"👑"},
  {min:2800, label:"Elite",    emoji:"🔥"},
  {min:3600, label:"Diamond",  emoji:"💎"},
  {min:4500, label:"Champion", emoji:"🏆"},
];

const getLevel = (xp=0) => {
  for (let i = LEVELS.length-1; i >= 0; i--) {
    if (xp >= LEVELS[i].min) return {...LEVELS[i], index: i+1};
  }
  return {...LEVELS[0], index:1};
};
const getNextLevel = (xp=0) => {
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp < LEVELS[i].min) return LEVELS[i];
  }
  return null;
};
const getLevelProgress = (xp=0) => {
  const cur = getLevel(xp);
  const next = getNextLevel(xp);
  if (!next) return 100;
  return Math.round(((xp - cur.min) / (next.min - cur.min)) * 100);
};

const updateStreak = async (userId, currentProfile, setProfile) => {
  try {
    const todayStr = new Date().toISOString().split("T")[0];
    const lastStr  = currentProfile.streakLastDate || "";
    const yestStr  = new Date(Date.now()-86400000).toISOString().split("T")[0];
    let streakCount = currentProfile.streakCount || 0;
    let xp          = currentProfile.xp || 0;
    let bonusToast  = null;

    if (lastStr === todayStr) {
      xp += XP_PER_TX; // already logged today, just XP
    } else if (lastStr === yestStr) {
      streakCount += 1;
      xp += XP_PER_TX;
      const bonus = STREAK_BONUS[streakCount];
      if (bonus) { xp += bonus; bonusToast = `🔥 ${streakCount}-day streak! +${bonus} bonus XP 🎉`; }
    } else {
      streakCount = 1; // reset
      xp += XP_PER_TX;
    }

    const updated = {...currentProfile, streakCount, streakLastDate: todayStr, xp};
    setProfile(updated);
    await supabase.from("profiles").update({
      streak_count: streakCount, streak_last_date: todayStr, xp,
    }).eq("id", userId);
    return bonusToast;
  } catch(e) { console.error("Streak error:", e); return null; }
};

// ─── THEME & CONSTANTS ────────────────────────────────────────

// ─── DEFAULT CATEGORIES ───────────────────────────────────────
const DEFAULT_EXPENSE_CATS = [
  // ── Daily food & drink ──────────────────────────────────────
  {id:"food",          emoji:"🍜",en:"Food",             lo:"ອາຫານ",        th:"อาหาร"},
  {id:"groceries",     emoji:"🛒",en:"Groceries",        lo:"ຊື້ຂອງກິນ",    th:"ของชำ"},
  {id:"drinks",        emoji:"🍺",en:"Drinks",           lo:"ເຄື່ອງດື່ມ",   th:"เครื่องดื่ม"},
  {id:"coffee",        emoji:"☕",en:"Coffee / Cafe",    lo:"ກາເຟ",         th:"กาแฟ"},
  // ── Getting around ─────────────────────────────────────────
  {id:"transport",     emoji:"🛵",en:"Transport",        lo:"ຂົນສົ່ງ",      th:"เดินทาง"},
  {id:"travel",        emoji:"✈️",en:"Travel",           lo:"ທ່ອງທ່ຽວ",     th:"ท่องเที่ยว"},
  // ── Home & bills ───────────────────────────────────────────
  {id:"rent",          emoji:"🏠",en:"Housing / Rent",  lo:"ທີ່ພັກ",        th:"ที่พัก"},
  {id:"utilities",     emoji:"💡",en:"Utilities",        lo:"ຄ່ານ້ຳ-ໄຟ",    th:"สาธารณูปโภค"},
  {id:"phone_internet",emoji:"📱",en:"Phone & Internet", lo:"ຄ່າໂທ/ເນັດ",   th:"ค่าโทร/เน็ต"},
  {id:"household",     emoji:"🏡",en:"Household",        lo:"ຂອງໃຊ້ເຮືອນ",  th:"ของใช้ในบ้าน"},
  // ── Personal spending ──────────────────────────────────────
  {id:"shopping",      emoji:"🛍️",en:"Shopping",        lo:"ຊື້ເຄື່ອງ",    th:"ช้อปปิ้ง"},
  {id:"health",        emoji:"💊",en:"Health",           lo:"ສຸຂະພາບ",      th:"สุขภาพ"},
  {id:"beauty",        emoji:"💇",en:"Beauty",           lo:"ຄວາມງາມ",      th:"ความงาม"},
  {id:"fitness",       emoji:"🏋️",en:"Fitness",         lo:"ອອກກຳລັງ",     th:"ออกกำลัง"},
  // ── Fun & leisure ──────────────────────────────────────────
  {id:"entertainment", emoji:"🎉",en:"Entertainment",   lo:"ບັນເທີງ",      th:"บันเทิง"},
  {id:"subscriptions", emoji:"📺",en:"Subscriptions",   lo:"ສະໝັກລາຍການ",  th:"สมาชิกรายเดือน"},
  {id:"gaming",        emoji:"🎮",en:"Gaming",           lo:"ເກມ",           th:"เกม"},
  // ── Growth & family ────────────────────────────────────────
  {id:"education",     emoji:"📚",en:"Education",        lo:"ການສຶກສາ",     th:"การศึกษา"},
  {id:"family",        emoji:"👨‍👩‍👧",en:"Family",        lo:"ຄອບຄົວ",       th:"ครอบครัว"},
  // ── Culture & community ────────────────────────────────────
  {id:"donation",      emoji:"🙏",en:"Donation / Merit", lo:"ເຮັດບຸນ",      th:"ทำบุญ"},
  // ── Financial obligations ──────────────────────────────────
  {id:"debt_payment",  emoji:"💳",en:"Debt Payment",    lo:"ຊຳລະໜີ້",      th:"ชำระหนี้"},
  {id:"fees",          emoji:"🏦",en:"Fees & Charges",   lo:"ຄ່າທຳນຽມ",    th:"ค่าธรรมเนียม"},
  {id:"repair",        emoji:"🔧",en:"Repair",           lo:"ຄ່າຊ່ອມ",      th:"ค่าซ่อม"},
  // ── Catch-all ──────────────────────────────────────────────
  {id:"other",         emoji:"📦",en:"Other",            lo:"ອື່ນໆ",         th:"อื่นๆ"},
];
const DEFAULT_INCOME_CATS = [
  {id:"salary",    emoji:"💼",en:"Salary",     lo:"ເງິນເດືອນ", th:"เงินเดือน"},
  {id:"freelance", emoji:"💰",en:"Freelance",  lo:"ຟຣີແລນ",    th:"ฟรีแลนซ์"},
  {id:"selling",   emoji:"💵",en:"Selling",    lo:"ຂາຍ",       th:"ขาย"},
  {id:"gift",      emoji:"🎁",en:"Gift",       lo:"ຂອງຂວັນ",   th:"ของขวัญ"},
  {id:"investment",emoji:"📈",en:"Investment", lo:"ການລົງທຶນ",  th:"การลงทุน"},
  {id:"bonus",     emoji:"🎯",en:"Bonus",      lo:"ໂບນັດ",     th:"โบนัส"},
  {id:"transfer",  emoji:"🏧",en:"Transfer",   lo:"ໂອນເງິນ",   th:"โอนเงิน"},
  {id:"other_inc", emoji:"📦",en:"Other",      lo:"ອື່ນໆ",      th:"อื่นๆ"},
];

const catLabel=(cat,lang)=>(lang==="lo"?cat.lo:lang==="th"?cat.th:cat.en)||cat.en;
const buildAllCats=(customCats=[])=>[...DEFAULT_EXPENSE_CATS,...DEFAULT_INCOME_CATS,...customCats];
const findCat=(id,customCats=[])=>buildAllCats(customCats).find(c=>c.id===id)||DEFAULT_EXPENSE_CATS[0];

const normalizeCategory=(cat,type)=>{
  const m={
    // Self-mappings — when AI/parser returns category ID directly
    drinks:"drinks",transport:"transport",travel:"travel",rent:"rent",
    phone_internet:"phone_internet",household:"household",
    health:"health",beauty:"beauty",fitness:"fitness",
    subscriptions:"subscriptions",gaming:"gaming",
    family:"family",donation:"donation",
    debt_payment:"debt_payment",fees:"fees",repair:"repair",
    freelance:"freelance",selling:"selling",bonus:"bonus",other_inc:"other_inc",
    // ── Food ──────────────────────────────────────────────────
    food:"food",eating:"food",restaurant:"food",dining:"food",
    lunch:"food",dinner:"food",breakfast:"food",meal:"food",
    rice:"food",noodle:"food",pho:"food",bbq:"food",
    ເຂົ້າ:"food",ເຂົ້າປຽກ:"food",ອາຫານ:"food",ກິນ:"food",
    ຕຳ:"food",ເຝີ:"food",ລາບ:"food",laap:"food",larb:"food",
    // ── Groceries ─────────────────────────────────────────────
    groceries:"groceries",grocery:"groceries",supermarket:"groceries",
    "fresh market":"groceries","villa market":"groceries",
    "that luang market":"groceries","t-mart":"groceries",
    ຊື້ຂອງ:"groceries",ຊື້ຂອງກິນ:"groceries",talat:"groceries",
    // ── Drinks ────────────────────────────────────────────────
    beer:"drinks",alcohol:"drinks",wine:"drinks","beer lao":"drinks",
    whiskey:"drinks",whisky:"drinks",drinking:"drinks",vodka:"drinks",
    ດື່ມ:"drinks",ເຫຼົ້າ:"drinks","lao lao":"drinks",ລາວລາວ:"drinks",
    // ── Coffee ────────────────────────────────────────────────
    coffee:"coffee",cafe:"coffee",กาแฟ:"coffee",ກາເຟ:"coffee",
    latte:"coffee",espresso:"coffee",joma:"coffee",
    // ── Transport ─────────────────────────────────────────────
    taxi:"transport",grab:"transport",uber:"transport",loca:"transport",
    indrive:"transport",bus:"transport",fuel:"transport",gas:"transport",
    petrol:"transport",tuk:"transport",ນ້ຳມັນ:"transport",
    // ── Travel ────────────────────────────────────────────────
    travel:"travel",flight:"travel",hotel:"travel",trip:"travel",
    vacation:"travel",holiday:"travel",resort:"travel",ທ່ອງທ່ຽວ:"travel",
    // ── Housing (id="rent") ───────────────────────────────────
    housing:"rent",apartment:"rent",room:"rent",
    ຄ່າເຊົ່າ:"rent",ເຊົ່າ:"rent",ທີ່ພັກ:"rent",
    // ── Utilities ─────────────────────────────────────────────
    utilities:"utilities",electricity:"utilities",electric:"utilities",
    edl:"utilities","nam papa":"utilities",
    ຄ່າໄຟ:"utilities",ໄຟຟ້າ:"utilities",ຄ່ານ້ຳ:"utilities",ນ້ຳປະປາ:"utilities",
    // ── Phone & Internet ──────────────────────────────────────
    "phone internet":"phone_internet",phone:"phone_internet",
    mobile:"phone_internet",topup:"phone_internet","top-up":"phone_internet",
    unitel:"phone_internet",etl:"phone_internet",ltc:"phone_internet",
    internet:"phone_internet",wifi:"phone_internet",
    ຄ່າໂທ:"phone_internet",ຄ່າໂທລະສັບ:"phone_internet",ຄ່າເນັດ:"phone_internet",ເຕີມ:"phone_internet",
    // ── Household ─────────────────────────────────────────────
    cleaning:"household",detergent:"household",furniture:"household",appliance:"household",
    ຂອງໃຊ້:"household",ຂອງໃຊ້ເຮືອນ:"household",
    // ── Shopping ──────────────────────────────────────────────
    shopping:"shopping",clothes:"shopping",shop:"shopping",
    bag:"shopping",caddie:"shopping",caddy:"shopping",mall:"shopping",
    // ── Health ────────────────────────────────────────────────
    medical:"health",doctor:"health",medicine:"health",hospital:"health",
    clinic:"health",pharmacy:"health",ໂຮງໝໍ:"health",ຢາ:"health",
    // ── Beauty ────────────────────────────────────────────────
    beauty:"beauty",salon:"beauty",haircut:"beauty",nail:"beauty",spa:"beauty",ຕັດຜົມ:"beauty",
    // ── Fitness ───────────────────────────────────────────────
    gym:"fitness",sport:"fitness",exercise:"fitness",
    golf:"fitness",swimming:"fitness",yoga:"fitness",ອອກກຳລັງ:"fitness",
    // ── Entertainment ─────────────────────────────────────────
    entertainment:"entertainment",movie:"entertainment",concert:"entertainment",
    event:"entertainment",party:"entertainment",festival:"entertainment",
    karaoke:"entertainment",ktv:"entertainment","mor lam":"entertainment",morlam:"entertainment",ມໍລຳ:"entertainment",
    // ── Subscriptions ─────────────────────────────────────────
    subscription:"subscriptions",netflix:"subscriptions",spotify:"subscriptions",
    youtube:"subscriptions",disney:"subscriptions",icloud:"subscriptions",ສະໝັກ:"subscriptions",
    // ── Gaming ────────────────────────────────────────────────
    game:"gaming",games:"gaming",steam:"gaming",playstation:"gaming",xbox:"gaming",ເກມ:"gaming",
    // ── Education ─────────────────────────────────────────────
    education:"education",school:"education",book:"education",course:"education",
    tuition:"education",ຮຽນ:"education",
    // ── Family ────────────────────────────────────────────────
    parents:"family",mom:"family",dad:"family",kids:"family",children:"family",baby:"family",
    ຄອບຄົວ:"family",ພໍ່ແມ່:"family",ລູກ:"family","ໃຫ້ພໍ່":"family","ໃຫ້ແມ່":"family",ສົ່ງໃຫ້:"family",
    // ── Donation ──────────────────────────────────────────────
    donate:"donation",temple:"donation",merit:"donation",charity:"donation",monk:"donation",
    ເຮັດບຸນ:"donation",ໃສ່ບາດ:"donation",ວັດ:"donation",ຖວາຍ:"donation",ທຳທານ:"donation",ທານ:"donation",ບໍລິຈາກ:"donation",
    // ── Debt Payment ──────────────────────────────────────────
    debt:"debt_payment",loan:"debt_payment",installment:"debt_payment",repayment:"debt_payment",
    ຜ່ອນ:"debt_payment",ໜີ້:"debt_payment",ກູ້:"debt_payment",ໃຊ້ໜີ້:"debt_payment",ຊຳລະ:"debt_payment",
    // ── Fees ──────────────────────────────────────────────────
    fee:"fees",charge:"fees","atm fee":"fees","transfer fee":"fees","bank fee":"fees",
    ຄ່າທຳນຽມ:"fees",ຄ່າບໍລິການ:"fees",
    // ── Repair ────────────────────────────────────────────────
    repair:"repair",fix:"repair",maintenance:"repair",mechanic:"repair",
    ຊ່ອມ:"repair",ສ້ອມ:"repair",ແກ້:"repair",
    // ── Income ────────────────────────────────────────────────
    salary:"salary",wage:"salary",paycheck:"salary",payroll:"salary",
    เงินเดือน:"salary",ເງິນເດືອນ:"salary",
    commission:"freelance",ຄ່າຈ້າງ:"freelance",ຮັບຈ້າງ:"freelance",
    sale:"selling",sold:"selling",sell:"selling",ຂາຍ:"selling",ຂາຍເຄື່ອງ:"selling",
    gift:"gift",ຂອງຂວັນ:"gift",award:"bonus",ໂບນັດ:"bonus",
    investment:"investment",invest:"investment",dividend:"investment",ລົງທຶນ:"investment",ຫຸ້ນ:"investment",
    transfer:"transfer",received:"transfer",ໂອນ:"transfer",
    income:type==="income"?"salary":"other",
    other:type==="income"?"other_inc":"other",
  };
  return m[cat?.toLowerCase()]||(type==="income"?"salary":"food");
};

// ─── KEYBOARD OFFSET HOOK ─────────────────────────────────────
// iOS Safari: position:fixed elements don't shrink when keyboard opens.
// This hook returns how many px the keyboard is covering at bottom.
// Apply as transform:translateY(-Xpx) or marginBottom:Xpx on modal sheets.
const useKeyboardOffset = () => {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const kh = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setOffset(kh);
    };
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => { vv.removeEventListener('resize', update); vv.removeEventListener('scroll', update); };
  }, []);
  return offset;
};


// ─── LOCAL PARSER ─────────────────────────────────────────────
// ─── LOCAL PARSER v4 — Combined best of Claude + Gemini + GPT ──
// Handles: Lao (primary) · Thai (secondary) · English
// Zero API calls — handles ~90% of real inputs instantly
const localParse = (text) => {
  if (!text || typeof text !== 'string') return null;

  // ── Lao & Thai native digit normalisation ──────────────────
  const toArabic = (s) => (s||'')
    .replace(/[໐໑໒໓໔໕໖໗໘໙]/g, c => '໐໑໒໓໔໕໖໗໘໙'.indexOf(c).toString())
    .replace(/[๐๑๒๓๔๕๖๗๘๙]/g, c => '๐๑๒๓๔๕๖๗๘๙'.indexOf(c).toString());

  // ── Scale multipliers (Lao-first) ─────────────────────────
  const SCALE = {
    k:1e3, K:1e3, m:1e6, M:1e6,
    'ພັນ':1e3, 'พัน':1e3,
    'ແສນ':1e5, 'แสน':1e5,
    'ລ້ານ':1e6, 'ล้าน':1e6,
  };

  // ── Parse number with thousands-separator awareness ────────
  const parseNum = (raw, suffix) => {
    let s = toArabic((raw||'').trim());
    const scale = SCALE[suffix] || 1;
    // 50.000 or 50,000 → thousands separator (not decimal)
    if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g,'');
    else if (/^\d{1,3}(,\d{3})+$/.test(s)) s = s.replace(/,/g,'');
    else if (scale > 1 && /^\d+,\d+$/.test(s)) s = s.replace(',','.');
    else s = s.replace(/,/g,'');
    const n = parseFloat(s);
    return (isFinite(n) && n > 0) ? Math.round(n * scale) : null;
  };

  // ── Extract best amount from a line ───────────────────────
  const extractAmount = (line) => {
    const s = toArabic(line||'');
    const re = /(\$)?([\d][0-9.,]*)(?:\s*)(ພັນ|พัน|k|K|ແສນ|แสน|ລ້ານ|ล้าน|m|M)?/g;
    let best = null;
    let m;
    while ((m = re.exec(s)) !== null) {
      const val = parseNum(m[2], m[3]);
      if (!val) continue;
      const hasScale = !!(m[3] && SCALE[m[3]]);
      const hasDollar = m[1] === '$';
      const score = (hasScale?3:0) + (hasDollar?2:0) + (val>1000?1:0);
      if (!best || score > best.score || (!best.hasScale && val > best.val)) {
        best = { val, score, hasScale, matchText: m[0], start: m.index, end: re.lastIndex };
      }
    }
    return best;
  };

  // ── Currency detection (LAK default — Laos is primary) ────
  const detectCurrency = (line, amount) => {
    const t = (line||'').toLowerCase();
    if (/฿|บาท|baht|thb/i.test(t)) return 'THB';
    if (/\$|usd|\bdollar\b/i.test(t)) return 'USD';
    if (/₭|ກີບ|\bkip\b|\blak\b/i.test(t)) return 'LAK';
    const thaiCtx = /[\u0E00-\u0E7F]/.test(t) || /grab|shopee|lazada|lotus|big\s*c/i.test(t);
    if (amount < 5000 && thaiCtx) return 'THB';
    return 'LAK';
  };

  // ── Category rules — ordered by specificity, Lao-first ────
  // [regex, category, confidence]
  // confidence >= 0.88 → skip API call (App.jsx threshold)
  // Expanded with GPT + Gemini Lao/Thai/EN vocabulary
  const CAT_RULES = [

    // ══ INCOME ══════════════════════════════════════════════════
    [/ເງິນເດືອນ|salary|\bwage\b|payroll|เงินเดือน/i,                                       'salary',        0.96],
    [/ຂາຍ(?:ເຄື່ອງ|ຂອງ)?|ขาย|\bsell\b|\bsold\b|\bsale\b/i,                         'selling',       0.93],
    [/ຮັບຈ້າງ|ຄ່າຈ້າງ|freelance|commission|ฟรีแลนซ์/i,                                    'freelance',     0.93],
    [/ໂບນັດ|\bbonus\b|โบนัส/i,                                                           'bonus',         0.93],
    [/ລົງທຶນ|ຫຸ້ນ|\binvest|crypto|bitcoin|\bstock|หุ้น|ลงทุน/i,                          'investment',    0.90],

    // ══ TRANSFER (banks — very specific) ══════════════════════════
    [/\b(bcel|jdb|ldb|bfl|onepay|apay|k\s*plus|promptpay|truemoney)\b(?!\s*(?:fee|fees|charge|charges|statement|statements))/i, 'transfer', 0.92],
    [/ໂອນ(?:ເງິນ)?(?!\s*ອອກ)|โอน(?:เงิน)?/i,                                            'transfer',      0.90],

    // ══ DONATION — ເຮັດບຸນ (very Lao — highest priority) ══════════
    [/ເຮັດບຸນ|ໃສ່ບາດ|ຕັກບາດ|ຖວາຍ|ທຳທານ|ບໍລິຈາກ|ສູ່ຂວັນ|ຜູກແຂນ/i,                   'donation',      0.98],
    [/ບຸນທາດຫຼວງ|ບຸນບັ້ງໄຟ|ບຸນຊ່ວງເຮືອ|ບຸນປີໃໝ່|ບຸນເຂົ້າພັນສາ|ບຸນອອກພັນສາ/i,         'donation',      0.97],
    [/ວັດ(?:\s|$)|ຖວາຍພະ|ຖວາຍວັດ|ໂຮງໝໍ.*ບໍລິຈາກ|ປ່ອຍປາ|ປ່ອຍນົກ|ກະຖິນ|ຜ້າປ່າ/i,    'donation',      0.96],
    [/baci|boun\s*bang\s*fai|boun\s*that\s*luang|kathin|pha\s*pa|sai\s*bat|tak\s*bat/i,'donation',   0.95],
    [/boun\s*pi\s*mai|sou\s*khuan|sukhuan|wrist\s*thread|ordination|buat/i,           'donation',      0.93],
    [/funeral\s*envelope|ngan\s*sop|wedding\s*envelope|kha\s*dong|kha\s*khong/i,     'donation',      0.93],
    [/\bdonate\b|\bdonation\b|\bcharity\b|\btemple\b|\bmonk\b|\balms\b/i,      'donation',      0.92],
    [/ทำบุญ|ใส่บาตร|ตักบาตร|ถวาย|วัด|กฐิน|ผ้าป่า|บริจาค|สู่ขวัญ/i,                   'donation',      0.93],

    // ══ DEBT PAYMENT ══════════════════════════════════════════════
    [/ຜ່ອນ|ໜີ້|ໃຊ້ໜີ້|ກູ້(?!ຢືມ)|ຊຳລະໜີ້/i,                                             'debt_payment',  0.97],
    [/\bloan\b|\binstallment\b|\brepayment\b|ผ่อน|หนี้|ชำระหนี้/i,                  'debt_payment',  0.93],

    // ══ PHONE & INTERNET (before utilities) ══════════════════════
    [/ຄ່າໂທ|ຄ່າໂທລະສັບ|ຄ່າເນັດ|ເຕີມ(?:ເງິນ)?/i,                                       'phone_internet',0.97],
    [/\b(unitel|etl|ltc|beeline|ອູນີເທລ)\b/i,                                          'phone_internet',0.97],
    [/\btopup\b|top[\s-]?up(?:\s*phone)?|mobile\s*package|data\s*package|เติมเงิน/i, 'phone_internet',0.93],
    [/wifi\s*bill|phone\s*bill|internet\s*bill|ค่าเน็ต|ค่าโทร/i,                     'phone_internet',0.93],

    // ══ UTILITIES (ຄ່າໄຟ ຄ່ານ້ຳ) ════════════════════════════════
    [/ຄ່າໄຟ|ໄຟຟ້າ|\bedl\b|ຄ່ານ້ຳ|ນ້ຳປະປາ|\bnam\s*papa\b/i,                       'utilities',     0.98],
    [/electricity|electric\s*bill|water\s*bill|water\s*supply|ค่าไฟ|ค่าน้ำ|สาธารณูปโภค|ລັດວິສາຫະກິດນ້ຳປະປາ/i, 'utilities', 0.95],
    [/trash|garbage|rubbish|waste\s*collect|ຂີ້ເຫຍື້ອ|ค่าขยะ/i,                    'utilities',     0.92],

    // ══ HOUSING (rent only) ════════════════════════════════════════
    [/ຄ່າເຊົ່າ|ເຊົ່າຫ້ອງ|ເຊົ່າບ້ານ|ค่าเช่า|เช่าบ้าน/i,                                  'rent',          0.97],
    [/\brent\b|apartment\s*fee|room\s*rent/i,                                         'rent',          0.93],

    // ══ REPAIR ════════════════════════════════════════════════════
    [/ຊ່ອມລົດ|ຊ່ອມ(?:ຈັກ|ໂທ|ເຮືອນ|ຕູ້ເຢັນ|ແອ)|ສ້ອມແຊມ|ຄ່າຊ່າງ/i,                    'repair',        0.97],
    [/\brepair\b|mechanic|tire\s*repair|pa\s*yang|ล้างรถ|ค่าช่าง|ปะยาง/i,          'repair',        0.93],
    [/car\s*wash|lang\s*lot|ນ້ຳມັນເຄື່ອງ|engine\s*oil|ຫາງໝໍ|ຊ່ອມ/i,               'repair',        0.92],

    // ══ FEES (ATM, transfer, govt) ════════════════════════════════
    [/ຄ່າທຳນຽມ|ຄ່າ\s*atm|ຄ່າໂອນ|ຄ່າຝາກ|ໃບຂັບຂີ່|ຄ່າວີຊາ/i,                        'fees',          0.97],
    [/atm\s*fee|transfer\s*fee|bank\s*fee|service\s*fee|visa\s*fee/i,              'fees',          0.94],
    [/ຄ່າປັບ|police\s*ticket|ໃບສັ່ງ|ค่าปรับ|ค่าธรรมเนียม/i,                          'fees',          0.92],
    [/bank\s*statement|bank\s*charge|monthly\s*fee|bcel\s*fee|annual\s*fee/i,       'fees',          0.93],

    // ══ FAMILY ════════════════════════════════════════════════════
    [/ໃຫ້ພໍ່|ໃຫ້ແມ່|ໃຫ້ພໍ່ແມ່|ສົ່ງໃຫ້ພໍ່|ສົ່ງໃຫ້ແມ່|ຄ່ານົມ|ຜ້າອ້ອມ|ລ້ຽງລູກ/i,      'family',        0.97],
    [/give\s*mom|give\s*dad|send\s*parents|baby\s*milk|diapers|pampers|mamypoko/i,  'family',        0.93],

    // ══ COFFEE ════════════════════════════════════════════════════
    [/ກາເຟ|กาแฟ|\bcoffee\b|\bcafe\b|joma|starbucks|amazon\s*cafe/i,               'coffee',        0.96],
    [/latte|espresso|cappuccino|americano|flat\s*white|iced\s*coffee|cha\s*yen/i,   'coffee',        0.94],
    [/inthanin|cafe\s*amazon|chatramue|cha\s*tra\s*mue|pearly\s*tea|koi\s*the/i, 'coffee',        0.95],
    [/kamu|ichitan|oishi(?!.*beer)|green\s*tea(?!.*beer)|ชาเขียว|ชาไทย/i,            'coffee',        0.90],

    // ══ DRINKS — Beerlao variants (most specific first) ══════════
    [/beerlao|beer\s*lao|ເບຍລາວ|ເບຍນ້ຳຂອງ|namkhong/i,                                 'drinks',        0.98],
    [/beerlao\s*(?:dark|gold|white|ipa|lemon|green)|ເບຍລາວ(?:ດຳ|ໂກ|ໄວ)/i,          'drinks',        0.98],
    [/ລາວລາວ|lao\s*lao|ເຫຼົ້າ(?:ຂາວ)?|lao\s*whisky|rice\s*whisky/i,               'drinks',        0.97],
    [/carlsberg|heineken|tuborg|chang\s*beer|tiger\s*beer|luang\s*prabang\s*beer/i,'drinks',        0.96],
    [/soju|chivas|red\s*label|black\s*label|johnnie|jack\s*daniel|smirnoff|absolut/i,'drinks',       0.95],
    [/regency|blend\s*285|hong\s*thong|sangsom|vodka|\bwine\b|champagne/i,         'drinks',        0.94],
    [/ດື່ມ|alcohol|\bbeer\b|\bwhisky\b|\bwhiskey\b|cocktail|เบียร์|เหล้า/i,    'drinks',        0.95],
    [/m-150|carabao|red\s*bull|sponsor|pocari|energy\s*drink|ນ້ຳຊູກຳລັງ/i,          'drinks',        0.93],
    [/ຊານົມ|cha\s*nom|boba|bubble\s*tea|milk\s*tea|pearl(?:s)?\s*tea|ไข่มุก/i,    'drinks',        0.94],
    [/ນ້ຳອ້ອຍ|sugarcane|coconut\s*water|ໝາກພ້າວ|ນ້ຳໝາກ|fresh\s*juice|smoothie/i,   'drinks',        0.92],
    [/coke|pepsi|sprite|fanta|\bsoda\b|soft\s*drink|ນ້ຳອັດລົມ|น้ำอัดลม/i,          'drinks',        0.92],
    [/\bwater\b(?!\s*bill|\s*supply|\s*park)|ນ້ຳດື່ມ(?!\s*ຫົວ)|nom\s*sot/i,    'drinks',        0.88],

    // ══ GROCERIES (market/supermarket shopping) ══════════════════
    [/ຊື້ຂອງກິນ|ຊື້ຂອງ(?!\s*ໃຊ້)|ຕະຫຼາດສົດ|ຕະຫຼາດເຊົ້າ|ທ້ອງຕະຫຼາດ/i,              'groceries',     0.97],
    [/villa\s*market|phimphone|t-mart|j-mart|kok\s*kok|rimping|mini\s*big\s*c/i,  'groceries',     0.97],
    [/khua\s*din|talat\s*sao|that\s*luang\s*market|\btalat\b/i,                 'groceries',     0.95],
    [/supermarket|fresh\s*market|\bgrocery\b|\bproduce\b|big\s*c/i,             'groceries',     0.93],
    // Cleaning & household brands — groceries context
    [/omo|downy|comfort|pantene|sunsilk|dove\b|lux\b|colgate|vaseline/i,            'groceries',     0.93],
    [/pampers|mamypoko|mammy\s*poko|baby\s*formula|nom\s*phong|ຜ້າອ້ອມ/i,          'groceries',     0.94],
    [/\bsunlight\b|faep|\breeze\b|detergent|ຜ້ານຸ່ມ|ຜ້ານຸ່ມ|fabric\s*softener/i,'groceries',     0.92],
    [/ຢາສີຟັນ|ຢາສະຜົມ|ສະບູ|toothpaste|shampoo|conditioner|body\s*wash/i,            'groceries',     0.92],
    [/trash\s*bag|toilet\s*paper|tissue|garbage\s*bag|ຖົງຂີ້ເຫຍື້ອ|ເຈ້ຍ/i,        'groceries',     0.91],
    [/fish\s*sauce|nam\s*pa|padaek|pa\s*daek|soy\s*sauce|oyster\s*sauce/i,      'groceries',     0.91],
    [/instant\s*noodle|mama\b|wai\s*wai|ໝີ່ໄວໄວ|canned\s*fish|ປາກະປ໋ອງ/i,      'groceries',     0.93],
    [/cooking\s*oil|ນ້ຳມັນກິນ|sugar|ນ້ຳຕານ|salt|ເກືອ|msg|ຜົງ|seasoning/i,          'groceries',     0.90],

    // ══ FOOD — Lao dishes (highest priority) ═════════════════════
    [/ຕຳໝາກຫຸ່ງ|ຕຳໝາກແດງ|ຕຳໝາກ|ສົ້ມຕຳ|som\s*tam/i,                                'food',          0.98],
    [/ເຝີ|ໝູກະທະ|moo\s*kata|ອໍ້ລຳ|or\s*lam|ລາບ(?:ໝູ|ໄກ່|ງົວ|ປາ|ເປັດ)?/i,        'food',          0.97],
    [/ຜັດໄທ|pad\s*thai|ຂ້າວຜັດ|khao\s*pad|ຜັດກະເພົາ|pad\s*kra\s*pao/i,          'food',          0.97],
    [/ໝົກປາ|mok\s*pa|ໝົກໄກ່|mok\s*kai|ຫໍ່ໝົກ|hor\s*mok/i,                        'food',          0.97],
    [/ໄສ້ອົ່ວ|sai\s*oua|ແໜມເນືອງ|nam\s*khao|ຫ່ຍ|jeow\s*bong|ແຈ່ວ/i,             'food',          0.96],
    [/ping\s*(?:kai|moo|pa|sin)|ປີ້ງ(?:ໄກ່|ໝູ|ປາ|ຊີ້ນ)/i,                          'food',          0.96],
    [/khao\s*piak|kao\s*piek|ເຂົ້າປຽກ|khao\s*poon|ເຂົ້າປຸ້ນ|khao\s*soi/i,       'food',          0.96],
    [/khao\s*niao|ເຂົ້າໜຽວ|sticky\s*rice|ເຂົ້າຈີ່ປາເຕ້|khao\s*jee/i,             'food',          0.95],
    [/tom\s*yum|ຕົ້ມຍຳ|suki|ສຸກີ້|shabu|ຊາບູ|buffet|ບຸບເຟ້|wark|ແຊບ/i,             'food',          0.95],
    [/laap|larb|laab|ລາບ|khao\s*man|khao\s*na\s*ped|boat\s*noodle/i,              'food',          0.95],
    [/ເຂົ້າ|ອາຫານ|ກິນ|ຊີ້ນ|ໄກ່|ໄຂ່|ຜັກ|ປາ|ໝູ|ກຸ້ງ/i,                              'food',          0.95],
    [/ข้าว|อาหาร|หมูกระทะ|ส้มตำ|ลาบ|ผัดไทย|ก๋วยเตี๋ยว|ไก่|ไข่|เนื้อ|ผัก/i,       'food',          0.93],
    // Romanized Lao food
    [/khao|tam\s*mak|ping\s*gai|mee\s*sua|khao\s*jee|pate/i,                      'food',          0.92],
    // International food chains in Laos
    [/lotteria|texas\s*chicken|dairy\s*queen|swensen|patongo|pa\s*thong/i,          'food',          0.95],
    [/dim\s*sum|ຕິ່ມຊຳ|ramen|ຣາເມັງ|roti|ໂຣຕີ|sushi|kfc|burger|pizza/i,             'food',          0.94],
    // General food vocabulary
    [/noodle|\brice\b|chicken|\bpork\b|\bfish\b|\begg\b|shrimp|\bbeef\b/i,  'food',          0.92],
    [/\bcake\b|cupcake|cup\s*cake|cake\s*roll|croissant|pastry|bakery/i,           'food',          0.93],
    [/\bcookie\b|donut|waffle|pancake|muffin|patongko|ปาท่องโก๋/i,                  'food',          0.93],
    [/\bbread\b|toast|sandwich|hotdog|baguette|roti/i,                               'food',          0.92],
    [/ໝາກ(?:ກ້ວຍ|ໂມ|ມ່ວງ|ພ້າວ|ຫຸ້ງ|ເລັ່ນ|ນາວ)|mak\s*(?:muang|mo|kuai)/i,          'food',          0.92],
    [/\bapple\b|\bbanana\b|\bmango\b|watermelon|papaya|\bfruit\b/i,            'food',          0.92],
    [/sausage|\bham\b|\bbacon\b|meatball|\bsteak\b|ลูกชิ้น|ไส้อั่ว/i,           'food',          0.93],
    [/\bmilk\b|\bcheese\b|yogurt|\bbutter\b|tofu|ขนม|dessert|ของหวาน/i,         'food',          0.91],
    [/\bjam\b|honey|sauce|ketchup|chocolate|\bsnack\b|chips|candy|ຂະໜົມ/i,          'food',          0.90],
    [/breakfast|lunch|dinner|\bfood\b|\beat\b|meal|restaurant|street\s*food/i,   'food',          0.90],
    [/oeuvre|takeaway|packed\s*lunch|ຫໍ່ກັບ|khao\s*kong|อาหารข้างทาง/i,            'food',          0.90],

    // ══ TRANSPORT — Lao apps + specific ═══════════════════════════
    [/\bloca\b|ໂລຄ່າ|ຈໍາໂບ້|jumbo|skylab|ສະກາຍແລັບ|xanh\s*sm/i,                  'transport',     0.97],
    [/\bindrive\b|kok\s*kok\s*move|tuk\s*tuk|ຕຸກຕຸກ|\btaxi\b/i,               'transport',     0.96],
    [/ນ້ຳມັນ|ຕື່ມນ້ຳມັນ|pam\s*nam\s*man|gas\s*station|ປ້ຳ/i,                      'transport',     0.97],
    // Lao fuel brands
    [/ptt|laopec|petrolimex|petrotrade|star\s*oil|plus\s*gas|pv\s*oil|orl|lsfc/i,'transport',     0.96],
    // LCR train (Lao-China Railway)
    [/\blcr\b|lao\s*china\s*rail|lot\s*fai|ລົດໄຟ|high\s*speed\s*train/i,     'transport',     0.95],
    [/\bgrab\b|\bfuel\b|petrol|diesel|gasoline|parking|ค่าน้ำมัน|road\s*tax|vehicle\s*tax|ພາສີລົດ/i, 'transport', 0.93],
    [/speedboat|slow\s*boat|heua|ferry|ເຮືອ|boat\s*ticket|ปีเรือ/i,                'transport',     0.93],
    [/lao\s*airlines|wattay|airport|sanam\s*bin|สนามบิน|ตั๋วเครื่องบิน/i,          'transport',     0.93],
    [/motorbike\s*rental|sao\s*lot|car\s*rental|ເຊົ່າລົດ|เช่ารถ/i,               'transport',     0.92],

    // ══ ENTERTAINMENT — morlam + KTV (highest) ══════════════════
    [/ມໍລຳ|ໝໍລຳ|morlam|mor\s*lam|molam|luk\s*thung/i,                               'entertainment', 0.98],
    [/\bktv\b|karaoke|ຄາຣາໂອເກະ|คาราโอเกะ|vip\s*room(?!.*hotel)/i,                'entertainment', 0.97],
    // Pub/bar/nightclub
    [/\bຜັບ\b|nightclub|ໄນທ໌ຄັບ|pub(?!\s*lic)|beer\s*garden|rooftop\s*bar/i,   'entertainment', 0.95],
    [/tawandang|marina|dao\s*vieng|\bbar\b(?!code)|\bclub\b(?!\s*card)/i,       'entertainment', 0.93],
    // Cinema — Lao-specific
    [/major\s*(?:cineplex|platinum)|platinum\s*cineplex|hong\s*nang|ໂຮງໜັງ/i,    'entertainment', 0.97],
    [/\bmovie\b|cinema|\bfilm\b|ເບິ່ງໜັງ|popcorn|ticket(?!\s*train)/i,          'entertainment', 0.93],
    // Sports & activities
    [/bowling|ໂບລິ້ງ|billiards|billiard|snooker|ສະນຸກເກີ|pool(?!\s*party)/i,       'entertainment', 0.94],
    [/arcade|game\s*center|internet\s*cafe|pc\s*cafe|han\s*net|ຮ້ານເນັດ/i,       'entertainment', 0.93],
    // Festivals (Lao-specific)
    [/boun\s*pi\s*mai|pi\s*mai\s*lao|boun\s*bang\s*fai|boat\s*race/i,         'entertainment', 0.95],
    [/\bconcert\b|live\s*music|live\s*band|dj\s*party|edm|stage\s*show/i,      'entertainment', 0.93],
    [/\bparty\b|night\s*market|walking\s*street|water\s*park|amusement/i,        'entertainment', 0.91],
    [/petanque|ເປຕັງ|football\s*(?:match|game)|swimming\s*pool|สระว่ายน้ำ/i,       'entertainment', 0.91],
    [/lottery|lotto|ຊື້ເລກ|ຫວຍ|หวย|ลอตเตอรี่|scratch\s*card|ຂູດ/i,               'entertainment', 0.95],

    // ══ SUBSCRIPTIONS ════════════════════════════════════════════
    [/netflix|spotify|youtube\s*premium|disney\s*\+?|icloud/i,                     'subscriptions', 0.98],
    [/google\s*one|apple\s*one|line\s*tv|wetv|\bviu\b|canva/i,                   'subscriptions', 0.97],
    [/ສະໝັກ(?:\s*ລາຍ)?|ຕໍ່ອາຍຸ|auto\s*renew|monthly\s*sub/i,                    'subscriptions', 0.93],
    [/openai|chatgpt|anthropic|\bclaude\b|midjourney|github\s*copilot|\bapi\b.*subscr/i, 'subscriptions', 0.96],

    // ══ HOUSEHOLD ════════════════════════════════════════════════
    [/ຂອງໃຊ້ເຮືອນ|ຂອງໃຊ້|ນ້ຳຢາ|ຜ້າທຳຄວາມ/i,                                        'household',     0.95],
    [/detergent|cleaning|tissue|shampoo|\bsoap\b|toothpaste|floor\s*cleaner/i,    'household',     0.93],
    [/\bfan\b(?!\s*page)|rice\s*cooker|furniture|ເຄື່ອງໃຊ້ຟ້າ/i,                'household',     0.90],

    // ══ HEALTH — hospitals + medicine ════════════════════════════
    [/ໂຮງໝໍ|mahosot|setthathirath|mittaphab|hong\s*mo\s*150|hamesa/i,              'health',        0.98],
    [/\b(kasemrad|alliance\s*clinic|french\s*clinic|asean\s*hospital)\b/i,       'health',        0.97],
    [/ຮ້ານຂາຍຢາ|ຄລີນິກ|\bຢາ\b|ໝໍ(?!ລຳ)|pharmacy|clinic|\bdoctor\b/i,           'health',        0.96],
    [/paracetamol|sara\b|tiffy|decolgen|ibuprofen|amoxicillin|antibiotic/i,         'health',        0.95],
    [/dental|tooth|ຖອນແຂ້ວ|ດັດແຂ້ວ|braces|ໝໍແຂ້ວ|ขูดหินปูน/i,                     'health',        0.95],
    [/x-ray|ultrasound|mri|ct\s*scan|lab\s*test|blood\s*test|vaccine/i,           'health',        0.95],
    [/glasses|contact\s*lens|ແວ່ນຕາ|optic|eye\s*(?:care|clinic|drop)/i,           'health',        0.94],
    [/traditional\s*medicine|herbal|ຢາພື້ນເມືອງ|ຢາສະໝຸນໄພ|ยาสมุนไพร/i,            'health',        0.93],
    [/hospital|\bmedical\b|\bmedicine\b|ຢາ|surgery|pregnant|maternity/i,         'health',        0.92],

    // ══ BEAUTY ════════════════════════════════════════════════════
    [/ຕັດຜົມ|ເສີມສວຍ|ທາເລັບ|ทำผม|ตัดผม|ทำเล็บ/i,                                   'beauty',        0.95],
    [/salon|\bspa\b|haircut|\bnail\b|facial|skincare|sauna|ōb\s*aiy/i,          'beauty',        0.93],
    [/massage|ນວດ(?!ບຳ)|nuat(?!\s*bam)|โรงนวด|นวดแผนไทย/i,                        'beauty',        0.91],

    // ══ FITNESS ════════════════════════════════════════════════════
    [/\bgolf\b|\bgym\b|ອອກກຳລັງ|fitness|yoga|ฟิตเนส|กีฬา/i,                    'fitness',       0.95],
    [/badminton|football|futsal|\bswim|running|jogging|sa\s*loy\s*nam/i,          'fitness',       0.93],
    [/massage\s*therapy|nuat\s*bam|physiotherapy|ກາຍະພາບ/i,                       'fitness',       0.91],

    // ══ TRAVEL ════════════════════════════════════════════════════
    [/\bflight\b|\bhotel\b|ໂຮງແຮມ|ທ່ອງທ່ຽວ|wattay|lao\s*airlines/i,           'travel',        0.95],
    [/resort|booking|vacation|\btur\b|tour\s*package|เที่ยว|โรงแรม/i,              'travel',        0.93],

    // ══ SHOPPING ════════════════════════════════════════════════
    [/icon\s*mall|vientiane\s*center|miniso|\bcaddi\b|talat\s*sao/i,            'shopping',      0.96],
    [/ຊື້ເຄື່ອງ|shopee|lazada|clothes|shirt|\bbag\b|\bmall\b|electronics/i,          'shopping',      0.93],
    [/delivery|shipping|ຄ່າສົ່ງ|ຄ່າເຄື່ອງ|ค่าส่ง|ค่าจัดส่ง|grab\s*express|lalamove/i, 'shopping', 0.93],

    // ══ GAMING ════════════════════════════════════════════════════
    [/steam|playstation|\bps[45]\b|xbox|roblox|pubg|garena|free\s*fire/i,         'gaming',        0.97],
    [/top\s*up\s*game|เติมเกม|game\s*coin|in-game|rov|mobile\s*legend/i,         'gaming',        0.95],
    [/\bgame\b|\bgaming\b|\bເກມ\b|\bเกม\b/i,                                  'gaming',        0.88],

    // ══ EDUCATION ════════════════════════════════════════════════
    [/ຄ່າຮຽນ|ໂຮງຮຽນ|\bຮຽນ\b|ค่าเรียน|เรียน|โรงเรียน/i,                            'education',     0.95],
    [/school|university|college|course|tuition|workshop|\bbook\b|ໜັງສື/i,          'education',     0.93],
  ];

  // ── Income/expense type detection ─────────────────────────
  const INCOME_CATS = new Set(['salary','freelance','selling','bonus','investment']);
  const detectType = (line, category) => {
    if (INCOME_CATS.has(category)) return 'income';
    if (/ໄດ້ຮັບ|ຮັບ(?:ເງິນ)|ເງິນເຂົ້າ|ໂອນເຂົ້າ|รับ|เงินเข้า|received|incoming|earned|refund/i.test(line)) return 'income';
    return 'expense';
  };

  // ── Levenshtein distance (for Latin-script fuzzy matching) ──
  const levenshtein = (a, b) => {
    const m = a.length, n = b.length;
    const dp = Array.from({length: m + 1}, (_, i) => i);
    for (let j = 1; j <= n; j++) {
      let prev = dp[0];
      dp[0] = j;
      for (let i = 1; i <= m; i++) {
        const tmp = dp[i];
        dp[i] = a[i-1] === b[j-1] ? prev : 1 + Math.min(prev, dp[i], dp[i-1]);
        prev = tmp;
      }
    }
    return dp[m];
  };

  // ── Fuzzy keyword dictionary (Latin-only, high-value words) ─
  const FUZZY_WORDS = {
    coffee:'coffee',cafe:'coffee',latte:'coffee',espresso:'coffee',cappuccino:'coffee',americano:'coffee',starbucks:'coffee',
    beer:'drinks',whisky:'drinks',whiskey:'drinks',vodka:'drinks',cocktail:'drinks',soju:'drinks',
    gas:'transport',fuel:'transport',taxi:'transport',parking:'transport',gasoline:'transport',diesel:'transport',petrol:'transport',
    grocery:'groceries',groceries:'groceries',supermarket:'groceries',market:'groceries',
    restaurant:'food',breakfast:'food',lunch:'food',dinner:'food',pizza:'food',burger:'food',sushi:'food',noodle:'food',chicken:'food',steak:'food',
    hotel:'travel',flight:'travel',resort:'travel',vacation:'travel',booking:'travel',
    shopping:'shopping',clothes:'shopping',electronics:'shopping',delivery:'shopping',shipping:'shopping',
    netflix:'subscriptions',spotify:'subscriptions',subscription:'subscriptions',youtube:'subscriptions',
    pharmacy:'health',hospital:'health',medicine:'health',clinic:'health',dental:'health',
    salon:'beauty',haircut:'beauty',massage:'beauty',skincare:'beauty',
    gym:'fitness',yoga:'fitness',badminton:'fitness',football:'fitness',
    karaoke:'entertainment',cinema:'entertainment',movie:'entertainment',concert:'entertainment',bowling:'entertainment',lottery:'entertainment',
    rent:'rent',apartment:'rent',
    electricity:'utilities',water:'utilities',trash:'utilities',garbage:'utilities',
    repair:'repair',mechanic:'repair',
    school:'education',university:'education',tuition:'education',course:'education',
  };

  // ── Category detection ─────────────────────────────────────
  const detectCategory = (line) => {
    // Exact regex match (fast, high confidence)
    for (const [pattern, cat, conf] of CAT_RULES) {
      if (pattern.test(line)) return { category: cat, confidence: conf };
    }
    // Fuzzy fallback — Latin words only
    const words = line.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(w => w.length >= 3);
    for (const word of words) {
      if (word.length <= 5) {
        // Exact match only for short words (too many near-neighbors for fuzzy)
        if (FUZZY_WORDS[word]) return { category: FUZZY_WORDS[word], confidence: 0.65 };
      } else {
        // Fuzzy match (distance 1) for longer words
        for (const [target, cat] of Object.entries(FUZZY_WORDS)) {
          if (Math.abs(word.length - target.length) > 1) continue;
          if (levenshtein(word, target) <= 1) return { category: cat, confidence: 0.65 };
        }
      }
    }
    return { category: 'other', confidence: 0.40 };
  };

  // ── Clean description ──────────────────────────────────────
  const cleanDesc = (line, matchText, category) => {
    const d = (line||'')
      .replace(matchText||'', '')
      .replace(/[฿$₭]/g, '')
      .replace(/\b(lak|kip|thb|baht|usd|dollar|ກີບ|ບາດ|บาท)\b/gi, '')
      .replace(/\b(k|m|ພັນ|ແສນ|ລ້ານ|พัน|แสน|ล้าน)\b/gi, '')
      .replace(/\s+/g,' ').trim()
      .replace(/^[-–,.\s]+|[-–,.\s]+$/g,'').trim()
      .slice(0,45);
    return d || category;
  };

  // ── Parse single line ──────────────────────────────────────
  const parseSingle = (line) => {
    const t = (line||'').trim();
    if (!t) return null;
    const amnt = extractAmount(t);
    if (!amnt) return null;
    const { category, confidence: catConf } = detectCategory(t);
    const currency = detectCurrency(t, amnt.val);
    const type = detectType(t, category);
    const description = cleanDesc(t, amnt.matchText, category);
    // Confidence: base + amount quality + category certainty
    let conf = 0.42;
    if (amnt.hasScale) conf += 0.12;
    if (amnt.val > 1000) conf += 0.05;
    if (category !== 'other') conf += Math.min(0.30, (catConf - 0.88) * 2 + 0.20);
    conf = Math.min(0.97, Math.max(0.25, parseFloat(conf.toFixed(2))));
    return { amount: amnt.val, currency, type, category, description, confidence: conf };
  };

  // ── Multi-line handling ────────────────────────────────────
  const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  if (lines.length === 1) return parseSingle(lines[0]);

  const parsed = lines.map(parseSingle).filter(Boolean);
  if (!parsed.length) return null;

  // Dominant currency (most frequent)
  const currCount = {};
  parsed.forEach(p => currCount[p.currency] = (currCount[p.currency]||0) + 1);
  const currency = Object.entries(currCount).sort((a,b) => b[1]-a[1])[0][0];
  const sameC = parsed.filter(p => p.currency === currency);
  const total = sameC.reduce((s,p) => s+p.amount, 0);

  // Dominant category
  const catCount = {};
  sameC.forEach(p => catCount[p.category] = (catCount[p.category]||0)+1);
  const category = Object.entries(catCount).sort((a,b) => b[1]-a[1])[0][0] || 'food';
  const type = sameC.filter(p => p.type==='income').length > sameC.length/2 ? 'income' : 'expense';

  return {
    amount: total,
    currency,
    type,
    category,
    description: sameC.length <= 3
      ? sameC.map(p => p.description).join(', ')
      : `${sameC.slice(0,3).map(p => p.description).join(', ')} +${sameC.length-3}`,
    confidence: 0.92,
    items: sameC.map(p => ({ name: p.description, amount: p.amount })),
  };
};

const parseWithAI=async(text,customCatIds=[],userId=null)=>{
  if(userId){
    try{
      const memory=await dbCheckMemory(userId,text);
      if(memory&&memory.usage_count>=2){
        const local=localParse(text);
        return{amount:local?.amount||0,currency:local?.currency||"LAK",type:memory.type||"expense",
          category:normalizeCategory(memory.category_name,"expense"),
          description:local?.description||text.slice(0,40),confidence:0.95,source:"memory"};
      }
    }catch{}
  }
  const local=localParse(text);
  if(local&&local.confidence>=0.88){
    return{...local,category:normalizeCategory(local.category,local.type),source:"local"};
  }
  try{
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),10000);
    const res=await fetch("https://api.phajot.com/parse",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({text,userId}),signal:controller.signal,
    });
    clearTimeout(timeout);
    const parsed=await res.json();
    if(parsed&&parsed.amount){
      parsed.category=normalizeCategory(parsed.category,parsed.type);
      parsed.source="haiku";
      if(userId){dbSaveMemory(userId,text,parsed.category,parsed.type,parsed.confidence).catch(()=>{});}
      return parsed;
    }
    throw new Error("No amount");
  }catch{
    if(local)return{...local,category:normalizeCategory(local.category,local.type),source:"local_fallback"};
    const numMatch=text.match(/[\d,]+(?:\.\d+)?/);
    const amount=numMatch?parseFloat(numMatch[0].replace(/,/g,"")):0;
    const currency=/THB|baht|บาท/i.test(text)?"THB":/USD|dollar|\$/i.test(text)?"USD":"LAK";
    const type=/income|salary|เงินเดือน|ເງິນເດືອນ/i.test(text)?"income":"expense";
    return{amount,currency,type,category:type==="income"?"salary":"other",description:text.slice(0,40),confidence:0.35,source:"regex"};
  }
};

// ─── I18N ─────────────────────────────────────────────────────
const i18n={
  en:{
    welcome:"Welcome to Phajot",tagline:"ພາຈົດ · Your money, your story",
    slogan:"Where did your money go? Let Phajot tell you.",
    your_name:"Your name",pick_avatar:"Pick your companion",pick_lang:"Choose your language",
    pick_currency:"Your main currency",pick_expense_cats:"Select expense categories",
    pick_income_cats:"Select income categories",next:"Next →",start:"Start tracking! 🐾",
    morning:"Good morning",afternoon:"Good afternoon",evening:"Good evening",
    placeholder:'e.g. "coffee 45000 LAK" or "ເຂົ້າ 50,000" or "กาแฟ 95 บาท"',
    note_placeholder:"Add a note…",parsing:"Reading your transaction…",
    recent:"Recent",today:"Today",yesterday:"Yesterday",total:"total",
    empty:"No transactions yet",empty_sub:"Type anything below to log your first one",
    home:"Home",analytics:"Analytics",budget:"Budget",goals:"Goals",settings:"Settings",
    coming_soon:"Coming in Phase 2",
    confirm_q:"Did you mean?",confirm_yes:"Yes, save it",confirm_edit:"Let me fix it",
    reset:"Reset app",reset_confirm:"This will clear all data. Are you sure?",
    language:"Language",base_currency:"Base Currency",
    add_note:"+ note",edit_note:"edit note",save:"Save",cancel:"Cancel",
    add_category:"Add category",category_name:"Category name",
    expense:"Expense",income:"Income",manage_cats:"Manage Categories",
    preferences:"Preferences",account:"Account",
    logout:"Log out / Switch account",logout_sub:"Login with a different phone number",
    danger_zone:"Danger zone",reset_all:"Reset & clear all data",
    safe_to_spend:"Safe to spend this month",per_day:"Per day",
    over_capacity:"Over capacity by",days_left:"days left",on_track:"on track",
    incl_goals:"incl. for goals",almost_out:"Almost out",
    days:"days",day:"day",level:"Lv.",
    spending_breakdown:"Spending Breakdown",top_expenses:"Top Expenses",
    income_sources:"Income Sources",last_7_days:"Last 7 Days",
    savings_rate:"Savings Rate",net:"Net",
    no_data:"No data for",log_transactions:"Log some transactions to see analytics",
    period_today:"Today",period_week:"Week",period_month:"Month",period_all:"All Time",
    total_spent:"Total Spent",categories:"Categories",tap_set_limit:"Tap to set limit",
    monthly_limit:"Monthly Limit",remove:"Remove",save_budget:"Save Budget ✓",
    spent_this_month:"Spent this month",
    goals_tagline:"Plan · Save · Achieve",
    goal_name:"Goal name",target_amount:"Target amount",
    already_saved:"Already saved",target_month:"Target month",
    no_goals:"No goals yet",no_goals_sub:"Set a savings goal and we'll help you get there.",
    create_first:"Create my first goal",add_savings:"+ Add savings",
    saved_label:"Saved",target_label:"Target",complete:"complete",remaining:"remaining",
    save_per_month:"Save / month",months_left:"Months left",goal_date:"Goal date",
    on_track_for:"On track for",no_deadline:"No deadline set",
    no_deadline_sub:"Tap ✏️ to add a target month",
    ask_ai:"Ask AI",ai_tagline:"Your personal finance advisor",
    ai_greeting:"Hi! 👋 I'm Phajot's AI advisor. Ask me anything about your finances!",
    ask_placeholder:"Ask about your finances…",
    edit_tx:"Edit Transaction",name_label:"Name",amount_label:"Amount",category_label:"Category",
    add_to:"Add to",transactions_count:"transactions",
    wrap_title:"Monthly Wrap",wrap_subtitle:"Your month in a story",
    wrap_generating:"Writing your story…",wrap_error:"Couldn't generate your wrap — try again",
    wrap_partial:"Your story is resting, but here are the numbers",
    wrap_empty:"Nothing logged this month yet — start adding transactions to unlock your wrap!",
    wrap_retry:"Try again",wrap_total_expense:"Total expenses",wrap_total_income:"Total income",
    wrap_top_category:"Top category",wrap_biggest_day:"Biggest day",
    wrap_active_days:"Active days",wrap_vs_last:"Vs last month",wrap_close:"Close",
    statementScan:"Bank statement scan",statementScanSubtitle:"Import transactions from your bank app",
    statementScanProGate:"Upgrade to Pro to scan bank statements",
    statementPickCurrency:"Which currency?",statementPickCurrencyHint:"Pick the currency of the transactions in your screenshots",
    statementUploadTitle:"Upload screenshots",statementUploadHint:"Up to 10 images from BCEL One, LDB, or JDB",
    statementUploadButton:"Choose images",statementScanButton:"Scan transactions",
    statementScanning:"Scanning {n} images...",statementScanningHint:"This may take 10-30 seconds",
    statementReviewTitle:"Review transactions",statementReviewStats:"Found {n} transactions",
    statementReviewDuplicates:"({n} duplicates removed)",statementImportButton:"Import {n} selected",
    statementImporting:"Importing {current} of {total}...",statementSuccess:"Imported {n} transactions!",
    statementCurrencyMismatch:"Bank shows {detected} but you picked {selected}",
    statementCurrencyUseDetected:"Use {detected} (from bank)",statementCurrencyUseSelected:"Use {selected} (as I picked)",
    statementErrorParse:"Couldn't read the screenshots. Try clearer images.",
    statementErrorNetwork:"Network error. Check connection and try again.",
    statementErrorRateLimit:"Too many requests. Wait a minute and retry.",
    statementRetry:"Retry",statementCancel:"Cancel",statementBack:"Back",statementNext:"Next",
    statementMaxImages:"Maximum 10 images",statementNoImages:"Add at least 1 screenshot",
    statementToolsSection:"Tools",
    loadMore:"Load 50 more",filteredTotal:"Total",emptyStateFilter:"No transactions in this view",
    viewAllTx:"View all transactions",searchTx:"Search transactions...",typeBoth:"Both",txScreenTitle:"Transactions",showingCount:"Showing {visible} of {total}",
    duplicate:"Duplicate",alreadyImported:"{n} already imported",allDuplicatesWarning:"All transactions already exist in your records. Check any you want to import anyway.",
    dailySpend:"Daily spend",heatmapLegendLess:"Less",heatmapLegendMore:"More",
    noActivityMonth:"No activity this month",showingDate:"Showing: {date}",showingCategory:"Showing: {category}",clearFilter:"Clear",
    heatmapSummary:"{n} active days · biggest {date} ({biggest}) · avg {avg}/day",
    biggestDays:"Biggest days",viewTransactionsBtn:"View transactions",txCount:"{n} txs",dayPopoverTop:"Top:",
    todayLabel:"Today",recentLabel:"Recent",
    months:["January","February","March","April","May","June","July","August","September","October","November","December"],
  },
  lo:{
    welcome:"ຍິນດີຕ້ອນຮັບ Phajot",tagline:"ພາຈົດ — ຕິດຕາມການເງິນຂອງທ່ານ",
    slogan:"ເງິນເຈົ້າໄປໃສ? ດຽວພາຈົດບອກໃຫ້ຟັງ",
    your_name:"ຊື່ຂອງທ່ານ",pick_avatar:"ເລືອກໂຕລະຄອນ",pick_lang:"ເລືອກພາສາ",
    pick_currency:"ສະກຸນເງິນຫຼັກ",pick_expense_cats:"ເລືອກໝວດລາຍຈ່າຍ",
    pick_income_cats:"ເລືອກໝວດລາຍຮັບ",next:"ຕໍ່ໄປ →",start:"ເລີ່ມເລີຍ! 🐾",
    morning:"ສະບາຍດີຕອນເຊົ້າ",afternoon:"ສະບາຍດີຕອນທ່ຽງ",evening:"ສະບາຍດີຕອນແລງ",
    placeholder:"ເຊັ່ນ: ເຂົ້າປຽກ 50,000 LAK",note_placeholder:"ເພີ່ມໝາຍເຫດ…",
    parsing:"ກຳລັງວິເຄາະ…",
    recent:"ລ່າສຸດ",today:"ມື້ນີ້",yesterday:"ມື້ວານ",total:"ລາຍການ",
    empty:"ຍັງບໍ່ມີລາຍການ",empty_sub:"ພິມດ້ານລຸ່ມເພື່ອບັນທຶກ",
    home:"ຫນ້າຫລັກ",analytics:"ວິເຄາະ",budget:"ງົບ",goals:"ເປົ້າໝາຍ",settings:"ຕັ້ງຄ່າ",
    coming_soon:"ມາໃນ Phase 2",
    confirm_q:"ຖືກຕ້ອງບໍ?",confirm_yes:"ຖືກ, ບັນທຶກ",confirm_edit:"ແກ້ໄຂ",
    reset:"ລ້າງຂໍ້ມູນ",reset_confirm:"ຈະລ້າງທຸກຂໍ້ມູນ. ແນ່ໃຈບໍ?",
    language:"ພາສາ",base_currency:"ສະກຸນເງິນຫຼັກ",
    add_note:"+ ໝາຍເຫດ",edit_note:"ແກ້ໄຂ",save:"ບັນທຶກ",cancel:"ຍົກເລີກ",
    add_category:"ເພີ່ມໝວດ",category_name:"ຊື່ໝວດ",
    expense:"ລາຍຈ່າຍ",income:"ລາຍຮັບ",manage_cats:"ຈັດການໝວດ",
    preferences:"ການຕັ້ງຄ່າ",account:"ບັນຊີ",
    logout:"ອອກຈາກລະບົບ / ປ່ຽນບັນຊີ",logout_sub:"ເຂົ້າສູ່ລະບົບດ້ວຍເບີໂທລະສັບອື່ນ",
    danger_zone:"ໂຊນອັນຕະລາຍ",reset_all:"ລ້າງຂໍ້ມູນທັງໝົດ",
    safe_to_spend:"ໃຊ້ຈ່າຍໄດ້ອີກເດືອນນີ້",per_day:"ຕໍ່ວັນ",
    over_capacity:"ເກີນຂອບເຂດ",days_left:"ວັນທີ່ເຫຼືອ",on_track:"ຢູ່ໃນເສັ້ນທາງ",
    incl_goals:"ລວມເປົ້າໝາຍ",almost_out:"ໃກ້ໝົດແລ້ວ",
    days:"ວັນ",day:"ວັນ",level:"ລະດັບ ",
    spending_breakdown:"ການໃຊ້ຈ່າຍຕາມໝວດ",top_expenses:"ລາຍຈ່າຍສູງສຸດ",
    income_sources:"ແຫຼ່ງລາຍຮັບ",last_7_days:"7 ວັນຜ່ານມາ",
    savings_rate:"ອັດຕາການປະຢັດ",net:"ຍອດສຸດທິ",
    no_data:"ບໍ່ມີຂໍ້ມູນ",log_transactions:"ບັນທຶກລາຍການເພື່ອເບິ່ງການວິເຄາະ",
    period_today:"ມື້ນີ້",period_week:"ອາທິດ",period_month:"ເດືອນ",period_all:"ທັງໝົດ",
    total_spent:"ທັງໝົດທີ່ໃຊ້",categories:"ໝວດໝູ່",tap_set_limit:"ແຕະເພື່ອຕັ້ງຂອບເຂດ",
    monthly_limit:"ຂອບເຂດລາຍເດືອນ",remove:"ລຶບ",save_budget:"ບັນທຶກງົບ ✓",
    spent_this_month:"ໃຊ້ຈ່າຍເດືອນນີ້",
    goals_tagline:"ວາງແຜນ · ປະຢັດ · ສຳເລັດ",
    goal_name:"ຊື່ເປົ້າໝາຍ",target_amount:"ຈຳນວນເງິນເປົ້າໝາຍ",
    already_saved:"ປະຢັດໄດ້ແລ້ວ",target_month:"ເດືອນເປົ້າໝາຍ",
    no_goals:"ຍັງບໍ່ມີເປົ້າໝາຍ",no_goals_sub:"ຕັ້ງເປົ້າໝາຍການປະຢັດ ແລ້ວພວກເຮົາຈະຊ່ວຍທ່ານ",
    create_first:"ສ້າງເປົ້າໝາຍທຳອິດ",add_savings:"+ ເພີ່ມການປະຢັດ",
    saved_label:"ປະຢັດແລ້ວ",target_label:"ເປົ້າໝາຍ",complete:"ສຳເລັດ",remaining:"ທີ່ເຫຼືອ",
    save_per_month:"ປະຢັດ / ເດືອນ",months_left:"ເດືອນທີ່ເຫຼືອ",goal_date:"ວັນທີ່ເປົ້າໝາຍ",
    on_track_for:"ຢູ່ໃນເສັ້ນທາງ",no_deadline:"ຍັງບໍ່ໄດ້ຕັ້ງວັນທີ",
    no_deadline_sub:"ແຕະ ✏️ ເພື່ອເພີ່ມເດືອນເປົ້າໝາຍ",
    ask_ai:"ຖາມ AI",ai_tagline:"ທີ່ປຶກສາການເງິນ AI ຂອງທ່ານ",
    ai_greeting:"ສະບາຍດີ! 👋 ຂ້ອຍແມ່ນທີ່ປຶກສາ AI ຂອງ Phajot. ຖາມຂ້ອຍໄດ້ເລີຍ!",
    ask_placeholder:"ຖາມກ່ຽວກັບການເງິນຂອງທ່ານ…",
    edit_tx:"ແກ້ໄຂລາຍການ",name_label:"ຊື່",amount_label:"ຈຳນວນ",category_label:"ໝວດ",
    add_to:"ເພີ່ມໃສ່",transactions_count:"ລາຍການ",
    wrap_title:"ສະຫຼຸບເດືອນ",wrap_subtitle:"ເດືອນຂອງເຈົ້າໃນເລື່ອງໜຶ່ງ",
    wrap_generating:"ກຳລັງຂຽນເລື່ອງຂອງເຈົ້າ…",wrap_error:"ບໍ່ສາມາດສ້າງສະຫຼຸບໄດ້ — ລອງໃໝ່",
    wrap_partial:"ເລື່ອງຂອງເຈົ້າພັກຜ່ອນຢູ່ ແຕ່ນີ້ຄືຕົວເລກ",
    wrap_empty:"ຍັງບໍ່ມີລາຍການໃນເດືອນນີ້ — ເພີ່ມລາຍການເພື່ອເປີດສະຫຼຸບ!",
    wrap_retry:"ລອງໃໝ່",wrap_total_expense:"ລວມລາຍຈ່າຍ",wrap_total_income:"ລວມລາຍຮັບ",
    wrap_top_category:"ໝວດສູງສຸດ",wrap_biggest_day:"ວັນທີ່ໃຊ້ຈ່າຍຫຼາຍສຸດ",
    wrap_active_days:"ມື້ທີ່ບັນທຶກ",wrap_vs_last:"ທຽບກັບເດືອນກ່ອນ",wrap_close:"ປິດ",
    statementScan:"ສະແກນໃບແຈ້ງຍອດ",statementScanSubtitle:"ນຳເຂົ້າທຸລະກຳຈາກແອັບທະນາຄານ",
    statementScanProGate:"ອັບເກຣດເປັນ Pro ເພື່ອສະແກນໃບແຈ້ງຍອດ",
    statementPickCurrency:"ສະກຸນເງິນຫຍັງ?",statementPickCurrencyHint:"ເລືອກສະກຸນເງິນຂອງທຸລະກຳໃນຮູບພາບ",
    statementUploadTitle:"ອັບໂຫຼດຮູບພາບ",statementUploadHint:"ສູງສຸດ 10 ຮູບຈາກ BCEL One, LDB ຫຼື JDB",
    statementUploadButton:"ເລືອກຮູບ",statementScanButton:"ສະແກນທຸລະກຳ",
    statementScanning:"ກຳລັງສະແກນ {n} ຮູບ...",statementScanningHint:"ອາດໃຊ້ເວລາ 10-30 ວິນາທີ",
    statementReviewTitle:"ກວດສອບທຸລະກຳ",statementReviewStats:"ພົບ {n} ທຸລະກຳ",
    statementReviewDuplicates:"({n} ຊ້ຳກັນຖືກລົບແລ້ວ)",statementImportButton:"ນຳເຂົ້າ {n} ລາຍການ",
    statementImporting:"ກຳລັງນຳເຂົ້າ {current}/{total}...",statementSuccess:"ນຳເຂົ້າ {n} ທຸລະກຳສຳເລັດ!",
    statementCurrencyMismatch:"ທະນາຄານສະແດງ {detected} ແຕ່ເຈົ້າເລືອກ {selected}",
    statementCurrencyUseDetected:"ໃຊ້ {detected} (ຈາກທະນາຄານ)",statementCurrencyUseSelected:"ໃຊ້ {selected} (ຕາມທີ່ເລືອກ)",
    statementErrorParse:"ອ່ານຮູບບໍ່ໄດ້. ລອງຮູບທີ່ຊັດເຈນກວ່າ.",
    statementErrorNetwork:"ມີບັນຫາເຄືອຂ່າຍ. ກວດເບິ່ງການເຊື່ອມຕໍ່.",
    statementErrorRateLimit:"ຄຳຂໍເກີນກຳນົດ. ລໍຖ້າ 1 ນາທີ.",
    statementRetry:"ລອງໃໝ່",statementCancel:"ຍົກເລີກ",statementBack:"ກັບຄືນ",statementNext:"ຕໍ່ໄປ",
    statementMaxImages:"ສູງສຸດ 10 ຮູບ",statementNoImages:"ເພີ່ມຮູບຢ່າງໜ້ອຍ 1 ຮູບ",
    statementToolsSection:"ເຄື່ອງມື",
    loadMore:"ເບິ່ງອີກ 50",filteredTotal:"ລວມ",emptyStateFilter:"ບໍ່ມີທຸລະກຳໃນມຸມມອງນີ້",
    viewAllTx:"ເບິ່ງທຸລະກຳທັງໝົດ",searchTx:"ຄົ້ນຫາທຸລະກຳ...",typeBoth:"ທັງໝົດ",txScreenTitle:"ທຸລະກຳ",showingCount:"ສະແດງ {visible} ຈາກ {total}",
    duplicate:"ຊ້ຳກັນ",alreadyImported:"{n} ນຳເຂົ້າແລ້ວ",allDuplicatesWarning:"ທຸລະກຳທັງໝົດມີຢູ່ແລ້ວ. ເລືອກອັນທີ່ຕ້ອງການນຳເຂົ້າຊ້ຳ.",
    dailySpend:"ຈ່າຍລາຍວັນ",heatmapLegendLess:"ໜ້ອຍ",heatmapLegendMore:"ຫຼາຍ",
    noActivityMonth:"ບໍ່ມີກິດຈະກຳໃນເດືອນນີ້",showingDate:"ສະແດງ: {date}",showingCategory:"ສະແດງ: {category}",clearFilter:"ລ້າງ",
    heatmapSummary:"{n} ວັນມີກິດຈະກຳ · ສູງສຸດ {date} ({biggest}) · ສະເລ່ຍ {avg}/ວັນ",
    biggestDays:"ວັນໃຊ້ຈ່າຍຫຼາຍສຸດ",viewTransactionsBtn:"ເບິ່ງທຸລະກຳ",txCount:"{n} ທຸລະກຳ",dayPopoverTop:"ສູງສຸດ:",
    todayLabel:"ມື້ນີ້",recentLabel:"ລ່າສຸດ",
    months:["ມັງກອນ","ກຸມພາ","ມີນາ","ເມສາ","ພຶດສະພາ","ມິຖຸນາ","ກໍລະກົດ","ສິງຫາ","ກັນຍາ","ຕຸລາ","ພະຈິກ","ທັນວາ"],
  },
  th:{
    welcome:"ยินดีต้อนรับสู่ Phajot",tagline:"Phajot — ติดตามการเงินของคุณ",
    your_name:"ชื่อของคุณ",pick_avatar:"เลือกตัวละคร",pick_lang:"เลือกภาษา",
    pick_currency:"สกุลเงินหลัก",pick_expense_cats:"เลือกหมวดรายจ่าย",
    pick_income_cats:"เลือกหมวดรายรับ",next:"ถัดไป →",start:"เริ่มเลย! 🐾",
    morning:"อรุณสวัสดิ์",afternoon:"สวัสดีตอนบ่าย",evening:"สวัสดีตอนเย็น",
    placeholder:"เช่น กาแฟ 95 บาท",note_placeholder:"เพิ่มหมายเหตุ…",
    parsing:"กำลังวิเคราะห์…",
    recent:"ล่าสุด",today:"วันนี้",yesterday:"เมื่อวาน",total:"รายการ",
    empty:"ยังไม่มีรายการ",empty_sub:"พิมพ์ด้านล่างเพื่อบันทึก",
    home:"หน้าหลัก",analytics:"วิเคราะห์",budget:"งบประมาณ",goals:"เป้าหมาย",settings:"ตั้งค่า",
    coming_soon:"มาใน Phase 2",
    confirm_q:"ถูกต้องไหม?",confirm_yes:"ใช่ บันทึก",confirm_edit:"แก้ไข",
    reset:"ล้างข้อมูล",reset_confirm:"จะลบข้อมูลทั้งหมด ยืนยันไหม?",
    language:"ภาษา",base_currency:"สกุลเงินหลัก",
    add_note:"+ หมายเหตุ",edit_note:"แก้ไข",save:"บันทึก",cancel:"ยกเลิก",
    add_category:"เพิ่มหมวด",category_name:"ชื่อหมวด",
    expense:"รายจ่าย",income:"รายรับ",manage_cats:"จัดการหมวด",
    preferences:"การตั้งค่า",account:"บัญชี",
    logout:"ออกจากระบบ / เปลี่ยนบัญชี",logout_sub:"เข้าสู่ระบบด้วยเบอร์อื่น",
    danger_zone:"โซนอันตราย",reset_all:"ล้างข้อมูลทั้งหมด",
    safe_to_spend:"ใช้ได้อีกเดือนนี้",per_day:"ต่อวัน",
    over_capacity:"เกินขีดจำกัด",days_left:"วันที่เหลือ",on_track:"อยู่ในเส้นทาง",
    incl_goals:"รวมเป้าหมาย",almost_out:"ใกล้หมดแล้ว",
    days:"วัน",day:"วัน",level:"Lv.",
    spending_breakdown:"การใช้จ่ายตามหมวด",top_expenses:"รายจ่ายสูงสุด",
    income_sources:"แหล่งรายได้",last_7_days:"7 วันที่ผ่านมา",
    savings_rate:"อัตราการออม",net:"ยอดสุทธิ",
    no_data:"ไม่มีข้อมูลสำหรับ",log_transactions:"บันทึกรายการเพื่อดูการวิเคราะห์",
    period_today:"วันนี้",period_week:"สัปดาห์",period_month:"เดือน",period_all:"ทั้งหมด",
    total_spent:"ยอดใช้ทั้งหมด",categories:"หมวดหมู่",tap_set_limit:"แตะเพื่อตั้งขีดจำกัด",
    monthly_limit:"ขีดจำกัดรายเดือน",remove:"ลบ",save_budget:"บันทึกงบ ✓",
    spent_this_month:"ใช้จ่ายเดือนนี้",
    goals_tagline:"วางแผน · ออม · สำเร็จ",
    goal_name:"ชื่อเป้าหมาย",target_amount:"จำนวนเงินเป้าหมาย",
    already_saved:"ออมแล้ว",target_month:"เดือนเป้าหมาย",
    no_goals:"ยังไม่มีเป้าหมาย",no_goals_sub:"ตั้งเป้าหมายการออม แล้วเราจะช่วยคุณ",
    create_first:"สร้างเป้าหมายแรก",add_savings:"+ เพิ่มการออม",
    saved_label:"ออมแล้ว",target_label:"เป้าหมาย",complete:"สำเร็จ",remaining:"คงเหลือ",
    save_per_month:"ออม / เดือน",months_left:"เดือนที่เหลือ",goal_date:"วันที่เป้าหมาย",
    on_track_for:"อยู่ในเส้นทางสำหรับ",no_deadline:"ยังไม่ได้ตั้งวันที่",
    no_deadline_sub:"แตะ ✏️ เพื่อเพิ่มเดือนเป้าหมาย",
    ask_ai:"ถาม AI",ai_tagline:"ที่ปรึกษาการเงิน AI ของคุณ",
    ai_greeting:"สวัสดี! 👋 ฉันคือที่ปรึกษา AI ของ Phajot ถามได้เลยนะ!",
    ask_placeholder:"ถามเรื่องการเงินของคุณ…",
    edit_tx:"แก้ไขรายการ",name_label:"ชื่อ",amount_label:"จำนวน",category_label:"หมวด",
    add_to:"เพิ่มใน",transactions_count:"รายการ",
    wrap_title:"สรุปเดือน",wrap_subtitle:"เดือนของคุณในเรื่องเดียว",
    wrap_generating:"กำลังเขียนเรื่องราวของคุณ…",wrap_error:"สร้างสรุปไม่ได้ — ลองอีกครั้ง",
    wrap_partial:"เรื่องราวพักอยู่ แต่นี่คือตัวเลข",
    wrap_empty:"ยังไม่มีรายการเดือนนี้ — เพิ่มรายการเพื่อปลดล็อคสรุป!",
    wrap_retry:"ลองอีกครั้ง",wrap_total_expense:"ค่าใช้จ่ายรวม",wrap_total_income:"รายรับรวม",
    wrap_top_category:"หมวดสูงสุด",wrap_biggest_day:"วันที่ใช้จ่ายมากสุด",
    wrap_active_days:"วันที่บันทึก",wrap_vs_last:"เทียบกับเดือนก่อน",wrap_close:"ปิด",
    dailySpend:"จ่ายรายวัน",heatmapLegendLess:"น้อย",heatmapLegendMore:"มาก",
    noActivityMonth:"ไม่มีกิจกรรมในเดือนนี้",showingDate:"แสดง: {date}",showingCategory:"แสดง: {category}",clearFilter:"ล้าง",
    heatmapSummary:"{n} วันมีกิจกรรม · สูงสุด {date} ({biggest}) · เฉลี่ย {avg}/วัน",
    biggestDays:"วันที่จ่ายมากสุด",viewTransactionsBtn:"ดูรายการ",txCount:"{n} รายการ",dayPopoverTop:"สูงสุด:",
    todayLabel:"วันนี้",recentLabel:"ล่าสุด",
    months:["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"],
  },
};
const t=(lang,key)=>i18n[lang]?.[key]||i18n.en[key]||key;

// ─── UI PRIMITIVES ────────────────────────────────────────────
const AnimalBg=()=>(
  <div aria-hidden="true" style={{
    position:"fixed",inset:0,backgroundImage:"url('/bg-pattern.png')",
    backgroundSize:"420px 420px",backgroundRepeat:"repeat",opacity:0.18,
    mixBlendMode:"multiply",pointerEvents:"none",zIndex:0,
  }}/>
);

const Toast=({msg,onDone})=>{
  useEffect(()=>{const id=setTimeout(onDone,4500);return()=>clearTimeout(id);},[onDone]);
  return(<div style={{position:"fixed",bottom:90,left:"50%",transform:"translateX(-50%)",background:"rgba(30,30,40,0.93)",backdropFilter:"blur(14px)",color:"#fff",borderRadius:18,padding:"12px 22px",fontSize:13,lineHeight:1.5,maxWidth:320,textAlign:"center",zIndex:999,boxShadow:"0 6px 28px rgba(0,0,0,0.22)",animation:"toastIn .3s cubic-bezier(.34,1.56,.64,1)",fontFamily:"'Noto Sans',sans-serif"}}>{msg}</div>);
};

const Flag=({code,size=32})=>{
  const w=size,h=Math.round(size*0.67),r=Math.round(size*0.12);
  const flags={
    USD:(<svg width={w} height={h} viewBox="0 0 60 40">{[0,1,2,3,4,5,6,7,8,9,10,11,12].map(i=><rect key={i} y={i*3.08} width="60" height="3.08" fill={i%2===0?"#B22234":"#fff"}/>)}<rect width="24" height="21.5" fill="#3C3B6E"/>{[[2,2],[6,2],[10,2],[14,2],[18,2],[4,4.5],[8,4.5],[12,4.5],[16,4.5],[2,7],[6,7],[10,7],[14,7],[18,7],[4,9.5],[8,9.5],[12,9.5],[16,9.5],[2,12],[6,12],[10,12],[14,12],[18,12],[4,14.5],[8,14.5],[12,14.5],[16,14.5],[2,17],[6,17],[10,17],[14,17],[18,17]].map(([x,y],i)=><circle key={i} cx={x+1.5} cy={y+1} r="0.9" fill="#fff"/>)}</svg>),
    THB:(<svg width={w} height={h} viewBox="0 0 60 40"><rect width="60" height="40" fill="#A51931"/><rect y="6.67" width="60" height="26.67" fill="#F4F5F8"/><rect y="13.33" width="60" height="13.33" fill="#2D2A4A"/></svg>),
    LAK:(<svg width={w} height={h} viewBox="0 0 60 40"><rect width="60" height="40" fill="#CE1126"/><rect y="10" width="60" height="20" fill="#002868"/><circle cx="30" cy="20" r="6.5" fill="#fff"/></svg>),
  };
  return(<div style={{width:w,height:h,borderRadius:r,overflow:"hidden",flexShrink:0,filter:"drop-shadow(0 1px 3px rgba(0,0,0,0.15))",display:"inline-flex"}}>{flags[code]}</div>);
};

// ═══ LOGO ═════════════════════════════════════════════════════
// Renders the Phajot brand mark (transparent PNG, landscape aspect 823x433).
// 5 resolution tiers — picks the smallest source >= display size for sharpness.
// height: auto preserves natural aspect ratio (don't crop the capybora).
const Logo = ({ size = 64, alt = "Phajot" }) => {
  let src;
  if (size <= 64) src = "/phajot-favicon-64.png";
  else if (size <= 128) src = "/phajot-logo-128.png";
  else if (size <= 256) src = "/phajot-logo-256.png";
  else if (size <= 512) src = "/phajot-logo-512.png";
  else src = "/phajot-logo-1024.png";

  return (
    <img
      src={src}
      alt={alt}
      style={{
        width: size,
        height: "auto",
        maxHeight: size,
        objectFit: "contain",
        display: "block",
      }}
    />
  );
};

// ═══ ONBOARDING ═══════════════════════════════════════════════
function OnboardingScreen({onComplete, onBack}){
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

// ═══ WALLET CARDS ═════════════════════════════════════════════
function WalletCards({transactions}){
  const[expanded,setExpanded]=useState(null);
  const getStats=(cur)=>{
    const now=new Date(),mo=now.getMonth(),yr=now.getFullYear();
    const monthly=transactions.filter(tx=>{const d=new Date(tx.date);return d.getMonth()===mo&&d.getFullYear()===yr&&tx.currency===cur;});
    const allCur=transactions.filter(tx=>tx.currency===cur);
    const allIn=allCur.filter(x=>x.type==="income").reduce((s,x)=>s+x.amount,0);
    const allOut=allCur.filter(x=>x.type==="expense").reduce((s,x)=>s+x.amount,0);
    const moIn=monthly.filter(x=>x.type==="income").reduce((s,x)=>s+x.amount,0);
    const moOut=monthly.filter(x=>x.type==="expense").reduce((s,x)=>s+x.amount,0);
    return{balance:allIn-allOut,income:moIn,expenses:moOut};
  };
  const CircleFlag=({code})=>(
    <div style={{width:16,height:16,borderRadius:"50%",overflow:"hidden",flexShrink:0,display:"inline-flex",border:"0.5px solid rgba(45,45,58,0.15)"}}>
      <svg viewBox="0 0 24 24" width="22" height="22" style={{margin:"-3px"}}>
        {code==="LAK"&&<><rect width="24" height="24" fill="#CE1126"/><rect y="6" width="24" height="12" fill="#002868"/><circle cx="12" cy="12" r="4" fill="#fff"/></>}
        {code==="THB"&&<><rect width="24" height="24" fill="#A51931"/><rect y="4" width="24" height="4" fill="#F4F5F8"/><rect y="8" width="24" height="8" fill="#2D2A4A"/><rect y="16" width="24" height="4" fill="#F4F5F8"/></>}
        {code==="USD"&&<><rect width="24" height="24" fill="#B22234"/><rect y="2" width="24" height="2" fill="#fff"/><rect y="6" width="24" height="2" fill="#fff"/><rect y="10" width="24" height="2" fill="#fff"/><rect y="14" width="24" height="2" fill="#fff"/><rect y="18" width="24" height="2" fill="#fff"/><rect y="22" width="24" height="2" fill="#fff"/><rect width="11" height="13" fill="#3C3B6E"/></>}
      </svg>
    </div>
  );
  return(
    <div style={{padding:"0 16px"}}>
      <div style={{background:T.surface,backdropFilter:"blur(20px)",borderRadius:18,boxShadow:T.shadow,overflow:"hidden"}}>
        <div style={{display:"flex",alignItems:"stretch"}}>
          {["LAK","THB","USD"].map((cur,i)=>{
            const stats=getStats(cur),open=expanded===cur,bal=stats.balance;
            return(
              <div key={cur} onClick={()=>setExpanded(open?null:cur)}
                style={{flex:1,padding:"9px 8px",cursor:"pointer",
                  borderLeft:i>0?"1px solid rgba(45,45,58,0.07)":"none",
                  background:open?"rgba(172,225,175,0.08)":"transparent",
                  transition:"background .15s",textAlign:"center"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:4,marginBottom:3}}>
                  <CircleFlag code={cur}/>
                  <span style={{fontSize:10,fontWeight:700,color:T.muted,letterSpacing:0.3}}>{cur}</span>
                </div>
                <div style={{fontSize:13,fontWeight:800,color:bal<0?"#C0392B":T.dark,fontFamily:"'Noto Sans',sans-serif",letterSpacing:-0.3}}>
                  {bal<0?"−":""}{fmtCompact(Math.abs(bal),cur)}
                </div>
              </div>
            );
          })}
        </div>
        {expanded&&(()=>{
          const stats=getStats(expanded),cfg=CURR[expanded];
          return(
            <div style={{borderTop:"1px solid rgba(45,45,58,0.07)",padding:"10px 14px",animation:"slideDown .2s ease",background:"rgba(172,225,175,0.04)"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <Flag code={expanded} size={16}/>
                  <span style={{fontSize:12,fontWeight:700,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>{cfg.name}</span>
                </div>
                <button onClick={()=>setExpanded(null)} style={{fontSize:14,color:T.muted,background:"none",border:"none",cursor:"pointer"}}>✕</button>
              </div>
              <div style={{display:"flex",gap:8}}>
                <div style={{flex:1,padding:"8px 10px",borderRadius:12,background:"rgba(172,225,175,0.15)"}}>
                  <div style={{fontSize:10,fontWeight:700,color:"#2A7A40",textTransform:"uppercase",letterSpacing:0.8}}>Income</div>
                  <div style={{fontSize:14,fontWeight:800,color:"#1A5A30",marginTop:3,fontFamily:"'Noto Sans',sans-serif"}}>+{fmt(stats.income,expanded)}</div>
                </div>
                <div style={{flex:1,padding:"8px 10px",borderRadius:12,background:"rgba(255,179,167,0.12)"}}>
                  <div style={{fontSize:10,fontWeight:700,color:"#A03020",textTransform:"uppercase",letterSpacing:0.8}}>Expenses</div>
                  <div style={{fontSize:14,fontWeight:800,color:"#C0392B",marginTop:3,fontFamily:"'Noto Sans',sans-serif"}}>−{fmt(stats.expenses,expanded)}</div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// ═══ EDIT TRANSACTION MODAL ───────────────────────────────────
function EditTransactionModal({tx,lang,onSave,onClose,customCategories=[]}){
  const[amount,setAmount]=useState(String(tx.amount));
  const[desc,setDesc]=useState(tx.description||"");
  const[catId,setCatId]=useState(tx.categoryId);
  const[editCurrency,setEditCurrency]=useState(tx.currency||"LAK");
  const[editType,setEditType]=useState(tx.type||"expense");
  const kbOffset=useKeyboardOffset();
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
  const save=()=>{const a=parseFloat(String(amount).replace(/,/g,""));if(!a||a<=0)return;onSave({...tx,amount:a,categoryId:catId,description:desc.trim()||tx.description,currency:editCurrency,type:editType});};
  const pillBtn=(active,label,onClick,color)=>(<button onClick={onClick} style={{flex:1,padding:"8px 0",borderRadius:12,border:"none",cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"'Noto Sans',sans-serif",background:active?(color||"rgba(172,225,175,0.25)"):"rgba(45,45,58,0.06)",color:active?T.dark:T.muted,transition:"all .15s"}}>{label}</button>);
  return(
    <div style={{position:"fixed",inset:0,zIndex:2000,background:"rgba(30,30,40,0.6)",backdropFilter:"blur(4px)",display:"flex",alignItems:"flex-end",justifyContent:"center"}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:"#fff",borderRadius:"28px 28px 0 0",width:"100%",maxWidth:430,animation:"slideUp .3s ease",maxHeight:"88dvh",display:"flex",flexDirection:"column",
        transform:kbOffset>0?`translateY(-${kbOffset}px)`:undefined,transition:"transform .25s ease"}}>
        <div style={{overflowY:"auto",flex:1,minHeight:0,padding:"22px 20px 8px",display:"flex",flexDirection:"column",gap:14,WebkitOverflowScrolling:"touch"}}>
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
        <div style={{padding:"12px 20px",paddingBottom:"calc(env(safe-area-inset-bottom,0px) + 12px)",borderTop:"0.5px solid rgba(45,45,58,0.06)",flexShrink:0,background:"#fff"}}>
          <button onClick={save} style={{width:"100%",padding:"15px",borderRadius:16,border:"none",cursor:"pointer",background:"linear-gradient(145deg,#ACE1AF,#7BC8A4)",color:"#1A4020",fontWeight:800,fontSize:15,fontFamily:"'Noto Sans',sans-serif",boxShadow:"0 4px 16px rgba(172,225,175,0.4)"}}>Save Changes ✓</button>
        </div>
      </div>
    </div>
  );
}

// ═══ CONFIRM MODAL ════════════════════════════════════════════
function ConfirmModal({parsed,lang,onConfirm,onEdit}){
  const[note,setNote]=useState("");
  const cat=findCat(parsed.category||parsed.categoryId);
  const aiDone=parsed._aiDone;
  const aiUpdated=parsed._aiUpdated;
  return(
    <Sheet open={true} onClose={onEdit} showCloseButton={false} footer={
      <div style={{display:"flex",gap:10}}>
        <button onClick={onEdit} style={{flex:1,padding:"14px",borderRadius:16,border:"none",cursor:"pointer",background:"rgba(155,155,173,0.12)",color:T.muted,fontWeight:700,fontSize:14,fontFamily:"'Noto Sans',sans-serif"}}>{t(lang,"confirm_edit")}</button>
        <button onClick={()=>onConfirm({...parsed,note:note.trim()})} style={{flex:2,padding:"14px",borderRadius:16,border:"none",cursor:"pointer",background:"linear-gradient(145deg,#ACE1AF,#7BC8A4)",color:"#1A4020",fontWeight:800,fontSize:14,fontFamily:"'Noto Sans',sans-serif",boxShadow:"0 4px 16px rgba(172,225,175,0.4)"}}>{t(lang,"confirm_yes")}</button>
      </div>
    }>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,paddingTop:20}}>
        <div style={{fontSize:13,color:T.muted,fontWeight:600}}>{t(lang,"confirm_q")}</div>
        {!aiDone&&(
          <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#2A7A40",fontWeight:700,background:"rgba(172,225,175,0.15)",padding:"3px 9px",borderRadius:9999}}>
            <div style={{width:6,height:6,borderRadius:3,background:"#ACE1AF",animation:"pulse 1s infinite"}}/>
            AI checking…
          </div>
        )}
        {aiDone&&aiUpdated&&(
          <div style={{fontSize:11,color:"#2A7A40",fontWeight:700,background:"rgba(172,225,175,0.15)",padding:"3px 9px",borderRadius:9999}}>
            ✦ AI corrected
          </div>
        )}
        {aiDone&&!aiUpdated&&(
          <div style={{fontSize:11,color:T.muted,padding:"3px 9px"}}>✓ AI confirmed</div>
        )}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:14,background:T.bg,borderRadius:20,padding:"14px 16px",marginBottom:14}}>
        <div style={{width:48,height:48,borderRadius:15,fontSize:24,background:parsed.type==="expense"?"rgba(255,179,167,0.25)":"rgba(172,225,175,0.25)",display:"flex",alignItems:"center",justifyContent:"center"}}>{cat.emoji}</div>
        <div style={{flex:1}}>
          <div style={{fontWeight:700,fontSize:15,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>{parsed.description}</div>
          <div style={{fontSize:12,color:T.muted,marginTop:2}}>{catLabel(cat,lang)} · {parsed.currency}</div>
        </div>
        <div style={{fontWeight:800,fontSize:18,fontFamily:"'Noto Sans',sans-serif",color:parsed.type==="expense"?"#C0392B":"#1A5A30"}}>{parsed.type==="expense"?"-":"+"}{fmt(parsed.amount,parsed.currency)}</div>
      </div>
      <input value={note} onChange={e=>setNote(e.target.value)} placeholder={t(lang,"note_placeholder")}
        style={{width:"100%",padding:"11px 14px",borderRadius:14,border:"1.5px solid rgba(45,45,58,0.1)",outline:"none",fontSize:13,fontFamily:"'Noto Sans',sans-serif",color:T.dark,background:"rgba(172,225,175,0.06)",boxSizing:"border-box"}}
        onFocus={e=>e.target.style.borderColor="#ACE1AF"} onBlur={e=>e.target.style.borderColor="rgba(45,45,58,0.1)"}/>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </Sheet>
  );
}

// ═══ QUICK EDIT TOAST ════════════════════════════════════════
function QuickEditToast({tx,lang,onChangeCategory,onDone,customCategories=[]}){
  const cat=findCat(tx.categoryId,customCategories);
  const[visible,setVisible]=useState(true);
  // Auto-dismiss after 2.5s — short enough to not block view
  useEffect(()=>{const timer=setTimeout(()=>{setVisible(false);setTimeout(onDone,250);},2500);return()=>clearTimeout(timer);},[]);
  return(
    <div style={{
      position:"fixed",
      // Sit just above the bottom nav bar (56px) + quick add bar (~58px) + 8px gap
      bottom:"calc(env(safe-area-inset-bottom,0px) + 122px)",
      right:16,
      zIndex:400,
      opacity:visible?1:0,
      transform:visible?"translateY(0)":"translateY(8px)",
      transition:"opacity .25s ease, transform .25s ease",
      pointerEvents:visible?"auto":"none",
    }}>
      <div style={{
        background:"rgba(26,46,26,0.95)",
        backdropFilter:"blur(8px)",
        borderRadius:14,
        padding:"8px 12px 8px 10px",
        display:"flex",alignItems:"center",gap:8,
        boxShadow:"0 4px 16px rgba(0,0,0,0.18)",
        maxWidth:200,
      }}>
        <span style={{fontSize:16,flexShrink:0}}>{cat.emoji}</span>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:11,fontWeight:700,color:"#fff",fontFamily:"'Noto Sans',sans-serif",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
            {lang==="lo"?"ບັນທຶກແລ້ວ":lang==="th"?"บันทึกแล้ว":"Saved"} ✓
          </div>
          <div style={{fontSize:10,color:"rgba(255,255,255,0.55)",marginTop:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{tx.description}</div>
        </div>
        <button onClick={()=>{setVisible(false);onChangeCategory();}}
          style={{padding:"4px 8px",borderRadius:8,border:"1px solid rgba(255,255,255,0.2)",background:"transparent",color:"#ACE1AF",fontSize:10,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",fontFamily:"'Noto Sans',sans-serif",flexShrink:0}}>
          ✏️
        </button>
      </div>
    </div>
  );
}

// ═══ OCR BUTTON + FLOW ═══════════════════════════════════════
function OcrButton({ profile, onAdd, lang, compact=false }) {
  const [status,     setStatus]     = useState("idle"); // idle | picker | scanning | confirm | error
  const [result,     setResult]     = useState(null);
  const [errMsg,     setErrMsg]     = useState("");
  const cameraRef  = useRef(); // capture=environment
  const galleryRef = useRef(); // gallery pick

  const isPro = profile?.isPro || false;
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be picked again
    e.target.value = "";

    setStatus("scanning");
    setResult(null);

    try {
      // Convert to base64
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve(reader.result.split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch("https://api.phajot.com/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64,
          mimeType: file.type || "image/jpeg",
          userId: profile?.userId,
        }),
      });

      const data = await res.json();
      if (data.error || !data.amount) {
        // Friendly error messages by status code
        const s = res.status;
        const msg = s === 503 || s === 500 || /UNAVAILABLE|overloaded/i.test(data.error||"")
          ? (lang==="lo"?"AI ຍັງນອນຢູ່ 😴 ກະລຸນາລອງໃໝ່ອີກຄັ້ງ":lang==="th"?"AI กำลังงีบอยู่ 😴 ลองใหม่อีกครั้งนะคะ":"Gemini is a bit sleepy right now 😴 Please try again in a minute.")
          : s === 429
          ? (lang==="lo"?"ຊ້ຳມື້ນີ້ແລ້ວ! ພັກຜ່ອນໜ້ອຍໜຶ່ງ 🌿":lang==="th"?"วันนี้ใช้เยอะแล้ว! พักสักครู่นะคะ 🌿":"You've used OCR a lot today! Take a short break 🌿")
          : (lang==="lo"?"ອ່ານໃບບິນບໍ່ໄດ້ 😕 ລອງຖ່າຍຮູບໃໝ່":lang==="th"?"อ่านใบเสร็จไม่ได้ 😕 ลองถ่ายใหม่":"Couldn't read this receipt 😕 Try a clearer photo?");
        setErrMsg(msg);
        setStatus("error");
        return;
      }
      setResult(data);
      setStatus("confirm");

    } catch (e) {
      setErrMsg(lang==="lo"?"ເຊື່ອມຕໍ່ບໍ່ໄດ້ 😕 ລອງໃໝ່":lang==="th"?"เชื่อมต่อไม่ได้ 😕 ลองใหม่":"Connection error 😕 Please try again.");
      setStatus("error");
    }
  };

  const confirmAdd = () => {
    if (!result) return;
    const catId = normalizeCategory(result.category || "other", "expense");
    // Store items as JSON in note if OCR extracted line items
    const noteVal = result.items && result.items.length > 0
      ? JSON.stringify({items: result.items, note: "", source: "ocr"})
      : JSON.stringify({items: [], note: "", source: "ocr"});
    onAdd({
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      amount: result.amount,
      currency: result.currency || "LAK",
      type: "expense",
      categoryId: catId,
      description: result.description || "Receipt",
      note: noteVal,
      date: new Date().toISOString().split("T")[0],
      confidence: result.confidence || 0.8,
      createdAt: new Date().toISOString(),
      rawInput: "OCR",
    });
    setStatus("idle");
    setResult(null);
  };

  // Pro gate — show lock if not Pro
  if (!isPro) {
    return (
      <button
        onClick={() => alert(lang === "lo" ? "ຟີເຈີ Pro — ຕິດຕໍ່ເຈົ້າຂອງແອັບ" : lang === "th" ? "ฟีเจอร์ Pro — ติดต่อผู้ดูแลแอป" : "Pro feature — contact the app admin to enable")}
        style={{ width:compact?32:36, height:compact?32:36, borderRadius:compact?10:11, border:"1px dashed rgba(45,45,58,0.2)", cursor:"pointer", background:"rgba(45,45,58,0.04)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:compact?13:16, flexShrink:0 }}>
        🔒
      </button>
    );
  }

  return (
    <>
      {/* Hidden inputs */}
      <input ref={cameraRef}  type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={handleFile}/>
      <input ref={galleryRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleFile}/>

      {/* Trigger button */}
      <button
        onClick={() => {
          if (status === "scanning") return;
          if (isMobile) { setStatus("picker"); }
          else { galleryRef.current?.click(); }
        }}
        style={{ width:compact?32:36, height:compact?32:36, borderRadius:compact?10:11, border:"none", cursor:"pointer", flexShrink:0,
          background: status==="scanning" ? "rgba(172,225,175,0.4)" : "rgba(172,225,175,0.18)",
          display:"flex", alignItems:"center", justifyContent:"center", fontSize:compact?14:18, transition:"all .2s" }}>
        {status === "scanning" ? "⏳" : "📷"}
      </button>

      {/* Mobile picker sheet */}
      {status === "picker" && (
        <div style={{position:"fixed",inset:0,zIndex:3000,background:"rgba(30,30,40,0.5)",backdropFilter:"blur(4px)",display:"flex",alignItems:"flex-end",justifyContent:"center"}}
          onClick={e=>{if(e.target===e.currentTarget)setStatus("idle");}}>
          <div style={{background:"#fff",borderRadius:"24px 24px 0 0",width:"100%",maxWidth:430,padding:"20px 20px",paddingBottom:"calc(env(safe-area-inset-bottom,0px) + 20px)",animation:"slideUp .25s ease"}}>
            <div style={{fontSize:13,fontWeight:700,color:T.muted,textAlign:"center",marginBottom:14}}>
              {lang==="lo"?"ເລືອກຮູບໃບບິນ":lang==="th"?"เลือกรูปใบเสร็จ":"Scan a receipt"}
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>{setStatus("idle");setTimeout(()=>cameraRef.current?.click(),50);}}
                style={{flex:1,padding:"16px 10px",borderRadius:16,border:"1.5px solid rgba(172,225,175,0.4)",cursor:"pointer",background:"rgba(172,225,175,0.08)",display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
                <span style={{fontSize:28}}>📷</span>
                <span style={{fontSize:13,fontWeight:700,color:"#1A4020",fontFamily:"'Noto Sans',sans-serif"}}>
                  {lang==="lo"?"ຖ່າຍຮູບ":lang==="th"?"ถ่ายรูป":"Take photo"}
                </span>
              </button>
              <button onClick={()=>{setStatus("idle");setTimeout(()=>galleryRef.current?.click(),50);}}
                style={{flex:1,padding:"16px 10px",borderRadius:16,border:"1.5px solid rgba(45,45,58,0.1)",cursor:"pointer",background:"rgba(45,45,58,0.04)",display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
                <span style={{fontSize:28}}>🖼️</span>
                <span style={{fontSize:13,fontWeight:700,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>
                  {lang==="lo"?"ເລືອກຈາກຄັງ":lang==="th"?"เลือกจากคลัง":"Choose photo"}
                </span>
              </button>
            </div>
            <button onClick={()=>setStatus("idle")}
              style={{width:"100%",marginTop:10,padding:"12px",borderRadius:14,border:"none",cursor:"pointer",background:"rgba(45,45,58,0.06)",color:T.muted,fontWeight:700,fontSize:14,fontFamily:"'Noto Sans',sans-serif"}}>
              {lang==="lo"?"ຍົກເລີກ":lang==="th"?"ยกเลิก":"Cancel"}
            </button>
          </div>
        </div>
      )}

      {/* Scanning overlay */}
      {status === "scanning" && (
        <div style={{ position:"fixed", inset:0, zIndex:3000, background:"rgba(30,30,40,0.7)", backdropFilter:"blur(4px)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16 }}>
          <div style={{ fontSize:52 }}>📷</div>
          <div style={{ fontSize:16, fontWeight:700, color:"#fff", fontFamily:"'Noto Sans',sans-serif" }}>
            {lang==="lo"?"ກຳລັງອ່ານໃບບິນ…":lang==="th"?"กำลังอ่านใบเสร็จ…":"Reading receipt…"}
          </div>
          <div style={{ fontSize:13, color:"rgba(255,255,255,0.6)" }}>Claude Vision</div>
        </div>
      )}

      {/* Error */}
      {status === "error" && (
        <div style={{ position:"fixed", inset:0, zIndex:3000, background:"rgba(30,30,40,0.6)", backdropFilter:"blur(4px)", display:"flex", alignItems:"flex-end", justifyContent:"center" }}
          onClick={() => setStatus("idle")}>
          <div style={{ background:"#fff", borderRadius:"28px 28px 0 0", padding:"28px 24px 52px", width:"100%", maxWidth:430, animation:"slideUp .3s ease" }}>
            <div style={{ fontSize:40, textAlign:"center", marginBottom:12 }}>😕</div>
            <div style={{ fontWeight:700, fontSize:16, color:T.dark, textAlign:"center", marginBottom:8, fontFamily:"'Noto Sans',sans-serif" }}>
              {lang==="lo"?"ອ່ານໃບບິນບໍ່ໄດ້":lang==="th"?"อ่านใบเสร็จไม่ได้":"Couldn't read receipt"}
            </div>
            <div style={{ fontSize:13, color:T.muted, textAlign:"center", marginBottom:24 }}>{errMsg}</div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => { setStatus(isMobile ? "picker" : "idle"); if (!isMobile) galleryRef.current?.click(); }}
                style={{ flex:1, padding:"14px", borderRadius:16, border:"none", cursor:"pointer", background:"rgba(172,225,175,0.2)", color:"#1A5A30", fontWeight:700, fontSize:14, fontFamily:"'Noto Sans',sans-serif" }}>
                {lang==="lo"?"ລອງໃໝ່":lang==="th"?"ลองใหม่":"Try again"}
              </button>
              <button onClick={() => setStatus("idle")}
                style={{ flex:1, padding:"14px", borderRadius:16, border:"none", cursor:"pointer", background:"rgba(45,45,58,0.06)", color:T.muted, fontWeight:700, fontSize:14, fontFamily:"'Noto Sans',sans-serif" }}>
                {lang==="lo"?"ຍົກເລີກ":lang==="th"?"ยกเลิก":"Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm modal — uses Sheet for pinned footer + scroll fix */}
      {status === "confirm" && result && (
        <Sheet open={true} onClose={() => setStatus("idle")} showCloseButton={false} maxHeight="calc(85dvh - 90px)" footer={
          <div style={{ borderTop:"0.5px solid rgba(45,45,58,0.06)", paddingTop:12 }}>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setStatus("idle")}
                style={{ flex:1, padding:"14px", borderRadius:16, border:"none", cursor:"pointer", background:"rgba(45,45,58,0.06)", color:T.muted, fontWeight:700, fontSize:14, fontFamily:"'Noto Sans',sans-serif" }}>
                {lang==="lo"?"ຍົກເລີກ":lang==="th"?"ยกเลิก":"Cancel"}
              </button>
              <button onClick={confirmAdd}
                style={{ flex:2, padding:"14px", borderRadius:16, border:"none", cursor:"pointer", background:"linear-gradient(145deg,#ACE1AF,#7BC8A4)", color:"#1A4020", fontWeight:800, fontSize:15, fontFamily:"'Noto Sans',sans-serif", boxShadow:"0 4px 16px rgba(172,225,175,0.4)" }}>
                {lang==="lo"?"ບັນທຶກ ✓":lang==="th"?"บันทึก ✓":"Save ✓"}
              </button>
            </div>
          </div>
        }>
          <div style={{ textAlign:"center", marginBottom:16, paddingTop:24 }}>
            <div style={{ fontSize:14, color:T.muted, marginBottom:6, fontWeight:600 }}>
              {lang==="lo"?"📷 ອ່ານໃບບິນໄດ້!":lang==="th"?"📷 อ่านใบเสร็จได้!":"📷 Receipt scanned!"}
            </div>
            <div style={{ display:"inline-block", padding:"2px 10px", borderRadius:8, fontSize:11, fontWeight:700,
              background: result.confidence >= 0.8 ? "rgba(172,225,175,0.2)" : "rgba(255,179,167,0.2)",
              color: result.confidence >= 0.8 ? "#1A5A30" : "#A03020" }}>
              {result.confidence >= 0.8 ? "✓ High confidence" : "⚠ Please verify"}
            </div>
          </div>

          {/* Transaction preview */}
          <div style={{ background:T.bg, borderRadius:20, padding:"16px 18px", marginBottom:16 }}>
            <div style={{ display:"flex", alignItems:"center", gap:14 }}>
              <div style={{ width:52, height:52, borderRadius:16, background:"rgba(255,179,167,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, flexShrink:0 }}>
                {findCat(result.category || "other", profile?.customCategories || []).emoji}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:16, color:T.dark, fontFamily:"'Noto Sans',sans-serif" }}>{result.description}</div>
                <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>
                  {catLabel(findCat(result.category || "other", profile?.customCategories || []), lang)} · {result.currency}
                </div>
              </div>
              <div style={{ fontWeight:800, fontSize:20, color:"#C0392B", fontFamily:"'Noto Sans',sans-serif" }}>
                −{fmt(result.amount, result.currency || "LAK")}
              </div>
            </div>
            {/* Item list if OCR extracted line items */}
            {result.items && result.items.length > 0 && (
              <div style={{ marginTop:12, borderTop:"0.5px solid rgba(45,45,58,0.07)", paddingTop:10 }}>
                <div style={{ fontSize:10, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:0.8, marginBottom:7 }}>
                  {result.items.length} items detected
                </div>
                {result.items.map((item, i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"4px 0", borderBottom: i < result.items.length-1 ? "0.5px solid rgba(45,45,58,0.05)" : "none" }}>
                    <span style={{ fontSize:12, color:T.dark }}>{item.name}</span>
                    <span style={{ fontSize:12, fontWeight:700, color:T.muted }}>{fmt(item.amount, result.currency || "LAK")}</span>
                  </div>
                ))}
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:7, paddingTop:7, borderTop:"0.5px solid rgba(45,45,58,0.1)" }}>
                  <span style={{ fontSize:12, fontWeight:800, color:T.dark }}>Total</span>
                  <span style={{ fontSize:12, fontWeight:800, color:"#C0392B" }}>{fmt(result.amount, result.currency || "LAK")}</span>
                </div>
              </div>
            )}
          </div>
        </Sheet>
      )}
    </>
  );
}

// ═══ QUICK ADD BAR ════════════════════════════════════════════
function QuickAddBar({lang,onAdd,customCategories=[],userId=null,onShowAdvisor=null,profile=null}){
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

// ═══ TRANSACTION LIST ════════════════════════════════════════
function TransactionList({transactions,lang,onUpdateNote,onDeleteTx,onEditCategory,customCategories=[]}){
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

// ═══ CUSTOM CATEGORY MANAGER ══════════════════════════════════
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

// ═══ SETTINGS ════════════════════════════════════════════════
function SettingsScreen({profile,transactions,onUpdateProfile,onReset,pinConfig={owner:null,guest:null},savePinConfig=()=>{},setPinRole=()=>{},setPinSetupMode=()=>{},onShowGuide=()=>{},onShowUpgrade=()=>{},onShowStatementScan=()=>{}}){
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

// ═══ GOAL MODAL (create / edit) ══════════════════════════════
function GoalModal({ goal, profile, onSave, onClose }) {
  const { lang } = profile;
  const kbOffset = useKeyboardOffset();
  const [name,     setName]     = useState(goal?.name || "");
  const [emoji,    setEmoji]    = useState(goal?.emoji || "🎯");
  const [target,   setTarget]   = useState(goal ? String(goal.target_amount) : "");
  const [saved,    setSaved]    = useState(goal ? String(goal.saved_amount || 0) : "0");
  const [currency, setCurrency] = useState(goal?.currency || profile.baseCurrency || "LAK");
  const [deadline, setDeadline] = useState(goal?.deadline || "");
  const [showEmoji, setShowEmoji] = useState(false);
  const isEdit = !!goal;

  const monthsLeft = () => {
    if (!deadline) return null;
    const now = new Date();
    const dl  = new Date(deadline + "-01");
    return Math.max(1, (dl.getFullYear() - now.getFullYear()) * 12 + (dl.getMonth() - now.getMonth()));
  };
  const monthlyNeeded = () => {
    const t = parseFloat(target) || 0;
    const s = parseFloat(saved) || 0;
    const m = monthsLeft();
    if (!m || t <= s) return 0;
    return Math.ceil((t - s) / m);
  };

  const save = () => {
    const t = parseFloat(String(target).replace(/,/g,""));
    const s = parseFloat(String(saved).replace(/,/g,"")) || 0;
    if (!name.trim() || !t || t <= 0) return;
    onSave({ name: name.trim(), emoji, target_amount: t, saved_amount: s, currency, deadline: deadline || null });
  };

  const QUICK = { LAK:[1000000,5000000,10000000,50000000], THB:[1000,5000,10000,50000], USD:[100,500,1000,5000] };
  const sym = CURR[currency].symbol;

  return (
    <div style={{position:"fixed",inset:0,zIndex:2000,background:"rgba(30,30,40,0.6)",backdropFilter:"blur(4px)",display:"flex",alignItems:"flex-end",justifyContent:"center"}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:"#fff",borderRadius:"28px 28px 0 0",width:"100%",maxWidth:430,animation:"slideUp .3s ease",maxHeight:"88dvh",display:"flex",flexDirection:"column",
        transform:kbOffset>0?`translateY(-${kbOffset}px)`:undefined,transition:"transform .25s ease"}}>

        {/* Fixed header */}
        <div style={{padding:"18px 20px 12px",borderBottom:"1px solid rgba(45,45,58,0.07)",flexShrink:0,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontWeight:800,fontSize:17,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>{isEdit?"Edit Goal ✏️":"New Goal 🎯"}</div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:T.muted,padding:"4px 8px"}}>✕</button>
        </div>

        {/* Everything scrollable including the button */}
        <div style={{overflowY:"auto",flex:1,minHeight:0,padding:"16px 20px",WebkitOverflowScrolling:"touch"}}>

          <div style={{fontSize:11,fontWeight:700,color:T.muted,letterSpacing:0.8,textTransform:"uppercase",marginBottom:6}}>Goal name</div>
          <div style={{display:"flex",gap:8,marginBottom:14}}>
            <button onClick={()=>setShowEmoji(!showEmoji)} style={{width:48,height:48,borderRadius:13,border:"1.5px solid rgba(45,45,58,0.12)",background:"rgba(172,225,175,0.08)",fontSize:22,cursor:"pointer",flexShrink:0}}>{emoji}</button>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder='e.g. "Bali Trip", "New Phone"'
              style={{flex:1,padding:"11px 14px",borderRadius:13,border:"1.5px solid rgba(45,45,58,0.12)",outline:"none",fontSize:14,fontFamily:"'Noto Sans',sans-serif",color:T.dark,background:"rgba(172,225,175,0.05)"}}
              onFocus={e=>e.target.style.borderColor="#ACE1AF"} onBlur={e=>e.target.style.borderColor="rgba(45,45,58,0.12)"}/>
          </div>
          {showEmoji&&(
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12,padding:10,borderRadius:14,background:"rgba(45,45,58,0.04)"}}>
              {GOAL_EMOJIS.map(e=><button key={e} onClick={()=>{setEmoji(e);setShowEmoji(false);}} style={{fontSize:20,border:"none",background:emoji===e?"rgba(172,225,175,0.3)":"transparent",cursor:"pointer",borderRadius:8,padding:3,width:34,height:34}}>{e}</button>)}
            </div>
          )}

          <div style={{fontSize:11,fontWeight:700,color:T.muted,letterSpacing:0.8,textTransform:"uppercase",marginBottom:6}}>Currency</div>
          <div style={{display:"flex",gap:8,marginBottom:14}}>
            {["LAK","THB","USD"].map(c=>(
              <button key={c} onClick={()=>setCurrency(c)} style={{flex:1,padding:"8px 0",borderRadius:12,border:"none",cursor:"pointer",background:currency===c?T.celadon:"rgba(45,45,58,0.06)",fontWeight:700,fontSize:13,color:currency===c?"#1A4020":T.muted,display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
                <Flag code={c} size={14}/>{c}
              </button>
            ))}
          </div>

          <div style={{fontSize:11,fontWeight:700,color:T.muted,letterSpacing:0.8,textTransform:"uppercase",marginBottom:6}}>Target amount</div>
          <div style={{display:"flex",alignItems:"center",gap:8,background:"rgba(172,225,175,0.08)",borderRadius:13,padding:"4px 4px 4px 14px",border:"1.5px solid #ACE1AF",marginBottom:8}}>
            <span style={{fontSize:18,fontWeight:800,color:T.dark}}>{sym}</span>
            <input value={target} onChange={e=>setTarget(e.target.value)} onFocus={e=>e.target.select()} type="number" inputMode="decimal" placeholder="0"
              style={{flex:1,border:"none",outline:"none",background:"transparent",fontSize:22,fontWeight:800,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}/>
          </div>
          <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
            {QUICK[currency].map(v=>(
              <button key={v} onClick={()=>setTarget(String(v))} style={{padding:"6px 10px",borderRadius:10,border:"none",cursor:"pointer",background:Number(target)===v?"rgba(172,225,175,0.35)":"rgba(45,45,58,0.06)",fontWeight:700,fontSize:12,color:T.dark,boxShadow:Number(target)===v?"0 0 0 2px #ACE1AF":"none"}}>{fmtCompact(v,currency)}</button>
            ))}
          </div>

          {isEdit&&(<>
            <div style={{fontSize:11,fontWeight:700,color:T.muted,letterSpacing:0.8,textTransform:"uppercase",marginBottom:6}}>Already saved</div>
            <div style={{display:"flex",alignItems:"center",gap:8,background:"rgba(45,45,58,0.04)",borderRadius:13,padding:"4px 4px 4px 14px",border:"1.5px solid rgba(45,45,58,0.1)",marginBottom:14}}>
              <span style={{fontSize:16,fontWeight:800,color:T.muted}}>{sym}</span>
              <input value={saved} onChange={e=>setSaved(e.target.value)} onFocus={e=>e.target.select()} type="number" inputMode="decimal" placeholder="0"
                style={{flex:1,border:"none",outline:"none",background:"transparent",fontSize:18,fontWeight:700,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}/>
            </div>
          </>)}

          <div style={{fontSize:11,fontWeight:700,color:T.muted,letterSpacing:0.8,textTransform:"uppercase",marginBottom:6}}>Target month</div>
          <input type="month" value={deadline} onChange={e=>setDeadline(e.target.value)}
            min={new Date().toISOString().slice(0,7)}
            style={{width:"100%",padding:"11px 14px",borderRadius:13,border:"1.5px solid rgba(45,45,58,0.12)",outline:"none",fontSize:14,fontFamily:"'Noto Sans',sans-serif",color:T.dark,background:"rgba(172,225,175,0.05)",marginBottom:14,boxSizing:"border-box"}}
            onFocus={e=>e.target.style.borderColor="#ACE1AF"} onBlur={e=>e.target.style.borderColor="rgba(45,45,58,0.12)"}/>

          {parseFloat(target) > 0 && deadline && (
            <div style={{background:"rgba(172,225,175,0.12)",borderRadius:14,padding:"10px 14px",marginBottom:14}}>
              <div style={{fontSize:12,color:"#2A7A40",fontWeight:700}}>
                💚 Save {fmt(monthlyNeeded(), currency)}/month for {monthsLeft()} months to hit your goal
              </div>
            </div>
          )}

          <div style={{height:8}}/>
        </div>
        {/* Pinned save button */}
        <div style={{padding:"12px 20px",paddingBottom:"calc(env(safe-area-inset-bottom,0px) + 12px)",borderTop:"0.5px solid rgba(45,45,58,0.06)",flexShrink:0,background:"#fff"}}>
          <button onClick={save} style={{width:"100%",padding:"16px",borderRadius:16,border:"none",cursor:"pointer",background:"linear-gradient(145deg,#ACE1AF,#7BC8A4)",color:"#1A4020",fontWeight:800,fontSize:15,fontFamily:"'Noto Sans',sans-serif",boxShadow:"0 4px 16px rgba(172,225,175,0.4)"}}>
            {isEdit ? "Save Changes ✓" : "Create Goal 🎯"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══ ADD SAVINGS MODAL ════════════════════════════════════════
function AddSavingsModal({ goal, onSave, onClose }) {
  const [amount, setAmount] = useState("");
  const kbOffset = useKeyboardOffset();
  const remaining = Math.max(0, goal.target_amount - goal.saved_amount);
  const QUICK = { LAK:[500000,1000000,2000000], THB:[500,1000,2000], USD:[50,100,200] };
  const save = () => {
    const a = parseFloat(String(amount).replace(/,/g,""));
    if (!a || a <= 0) return;
    onSave(Math.min(a, remaining));
  };
  return (
    <div style={{position:"fixed",inset:0,zIndex:2000,background:"rgba(30,30,40,0.6)",backdropFilter:"blur(4px)",display:"flex",alignItems:"flex-end",justifyContent:"center"}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:"#fff",borderRadius:"28px 28px 0 0",width:"100%",maxWidth:430,animation:"slideUp .3s ease",maxHeight:"80dvh",display:"flex",flexDirection:"column",
        transform:kbOffset>0?`translateY(-${kbOffset}px)`:undefined,transition:"transform .25s ease"}}>
        <div style={{overflowY:"auto",flex:1,minHeight:0,padding:"20px 20px 8px",WebkitOverflowScrolling:"touch"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div>
            <div style={{fontWeight:800,fontSize:17,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>{goal.emoji} Add to {goal.name}</div>
            <div style={{fontSize:12,color:T.muted,marginTop:2}}>{fmt(goal.saved_amount,goal.currency)} saved · {fmt(remaining,goal.currency)} to go</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:T.muted}}>✕</button>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,background:"rgba(172,225,175,0.08)",borderRadius:14,padding:"4px 4px 4px 16px",border:"1.5px solid #ACE1AF",marginBottom:12}}>
          <span style={{fontSize:18,fontWeight:800,color:T.dark}}>{CURR[goal.currency].symbol}</span>
          <input value={amount} onChange={e=>setAmount(e.target.value)} onFocus={e=>e.target.select()} type="number" inputMode="decimal" placeholder="0" autoFocus
            style={{flex:1,border:"none",outline:"none",background:"transparent",fontSize:26,fontWeight:800,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}/>
        </div>
        <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
          {(QUICK[goal.currency]||[]).map(v=>(
            <button key={v} onClick={()=>setAmount(String(Math.min(v,remaining)))} style={{padding:"7px 12px",borderRadius:10,border:"none",cursor:"pointer",background:"rgba(45,45,58,0.06)",fontWeight:700,fontSize:12,color:T.dark}}>{fmtCompact(v,goal.currency)}</button>
          ))}
          <button onClick={()=>setAmount(String(remaining))} style={{padding:"7px 12px",borderRadius:10,border:"none",cursor:"pointer",background:"rgba(172,225,175,0.2)",fontWeight:700,fontSize:12,color:"#1A5A30"}}>All ✓</button>
        </div>
        </div>{/* end scroll */}
        <div style={{padding:"12px 20px",paddingBottom:"calc(env(safe-area-inset-bottom,0px) + 12px)",borderTop:"0.5px solid rgba(45,45,58,0.06)",flexShrink:0,background:"#fff"}}>
          <button onClick={save} style={{width:"100%",padding:"15px",borderRadius:16,border:"none",cursor:"pointer",background:"linear-gradient(145deg,#ACE1AF,#7BC8A4)",color:"#1A4020",fontWeight:800,fontSize:15,fontFamily:"'Noto Sans',sans-serif",boxShadow:"0 4px 16px rgba(172,225,175,0.4)"}}>Add Savings 💚</button>
        </div>
      </div>
    </div>
  );
}

// ═══ GOALS SCREEN ════════════════════════════════════════════
function GoalsScreen({ profile, transactions }) {
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
    await supabase.from("goals").update(data).eq("id", id);
    setGoals(prev => prev.map(g => g.id === id ? { ...g, ...data } : g));
    setEditGoal(null);
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
function SetBudgetModal({ cat, currency, currentLimit, spent, lang, onSave, onClose }) {
  const [amount, setAmount] = useState(currentLimit > 0 ? String(currentLimit) : "");
  const kbOffset = useKeyboardOffset();
  const sym = CURR[currency].symbol;
  const pct = currentLimit > 0 ? Math.min((spent / currentLimit) * 100, 100) : 0;
  const barColor = pct >= 100 ? "#C0392B" : pct >= 80 ? "#d4993a" : "#3da873";
  const save = () => {
    const a = parseFloat(String(amount).replace(/,/g, ""));
    if (!a || a <= 0) return;
    onSave(a);
  };
  const QUICK = {
    LAK: [500000, 1000000, 2000000, 5000000],
    THB: [500, 1000, 2000, 5000],
    USD: [50, 100, 200, 500],
  };
  return (
    <div style={{ position:"fixed", inset:0, zIndex:2000, background:"rgba(30,30,40,0.6)",
      backdropFilter:"blur(4px)", display:"flex", alignItems:"flex-end", justifyContent:"center" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:"#fff", borderRadius:"28px 28px 0 0",
        width:"100%", maxWidth:430, animation:"slideUp .3s ease", maxHeight:"88dvh", display:"flex", flexDirection:"column",
        transform: kbOffset > 0 ? `translateY(-${kbOffset}px)` : undefined, transition:"transform .25s ease" }}>
        {/* Scrollable content */}
        <div style={{overflowY:"auto",flex:1,minHeight:0,padding:"20px 20px 8px",WebkitOverflowScrolling:"touch"}}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:30 }}>{cat.emoji}</span>
            <div>
              <div style={{ fontWeight:800, fontSize:17, color:T.dark, fontFamily:"'Noto Sans',sans-serif" }}>{catLabel(cat, lang)}</div>
              <div style={{ fontSize:12, color:T.muted, marginTop:1 }}>Monthly budget · {currency}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", fontSize:22, color:T.muted }}>✕</button>
        </div>
        {spent > 0 && (
          <div style={{ background:T.bg, borderRadius:16, padding:"14px 16px", marginBottom:20 }}>
            <div style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:0.8, marginBottom:4 }}>Spent this month</div>
            <div style={{ fontSize:22, fontWeight:800, color:"#C0392B", fontFamily:"'Noto Sans',sans-serif" }}>{fmt(spent, currency)}</div>
            {currentLimit > 0 && (<>
              <div style={{ marginTop:10, height:6, background:"rgba(45,45,58,0.08)", borderRadius:99, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${pct}%`, background:barColor, borderRadius:99 }} />
              </div>
              <div style={{ marginTop:5, fontSize:11, color:barColor, fontWeight:700 }}>
                {pct >= 100 ? "⚠️ Over budget" : pct >= 80 ? "⚡ Almost at limit" : `${Math.round(pct)}% of ${fmt(currentLimit, currency)}`}
              </div>
            </>)}
          </div>
        )}
        <div style={{ fontSize:11, fontWeight:700, color:T.muted, letterSpacing:0.8, textTransform:"uppercase", marginBottom:8, fontFamily:"'Noto Sans',sans-serif" }}>Monthly Limit</div>
        <div style={{ display:"flex", alignItems:"center", gap:8, background:"rgba(172,225,175,0.08)",
          borderRadius:14, padding:"4px 4px 4px 16px", border:"1.5px solid #ACE1AF", marginBottom:16 }}>
          <span style={{ fontSize:20, fontWeight:800, color:T.dark }}>{sym}</span>
          <input value={amount} onChange={e => setAmount(e.target.value)}
            onFocus={e => e.target.select()} onKeyDown={e => e.key === "Enter" && save()}
            type="number" inputMode="decimal" placeholder="0" autoFocus
            style={{ flex:1, border:"none", outline:"none", background:"transparent",
              fontSize:26, fontWeight:800, color:T.dark, fontFamily:"'Noto Sans',sans-serif" }} />
        </div>
        <div style={{ display:"flex", gap:8, marginBottom:8, flexWrap:"wrap" }}>
          {QUICK[currency].map(v => (
            <button key={v} onClick={() => setAmount(String(v))} style={{
              padding:"8px 14px", borderRadius:12, border:"none", cursor:"pointer",
              background: Number(amount) === v ? "rgba(172,225,175,0.35)" : "rgba(45,45,58,0.06)",
              fontWeight:700, fontSize:12, color:T.dark, fontFamily:"'Noto Sans',sans-serif",
              boxShadow: Number(amount) === v ? "0 0 0 2px #ACE1AF" : "none",
            }}>{fmtCompact(v, currency)}</button>
          ))}
        </div>
        </div>{/* end scroll */}
        {/* Pinned buttons — always above keyboard */}
        <div style={{padding:"12px 20px", paddingBottom:"calc(env(safe-area-inset-bottom,0px) + 12px)",
          borderTop:"0.5px solid rgba(45,45,58,0.06)", flexShrink:0, background:"#fff"}}>
          <div style={{display:"flex",gap:10}}>
            {currentLimit > 0 && (
              <button onClick={() => onSave(0)} style={{ flex:1, padding:"14px", borderRadius:16,
                border:"none", cursor:"pointer", background:"rgba(255,179,167,0.15)", color:"#C0392B",
                fontWeight:700, fontSize:13, fontFamily:"'Noto Sans',sans-serif" }}>Remove</button>
            )}
            <button onClick={save} style={{ flex:2, padding:"14px", borderRadius:16, border:"none",
              cursor:"pointer", background:"linear-gradient(145deg,#ACE1AF,#7BC8A4)", color:"#1A4020",
              fontWeight:800, fontSize:15, fontFamily:"'Noto Sans',sans-serif",
              boxShadow:"0 4px 16px rgba(172,225,175,0.4)" }}>Save Budget ✓</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══ BUDGET SCREEN ════════════════════════════════════════════
function BudgetScreen({ profile, transactions }) {
  const { lang, baseCurrency, customCategories = [], userId } = profile;
  const [selectedCur, setSelectedCur] = useState(baseCurrency || "LAK");
  const [budgets, setBudgets] = useState({});
  const [editCat, setEditCat] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    supabase.from("budgets").select("*").eq("user_id", userId)
      .then(({ data }) => {
        if (data) {
          const map = {};
          data.forEach(b => { map[`${b.category_id}_${b.currency}`] = Number(b.monthly_limit); });
          setBudgets(map);
        }
        setLoading(false);
      });
  }, [userId]);

  const saveBudget = async (catId, currency, amount) => {
    const key = `${catId}_${currency}`;
    setBudgets(prev => amount > 0
      ? { ...prev, [key]: amount }
      : Object.fromEntries(Object.entries(prev).filter(([k]) => k !== key))
    );
    if (amount > 0) {
      await supabase.from("budgets").upsert({
        user_id: userId, category_id: catId, currency, monthly_limit: amount,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,category_id,currency" });
    } else {
      await supabase.from("budgets").delete().eq("user_id", userId).eq("category_id", catId).eq("currency", currency);
    }
  };

  const now = new Date();
  const monthlyExpenses = transactions.filter(tx => {
    const d = new Date(tx.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      && tx.currency === selectedCur && tx.type === "expense";
  });
  const spentByCat = {};
  monthlyExpenses.forEach(tx => { spentByCat[tx.categoryId] = (spentByCat[tx.categoryId] || 0) + tx.amount; });
  const totalSpent = monthlyExpenses.reduce((s, tx) => s + tx.amount, 0);
  const totalBudget = Object.entries(budgets).filter(([k]) => k.endsWith(`_${selectedCur}`)).reduce((s, [, v]) => s + v, 0);
  const totalPct = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;
  const getColor = (pct) => pct >= 100 ? "#C0392B" : pct >= 80 ? "#d4993a" : "#3da873";
  const getStatus = (pct) => pct >= 100 ? "⚠️ Over budget" : pct >= 80 ? "⚡ Almost there" : "✓ On track";
  const allExpCats = [...DEFAULT_EXPENSE_CATS, ...customCategories.filter(c => c.type === "expense")];
  const monthName = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div style={{ padding:"calc(env(safe-area-inset-top, 8px) + 8px) 16px calc(env(safe-area-inset-bottom,0px) + 80px)", position:"relative", zIndex:1 }}>
      <div style={{ fontWeight:800, fontSize:22, color:T.dark, fontFamily:"'Noto Sans',sans-serif", marginBottom:2 }}>Budget 💰</div>
      <div style={{ fontSize:12, color:T.muted, marginBottom:20 }}>{monthName}</div>
      <div style={{ display:"flex", gap:8, marginBottom:20 }}>
        {["LAK","THB","USD"].map(cur => (
          <button key={cur} onClick={() => setSelectedCur(cur)} style={{
            flex:1, padding:"9px 0", borderRadius:14, border:"none", cursor:"pointer",
            background: selectedCur === cur ? T.celadon : "rgba(45,45,58,0.06)",
            fontWeight:700, fontSize:13, color: selectedCur === cur ? "#1A4020" : T.muted,
            fontFamily:"'Noto Sans',sans-serif", transition:"all .2s",
            display:"flex", alignItems:"center", justifyContent:"center", gap:5,
          }}>
            <Flag code={cur} size={16}/> {cur}
          </button>
        ))}
      </div>
      {totalBudget > 0 && (
        <div style={{ background:T.surface, backdropFilter:"blur(20px)", borderRadius:22,
          padding:"18px 20px", boxShadow:T.shadow, marginBottom:18 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:14 }}>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:0.8 }}>Total Spent</div>
              <div style={{ fontSize:26, fontWeight:800, color:T.dark, fontFamily:"'Noto Sans',sans-serif", marginTop:3 }}>{fmt(totalSpent, selectedCur)}</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:0.8 }}>of</div>
              <div style={{ fontSize:17, fontWeight:700, color:T.dark, fontFamily:"'Noto Sans',sans-serif", marginTop:3 }}>{fmt(totalBudget, selectedCur)}</div>
            </div>
          </div>
          <div style={{ height:10, background:"rgba(45,45,58,0.08)", borderRadius:99, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${totalPct}%`, borderRadius:99,
              background:getColor(totalPct), transition:"width .6s cubic-bezier(.34,1.2,.64,1)" }} />
          </div>
          <div style={{ marginTop:8, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ fontSize:12, color:getColor(totalPct), fontWeight:700 }}>{getStatus(totalPct)}</div>
            <div style={{ fontSize:12, color:T.muted }}>{fmt(Math.max(totalBudget - totalSpent, 0), selectedCur)} left</div>
          </div>
        </div>
      )}
      <div style={{ fontSize:10, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:1.2, marginBottom:10, fontFamily:"'Noto Sans',sans-serif" }}>Categories</div>
      <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:16 }}>
        {allExpCats.map(cat => {
          const key = `${cat.id}_${selectedCur}`;
          const limit = budgets[key] || 0;
          const spent = spentByCat[cat.id] || 0;
          const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
          const color = getColor(pct);
          const hasActivity = spent > 0 || limit > 0;
          return (
            <div key={cat.id} onClick={() => setEditCat(cat)}
              style={{ background:T.surface, backdropFilter:"blur(20px)", borderRadius:18,
                padding:"13px 16px", boxShadow:T.shadow, cursor:"pointer",
                opacity: hasActivity ? 1 : 0.55, transition:"all .15s" }}
              onPointerDown={e => e.currentTarget.style.transform = "scale(0.985)"}
              onPointerUp={e => e.currentTarget.style.transform = "scale(1)"}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:42, height:42, borderRadius:14, flexShrink:0,
                  background: hasActivity ? "rgba(255,179,167,0.2)" : "rgba(45,45,58,0.05)",
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>{cat.emoji}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:14, color:T.dark, fontFamily:"'Noto Sans',sans-serif" }}>{catLabel(cat, lang)}</div>
                  <div style={{ fontSize:11, color:T.muted, marginTop:1 }}>
                    {limit > 0 ? `${fmt(spent, selectedCur)} / ${fmt(limit, selectedCur)}` : spent > 0 ? `${fmt(spent, selectedCur)} spent` : "Tap to set limit"}
                  </div>
                </div>
                <div style={{ flexShrink:0, textAlign:"right" }}>
                  {limit > 0
                    ? <div style={{ fontSize:14, fontWeight:800, color, fontFamily:"'Noto Sans',sans-serif" }}>{Math.round(pct)}%</div>
                    : <div style={{ fontSize:11, color:"#ACE1AF", fontWeight:700 }}>+ Set</div>}
                </div>
              </div>
              {limit > 0 && (
                <div style={{ marginTop:10, height:5, background:"rgba(45,45,58,0.08)", borderRadius:99, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${pct}%`, background:color, borderRadius:99,
                    transition:"width .6s cubic-bezier(.34,1.2,.64,1)" }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {!loading && totalBudget === 0 && (
        <div style={{ textAlign:"center", padding:"8px 0 16px" }}>
          <div style={{ fontSize:13, color:T.muted, lineHeight:1.6 }}>Tap any category above to set a monthly spending limit 👆</div>
        </div>
      )}
      {editCat && (
        <SetBudgetModal cat={editCat} currency={selectedCur}
          currentLimit={budgets[`${editCat.id}_${selectedCur}`] || 0}
          spent={spentByCat[editCat.id] || 0} lang={lang}
          onSave={amount => { saveBudget(editCat.id, selectedCur, amount); setEditCat(null); }}
          onClose={() => setEditCat(null)} />
      )}
    </div>
  );
}

// ═══ ANALYTICS SCREEN ════════════════════════════════════════
function AnalyticsScreen({ profile, transactions, onOpenTransactions = () => {} }) {
  const { lang, baseCurrency, customCategories = [] } = profile;
  const [selectedCur, setSelectedCur] = useState(baseCurrency || "LAK");
  // period: "today" | "week" | "month" | "all"
  const [period, setPeriod] = useState("month");
  const [monthOffset, setMonthOffset] = useState(0);
  const [showWrap, setShowWrap] = useState(false);
  const [popoverDay, setPopoverDay] = useState(null);

  const now = new Date();

  // Find earliest month with data for selected currency
  const earliestTx = transactions
    .filter(tx => tx.currency === selectedCur)
    .map(tx => tx.date)
    .sort()[0];
  const earliestDate = earliestTx ? new Date(earliestTx) : now;
  const earliestOffset = (earliestDate.getFullYear() - now.getFullYear()) * 12 + (earliestDate.getMonth() - now.getMonth());
  const canGoBack = monthOffset > earliestOffset;
  const canGoForward = monthOffset < 0;

  // Check if previous month has data
  const hasPrevData = (offset) => {
    const d = new Date(now.getFullYear(), now.getMonth() + offset - 1, 1);
    return transactions.some(tx => {
      const txDate = new Date(tx.date);
      return tx.currency === selectedCur && txDate.getMonth() === d.getMonth() && txDate.getFullYear() === d.getFullYear();
    });
  };

  // Compute date range based on period
  const getRange = () => {
    if (period === "today") {
      const d = now.toISOString().split("T")[0];
      return { label: "Today", filter: tx => tx.date === d };
    }
    if (period === "week") {
      const start = new Date(now); start.setDate(now.getDate() - now.getDay());
      const startStr = start.toISOString().split("T")[0];
      return { label: "This Week", filter: tx => tx.date >= startStr };
    }
    if (period === "month") {
      const targetDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
      const m = targetDate.getMonth(), y = targetDate.getFullYear();
      const label = targetDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      return { label, filter: tx => { const d = new Date(tx.date); return d.getMonth()===m && d.getFullYear()===y; }, canNav: true, targetDate };
    }
    // all time
    return { label: "All Time", filter: () => true };
  };

  const range = getRange();
  const filteredTxs = transactions.filter(tx => tx.currency === selectedCur && range.filter(tx));

  const income   = filteredTxs.filter(x => x.type==="income").reduce((s,x) => s+x.amount, 0);
  const expenses = filteredTxs.filter(x => x.type==="expense").reduce((s,x) => s+x.amount, 0);
  const net      = income - expenses;
  const savingsRate = income > 0 ? Math.round(((income-expenses)/income)*100) : 0;
  const momDelta = (() => {
    if (period !== "month") return null;
    const prevDate = new Date(now.getFullYear(), now.getMonth() + monthOffset - 1, 1);
    const pm = prevDate.getMonth(), py = prevDate.getFullYear();
    const prevTxs = transactions.filter(tx => {
      const d = new Date(tx.date);
      return tx.currency === selectedCur && d.getMonth() === pm && d.getFullYear() === py;
    });
    const prevExp = prevTxs.filter(x=>x.type==="expense").reduce((s,x)=>s+x.amount,0);
    const prevInc = prevTxs.filter(x=>x.type==="income").reduce((s,x)=>s+x.amount,0);
    if (!prevExp && !prevInc) return null;
    return {
      expense: prevExp > 0 ? Math.round(((expenses-prevExp)/prevExp)*100) : null,
      income:  prevInc > 0 ? Math.round(((income-prevInc)/prevInc)*100) : null,
    };
  })();

  const spentByCat = {};
  filteredTxs.filter(x=>x.type==="expense").forEach(tx => {
    spentByCat[tx.categoryId] = (spentByCat[tx.categoryId]||0) + tx.amount;
  });
  const catBreakdown = Object.entries(spentByCat)
    .map(([id,amount]) => ({ cat: findCat(id, customCategories), amount }))
    .sort((a,b) => b.amount - a.amount);

  const earnedByCat = {};
  filteredTxs.filter(x=>x.type==="income").forEach(tx => {
    earnedByCat[tx.categoryId] = (earnedByCat[tx.categoryId]||0) + tx.amount;
  });
  const incBreakdown = Object.entries(earnedByCat)
    .map(([id,amount]) => ({ cat: findCat(id, customCategories), amount }))
    .sort((a,b) => b.amount - a.amount);

  const DONUT_R = 54, DONUT_C = 2 * Math.PI * DONUT_R;
  const COLORS = ["#ACE1AF","#7BC8A4","#FFAA5E","#C9B8FF","#FFB3A7","#A8C5FF","#FFE27D","#b8e0d4","#f7c5bb","#d4e8ff"];
  let cumulative = 0;
  const donutSlices = catBreakdown.slice(0,8).map((item,i) => {
    const pct = item.amount/(expenses||1);
    const offset = DONUT_C*(1-cumulative);
    const dash = DONUT_C*pct;
    cumulative += pct;
    return { ...item, dash, offset, color: COLORS[i%COLORS.length] };
  });

  const isEmpty = filteredTxs.length === 0;

  const PERIODS = [
    { id:"today", label:t(lang,"period_today") },
    { id:"week",  label:t(lang,"period_week")  },
    { id:"month", label:t(lang,"period_month") },
    { id:"all",   label:t(lang,"period_all")   },
  ];

  return (
    <div style={{ padding:"calc(env(safe-area-inset-top, 8px) + 8px) 16px calc(env(safe-area-inset-bottom,0px) + 80px)", position:"relative", zIndex:1 }}>

      {/* Title */}
      <div style={{ fontWeight:800, fontSize:22, color:T.dark, fontFamily:"'Noto Sans',sans-serif", marginBottom:16 }}>Analytics 📊</div>

      {/* Period filter pills */}
      <div style={{ display:"flex", gap:6, marginBottom:12, background:T.surface, borderRadius:16, padding:4, boxShadow:T.shadow }}>
        {PERIODS.map(p => (
          <button key={p.id} onClick={()=>{ setPeriod(p.id); setMonthOffset(0); }} style={{
            flex:1, padding:"8px 0", borderRadius:12, border:"none", cursor:"pointer",
            background: period===p.id ? T.celadon : "transparent",
            fontWeight:700, fontSize:12, color: period===p.id ? "#1A4020" : T.muted,
            fontFamily:"'Noto Sans',sans-serif", transition:"all .2s",
          }}>{p.label}</button>
        ))}
      </div>

      {/* Month nav — only shown in Monthly view */}
      {period === "month" && (
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <div style={{ fontSize:13, fontWeight:700, color:T.dark, fontFamily:"'Noto Sans',sans-serif" }}>{range.label}</div>
          <div style={{ display:"flex", gap:6 }}>
            {/* Back button — only show if previous month has data */}
            {hasPrevData(monthOffset) && (
              <button onClick={()=>setMonthOffset(o=>o-1)} style={{ width:32,height:32,borderRadius:10,border:"none",cursor:"pointer",background:T.surface,boxShadow:T.shadow,fontSize:15,color:T.dark }}>←</button>
            )}
            {/* Forward button — only show if not at current month */}
            {canGoForward && (
              <button onClick={()=>setMonthOffset(o=>Math.min(0,o+1))} style={{ width:32,height:32,borderRadius:10,border:"none",cursor:"pointer",background:T.surface,boxShadow:T.shadow,fontSize:15,color:T.dark }}>→</button>
            )}
          </div>
        </div>
      )}

      {/* Period label for non-month views */}
      {period !== "month" && (
        <div style={{ fontSize:12, color:T.muted, marginBottom:14 }}>{range.label} · {selectedCur}</div>
      )}

      {/* Currency tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:20 }}>
        {["LAK","THB","USD"].map(cur => (
          <button key={cur} onClick={()=>setSelectedCur(cur)} style={{
            flex:1, padding:"9px 0", borderRadius:14, border:"none", cursor:"pointer",
            background: selectedCur===cur ? T.celadon : "rgba(45,45,58,0.06)",
            fontWeight:700, fontSize:13, color: selectedCur===cur ? "#1A4020" : T.muted,
            fontFamily:"'Noto Sans',sans-serif", transition:"all .2s",
            display:"flex", alignItems:"center", justifyContent:"center", gap:5,
          }}>
            <Flag code={cur} size={16}/> {cur}
          </button>
        ))}
      </div>

      {isEmpty ? (
        <div style={{ textAlign:"center", padding:"60px 24px", display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
          <div style={{ fontSize:52 }}>📊</div>
          <div style={{ fontWeight:700, fontSize:17, color:T.dark, fontFamily:"'Noto Sans',sans-serif" }}>No data for {range.label}</div>
          <div style={{ fontSize:13, color:T.muted }}>Log some {selectedCur} transactions to see analytics</div>
        </div>
      ) : (<>

        {/* Income / Expense / Net cards */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
          <div style={{ background:T.surface, borderRadius:18, padding:"14px 16px", boxShadow:T.shadow }}>
            <div style={{ fontSize:10, fontWeight:700, color:"#2A7A40", textTransform:"uppercase", letterSpacing:0.8 }}>Income</div>
            <div style={{ fontSize:18, fontWeight:800, color:"#1A5A30", fontFamily:"'Noto Sans',sans-serif", marginTop:4 }}>+{fmt(income, selectedCur)}</div>
            <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>{filteredTxs.filter(x=>x.type==="income").length} transactions</div>
            {momDelta?.income != null && (
              <div style={{ marginTop:6, display:"inline-flex", alignItems:"center", gap:3, padding:"2px 8px", borderRadius:9999, fontSize:10, fontWeight:700,
                background: momDelta.income >= 0 ? "rgba(172,225,175,0.2)" : "rgba(255,179,167,0.2)",
                color: momDelta.income >= 0 ? "#1A5A30" : "#C0392B" }}>
                {momDelta.income >= 0 ? "▲" : "▼"} {momDelta.income > 0 ? "+" : ""}{momDelta.income}% vs last mo
              </div>
            )}
          </div>
          <div style={{ background:T.surface, borderRadius:18, padding:"14px 16px", boxShadow:T.shadow }}>
            <div style={{ fontSize:10, fontWeight:700, color:"#A03020", textTransform:"uppercase", letterSpacing:0.8 }}>Expenses</div>
            <div style={{ fontSize:18, fontWeight:800, color:"#C0392B", fontFamily:"'Noto Sans',sans-serif", marginTop:4 }}>−{fmt(expenses, selectedCur)}</div>
            <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>{filteredTxs.filter(x=>x.type==="expense").length} transactions</div>
            {momDelta?.expense != null && (
              <div style={{ marginTop:6, display:"inline-flex", alignItems:"center", gap:3, padding:"2px 8px", borderRadius:9999, fontSize:10, fontWeight:700,
                background: momDelta.expense <= 0 ? "rgba(172,225,175,0.2)" : "rgba(255,179,167,0.2)",
                color: momDelta.expense <= 0 ? "#1A5A30" : "#C0392B" }}>
                {momDelta.expense > 0 ? "▲" : "▼"} {momDelta.expense > 0 ? "+" : ""}{momDelta.expense}% vs last mo
              </div>
            )}
          </div>
        </div>

        {/* Net + savings rate */}
        <div style={{ background:T.surface, borderRadius:18, padding:"14px 18px", boxShadow:T.shadow, marginBottom:20, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:10, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:0.8 }}>Net</div>
            <div style={{ fontSize:22, fontWeight:800, color: net>=0?"#1A5A30":"#C0392B", fontFamily:"'Noto Sans',sans-serif", marginTop:4 }}>
              {net>=0?"+":""}{fmt(net, selectedCur)}
            </div>
          </div>
          {income > 0 && (
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:10, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:0.8 }}>Savings Rate</div>
              <div style={{ fontSize:28, fontWeight:800, fontFamily:"'Noto Sans',sans-serif", marginTop:4,
                color: savingsRate>=20?"#1A5A30":savingsRate>=0?"#d4993a":"#C0392B" }}>
                {savingsRate}%
              </div>
            </div>
          )}
        </div>

        {/* Donut chart */}
        {catBreakdown.length > 0 && (
          <div style={{ background:T.surface, borderRadius:22, padding:"20px 18px", boxShadow:T.shadow, marginBottom:20 }}>
            <div style={{ fontSize:12, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:1, marginBottom:16 }}>Spending Breakdown</div>
            <div style={{ display:"flex", alignItems:"center", gap:20 }}>
              <div style={{ flexShrink:0, position:"relative", width:130, height:130 }}>
                <svg width="130" height="130" viewBox="0 0 130 130">
                  <circle cx="65" cy="65" r={DONUT_R} fill="none" stroke="rgba(45,45,58,0.06)" strokeWidth="18"/>
                  {donutSlices.map((slice,i)=>(
                    <circle key={i} cx="65" cy="65" r={DONUT_R} fill="none"
                      stroke={slice.color} strokeWidth="18"
                      strokeDasharray={`${slice.dash} ${DONUT_C-slice.dash}`}
                      strokeDashoffset={slice.offset}
                      strokeLinecap="round"
                      onClick={() => onOpenTransactions({ categoryId: slice.cat.id })}
                      onMouseEnter={e=>e.target.setAttribute("stroke-width","22")}
                      onMouseLeave={e=>e.target.setAttribute("stroke-width","18")}
                      style={{transform:"rotate(-90deg)",transformOrigin:"65px 65px",cursor:"pointer",transition:"stroke-width .15s"}}/>
                  ))}
                </svg>
                <div style={{ position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center" }}>
                  <div style={{ fontSize:10,color:T.muted,fontWeight:600 }}>Total</div>
                  <div style={{ fontSize:12,fontWeight:800,color:T.dark,fontFamily:"'Noto Sans',sans-serif",textAlign:"center",lineHeight:1.2 }}>{fmtCompact(expenses,selectedCur)}</div>
                </div>
              </div>
              <div style={{ flex:1,display:"flex",flexDirection:"column",gap:8 }}>
                {donutSlices.map((slice,i)=>(
                  <div key={i} onClick={() => onOpenTransactions({ categoryId: slice.cat.id })} style={{ display:"flex",alignItems:"center",gap:8,cursor:"pointer",borderRadius:6,padding:"2px 4px",margin:"-2px -4px",transition:"background .15s" }}
                    onMouseEnter={e=>e.currentTarget.style.background="rgba(172,225,175,0.15)"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <div style={{ width:10,height:10,borderRadius:3,background:slice.color,flexShrink:0 }}/>
                    <div style={{ flex:1,fontSize:12,color:T.dark,fontWeight:600,fontFamily:"'Noto Sans',sans-serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{slice.cat.emoji} {catLabel(slice.cat,lang)}</div>
                    <div style={{ fontSize:11,fontWeight:700,color:T.muted,flexShrink:0 }}>{Math.round((slice.amount/expenses)*100)}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Top expenses bars */}
        {catBreakdown.length > 0 && (
          <div style={{ background:T.surface, borderRadius:22, padding:"20px 18px", boxShadow:T.shadow, marginBottom:20 }}>
            <div style={{ fontSize:12, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:1, marginBottom:16 }}>Top Expenses</div>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {catBreakdown.slice(0,6).map((item,i)=>{
                const pct = (item.amount/(catBreakdown[0]?.amount||1))*100;
                return(
                  <div key={i}>
                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5 }}>
                      <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                        <span style={{ fontSize:18 }}>{item.cat.emoji}</span>
                        <span style={{ fontSize:13,fontWeight:600,color:T.dark,fontFamily:"'Noto Sans',sans-serif" }}>{catLabel(item.cat,lang)}</span>
                      </div>
                      <span style={{ fontSize:13,fontWeight:800,color:"#C0392B",fontFamily:"'Noto Sans',sans-serif" }}>−{fmt(item.amount,selectedCur)}</span>
                    </div>
                    <div style={{ height:6,background:"rgba(45,45,58,0.07)",borderRadius:99,overflow:"hidden" }}>
                      <div style={{ height:"100%",width:`${pct}%`,borderRadius:99,background:i===0?"#C0392B":i===1?"#e8857a":"#FFAA5E",transition:"width .6s ease" }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Income sources */}
        {incBreakdown.length > 0 && (
          <div style={{ background:T.surface, borderRadius:22, padding:"20px 18px", boxShadow:T.shadow, marginBottom:20 }}>
            <div style={{ fontSize:12, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:1, marginBottom:16 }}>Income Sources</div>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {incBreakdown.map((item,i)=>(
                <div key={i} style={{ display:"flex",alignItems:"center",gap:12 }}>
                  <div style={{ width:40,height:40,borderRadius:13,background:"rgba(172,225,175,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0 }}>{item.cat.emoji}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13,fontWeight:600,color:T.dark,fontFamily:"'Noto Sans',sans-serif" }}>{catLabel(item.cat,lang)}</div>
                    <div style={{ height:4,background:"rgba(45,45,58,0.07)",borderRadius:99,marginTop:5,overflow:"hidden" }}>
                      <div style={{ height:"100%",width:`${(item.amount/income)*100}%`,borderRadius:99,background:"#3da873" }}/>
                    </div>
                  </div>
                  <div style={{ fontSize:13,fontWeight:800,color:"#1A5A30",fontFamily:"'Noto Sans',sans-serif",flexShrink:0 }}>+{fmt(item.amount,selectedCur)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Last 7 days bar chart — only in month/all view */}
        {(period === "month" || period === "all") && (()=>{
          const days = Array.from({length:7},(_,i)=>{
            const d = new Date(); d.setDate(d.getDate()-(6-i));
            const dateStr = d.toISOString().split("T")[0];
            const dayTxs = transactions.filter(tx=>tx.date===dateStr&&tx.currency===selectedCur);
            return { label:d.toLocaleDateString("en-US",{weekday:"short"}), date:dateStr, spent:dayTxs.filter(x=>x.type==="expense").reduce((s,x)=>s+x.amount,0), earned:dayTxs.filter(x=>x.type==="income").reduce((s,x)=>s+x.amount,0) };
          });
          const maxDay = Math.max(...days.map(d=>Math.max(d.spent,d.earned)),1);
          const todayStr = now.toISOString().split("T")[0];
          return(
            <div style={{ background:T.surface,borderRadius:22,padding:"20px 18px",boxShadow:T.shadow }}>
              <div style={{ fontSize:12,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:16 }}>Last 7 Days</div>
              <div style={{ display:"flex",gap:6,alignItems:"flex-end",height:80 }}>
                {days.map((day,i)=>(
                  <div key={i} style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4 }}>
                    <div style={{ width:"100%",display:"flex",flexDirection:"column",justifyContent:"flex-end",gap:2,height:60 }}>
                      {day.earned>0&&<div style={{ width:"100%",height:`${(day.earned/maxDay)*60}px`,borderRadius:"4px 4px 0 0",background:"#3da873",minHeight:3 }}/>}
                      {day.spent>0&&<div style={{ width:"100%",height:`${(day.spent/maxDay)*60}px`,borderRadius:"4px 4px 0 0",background:"#e8857a",minHeight:3 }}/>}
                      {day.spent===0&&day.earned===0&&<div style={{ width:"100%",height:3,borderRadius:2,background:"rgba(45,45,58,0.08)" }}/>}
                    </div>
                    <div style={{ fontSize:9,fontWeight:700,color:day.date===todayStr?T.dark:T.muted }}>{day.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:"flex",gap:16,marginTop:12,justifyContent:"center" }}>
                <div style={{ display:"flex",alignItems:"center",gap:5 }}><div style={{ width:10,height:10,borderRadius:3,background:"#3da873" }}/><span style={{ fontSize:11,color:T.muted }}>Income</span></div>
                <div style={{ display:"flex",alignItems:"center",gap:5 }}><div style={{ width:10,height:10,borderRadius:3,background:"#e8857a" }}/><span style={{ fontSize:11,color:T.muted }}>Expenses</span></div>
              </div>
            </div>
          );
        })()}

        {/* Daily spend heatmap + biggest days — only in month view */}
        {period === "month" && (()=>{
          const targetDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
          const yr = targetDate.getFullYear(), mo = targetDate.getMonth();
          const daysInMonth = new Date(yr, mo + 1, 0).getDate();
          const firstDow = new Date(yr, mo, 1).getDay();
          const todayStr = now.toISOString().split("T")[0];
          const spendByDay = {};
          const txCountByDay = {};
          transactions.forEach(tx => {
            if (tx.currency !== selectedCur || tx.type !== "expense") return;
            const d = new Date(tx.date);
            if (d.getMonth() !== mo || d.getFullYear() !== yr) return;
            spendByDay[tx.date] = (spendByDay[tx.date] || 0) + tx.amount;
            txCountByDay[tx.date] = (txCountByDay[tx.date] || 0) + 1;
          });
          const maxSpend = Math.max(...Object.values(spendByDay), 0);
          const activeDays = Object.keys(spendByDay).length;
          const totalSpend = Object.values(spendByDay).reduce((s,v) => s+v, 0);
          const entries = Object.entries(spendByDay).sort((a,b) => b[1] - a[1]);
          const biggestEntry = entries[0];
          const daysElapsed = monthOffset === 0 ? Math.min(now.getDate(), daysInMonth) : daysInMonth;
          const avgPerDay = daysElapsed > 0 ? totalSpend / daysElapsed : 0;
          const aboveAvgThreshold = avgPerDay * 1.5;
          const fmtDate = (ds) => new Date(ds+"T00:00:00").toLocaleDateString(lang==="th"?"th-TH":lang==="lo"?"lo-LA":"en-US",{month:"short",day:"numeric"});
          const getColor = (amt) => {
            if (!amt || amt <= 0) return "rgba(172,225,175,0.08)";
            const r = amt / maxSpend;
            if (r <= 0.25) return "rgba(172,225,175,0.3)";
            if (r <= 0.5) return "rgba(172,225,175,0.5)";
            if (r <= 0.75) return "rgba(172,225,175,0.75)";
            return "#ACE1AF";
          };
          const cells = [];
          for (let i = 0; i < firstDow; i++) cells.push(null);
          for (let d = 1; d <= daysInMonth; d++) {
            const ds = `${yr}-${String(mo+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
            cells.push({ day: d, dateStr: ds, isFuture: ds > todayStr, spend: spendByDay[ds] || 0 });
          }
          const hasAny = activeDays > 0;
          const top5 = entries.slice(0, 5);
          return(<>
            <div style={{ background:T.surface,borderRadius:22,padding:"20px 18px",boxShadow:T.shadow,marginTop:20 }}>
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:hasAny?8:14 }}>
                <div style={{ fontSize:12,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:1 }}>{t(lang,"dailySpend")}</div>
                <div style={{ display:"flex",alignItems:"center",gap:4,fontSize:10,color:T.muted }}>
                  <span>{t(lang,"heatmapLegendLess")}</span>
                  {[0.08,0.3,0.5,0.75,1].map((op,i)=>(
                    <div key={i} style={{ width:10,height:10,borderRadius:2,background:i===4?"#ACE1AF":`rgba(172,225,175,${op})` }}/>
                  ))}
                  <span>{t(lang,"heatmapLegendMore")}</span>
                </div>
              </div>
              {hasAny && (
                <div style={{ fontSize:12,color:T.muted,marginBottom:10,lineHeight:1.5 }}>
                  {t(lang,"heatmapSummary").replace("{n}",activeDays).replace("{date}",fmtDate(biggestEntry[0])).replace("{biggest}",fmtCompact(biggestEntry[1],selectedCur)).replace("{avg}",fmtCompact(avgPerDay,selectedCur))}
                </div>
              )}
              <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:4 }}>
                {["S","M","T","W","T","F","S"].map((dh,i)=>(
                  <div key={i} style={{ textAlign:"center",fontSize:10,fontWeight:700,color:T.muted }}>{dh}</div>
                ))}
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4 }}>
                {cells.map((cell,i) => {
                  if (!cell) return <div key={i}/>;
                  const isToday = cell.dateStr === todayStr;
                  const tappable = !cell.isFuture && cell.spend > 0;
                  const aboveAvg = cell.spend >= aboveAvgThreshold && cell.spend > 0;
                  return(
                    <div key={i}
                      onClick={() => { if (tappable) setPopoverDay(cell.dateStr); }}
                      style={{
                        position:"relative",aspectRatio:"1",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",
                        fontSize:11,fontWeight:600,fontFamily:"'Noto Sans',sans-serif",
                        cursor:tappable?"pointer":"default",
                        background:cell.isFuture?"rgba(45,45,58,0.04)":getColor(cell.spend),
                        color:cell.isFuture?"rgba(45,45,58,0.25)":T.dark,
                        opacity:cell.isFuture?0.3:1,
                        border:isToday?`2px solid ${T.celadon}`:"2px solid transparent",
                        transition:"all .15s",
                      }}>
                      {cell.day}
                      {!cell.isFuture && aboveAvg && <div style={{ position:"absolute",top:3,right:3,width:4,height:4,borderRadius:2,background:"#fff" }}/>}
                    </div>
                  );
                })}
              </div>
              {!hasAny && <div style={{ textAlign:"center",fontSize:12,color:T.muted,marginTop:12 }}>{t(lang,"noActivityMonth")}</div>}
            </div>
            {top5.length > 0 && (
              <div style={{ background:T.surface,borderRadius:22,padding:"20px 18px",boxShadow:T.shadow,marginTop:12 }}>
                <div style={{ fontSize:12,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:14 }}>🔥 {t(lang,"biggestDays")}</div>
                <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                  {top5.map(([date,amount],i) => (
                    <div key={i} onClick={() => onOpenTransactions({ date })}
                      style={{ display:"flex",alignItems:"center",gap:12,cursor:"pointer",padding:"8px 12px",borderRadius:12,background:"rgba(45,45,58,0.03)",transition:"background .15s" }}
                      onMouseEnter={e=>e.currentTarget.style.background="rgba(172,225,175,0.12)"}
                      onMouseLeave={e=>e.currentTarget.style.background="rgba(45,45,58,0.03)"}>
                      <div style={{ width:28,height:28,borderRadius:8,background:i===0?"rgba(192,57,43,0.1)":"rgba(45,45,58,0.06)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:i===0?"#C0392B":T.muted,flexShrink:0 }}>{i+1}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13,fontWeight:700,color:T.dark,fontFamily:"'Noto Sans',sans-serif" }}>{fmtDate(date)}</div>
                        <div style={{ fontSize:11,color:T.muted }}>{t(lang,"txCount").replace("{n}",txCountByDay[date]||0)}</div>
                      </div>
                      <div style={{ fontSize:14,fontWeight:800,color:"#C0392B",fontFamily:"'Noto Sans',sans-serif",flexShrink:0 }}>−{fmtCompact(amount,selectedCur)}</div>
                      <div style={{ fontSize:14,color:T.muted,flexShrink:0 }}>›</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>);
        })()}

        {/* Monthly Wrap card — only in month view */}
        {period === "month" && (
          <div onClick={() => setShowWrap(true)} style={{
            marginTop:20, background:"linear-gradient(135deg, rgba(172,225,175,0.25) 0%, rgba(233,255,219,0.4) 100%)",
            border:"1px solid rgba(172,225,175,0.4)", borderRadius:22, padding:"16px 18px",
            boxShadow:T.shadow, cursor:"pointer", display:"flex", alignItems:"center", gap:14,
          }}>
            <div style={{ width:42, height:42, borderRadius:14, background:"rgba(172,225,175,0.3)",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>📖</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:800, color:T.dark, fontFamily:"'Noto Sans',sans-serif" }}>{t(lang,"wrap_title")}</div>
              <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>{t(lang,"wrap_subtitle")}</div>
            </div>
            <div style={{ fontSize:18, color:T.muted, flexShrink:0 }}>›</div>
          </div>
        )}

      </>)}

      {showWrap && <MonthlyWrapModal open={showWrap} onClose={() => setShowWrap(false)} profile={profile} transactions={transactions} />}

      {popoverDay && (()=>{
        const dayTxs = transactions.filter(tx => tx.date === popoverDay && tx.currency === selectedCur && tx.type === "expense");
        const dayTotal = dayTxs.reduce((s,tx) => s + tx.amount, 0);
        const dayCats = {};
        dayTxs.forEach(tx => {
          const cat = findCat(tx.categoryId, customCategories);
          if (!dayCats[cat.id]) dayCats[cat.id] = { cat, amount: 0 };
          dayCats[cat.id].amount += tx.amount;
        });
        const topCats = Object.values(dayCats).sort((a,b) => b.amount - a.amount).slice(0, 3);
        const formattedDate = new Date(popoverDay+"T00:00:00").toLocaleDateString(lang==="th"?"th-TH":lang==="lo"?"lo-LA":"en-US",{month:"long",day:"numeric",year:"numeric"});
        return(
          <div onClick={() => setPopoverDay(null)} style={{ position:"fixed",inset:0,zIndex:600,background:"rgba(0,0,0,0.4)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center" }}>
            <div onClick={e => e.stopPropagation()} style={{ background:"#fff",borderRadius:20,padding:20,maxWidth:320,width:"calc(100% - 48px)",boxShadow:"0 20px 60px rgba(0,0,0,0.25)" }}>
              <div style={{ fontSize:16,fontWeight:800,color:T.dark,fontFamily:"'Noto Sans',sans-serif",marginBottom:4 }}>{formattedDate}</div>
              <div style={{ fontSize:22,fontWeight:800,color:"#C0392B",fontFamily:"'Noto Sans',sans-serif",marginBottom:4 }}>−{fmt(dayTotal,selectedCur)}</div>
              <div style={{ fontSize:12,color:T.muted,marginBottom:12 }}>{t(lang,"txCount").replace("{n}",dayTxs.length)}</div>
              {topCats.length > 0 && (
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:0.8,marginBottom:6 }}>{t(lang,"dayPopoverTop")}</div>
                  {topCats.map((item,i) => (
                    <div key={i} style={{ display:"flex",alignItems:"center",gap:8,marginBottom:4 }}>
                      <span style={{ fontSize:14 }}>{item.cat.emoji}</span>
                      <span style={{ fontSize:13,fontWeight:600,color:T.dark,flex:1,fontFamily:"'Noto Sans',sans-serif" }}>{catLabel(item.cat,lang)}</span>
                      <span style={{ fontSize:13,fontWeight:700,color:"#C0392B",fontFamily:"'Noto Sans',sans-serif" }}>−{fmtCompact(item.amount,selectedCur)}</span>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => { onOpenTransactions({ date: popoverDay }); setPopoverDay(null); }} style={{ width:"100%",padding:"13px",borderRadius:14,border:"none",background:T.celadon,color:"#1A4020",fontSize:14,fontWeight:800,cursor:"pointer",fontFamily:"'Noto Sans',sans-serif",marginBottom:8 }}>{t(lang,"viewTransactionsBtn")} →</button>
              <button onClick={() => setPopoverDay(null)} style={{ width:"100%",padding:"11px",borderRadius:14,border:"none",background:"rgba(45,45,58,0.06)",color:T.muted,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Noto Sans',sans-serif" }}>{t(lang,"cancel")}</button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ═══ MONTHLY WRAP MODAL ═══════════════════════════════════════
const getMonthName = (month, lang) => {
  const mo = parseInt(month.split("-")[1], 10) - 1;
  return (i18n[lang]?.months || i18n.en.months)[mo];
};

const buildMonthlyWrapPayload = (transactions, month) =>
  transactions
    .filter(tx => tx.date.startsWith(month))
    .map(tx => ({
      d: tx.date,
      t: tx.type === "income" ? "in" : "ex",
      a: Math.round(tx.amount),
      c: tx.currency,
      cat: tx.categoryId || "other",
      n: (tx.description || tx.categoryId || "").slice(0, 40),
    }));

const computePrevMonthExpense = (transactions, month) => {
  const [y, m] = month.split("-").map(Number);
  const pm = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  const exp = {};
  transactions.forEach(tx => {
    if (tx.date.startsWith(pm) && tx.type === "expense")
      exp[tx.currency] = (exp[tx.currency] || 0) + tx.amount;
  });
  return exp;
};

function MonthlyWrapModal({ open, onClose, profile, transactions }) {
  const { lang, userId } = profile;
  const [narrative, setNarrative] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthName = getMonthName(month, lang);

  const generate = async () => {
    setLoading(true);
    setError(null);
    setNarrative(null);
    setStats(null);

    try {
      // Check cache first
      const { data: cached } = await supabase.from("monthly_reports")
        .select("*").eq("user_id", userId).eq("month", month).maybeSingle();

      const langCol = `narrative_${lang}`;
      if (cached && cached[langCol]) {
        setNarrative(cached[langCol]);
        setStats(cached.stats);
        setLoading(false);
        return;
      }

      // Build payload
      const monthTxs = buildMonthlyWrapPayload(transactions, month);
      if (!monthTxs.length) {
        setError("empty");
        setLoading(false);
        return;
      }

      const prevExp = computePrevMonthExpense(transactions, month);

      const res = await fetch("https://api.phajot.com/monthly-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId, month, lang,
          transactions: monthTxs,
          prev_month_expense: Object.keys(prevExp).length ? prevExp : undefined,
        }),
      });
      const data = await res.json();

      if (data.narrative) {
        setNarrative(data.narrative);
        setStats(data.stats);
        // Cache result (upsert handles both insert + update via unique constraint)
        await supabase.from("monthly_reports").upsert({
          user_id: userId, month,
          [langCol]: data.narrative, stats: data.stats,
          generated_at: new Date().toISOString(), generation_model: data.model,
        }, { onConflict: "user_id,month" });
      } else if (data.stats) {
        setStats(data.stats);
        setError("partial");
      } else {
        setError("failed");
      }
    } catch {
      setError("failed");
    }
    setLoading(false);
  };

  useEffect(() => { if (open) generate(); }, [open]);

  const modalTitle = lang === "lo" ? `ສະຫຼຸບ${monthName}` : lang === "th" ? `สรุป${monthName}` : `${monthName} Wrap`;

  const StatCard = ({ label, value, sub }) => (
    <div style={{ background:"rgba(45,45,58,0.04)", borderRadius:16, padding:"12px 14px" }}>
      <div style={{ fontSize:10, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:0.6 }}>{label}</div>
      <div style={{ fontSize:15, fontWeight:800, color:T.dark, fontFamily:"'Noto Sans',sans-serif", marginTop:4 }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>{sub}</div>}
    </div>
  );

  return (
    <Sheet open={open} onClose={onClose} title={`📖 ${modalTitle}`} footer={
      <button onClick={onClose} style={{ width:"100%", padding:14, borderRadius:16, border:"none", cursor:"pointer",
        background:"linear-gradient(145deg,#ACE1AF,#7BC8A4)", color:"#1A4020", fontWeight:800, fontSize:14,
        fontFamily:"'Noto Sans',sans-serif", boxShadow:"0 4px 16px rgba(172,225,175,0.4)" }}>
        {t(lang,"wrap_close")}
      </button>
    }>
      <div style={{ paddingBottom:16 }}>
        {/* Loading */}
        {loading && (
          <div style={{ textAlign:"center", padding:"48px 16px" }}>
            <div style={{ fontSize:14, color:T.muted, fontWeight:600, fontFamily:"'Noto Sans',sans-serif", marginBottom:12 }}>
              {t(lang,"wrap_generating")}
            </div>
            <div style={{ display:"flex", gap:5, justifyContent:"center" }}>
              {[0,1,2].map(i => <div key={i} style={{ width:7, height:7, borderRadius:"50%", background:T.muted, animation:`bounce .9s ease ${i*0.2}s infinite` }}/>)}
            </div>
          </div>
        )}

        {/* Empty month */}
        {error === "empty" && (
          <div style={{ textAlign:"center", padding:"48px 16px" }}>
            <div style={{ fontSize:40, marginBottom:12 }}>📖</div>
            <div style={{ fontSize:14, color:T.muted, fontFamily:"'Noto Sans',sans-serif", lineHeight:1.6 }}>
              {t(lang,"wrap_empty")}
            </div>
          </div>
        )}

        {/* Error with retry */}
        {error === "failed" && (
          <div style={{ textAlign:"center", padding:"48px 16px" }}>
            <div style={{ fontSize:14, color:T.muted, fontFamily:"'Noto Sans',sans-serif", marginBottom:16 }}>
              {t(lang,"wrap_error")}
            </div>
            <button onClick={generate} style={{ padding:"10px 24px", borderRadius:14, border:"none", cursor:"pointer",
              background:T.celadon, fontWeight:700, fontSize:13, color:"#1A4020", fontFamily:"'Noto Sans',sans-serif" }}>
              {t(lang,"wrap_retry")}
            </button>
          </div>
        )}

        {/* Partial success — stats but no narrative */}
        {error === "partial" && (
          <div style={{ fontSize:13, color:T.muted, fontFamily:"'Noto Sans',sans-serif", textAlign:"center",
            padding:"12px 16px", background:"rgba(172,225,175,0.1)", borderRadius:14, marginBottom:16 }}>
            {t(lang,"wrap_partial")}
          </div>
        )}

        {/* Narrative */}
        {narrative && (
          <div style={{ fontSize:14, lineHeight:1.7, color:T.dark, fontFamily:"'Noto Sans',sans-serif",
            padding:"8px 0 20px", fontWeight:400 }}>
            {narrative}
          </div>
        )}

        {/* Stats grid */}
        {stats && !loading && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <StatCard label={t(lang,"wrap_total_expense")}
              value={Object.entries(stats.total_expense).map(([c,a]) => fmtCompact(a,c)).join(", ") || "—"} />
            <StatCard label={t(lang,"wrap_total_income")}
              value={Object.entries(stats.total_income).map(([c,a]) => fmtCompact(a,c)).join(", ") || "—"} />
            {stats.top_category && (
              <StatCard label={t(lang,"wrap_top_category")}
                value={`${stats.top_category.name}`}
                sub={fmt(stats.top_category.amount, stats.top_category.currency)} />
            )}
            {stats.biggest_day && (
              <StatCard label={t(lang,"wrap_biggest_day")}
                value={stats.biggest_day.date.slice(5)}
                sub={fmt(stats.biggest_day.amount, stats.biggest_day.currency)} />
            )}
            <StatCard label={t(lang,"wrap_active_days")}
              value={`${stats.active_days} / ${stats.days_in_month}`} />
            {stats.vs_last_month && Object.keys(stats.vs_last_month).length > 0 && (
              <StatCard label={t(lang,"wrap_vs_last")}
                value={Object.entries(stats.vs_last_month).map(([c,pct]) =>
                  `${pct > 0 ? "+" : ""}${pct}%`
                ).join(", ")}
                sub={Object.keys(stats.vs_last_month).join(", ")} />
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
}

// ═══ STREAK BADGE (home header) ══════════════════════════════
function StreakBadge({ profile, onPress }) {
  const { streakCount = 0, xp = 0, lang = "lo" } = profile;
  const level = getLevel(xp);
  const pct   = getLevelProgress(xp);
  return (
    <button onClick={onPress} style={{
      display:"flex", alignItems:"center", gap:5, padding:"4px 10px 4px 8px",
      borderRadius:20, border:"1px solid rgba(45,45,58,0.08)", cursor:"pointer",
      background:"rgba(172,225,175,0.12)",
    }}>
      <span style={{fontSize:13}}>{streakCount >= 7 ? "🔥" : "📅"}</span>
      <span style={{fontSize:12, fontWeight:700, color:T.dark, fontFamily:"'Noto Sans',sans-serif"}}>
        {streakCount}{lang==="lo"?"ວ":lang==="th"?"ว":"d"}
      </span>
      <span style={{fontSize:10, color:T.muted}}>·</span>
      <span style={{fontSize:11}}>{level.emoji}</span>
      <span style={{fontSize:10, fontWeight:600, color:T.muted}}>Lv.{level.index}</span>
    </button>
  );
}

// ═══ STREAK MODAL (tap badge → full card) ════════════════════
function StreakModal({ profile, onClose }) {
  const kbOffset = useKeyboardOffset();
  const { streakCount = 0, xp = 0, name = "" } = profile;
  const level    = getLevel(xp);
  const nextLevel = getNextLevel(xp);
  const pct      = getLevelProgress(xp);
  const xpToNext = nextLevel ? nextLevel.min - xp : 0;

  const milestones = [
    { days:3,   done: streakCount>=3,   label:"3-day starter" },
    { days:7,   done: streakCount>=7,   label:"7-day habit",   bonus:"+30 XP" },
    { days:14,  done: streakCount>=14,  label:"2-week warrior", bonus:"+60 XP" },
    { days:30,  done: streakCount>=30,  label:"30-day legend",  bonus:"+150 XP" },
    { days:100, done: streakCount>=100, label:"100-day master",  bonus:"+500 XP" },
  ];

  return (
    <div style={{position:"fixed",inset:0,zIndex:3000,background:"rgba(30,30,40,0.6)",
      backdropFilter:"blur(4px)",display:"flex",alignItems:"flex-end",justifyContent:"center"}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:"#fff",borderRadius:"28px 28px 0 0",width:"100%",maxWidth:430,animation:"slideUp .3s ease",maxHeight:"88dvh",display:"flex",flexDirection:"column",
        transform:kbOffset>0?`translateY(-${kbOffset}px)`:undefined,transition:"transform .25s ease"}}>
        <div style={{overflowY:"auto",flex:1,minHeight:0,padding:"24px 24px 24px",WebkitOverflowScrolling:"touch"}}>

        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
          <div style={{fontWeight:800,fontSize:18,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>
            {level.emoji} Your Progress
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:T.muted}}>✕</button>
        </div>

        {/* Level card */}
        <div style={{background:"linear-gradient(145deg,#ACE1AF,#7BC8A4)",borderRadius:20,padding:"20px 20px 18px",marginBottom:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:"rgba(26,64,32,0.7)",textTransform:"uppercase",letterSpacing:0.8}}>Level {level.index}</div>
              <div style={{fontSize:26,fontWeight:800,color:"#1A4020",fontFamily:"'Noto Sans',sans-serif",marginTop:2}}>{level.emoji} {level.label}</div>
              <div style={{fontSize:12,color:"rgba(26,64,32,0.7)",marginTop:2}}>{xp} XP total</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:11,fontWeight:700,color:"rgba(26,64,32,0.7)",textTransform:"uppercase",letterSpacing:0.8}}>Streak</div>
              <div style={{fontSize:36,fontWeight:800,color:"#1A4020",fontFamily:"'Noto Sans',sans-serif",lineHeight:1}}>{streakCount}</div>
              <div style={{fontSize:11,color:"rgba(26,64,32,0.7)"}}>days 🔥</div>
            </div>
          </div>
          {nextLevel ? (<>
            <div style={{height:8,background:"rgba(26,64,32,0.15)",borderRadius:99,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${pct}%`,background:"#1A4020",borderRadius:99,transition:"width .6s ease"}}/>
            </div>
            <div style={{marginTop:6,display:"flex",justifyContent:"space-between",fontSize:11,color:"rgba(26,64,32,0.7)"}}>
              <span>{pct}% to Level {level.index+1}</span>
              <span>{xpToNext} XP needed</span>
            </div>
          </>) : (
            <div style={{fontSize:12,color:"rgba(26,64,32,0.8)",fontWeight:700}}>🏆 Maximum level reached!</div>
          )}
        </div>

        {/* How to earn XP */}
        <div style={{background:T.bg,borderRadius:16,padding:"14px 16px",marginBottom:20}}>
          <div style={{fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:0.8,marginBottom:10}}>Earn XP</div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13}}>
              <span style={{color:T.dark}}>Log any transaction</span>
              <span style={{fontWeight:700,color:"#2A7A40"}}>+10 XP</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13}}>
              <span style={{color:T.dark}}>7-day streak milestone</span>
              <span style={{fontWeight:700,color:"#2A7A40"}}>+30 XP</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13}}>
              <span style={{color:T.dark}}>30-day streak milestone</span>
              <span style={{fontWeight:700,color:"#2A7A40"}}>+150 XP</span>
            </div>
          </div>
        </div>

        {/* Milestones */}
        <div style={{fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:0.8,marginBottom:10}}>Streak milestones</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {milestones.map(m => (
            <div key={m.days} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",
              borderRadius:14,background:m.done?"rgba(172,225,175,0.2)":"rgba(45,45,58,0.04)",
              opacity:m.done?1:0.5}}>
              <div style={{width:32,height:32,borderRadius:10,background:m.done?T.celadon:"rgba(45,45,58,0.08)",
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>
                {m.done?"✓":"🔒"}
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>{m.days} days — {m.label}</div>
                {m.bonus&&<div style={{fontSize:11,color:"#2A7A40",marginTop:1}}>{m.bonus} bonus</div>}
              </div>
            </div>
          ))}
        </div>
        </div>{/* end scroll */}
      </div>
    </div>
  );
}

// ═══ AI ADVISOR MODAL ════════════════════════════════════════
function AiAdvisorModal({ profile, transactions, onClose }) {
  const { lang, baseCurrency, userId } = profile;
  const [messages, setMessages] = useState([
    { role:"assistant", text: lang==="lo"
        ? "ສະບາຍດີ! 👋 ຂ້ອຍແມ່ນທີ່ປຶກສາການເງິນ AI ຂອງ Phajot. ຖາມຂ້ອຍໄດ້ເລີຍ!"
        : lang==="th"
        ? "สวัสดี! 👋 ฉันคือที่ปรึกษาการเงิน AI ของ Phajot ถามได้เลยนะ!"
        : "Hi! 👋 I'm Phajot's AI advisor. Ask me anything about your finances!" }
  ]);
  const [input,    setInput]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [goals,    setGoals]    = useState([]);
  const [budgets,  setBudgets]  = useState([]);
  const bottomRef = useRef();
  const inputRef  = useRef();

  // Load goals + budgets for context
  useEffect(() => {
    if (!userId) return;
    supabase.from("goals").select("*").eq("user_id", userId).eq("is_completed", false)
      .then(({ data }) => { if (data) setGoals(data); });
    supabase.from("budgets").select("*").eq("user_id", userId)
      .then(({ data }) => { if (data) setBudgets(data); });
  }, [userId]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [messages, loading]);

  const QUICK_QUESTIONS = lang === "lo" ? [
    "ຂ້ອຍໃຊ້ຈ່າຍຫຼາຍທີ່ສຸດໃນໝວດໃດ?",
    "ຂ້ອຍຄວນຕັດຄ່າໃຊ້ຈ່າຍໃດ?",
    "ຈະຮອດເປົ້າໝາຍໄວຂຶ້ນໄດ້ແນວໃດ?",
    "ເດືອນນີ້ຂ້ອຍເໝາະສົມໃຊ້ຈ່າຍໄດ້ຈັກ?",
  ] : lang === "th" ? [
    "ฉันใช้จ่ายมากสุดหมวดไหน?",
    "ควรลดค่าใช้จ่ายด้านไหน?",
    "จะถึงเป้าหมายเร็วขึ้นได้ยังไง?",
    "เดือนนี้ใช้ได้อีกเท่าไหร่?",
  ] : [
    "Where am I spending the most?",
    "Which expense should I cut first?",
    "How can I reach my goal faster?",
    "How much can I safely spend this month?",
  ];

  const buildSummary = () => {
    const now = new Date();
    const mo = now.getMonth(), yr = now.getFullYear();
    const sym = c => c==="LAK"?"₭":c==="THB"?"฿":"$";
    const byCur = {};
    transactions.forEach(tx => {
      const d = new Date(tx.date);
      if (d.getMonth()!==mo||d.getFullYear()!==yr) return;
      if (!byCur[tx.currency]) byCur[tx.currency]={inc:0,exp:0,cats:{}};
      if (tx.type==="income") byCur[tx.currency].inc+=tx.amount;
      if (tx.type==="expense"){
        byCur[tx.currency].exp+=tx.amount;
        byCur[tx.currency].cats[tx.categoryId]=(byCur[tx.currency].cats[tx.categoryId]||0)+tx.amount;
      }
    });
    const lines=[];
    lines.push(`=== ${now.toLocaleDateString("en-US",{month:"long",year:"numeric"})} ===`);
    Object.entries(byCur).forEach(([cur,d])=>{
      const s=sym(cur);
      const top=Object.entries(d.cats).sort((a,b)=>b[1]-a[1]).slice(0,5)
        .map(([cat,amt])=>`${cat}:${s}${Math.round(amt).toLocaleString()}`).join(", ");
      lines.push(`${cur}: income ${s}${Math.round(d.inc).toLocaleString()}, expenses ${s}${Math.round(d.exp).toLocaleString()}, net ${s}${Math.round(d.inc-d.exp).toLocaleString()}`);
      if(top) lines.push(`  Top: ${top}`);
    });
    if(!Object.keys(byCur).length) lines.push("No transactions this month yet.");
    lines.push(`\n=== Goals ===`);
    goals.length ? goals.forEach(g=>{
      const s=sym(g.currency);
      const pct=Math.round((g.saved_amount/g.target_amount)*100);
      const mLeft=g.deadline?Math.max(1,Math.round((new Date(g.deadline)-now)/2628000000)):null;
      lines.push(`"${g.name}": target ${s}${Math.round(g.target_amount).toLocaleString()}, saved ${s}${Math.round(g.saved_amount).toLocaleString()} (${pct}%)${mLeft?`, ${mLeft} months left`:""}`);
    }) : lines.push("No goals.");
    lines.push(`\n=== Budgets ===`);
    budgets.length ? budgets.forEach(b=>{
      const s=sym(b.currency);
      const spent=byCur[b.currency]?.cats?.[b.category_id]||0;
      lines.push(`${b.category_id} (${b.currency}): ${s}${Math.round(spent).toLocaleString()} of ${s}${Math.round(b.monthly_limit).toLocaleString()} (${Math.round((spent/b.monthly_limit)*100)}%)`);
    }) : lines.push("No budgets.");
    return lines.join("\n");
  };

  const buildRecentTransactions = () => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    cutoff.setHours(0, 0, 0, 0);
    return transactions
      .filter(tx => new Date(tx.date) >= cutoff)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 50)
      .map(tx => ({
        d: tx.date,
        t: tx.type === "income" ? "in" : "ex",
        a: Math.round(tx.amount),
        c: tx.currency,
        cat: tx.categoryId || "other",
        n: (tx.description || tx.categoryId || "").slice(0, 40),
      }));
  };

  const ask = async (question) => {
    if (!question.trim() || loading) return;
    const q = question.trim();
    setInput("");
    setMessages(prev => [...prev, { role:"user", text: q }]);
    setLoading(true);
    try {
      const res = await fetch("https://api.phajot.com/advise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, lang, summary: buildSummary(), recentTransactions: buildRecentTransactions() }),
      });
      const data = await res.json();
      const reply = data.reply || data.error || "Sorry, couldn't get a response. Try again!";
      setMessages(prev => [...prev, { role:"assistant", text: reply }]);
    } catch {
      setMessages(prev => [...prev, { role:"assistant", text: "Connection issue — check your internet and try again." }]);
    }
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  return (
    <div style={{position:"fixed",inset:0,zIndex:3000,background:"rgba(30,30,40,0.6)",backdropFilter:"blur(4px)",display:"flex",alignItems:"flex-end",justifyContent:"center"}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:"#fff",borderRadius:"28px 28px 0 0",width:"100%",maxWidth:430,animation:"slideUp .3s ease",height:"80dvh",display:"flex",flexDirection:"column"}}>

        {/* Header */}
        <div style={{padding:"20px 20px 14px",borderBottom:"1px solid rgba(45,45,58,0.07)",flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:38,height:38,borderRadius:12,background:"linear-gradient(145deg,#ACE1AF,#7BC8A4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🤖</div>
              <div>
                <div style={{fontWeight:800,fontSize:16,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>Ask Phajot AI</div>
                <div style={{fontSize:11,color:"#5aae5f",marginTop:1}}>{t(lang,"ai_tagline")}</div>
              </div>
            </div>
            <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:T.muted}}>✕</button>
          </div>
        </div>

        {/* Messages */}
        <div style={{flex:1,overflowY:"auto",padding:"16px 16px 8px",display:"flex",flexDirection:"column",gap:12,WebkitOverflowScrolling:"touch"}}>
          {messages.map((msg, i) => (
            <div key={i} style={{display:"flex",justifyContent:msg.role==="user"?"flex-end":"flex-start"}}>
              {msg.role==="assistant" && (
                <div style={{width:28,height:28,borderRadius:9,background:"linear-gradient(145deg,#ACE1AF,#7BC8A4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0,marginRight:8,marginTop:2}}>🤖</div>
              )}
              <div style={{
                maxWidth:"78%",padding:"11px 14px",borderRadius:msg.role==="user"?"18px 18px 4px 18px":"18px 18px 18px 4px",
                background:msg.role==="user"?"linear-gradient(145deg,#ACE1AF,#7BC8A4)":"rgba(45,45,58,0.06)",
                color:msg.role==="user"?"#1A4020":T.dark,
                fontSize:14,lineHeight:1.55,fontFamily:"'Noto Sans',sans-serif",fontWeight:msg.role==="user"?600:400,
              }}>
                {msg.text.split(/\*\*(.*?)\*\*/g).map((part, i) =>
                  i % 2 === 1
                    ? <strong key={i} style={{fontWeight:700}}>{part}</strong>
                    : part
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:28,height:28,borderRadius:9,background:"linear-gradient(145deg,#ACE1AF,#7BC8A4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>🤖</div>
              <div style={{padding:"11px 16px",borderRadius:"18px 18px 18px 4px",background:"rgba(45,45,58,0.06)",display:"flex",gap:5,alignItems:"center"}}>
                {[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:T.muted,animation:`bounce .9s ease ${i*0.2}s infinite`}}/>)}
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>

        {/* Quick questions — show only at start */}
        {messages.length <= 1 && (
          <div style={{padding:"0 16px 10px",display:"flex",gap:6,flexWrap:"wrap",flexShrink:0}}>
            {QUICK_QUESTIONS.map((q,i) => (
              <button key={i} onClick={()=>ask(q)} style={{
                padding:"7px 12px",borderRadius:20,border:"1px solid rgba(172,225,175,0.5)",
                background:"rgba(172,225,175,0.1)",color:"#2A7A40",fontSize:12,fontWeight:600,
                cursor:"pointer",fontFamily:"'Noto Sans',sans-serif",textAlign:"left",lineHeight:1.3,
              }}>{q}</button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{padding:"8px 12px",paddingBottom:"calc(env(safe-area-inset-bottom,0px) + 10px)",borderTop:"1px solid rgba(45,45,58,0.07)",flexShrink:0}}>
          <div style={{display:"flex",gap:8,alignItems:"center",background:"rgba(45,45,58,0.05)",borderRadius:16,padding:"6px 6px 6px 14px"}}>
            <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&ask(input)}
              placeholder={t(lang,"ask_placeholder")}
              style={{flex:1,border:"none",outline:"none",background:"transparent",fontSize:14,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}/>
            <button onClick={()=>ask(input)} disabled={loading||!input.trim()} style={{
              width:36,height:36,borderRadius:11,border:"none",cursor:"pointer",flexShrink:0,
              background:input.trim()?"linear-gradient(145deg,#ACE1AF,#7BC8A4)":"rgba(45,45,58,0.1)",
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,
              color:input.trim()?"#1A4020":T.muted,transition:"all .2s",
            }}>↑</button>
          </div>
        </div>
      </div>
      <style>{`@keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}`}</style>
    </div>
  );
}

// ═══ SAFE TO SPEND ═══════════════════════════════════════════
function SafeToSpend({ transactions, profile }) {
  const { baseCurrency = "LAK", userId, lang = "lo" } = profile;
  const [budgets, setBudgets] = useState([]);
  const [goals,   setGoals]   = useState([]);
  useEffect(() => {
    if (!userId) return;
    supabase.from("budgets").select("*").eq("user_id", userId).then(({ data }) => { if (data) setBudgets(data); });
    supabase.from("goals").select("*").eq("user_id", userId).eq("is_completed", false).then(({ data }) => { if (data) setGoals(data); });
  }, [userId]);
  const cur = baseCurrency;
  const now = new Date();
  const mo = now.getMonth(), yr = now.getFullYear();
  const monthTxs = transactions.filter(tx => { const d = new Date(tx.date); return d.getMonth()===mo && d.getFullYear()===yr && tx.currency===cur; });
  const income   = monthTxs.filter(x=>x.type==="income").reduce((s,x)=>s+x.amount,0);
  const expenses = monthTxs.filter(x=>x.type==="expense").reduce((s,x)=>s+x.amount,0);
  const goalSavings = goals.filter(g=>g.currency===cur&&g.deadline).reduce((g2,g)=>{
    const dl = new Date(g.deadline);
    const mLeft = Math.max(1,(dl.getFullYear()-now.getFullYear())*12+(dl.getMonth()-now.getMonth()));
    return g2 + Math.ceil((g.target_amount-g.saved_amount)/mLeft);
  },0);
  const daysInMonth = new Date(yr,mo+1,0).getDate();
  const daysLeft = daysInMonth - now.getDate() + 1;
  const safeTotal = income - expenses - goalSavings;
  const safePerDay = daysLeft > 0 ? Math.floor(safeTotal / daysLeft) : 0;
  if (income === 0) return null;
  const isNegative = safeTotal < 0;
  const isWarning  = !isNegative && safeTotal < income * 0.1;
  const barColor   = isNegative ? "#C0392B" : isWarning ? "#d4993a" : "#3da873";
  const barPct     = Math.min(100, Math.max(0, (safeTotal/income)*100));
  const statusText = isNegative
    ? `⚠️ ${t(lang,"over_capacity")} ${fmtCompact(Math.abs(safeTotal),cur)}`
    : isWarning
    ? `⚡ ${t(lang,"almost_out")} — ${daysLeft} ${t(lang,"days_left")}`
    : `✓ ${daysLeft} ${t(lang,"days_left")} · ${goalSavings>0?`${t(lang,"incl_goals")} ${fmtCompact(goalSavings,cur)}`:t(lang,"on_track")}`;
  return (
    <div style={{padding:"0 16px 8px"}}>
      <div style={{background:T.surface,backdropFilter:"blur(20px)",borderRadius:14,padding:"8px 14px",boxShadow:T.shadow,display:"flex",alignItems:"center",gap:10}}>
        <div style={{fontSize:14}}>{isNegative?"⚠️":isWarning?"⚡":"✓"}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:10,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:0.8}}>{t(lang,"safe_to_spend")}</div>
          <div style={{fontSize:13,fontWeight:800,color:isNegative?"#C0392B":T.dark,fontFamily:"'Noto Sans',sans-serif"}}>
            {isNegative?"−":""}{fmtCompact(Math.abs(safeTotal),cur)}
            <span style={{fontSize:10,fontWeight:600,color:T.muted,marginLeft:6}}>{statusText.replace(/[⚠️⚡✓]/g,"").trim()}</span>
          </div>
        </div>
        <div style={{textAlign:"right",flexShrink:0}}>
          <div style={{fontSize:10,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:0.8}}>{t(lang,"per_day")}</div>
          <div style={{fontSize:13,fontWeight:800,color:barColor,fontFamily:"'Noto Sans',sans-serif"}}>
            {isNegative||safePerDay<=0?"—":fmtCompact(safePerDay,cur)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══ BOTTOM NAV ═══════════════════════════════════════════════
function BottomNav({active,onTab,lang,pinRole="owner"}){
  const allTabs=[{id:"home",icon:"🏠",label:t(lang,"home")},{id:"analytics",icon:"📊",label:t(lang,"analytics")},{id:"budget",icon:"💰",label:t(lang,"budget")},{id:"goals",icon:"🎯",label:t(lang,"goals")},{id:"settings",icon:"⚙️",label:t(lang,"settings")}];
  const tabs = pinRole === "guest" ? allTabs.filter(tab => tab.id !== "settings") : allTabs;
  return(<div style={{position:"sticky",bottom:0,background:"rgba(247,252,245,0.96)",backdropFilter:"blur(24px)",borderTop:"1px solid rgba(45,45,58,0.07)",display:"flex",zIndex:200,paddingBottom:"env(safe-area-inset-bottom,0px)"}}>
    {tabs.map(tab=>(<button key={tab.id} onClick={()=>onTab(tab.id)} style={{flex:1,padding:"10px 0 8px",border:"none",background:"transparent",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,position:"relative"}}>
      {active===tab.id&&<div style={{position:"absolute",top:-1,left:"50%",transform:"translateX(-50%)",width:32,height:2,borderRadius:2,background:T.celadon}}/>}
      <div style={{fontSize:22,filter:active!==tab.id?"grayscale(1) opacity(0.45)":"none"}}>{tab.icon}</div>
      <div style={{fontSize:10,fontWeight:700,color:active===tab.id?T.dark:T.muted,fontFamily:"'Noto Sans',sans-serif"}}>{tab.label}</div>
    </button>))}
  </div>);
}

// ═══ HOME SCREEN ══════════════════════════════════════════════
function HomeScreen({profile,transactions,onAdd,onReset,onUpdateProfile,onUpdateNote,onUpdateCategory,onDeleteTx,streakToast,onStreakToastDone,pinRole="owner",pinConfig={},savePinConfig,setPinRole,setPinSetupMode}){
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
      // Auto-switch to today filter so user sees their new transaction
      setTxFilter("today");
    }
    setToast(null);
    // Scroll list to top so new transaction is visible
    setTimeout(()=>scrollRef.current?.scrollTo({top:scrollRef.current.scrollHeight,behavior:"smooth"}),120);
  };
  const handleEditSave=(updated)=>{
    if(!editTx)return;
    setShowEdit(false);setEditTx(null);
    onUpdateCategory(editTx.id,updated.categoryId,updated.amount,updated.description,updated.currency,updated.type);
    const cat=findCat(updated.categoryId,customCategories);
    if(profile?.userId){dbSaveMemory(profile.userId,updated.description||editTx.description||"",cat.id,updated.type||editTx.type,0.99).catch(()=>{});}
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
          onDeleteBatch={(batchId)=>{setTransactions(prev=>prev.filter(tx=>tx.batchId!==batchId&&tx.batch_id!==batchId));}}/>
      )}
      {showTransactions&&(
        <TransactionsScreen lang={lang} profile={profile} customCategories={customCategories} transactions={transactions}
          onClose={()=>{setShowTransactions(false);setTxScreenFilters(null);}} onEditTx={(tx)=>{setEditTx(tx);setShowEdit(true);}} onDeleteTx={onDeleteTx} onUpdateNote={onUpdateNote} initialFilters={txScreenFilters}/>
      )}
      {streakToast&&<Toast msg={streakToast} onDone={onStreakToastDone}/>}
    </div>
  );
}

// ═══ TRANSACTIONS SCREEN ═════════════════════════════════════
function TransactionsScreen({ lang, profile, customCategories=[], transactions, onClose, onEditTx, onDeleteTx, onUpdateNote, initialFilters=null }) {
  const [txFilter, setTxFilter] = useState("all");
  const [curFilter, setCurFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("both");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(50);
  const [customDate, setCustomDate] = useState(null);
  const [customCategoryId, setCustomCategoryId] = useState(null);
  useEffect(() => { setVisibleCount(50); }, [txFilter, curFilter, typeFilter, searchQuery, customDate, customCategoryId]);
  useEffect(() => {
    if (initialFilters?.date) { setCustomDate(initialFilters.date); setTxFilter("all"); }
    if (initialFilters?.categoryId) { setCustomCategoryId(initialFilters.categoryId); setTxFilter("all"); }
  }, [initialFilters]);

  const tpl = (key, vars={}) => { let s = t(lang, key); Object.entries(vars).forEach(([k,v]) => { s = s.replace(`{${k}}`, v); }); return s; };

  const todayStr = new Date().toISOString().split("T")[0];
  const yestStr = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const weekAgoStr = new Date(Date.now() - 7*86400000).toISOString().split("T")[0];
  const monthPrefix = todayStr.slice(0, 7);

  let filtered = transactions;
  if (txFilter === "today") filtered = filtered.filter(tx => tx.date === todayStr);
  else if (txFilter === "yesterday") filtered = filtered.filter(tx => tx.date === yestStr);
  else if (txFilter === "week") filtered = filtered.filter(tx => tx.date >= weekAgoStr);
  else if (txFilter === "month") filtered = filtered.filter(tx => tx.date >= monthPrefix + "-01");
  if (curFilter !== "all") filtered = filtered.filter(tx => tx.currency === curFilter);
  if (typeFilter !== "both") filtered = filtered.filter(tx => tx.type === typeFilter);
  if (searchQuery.trim()) { const q = searchQuery.toLowerCase().trim(); filtered = filtered.filter(tx => (tx.description || "").toLowerCase().includes(q)); }
  if (customDate) filtered = filtered.filter(tx => tx.date === customDate);
  if (customCategoryId) filtered = filtered.filter(tx => tx.categoryId === customCategoryId);

  const totalFiltered = filtered.length;
  const visible = filtered.slice(0, visibleCount);
  const hasMore = totalFiltered > visibleCount;
  const fIncome = {}, fExpense = {};
  filtered.forEach(tx => { if (tx.type === "income") fIncome[tx.currency] = (fIncome[tx.currency] || 0) + tx.amount; else fExpense[tx.currency] = (fExpense[tx.currency] || 0) + tx.amount; });

  const pill = (active, color) => ({ padding:"6px 12px", borderRadius:9999, border:"none", cursor:"pointer", background: active ? (color || T.celadon) : "transparent", color: active ? "#1A4020" : T.muted, fontWeight: active ? 700 : 500, fontSize:12, fontFamily:"'Noto Sans',sans-serif", transition:"all .2s" });

  return (
    <div style={{ position:"fixed", inset:0, zIndex:500, background:"#F7FCF5", display:"flex", flexDirection:"column" }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, padding:"calc(env(safe-area-inset-top,8px) + 12px) 16px 10px", background:"rgba(247,252,245,0.97)", backdropFilter:"blur(16px)", flexShrink:0 }}>
        <button onClick={onClose} style={{ width:36, height:36, borderRadius:12, border:"none", background:"rgba(45,45,58,0.06)", cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>←</button>
        <div style={{ flex:1, fontWeight:800, fontSize:18, color:T.dark, fontFamily:"'Noto Sans',sans-serif" }}>{t(lang, "txScreenTitle")}</div>
        <div style={{ fontSize:11, color:T.muted }}>{transactions.length} {t(lang, "total")}</div>
      </div>
      <div style={{ padding:"0 16px 8px", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, background:T.surface, borderRadius:14, padding:"8px 14px", boxShadow:T.shadow }}>
          <span style={{ fontSize:14, color:T.muted, flexShrink:0 }}>🔍</span>
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={t(lang, "searchTx")} style={{ flex:1, border:"none", outline:"none", background:"transparent", fontSize:14, color:T.dark, fontFamily:"'Noto Sans',sans-serif" }} />
          {searchQuery && <button onClick={() => setSearchQuery("")} style={{ border:"none", background:"none", cursor:"pointer", fontSize:16, color:T.muted, padding:0 }}>×</button>}
        </div>
      </div>
      {(customDate || customCategoryId) && (
        <div style={{ padding:"0 16px 8px", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 14px", borderRadius:12, background:"rgba(172,225,175,0.15)", border:"1px solid rgba(172,225,175,0.3)" }}>
            <div style={{ flex:1, fontSize:13, fontWeight:600, color:T.dark, fontFamily:"'Noto Sans',sans-serif" }}>
              {customDate && tpl("showingDate", { date: new Date(customDate+"T00:00:00").toLocaleDateString(lang==="th"?"th-TH":lang==="lo"?"lo-LA":"en-US", {month:"long",day:"numeric",year:"numeric"}) })}
              {customCategoryId && tpl("showingCategory", { category: catLabel(findCat(customCategoryId, customCategories), lang) })}
            </div>
            <button onClick={() => { setCustomDate(null); setCustomCategoryId(null); }} style={{ border:"none", background:"rgba(45,45,58,0.08)", borderRadius:8, padding:"4px 10px", fontSize:12, fontWeight:600, color:T.muted, cursor:"pointer", fontFamily:"'Noto Sans',sans-serif", flexShrink:0 }}>× {t(lang,"clearFilter")}</button>
          </div>
        </div>
      )}
      <div style={{ padding:"0 16px 10px", flexShrink:0, display:"flex", flexDirection:"column", gap:6 }}>
        <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
          {[{id:"today",lo:"ມື້ນີ້",th:"วันนี้",en:"Today"},{id:"yesterday",lo:"ມື້ວານ",th:"เมื่อวาน",en:"Yesterday"},{id:"week",lo:"ອາທິດ",th:"สัปดาห์",en:"Week"},{id:"month",lo:"ເດືອນ",th:"เดือน",en:"Month"},{id:"all",lo:"ທັງໝົດ",th:"ทั้งหมด",en:"All"}].map(f =>
            <button key={f.id} onClick={() => { setTxFilter(f.id); setCustomDate(null); setCustomCategoryId(null); }} style={pill(txFilter === f.id)}>{lang === "lo" ? f.lo : lang === "th" ? f.th : f.en}</button>)}
        </div>
        <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
          {[{id:"all",label:lang==="lo"?"ທັງໝົດ":"All"},{id:"LAK",label:"₭ LAK"},{id:"THB",label:"฿ THB"},{id:"USD",label:"$ USD"}].map(c =>
            <button key={c.id} onClick={() => setCurFilter(c.id)} style={{...pill(curFilter === c.id), fontSize:11}}>{c.label}</button>)}
          <div style={{ width:8 }} />
          {[{id:"both",label:t(lang,"typeBoth")},{id:"expense",label:t(lang,"expense")},{id:"income",label:t(lang,"income")}].map(tp =>
            <button key={tp.id} onClick={() => setTypeFilter(tp.id)} style={{...pill(typeFilter === tp.id, tp.id === "expense" ? "rgba(255,179,167,0.3)" : tp.id === "income" ? "rgba(172,225,175,0.3)" : undefined), fontSize:11}}>{tp.label}</button>)}
        </div>
      </div>
      <div style={{ flex:1, overflowY:"auto", WebkitOverflowScrolling:"touch" }}>
        {totalFiltered > 0 ? (<>
          <div style={{ margin:"0 16px 8px", padding:"10px 14px", borderRadius:12, background:"rgba(172,225,175,0.08)", border:"0.5px solid rgba(172,225,175,0.2)" }}>
            <div style={{ fontSize:11, color:T.muted, fontWeight:600, marginBottom:4, fontFamily:"'Noto Sans',sans-serif" }}>{tpl("showingCount", { visible: visible.length, total: totalFiltered })}</div>
            <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
              {Object.entries(fIncome).map(([cur, amt]) => <span key={"i"+cur} style={{ fontSize:13, fontWeight:700, color:"#2A7A40" }}>+{fmt(amt, cur)}</span>)}
              {Object.entries(fExpense).map(([cur, amt]) => <span key={"e"+cur} style={{ fontSize:13, fontWeight:700, color:"#C0392B" }}>−{fmt(amt, cur)}</span>)}
            </div>
          </div>
          <TransactionList transactions={visible} lang={lang} customCategories={customCategories} onEditCategory={onEditTx} onDeleteTx={onDeleteTx} onUpdateNote={onUpdateNote} />
          {hasMore && <div style={{ textAlign:"center", padding:"12px 0" }}><button onClick={() => setVisibleCount(c => c + 50)} style={{ background:"transparent", border:"none", color:"#2A7A40", fontSize:13, fontWeight:600, cursor:"pointer", padding:"8px 16px", fontFamily:"'Noto Sans',sans-serif" }}>{t(lang, "loadMore")} ↓</button></div>}
        </>) : (
          <div style={{ padding:"48px 16px", textAlign:"center", color:T.muted }}><div style={{ fontSize:40, marginBottom:12 }}>🌿</div><div style={{ fontSize:14, fontFamily:"'Noto Sans',sans-serif" }}>{t(lang, "emptyStateFilter")}</div></div>
        )}
        <div style={{ height:16 }} />
      </div>
    </div>
  );
}

// ═══ STATEMENT SCAN FLOW ═════════════════════════════════════
// Full-screen 5-step flow: currency → upload → loading → review → save.
// Launched from Settings → Tools → Bank statement scan (Pro only).
function StatementScanFlow({ profile, lang, onClose, onAdd, customCategories=[], onImportDone=()=>{}, onDeleteBatch=()=>{}, transactions=[] }) {
  const [step, setStep] = useState("currency"); // currency | upload | loading | review | saving | done
  const [currency, setCurrency] = useState(null);
  const [images, setImages] = useState([]); // [{file, preview, data, mimeType}]
  const [error, setError] = useState(null);
  const [txs, setTxs] = useState([]);
  const [stats, setStats] = useState(null);
  const [bank, setBank] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [saveProgress, setSaveProgress] = useState(0);
  const [detectedCurrency, setDetectedCurrency] = useState(null);
  const [currencyMismatch, setCurrencyMismatch] = useState(false);
  const [batchHistory, setBatchHistory] = useState([]);
  const [viewBatchId, setViewBatchId] = useState(null);
  const fileRef = useRef();
  const imagesRef = useRef(images);

  // ── Load batch import history ──
  useEffect(() => {
    if (!profile?.userId) return;
    supabase.from("transactions").select("batch_id,created_at,description,currency,type,amount")
      .eq("user_id", profile.userId).eq("is_deleted", false).not("batch_id", "is", null)
      .order("created_at", { ascending: false }).limit(100)
      .then(({ data }) => {
        if (!data || data.length === 0) { setBatchHistory([]); return; }
        const groups = {};
        data.forEach(tx => {
          if (!groups[tx.batch_id]) groups[tx.batch_id] = { batch_id: tx.batch_id, imported_at: tx.created_at, tx_count: 0, currency: tx.currency, txs: [] };
          groups[tx.batch_id].tx_count++;
          groups[tx.batch_id].txs.push(tx);
        });
        setBatchHistory(Object.values(groups).sort((a, b) => new Date(b.imported_at) - new Date(a.imported_at)).slice(0, 10));
      }).catch(() => {});
  }, [profile?.userId, step === "done"]);

  const deleteBatch = async (batchId) => {
    try {
      await supabase.from("transactions").update({ is_deleted: true }).eq("batch_id", batchId).eq("user_id", profile?.userId);
      setBatchHistory(prev => prev.filter(b => b.batch_id !== batchId));
      onDeleteBatch(batchId);
      setViewBatchId(null);
    } catch (e) { console.error("Delete batch error:", e); }
  };

  const fmtRelative = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return mins <= 1 ? "just now" : `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  const tpl = (key, vars={}) => {
    let s = t(lang, key);
    Object.entries(vars).forEach(([k,v]) => { s = s.replace(`{${k}}`, v); });
    return s;
  };

  // ── Step 1: Currency picker ──
  const handleCurrencyNext = () => { if (currency) setStep("upload"); };

  // ── Step 2: File handling ──
  const handleFiles = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    const remaining = 10 - images.length;
    const batch = files.slice(0, remaining);
    const newImgs = batch.map(file => ({
      file, preview: URL.createObjectURL(file),
      mimeType: file.type || "image/jpeg",
    }));
    setImages(prev => [...prev, ...newImgs]);
  };
  const removeImage = (idx) => {
    const removed = images[idx];
    if (removed?.preview) URL.revokeObjectURL(removed.preview);
    setImages(prev => prev.filter((_, i) => i !== idx));
  };

  // Keep ref in sync + cleanup blob URLs on unmount
  useEffect(() => { imagesRef.current = images; }, [images]);
  useEffect(() => () => { imagesRef.current.forEach(img => { if (img?.preview) URL.revokeObjectURL(img.preview); }); }, []);

  // ── Step 3: Scan ──
  const handleScan = async () => {
    setStep("loading");
    setError(null);
    try {
      // Convert all images to base64
      const encoded = await Promise.all(images.map(img =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve({ data: reader.result.split(",")[1], mimeType: img.mimeType });
          reader.onerror = reject;
          reader.readAsDataURL(img.file);
        })
      ));

      const res = await fetch("https://api.phajot.com/parse-statement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: encoded, currency, userId: profile?.userId }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        const s = res.status;
        setError(s === 429 ? tpl("statementErrorRateLimit")
          : s >= 500 ? tpl("statementErrorParse")
          : tpl("statementErrorParse"));
        setStep("upload");
        return;
      }

      // Check currency mismatch
      if (data.currency && data.currency !== currency) {
        setDetectedCurrency(data.currency);
        setCurrencyMismatch(true);
      }

      // Cross-session dedup: mark transactions that already exist in user's records
      const existingKeys = new Set(transactions.map(tx => txDedupKey(tx)));
      const parsed = (data.transactions || []).map((tx, i) => ({
        ...tx,
        _idx: i,
        currency: data.currency || currency,
        categoryId: normalizeCategory(tx.category || "other", tx.type || "expense"),
        _isDuplicate: existingKeys.has(txDedupKey({ ...tx, amount: tx.amount, description: tx.description, date: tx.date })),
      }));
      setTxs(parsed);
      setStats({ ...(data.stats || {}), alreadyImported: parsed.filter(t => t._isDuplicate).length });
      setBank(data.bank);
      setSelected(new Set(parsed.map((tx, i) => tx._isDuplicate ? null : i).filter(i => i !== null)));
      setStep("review");

    } catch (e) {
      setError(tpl("statementErrorNetwork"));
      setStep("upload");
    }
  };

  // ── Currency mismatch resolution ──
  const resolveCurrency = (chosen) => {
    setCurrencyMismatch(false);
    if (chosen !== currency) {
      setCurrency(chosen);
      setTxs(prev => prev.map(tx => ({ ...tx, currency: chosen })));
    }
  };

  // ── Step 4: Toggle selection ──
  const toggleSelect = (idx) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  // ── Inline editing helpers ──
  const [catPickerIdx, setCatPickerIdx] = useState(null);
  const [editingField, setEditingField] = useState(null); // {idx, field, value}
  const updateTx = (idx, updates) => setTxs(prev => prev.map((t, i) => i === idx ? { ...t, ...updates } : t));
  const changeCat = (idx, catId) => { updateTx(idx, { categoryId: catId }); setCatPickerIdx(null); };
  const commitEdit = () => {
    if (!editingField) return;
    const { idx, field, value } = editingField;
    if (field === "amount") {
      const n = parseFloat(String(value).replace(/,/g, ""));
      if (isFinite(n) && n > 0) updateTx(idx, { amount: n });
    } else if (field === "description") {
      updateTx(idx, { description: value });
    }
    setEditingField(null);
  };
  const toggleType = (idx) => {
    const tx = txs[idx];
    const newType = tx.type === "expense" ? "income" : "expense";
    const newCats = newType === "income" ? DEFAULT_INCOME_CATS : DEFAULT_EXPENSE_CATS;
    const catValid = newCats.find(c => c.id === tx.categoryId);
    updateTx(idx, { type: newType, ...(catValid ? {} : { categoryId: newCats[0].id }) });
  };

  // ── Step 5: Bulk save ──
  const handleImport = async () => {
    const toSave = txs.filter((_, i) => selected.has(i));
    const batchId = crypto.randomUUID();
    setStep("saving");
    setSaveProgress(0);
    for (let i = 0; i < toSave.length; i++) {
      const tx = toSave[i];
      const cat = findCat(tx.categoryId, customCategories);
      const txObj = {
        id: `tx_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        amount: tx.amount,
        currency: tx.currency || currency,
        type: tx.type || "expense",
        categoryId: tx.categoryId,
        description: tx.description || "",
        note: JSON.stringify({ source: "statement", bank: bank, ref: tx.ref_number || null }),
        date: tx.date || new Date().toISOString().split("T")[0],
        confidence: 0.9,
        createdAt: new Date().toISOString(),
        rawInput: "statement-scan",
        batchId,
      };
      onAdd(txObj);
      setSaveProgress(i + 1);
      // Small delay to avoid UI freeze
      if (i % 5 === 4) await new Promise(r => setTimeout(r, 50));
    }
    setStep("done");
  };

  // ── Shared styles ──
  const headerStyle = { display:"flex", alignItems:"center", gap:12, padding:"calc(env(safe-area-inset-top,8px) + 12px) 20px 12px" };
  const backBtn = (action) => (
    <button onClick={action} style={{ width:36, height:36, borderRadius:12, border:"none", background:"rgba(45,45,58,0.06)", cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>←</button>
  );
  const primaryBtn = (label, onClick, disabled=false) => (
    <button onClick={onClick} disabled={disabled} style={{ width:"100%", padding:"16px", borderRadius:18, border:"none", background:disabled?"rgba(45,45,58,0.1)":"#1A4020", color:disabled?T.muted:"#fff", fontSize:15, fontWeight:800, cursor:disabled?"default":"pointer", fontFamily:"'Noto Sans',sans-serif", opacity:disabled?0.5:1 }}>{label}</button>
  );

  return (
    <div style={{ position:"fixed", inset:0, zIndex:500, background:"#F7FCF5", overflowY:"auto", WebkitOverflowScrolling:"touch", display:"flex", flexDirection:"column" }}>

      {/* ── STEP 1: Currency picker ── */}
      {step === "currency" && (<>
        <div style={headerStyle}>
          {backBtn(onClose)}
          <div style={{ flex:1, fontWeight:800, fontSize:18, color:T.dark, fontFamily:"'Noto Sans',sans-serif" }}>{tpl("statementPickCurrency")}</div>
        </div>
        <div style={{ padding:"0 20px", flex:1 }}>
          <div style={{ fontSize:13, color:T.muted, marginBottom:20, lineHeight:1.5 }}>{tpl("statementPickCurrencyHint")}</div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {Object.entries(CURR).map(([code, c]) => (
              <button key={code} onClick={() => setCurrency(code)} style={{
                display:"flex", alignItems:"center", gap:14, padding:"16px 18px", borderRadius:18, border:"none", cursor:"pointer",
                background: currency === code ? "rgba(172,225,175,0.25)" : T.surface, boxShadow: currency === code ? "0 2px 12px rgba(172,225,175,0.4)" : T.shadow,
                transform: currency === code ? "scale(1.02)" : "scale(1)", transition:"all .2s ease",
              }}>
                <Flag code={code} size={28} />
                <div style={{ flex:1, textAlign:"left" }}>
                  <div style={{ fontSize:16, fontWeight:700, color:T.dark, fontFamily:"'Noto Sans',sans-serif" }}>{code}</div>
                  <div style={{ fontSize:12, color:T.muted }}>{c.name}</div>
                </div>
                {currency === code && <div style={{ fontSize:18, color:"#2A7A40" }}>✓</div>}
              </button>
            ))}
          </div>
          {/* ── Recent imports history ── */}
          {batchHistory.length > 0 && (
            <div style={{ marginTop:24, padding:16, borderRadius:16, background:"rgba(172,225,175,0.08)", border:"1px solid rgba(172,225,175,0.2)" }}>
              <div style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:1.4, marginBottom:10, fontFamily:"'Noto Sans',sans-serif" }}>
                📋 {lang === "lo" ? "ການນຳເຂົ້າຫຼ້າສຸດ" : "Recent imports"}
              </div>
              {batchHistory.slice(0, 3).map(batch => (
                <button key={batch.batch_id} onClick={() => setViewBatchId(batch.batch_id)} style={{
                  width:"100%", padding:"12px", borderRadius:12, background:"#fff", marginBottom:8, cursor:"pointer", border:"none",
                  display:"flex", justifyContent:"space-between", alignItems:"center", textAlign:"left", fontFamily:"'Noto Sans',sans-serif",
                }}>
                  <div>
                    <div style={{ fontWeight:600, fontSize:14, color:T.dark }}>{batch.currency || "?"} · {batch.tx_count} tx</div>
                    <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>{fmtRelative(batch.imported_at)}</div>
                  </div>
                  <div style={{ color:T.muted, fontSize:14 }}>›</div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div style={{ padding:"16px 20px calc(env(safe-area-inset-bottom,0px) + 16px)" }}>
          {primaryBtn(tpl("statementNext"), handleCurrencyNext, !currency)}
        </div>

        {/* ── Batch detail modal ── */}
        {viewBatchId && (() => {
          const batch = batchHistory.find(b => b.batch_id === viewBatchId);
          if (!batch) return null;
          return (
            <div style={{ position:"fixed", inset:0, zIndex:600, background:"rgba(30,30,40,0.6)", backdropFilter:"blur(4px)", display:"flex", alignItems:"flex-end", justifyContent:"center" }}
              onClick={() => setViewBatchId(null)}>
              <div onClick={e => e.stopPropagation()} style={{ width:"100%", maxWidth:420, background:"#fff", borderRadius:"24px 24px 0 0", padding:"20px 20px calc(env(safe-area-inset-bottom,0px) + 20px)", maxHeight:"70vh", overflowY:"auto" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                  <div style={{ fontWeight:800, fontSize:18, color:T.dark, fontFamily:"'Noto Sans',sans-serif" }}>
                    {lang === "lo" ? "ລາຍລະອຽດການນຳເຂົ້າ" : "Import details"}
                  </div>
                  <button onClick={() => setViewBatchId(null)} style={{ border:"none", background:"none", fontSize:20, color:T.muted, cursor:"pointer" }}>×</button>
                </div>
                <div style={{ display:"flex", gap:12, marginBottom:16 }}>
                  <div style={{ background:"rgba(172,225,175,0.15)", borderRadius:12, padding:"8px 14px", fontSize:13, fontWeight:600, color:T.dark }}>{batch.currency}</div>
                  <div style={{ background:"rgba(172,225,175,0.15)", borderRadius:12, padding:"8px 14px", fontSize:13, fontWeight:600, color:T.dark }}>{batch.tx_count} transactions</div>
                  <div style={{ background:"rgba(45,45,58,0.06)", borderRadius:12, padding:"8px 14px", fontSize:13, color:T.muted }}>{fmtRelative(batch.imported_at)}</div>
                </div>
                {batch.txs.slice(0, 5).map((tx, i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid rgba(45,45,58,0.06)", fontSize:13 }}>
                    <div style={{ color:T.dark, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{tx.description || "—"}</div>
                    <div style={{ color: tx.type === "expense" ? "#C0392B" : "#2A7A40", fontWeight:700, flexShrink:0, marginLeft:12 }}>
                      {tx.type === "expense" ? "-" : "+"}{fmt(tx.amount, tx.currency)}
                    </div>
                  </div>
                ))}
                {batch.tx_count > 5 && <div style={{ fontSize:12, color:T.muted, padding:"8px 0", textAlign:"center" }}>+{batch.tx_count - 5} more</div>}
                <div style={{ display:"flex", gap:10, marginTop:20 }}>
                  <button onClick={() => setViewBatchId(null)} style={{ flex:1, padding:"14px", borderRadius:16, border:"none", background:"rgba(45,45,58,0.08)", color:T.dark, fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"'Noto Sans',sans-serif" }}>
                    {lang === "lo" ? "ປິດ" : "Close"}
                  </button>
                  <button onClick={() => { if (confirm(lang === "lo" ? `ລົບ ${batch.tx_count} ທຸລະກຳ?` : `Delete ${batch.tx_count} transactions?`)) deleteBatch(batch.batch_id); }}
                    style={{ flex:1, padding:"14px", borderRadius:16, border:"none", background:"rgba(192,57,43,0.1)", color:"#C0392B", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"'Noto Sans',sans-serif" }}>
                    {lang === "lo" ? `ລົບທັງໝົດ (${batch.tx_count})` : `Delete all (${batch.tx_count})`}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </>)}

      {/* ── STEP 2: Upload images ── */}
      {step === "upload" && (<>
        <div style={headerStyle}>
          {backBtn(() => setStep("currency"))}
          <div style={{ flex:1, fontWeight:800, fontSize:18, color:T.dark, fontFamily:"'Noto Sans',sans-serif" }}>{tpl("statementUploadTitle")}</div>
          <div style={{ fontSize:12, color:T.muted, fontWeight:600 }}>{images.length}/10</div>
        </div>
        <div style={{ padding:"0 20px", flex:1 }}>
          <div style={{ fontSize:13, color:T.muted, marginBottom:16, lineHeight:1.5 }}>{tpl("statementUploadHint")}</div>
          {error && (
            <div style={{ background:"rgba(255,179,167,0.15)", borderRadius:14, padding:"12px 16px", marginBottom:16, fontSize:13, color:"#C0392B", lineHeight:1.4 }}>
              {error}
            </div>
          )}
          {/* Thumbnail grid */}
          {images.length > 0 && (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:16 }}>
              {images.map((img, i) => (
                <div key={i} style={{ position:"relative", borderRadius:12, overflow:"hidden", aspectRatio:"3/4", background:"rgba(45,45,58,0.06)" }}>
                  <img src={img.preview} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                  <button onClick={() => removeImage(i)} style={{ position:"absolute", top:4, right:4, width:24, height:24, borderRadius:12, border:"none", background:"rgba(0,0,0,0.5)", color:"#fff", fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
                </div>
              ))}
            </div>
          )}
          {/* Add button */}
          {images.length < 10 && (
            <button onClick={() => fileRef.current?.click()} style={{
              width:"100%", padding:"20px", borderRadius:18, border:"2px dashed rgba(172,225,175,0.5)", background:"rgba(172,225,175,0.08)",
              cursor:"pointer", fontSize:14, fontWeight:600, color:"#2A7A40", fontFamily:"'Noto Sans',sans-serif", textAlign:"center",
            }}>
              📷 {tpl("statementUploadButton")}
            </button>
          )}
          {images.length >= 10 && (
            <div style={{ fontSize:12, color:T.muted, textAlign:"center", padding:8 }}>{tpl("statementMaxImages")}</div>
          )}
          <input ref={fileRef} type="file" accept="image/*" multiple style={{ display:"none" }} onChange={handleFiles} />
        </div>
        <div style={{ padding:"16px 20px calc(env(safe-area-inset-bottom,0px) + 16px)" }}>
          {primaryBtn(tpl("statementScanButton"), handleScan, images.length === 0)}
        </div>
      </>)}

      {/* ── STEP 3: Loading ── */}
      {step === "loading" && (
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:40, gap:16 }}>
          <div style={{ width:60, height:60, borderRadius:20, background:"rgba(172,225,175,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, animation:"pulse 1.5s ease infinite" }}>📄</div>
          <div style={{ fontSize:16, fontWeight:700, color:T.dark, fontFamily:"'Noto Sans',sans-serif" }}>{tpl("statementScanning", { n: images.length })}</div>
          <div style={{ fontSize:13, color:T.muted }}>{tpl("statementScanningHint")}</div>
          <style>{`@keyframes pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.6; transform:scale(0.95); } }`}</style>
        </div>
      )}

      {/* ── STEP 4: Review ── */}
      {step === "review" && (<>
        <div style={headerStyle}>
          {backBtn(() => { setStep("upload"); setTxs([]); setStats(null); })}
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:800, fontSize:18, color:T.dark, fontFamily:"'Noto Sans',sans-serif" }}>{tpl("statementReviewTitle")}</div>
            <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>
              {bank && <span style={{ fontWeight:700, marginRight:6 }}>{bank}</span>}
              {tpl("statementReviewStats", { n: txs.length })}
              {stats?.duplicates_removed > 0 && <span> {tpl("statementReviewDuplicates", { n: stats.duplicates_removed })}</span>}
              {stats?.alreadyImported > 0 && <span> · {tpl("alreadyImported", { n: stats.alreadyImported })}</span>}
            </div>
          </div>
        </div>

        {/* All duplicates banner */}
        {txs.length > 0 && txs.every(tx => tx._isDuplicate) && (
          <div style={{ margin:"0 20px 12px", padding:"14px 16px", borderRadius:12, background:"rgba(245,197,24,0.12)", border:"1px solid rgba(245,197,24,0.3)", fontSize:13, color:"#5C4500", lineHeight:1.4 }}>
            ⚠️ {t(lang, "allDuplicatesWarning")}
          </div>
        )}

        {/* Currency mismatch warning */}
        {currencyMismatch && detectedCurrency && (
          <div style={{ margin:"0 20px 12px", background:"rgba(245,197,24,0.15)", borderRadius:14, padding:"14px 16px" }}>
            <div style={{ fontSize:13, fontWeight:600, color:"#7A5A00", marginBottom:10, lineHeight:1.4 }}>
              {tpl("statementCurrencyMismatch", { detected: detectedCurrency, selected: currency })}
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => resolveCurrency(detectedCurrency)} style={{ flex:1, padding:"10px", borderRadius:12, border:"none", background:"#F5C518", color:"#7A3E00", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"'Noto Sans',sans-serif" }}>
                {tpl("statementCurrencyUseDetected", { detected: detectedCurrency })}
              </button>
              <button onClick={() => resolveCurrency(currency)} style={{ flex:1, padding:"10px", borderRadius:12, border:"none", background:"rgba(45,45,58,0.08)", color:T.dark, fontWeight:600, fontSize:12, cursor:"pointer", fontFamily:"'Noto Sans',sans-serif" }}>
                {tpl("statementCurrencyUseSelected", { selected: currency })}
              </button>
            </div>
          </div>
        )}

        {/* Transaction list */}
        <div style={{ flex:1, overflowY:"auto", padding:"0 20px" }}>
          {txs.length === 0 ? (
            <div style={{ padding:40, textAlign:"center" }}>
              <div style={{ fontSize:40, marginBottom:12 }}>📭</div>
              <div style={{ fontSize:16, fontWeight:600, color:T.dark, marginBottom:6, fontFamily:"'Noto Sans',sans-serif" }}>
                {lang === "lo" ? "ບໍ່ພົບທຸລະກຳ" : "No transactions found"}
              </div>
              <div style={{ fontSize:13, color:T.muted, lineHeight:1.5 }}>
                {lang === "lo" ? "ລອງອັບໂຫຼດຮູບທີ່ຊັດເຈນກວ່າ ຫຼື ເລືອກທະນາຄານອື່ນ" : "Try clearer images or a different bank app screenshot"}
              </div>
              <button onClick={() => { setStep("upload"); setTxs([]); setStats(null); }} style={{ marginTop:16, padding:"10px 24px", borderRadius:14, border:"none", background:"rgba(45,45,58,0.08)", color:T.dark, fontWeight:600, fontSize:13, cursor:"pointer", fontFamily:"'Noto Sans',sans-serif" }}>
                {lang === "lo" ? "ລອງໃໝ່" : "Try again"}
              </button>
            </div>
          ) : txs.map((tx, i) => {
            const cat = findCat(tx.categoryId, customCategories);
            const isExp = tx.type === "expense";
            const on = selected.has(i);
            const isEditingDesc = editingField?.idx === i && editingField?.field === "description";
            const isEditingAmt = editingField?.idx === i && editingField?.field === "amount";
            return (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 0", borderBottom:"1px solid rgba(45,45,58,0.06)", opacity: on ? 1 : 0.4 }}>
                <button onClick={() => toggleSelect(i)} style={{ width:24, height:24, borderRadius:8, border: on ? "none" : "2px solid rgba(45,45,58,0.2)", background: on ? "#2A7A40" : "transparent", color:"#fff", fontSize:12, cursor:"pointer", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {on && "✓"}
                </button>
                <button onClick={() => setCatPickerIdx(catPickerIdx === i ? null : i)} style={{ width:36, height:36, borderRadius:10, border:"none", background:"rgba(172,225,175,0.15)", cursor:"pointer", fontSize:18, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  {cat.emoji}
                </button>
                <div style={{ flex:1, minWidth:0 }}>
                  {isEditingDesc ? (
                    <input autoFocus value={editingField.value} onChange={e => setEditingField(prev => ({ ...prev, value: e.target.value }))}
                      onBlur={commitEdit} onKeyDown={e => e.key === "Enter" && commitEdit()}
                      style={{ width:"100%", fontSize:13, fontWeight:600, color:T.dark, fontFamily:"'Noto Sans',sans-serif", border:"none", borderBottom:"2px solid #ACE1AF", outline:"none", background:"transparent", padding:"2px 0", boxSizing:"border-box" }} />
                  ) : (
                    <div onClick={() => setEditingField({ idx: i, field: "description", value: tx.description || "" })}
                      style={{ fontSize:13, fontWeight:600, color:T.dark, fontFamily:"'Noto Sans',sans-serif", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", cursor:"text", borderBottom:"1px dashed transparent" }}
                      onMouseEnter={e => e.target.style.borderBottomColor = "rgba(172,225,175,0.5)"} onMouseLeave={e => e.target.style.borderBottomColor = "transparent"}>
                      {tx.description || catLabel(cat, lang)}
                      {tx._isDuplicate && <span style={{ fontSize:9, fontWeight:700, padding:"2px 6px", borderRadius:6, background:"rgba(245,197,24,0.2)", color:"#7A5A00", marginLeft:6, textTransform:"uppercase", letterSpacing:0.5 }}>{t(lang,"duplicate")}</span>}
                    </div>
                  )}
                  <div style={{ fontSize:11, color:T.muted, marginTop:1 }}>{tx.date}{tx.time ? ` · ${tx.time.slice(0,5)}` : ""}</div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:4, flexShrink:0 }}>
                  <button onClick={() => toggleType(i)} style={{ border:"none", background:"none", cursor:"pointer", fontSize:12, fontWeight:800, color: isExp ? "#C0392B" : "#2A7A40", padding:"2px 4px", fontFamily:"'Noto Sans',sans-serif" }}>
                    {isExp ? "−" : "+"}
                  </button>
                  {isEditingAmt ? (
                    <input autoFocus value={editingField.value} onChange={e => setEditingField(prev => ({ ...prev, value: e.target.value }))}
                      onBlur={commitEdit} onKeyDown={e => e.key === "Enter" && commitEdit()} type="number" inputMode="decimal"
                      style={{ width:80, fontSize:14, fontWeight:700, color: isExp ? "#C0392B" : "#2A7A40", fontFamily:"'Noto Sans',sans-serif", border:"none", borderBottom:"2px solid #ACE1AF", outline:"none", background:"transparent", textAlign:"right", padding:"2px 0" }} />
                  ) : (
                    <div onClick={() => setEditingField({ idx: i, field: "amount", value: String(tx.amount) })}
                      style={{ fontSize:14, fontWeight:700, color: isExp ? "#C0392B" : "#2A7A40", fontFamily:"'Noto Sans',sans-serif", cursor:"text", borderBottom:"1px dashed transparent" }}
                      onMouseEnter={e => e.target.style.borderBottomColor = "rgba(172,225,175,0.5)"} onMouseLeave={e => e.target.style.borderBottomColor = "transparent"}>
                      {fmt(tx.amount, tx.currency || currency)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Category picker bottom sheet */}
        {catPickerIdx !== null && (
          <div style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:600, background:"#fff", borderRadius:"24px 24px 0 0", boxShadow:"0 -4px 24px rgba(0,0,0,0.12)", maxHeight:"50vh", overflowY:"auto", padding:"16px 20px calc(env(safe-area-inset-bottom,0px) + 16px)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <div style={{ fontSize:14, fontWeight:700, color:T.dark, fontFamily:"'Noto Sans',sans-serif" }}>Category</div>
              <button onClick={() => setCatPickerIdx(null)} style={{ border:"none", background:"none", fontSize:18, color:T.muted, cursor:"pointer" }}>×</button>
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {[...DEFAULT_EXPENSE_CATS, ...DEFAULT_INCOME_CATS].map(c => (
                <button key={c.id} onClick={() => changeCat(catPickerIdx, c.id)} style={{
                  padding:"6px 12px", borderRadius:12, border:"none", cursor:"pointer", fontSize:12, fontWeight:600,
                  background: txs[catPickerIdx]?.categoryId === c.id ? "rgba(172,225,175,0.3)" : "rgba(45,45,58,0.06)",
                  color:T.dark, fontFamily:"'Noto Sans',sans-serif", display:"flex", alignItems:"center", gap:4,
                }}>
                  <span>{c.emoji}</span> {catLabel(c, lang)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Import button */}
        <div style={{ padding:"16px 20px calc(env(safe-area-inset-bottom,0px) + 16px)", borderTop:"1px solid rgba(45,45,58,0.06)" }}>
          {primaryBtn(tpl("statementImportButton", { n: selected.size }), handleImport, selected.size === 0)}
        </div>
      </>)}

      {/* ── STEP 5: Saving ── */}
      {step === "saving" && (
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:40, gap:16 }}>
          <div style={{ width:60, height:60, borderRadius:20, background:"rgba(172,225,175,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28 }}>💾</div>
          <div style={{ fontSize:16, fontWeight:700, color:T.dark, fontFamily:"'Noto Sans',sans-serif" }}>
            {tpl("statementImporting", { current: saveProgress, total: selected.size })}
          </div>
          <div style={{ width:200, height:6, borderRadius:3, background:"rgba(45,45,58,0.1)", overflow:"hidden" }}>
            <div style={{ width:`${(saveProgress / selected.size) * 100}%`, height:"100%", background:"#2A7A40", borderRadius:3, transition:"width .2s ease" }} />
          </div>
        </div>
      )}

      {/* ── STEP 6: Done ── */}
      {step === "done" && (
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:40, gap:16 }}>
          <div style={{ fontSize:48 }}>✅</div>
          <div style={{ fontSize:18, fontWeight:800, color:T.dark, fontFamily:"'Noto Sans',sans-serif" }}>
            {tpl("statementSuccess", { n: saveProgress })}
          </div>
          <div style={{ fontSize:13, color:T.muted }}>{bank ? `${bank} · ` : ""}{currency}</div>
          <div style={{ marginTop:12 }}>
            {primaryBtn("Done", () => onImportDone(saveProgress))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══ LOGIN SCREEN ════════════════════════════════════════════
// ═══ PRO UPGRADE SCREEN ══════════════════════════════════════
function ProUpgradeScreen({ onClose }) {
  const [billing, setBilling] = useState("monthly");
  const isAnnual = billing === "annual";

  const price    = isAnnual ? "$29.99" : "$2.99";
  const period   = isAnnual ? "/ year" : "/ month";
  const alts     = isAnnual ? "฿999 / year  ·  ₭699,000 / year" : "฿99 / month  ·  ₭69,000 / month";
  const ctaLabel = isAnnual ? "Start Pro — $29.99 / year" : "Start Pro — $2.99 / month";

  const FeatRow = ({emoji, title, desc, free, pro, coming})=>(
    <div style={{display:"flex",alignItems:"center",gap:12,padding:"11px 16px",borderBottom:"0.5px solid rgba(45,45,58,0.05)"}}>
      <div style={{width:32,height:32,borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0,background:free?"rgba(172,225,175,0.15)":"rgba(26,64,32,0.08)"}}>{emoji}</div>
      <div style={{flex:1}}>
        <div style={{fontSize:13,fontWeight:600,color:"#2D2D3A",fontFamily:"'Noto Sans',sans-serif"}}>{title}</div>
        <div style={{fontSize:11,color:"#9B9BAD",marginTop:1}}>{desc}</div>
      </div>
      <div style={{display:"flex",gap:18,flexShrink:0,width:60,justifyContent:"space-between"}}>
        <span style={{fontSize:14,color:free?"#3da873":"#ddd",width:20,textAlign:"center"}}>{free?"✓":"—"}</span>
        <span style={{fontSize:14,color:pro?"#3da873":"#ddd",width:20,textAlign:"center"}}>
          {coming ? <span style={{fontSize:9,fontWeight:700,background:"rgba(172,225,175,0.2)",color:"#2A7A40",padding:"2px 5px",borderRadius:4}}>Soon</span> : pro?"✓":"—"}
        </span>
      </div>
    </div>
  );

  return (
    <div style={{position:"fixed",inset:0,zIndex:600,background:"#F7FCF5",overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
      {/* Hero */}
      <div style={{background:"#1A4020",padding:"calc(env(safe-area-inset-top,0px) + 24px) 20px 22px"}}>
        <button onClick={onClose} style={{fontSize:13,color:"rgba(255,255,255,0.5)",background:"none",border:"none",cursor:"pointer",fontFamily:"'Noto Sans',sans-serif",padding:0,marginBottom:14}}>← Settings</button>
        <div style={{marginBottom:6}}><Logo size={96} /></div>
        <div style={{fontSize:21,fontWeight:800,color:"#fff",letterSpacing:-0.5,fontFamily:"'Noto Sans',sans-serif"}}>Phajot Pro</div>
        <div style={{fontSize:12,color:"rgba(255,255,255,0.55)",marginTop:5,lineHeight:1.6}}>Everything you need to track money across LAK, THB & USD — every day.</div>
      </div>

      <div style={{padding:"14px 16px 0"}}>
        {/* Billing toggle */}
        <div style={{display:"flex",background:"rgba(45,45,58,0.07)",borderRadius:12,padding:3,marginBottom:14}}>
          {["monthly","annual"].map(m=>(
            <button key={m} onClick={()=>setBilling(m)}
              style={{flex:1,padding:"8px 0",borderRadius:10,border:"none",background:billing===m?"#fff":"transparent",color:billing===m?"#2D2D3A":"#9B9BAD",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Noto Sans',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
              {m==="monthly"?"Monthly":<>Annual <span style={{fontSize:9,fontWeight:700,background:"#ACE1AF",color:"#1A4020",padding:"1px 5px",borderRadius:4}}>-17%</span></>}
            </button>
          ))}
        </div>

        {/* Price box */}
        <div style={{background:"#fff",borderRadius:18,padding:"16px",border:"1.5px solid #ACE1AF",marginBottom:14}}>
          <div style={{display:"flex",alignItems:"flex-end",gap:6,marginBottom:3}}>
            <span style={{fontSize:32,fontWeight:800,color:"#2D2D3A",letterSpacing:-1,fontFamily:"'Noto Sans',sans-serif"}}>{price}</span>
            <span style={{fontSize:13,color:"#9B9BAD",paddingBottom:6}}>{period}</span>
          </div>
          <div style={{fontSize:11,color:"#9B9BAD"}}>{alts}</div>
          {isAnnual&&<div style={{fontSize:11,color:"#3da873",fontWeight:700,marginTop:6}}>Save $5.89 compared to monthly</div>}
        </div>

        {/* Comparison table */}
        <div style={{marginBottom:14}}>
          {/* Column headers */}
          <div style={{display:"flex",alignItems:"center",padding:"0 16px 8px"}}>
            <div style={{flex:1}}/>
            <div style={{display:"flex",gap:18,width:60,justifyContent:"space-between"}}>
              <span style={{fontSize:10,fontWeight:700,color:"#9B9BAD",width:20,textAlign:"center"}}>Free</span>
              <span style={{fontSize:10,fontWeight:700,color:"#1A4020",width:20,textAlign:"center"}}>Pro</span>
            </div>
          </div>

          <div style={{background:"#fff",borderRadius:18,overflow:"hidden",border:"0.5px solid rgba(45,45,58,0.07)"}}>
            <FeatRow emoji="💬" title="Text logging"       desc="Lao, Thai, English"           free pro />
            <FeatRow emoji="📊" title="Analytics & budgets" desc="Charts, MoM comparison"       free pro />
            <FeatRow emoji="🎯" title="Goals & streaks"    desc="10 XP levels"                  free pro />
            <FeatRow emoji="🔐" title="PIN & guest access"  desc="Share safely with family"     free pro />
            <FeatRow emoji="🤖" title="AI Advisor chat"    desc="Personal finance assistant"    pro />
            <FeatRow emoji="📷" title="Receipt OCR"        desc="Scan & auto-log bills"         pro />
            <FeatRow emoji="🧠" title="AI memory"          desc="Learns your spending habits"   pro />
            <div style={{display:"flex",alignItems:"center",gap:12,padding:"11px 16px"}}>
              <div style={{width:32,height:32,borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0,background:"rgba(26,64,32,0.08)"}}>📥</div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:"#2D2D3A",fontFamily:"'Noto Sans',sans-serif"}}>Export CSV / Excel</div>
                <div style={{fontSize:11,color:"#9B9BAD",marginTop:1}}>Download your data anytime</div>
              </div>
              <div style={{display:"flex",gap:18,flexShrink:0,width:60,justifyContent:"space-between"}}>
                <span style={{fontSize:14,color:"#ddd",width:20,textAlign:"center"}}>—</span>
                <span style={{fontSize:9,fontWeight:700,background:"rgba(172,225,175,0.2)",color:"#2A7A40",padding:"2px 5px",borderRadius:4}}>Soon</span>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <button style={{width:"100%",padding:"15px",borderRadius:16,border:"none",background:"#1A4020",color:"#fff",fontSize:15,fontWeight:800,cursor:"pointer",fontFamily:"'Noto Sans',sans-serif",marginBottom:10}}>{ctaLabel}</button>
        <div style={{textAlign:"center",fontSize:11,color:"#9B9BAD",lineHeight:1.7,marginBottom:32}}>
          Cancel anytime · No hidden fees<br/>PromptPay · BCEL · International card
        </div>
      </div>
    </div>
  );
}

// ═══ GUIDE SCREEN ════════════════════════════════════════════
function GuideScreen({ lang, onClose }) {
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

// ═══ PIN LOCK ════════════════════════════════════════════════
function PinLock({ pinConfig, pinInput, pinShake, onKey, isSetup, setupMode, setupStep }) {
  const keys = ["1","2","3","4","5","6","7","8","9","","0","⌫"];
  const dots = pinInput.length;
  const title = isSetup
    ? (setupMode === "set-owner" ? "Set Owner PIN" : "Set Guest PIN")
    : "Welcome back";
  const subtitle = isSetup
    ? (setupStep === "confirm" ? "Confirm your PIN" : setupMode === "set-owner"
        ? "Enter new 4-digit owner PIN" : "Enter a 4-digit guest PIN")
    : "Enter your PIN to continue";
  return (
    <div style={{position:"fixed",inset:0,zIndex:9999,background:T.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:28}}>
      <div style={{marginBottom:6}}><Logo size={100} /></div>
      <div style={{fontSize:22,fontWeight:800,color:T.dark,letterSpacing:-0.5,fontFamily:"'Noto Sans',sans-serif"}}>Phajot</div>
      <div style={{fontSize:13,color:T.muted,marginTop:4,marginBottom:32,textAlign:"center",lineHeight:1.5,fontFamily:"'Noto Sans',sans-serif"}}>{subtitle}</div>
      <div style={{fontSize:17,fontWeight:700,color:T.dark,marginBottom:24,fontFamily:"'Noto Sans',sans-serif"}}>{title}</div>
      <div style={{display:"flex",gap:18,marginBottom:40,animation:pinShake?"shake .4s ease":"none"}}>
        {[0,1,2,3].map(i=>(
          <div key={i} style={{width:16,height:16,borderRadius:8,background:i<dots?T.celadon:"rgba(172,225,175,0.2)",transition:"background .12s, transform .12s",transform:i<dots?"scale(1.15)":"scale(1)",boxShadow:i<dots?"0 0 0 4px rgba(172,225,175,0.2)":"none"}}/>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3, 76px)",gap:14}}>
        {keys.map((k,i)=>(
          k===""?<div key={i}/>:
          <button key={i} onClick={()=>k&&onKey(k)}
            style={{width:76,height:76,borderRadius:22,border:"none",fontFamily:"'Noto Sans',sans-serif",background:k==="⌫"?"rgba(172,225,175,0.15)":T.surface,color:k==="⌫"?T.muted:T.dark,fontSize:k==="⌫"?20:26,fontWeight:k==="⌫"?400:500,cursor:"pointer",boxShadow:T.shadow,display:"flex",alignItems:"center",justifyContent:"center",WebkitTapHighlightColor:"transparent"}}
            onPointerDown={e=>{e.currentTarget.style.transform="scale(0.91)";e.currentTarget.style.boxShadow="none";}}
            onPointerUp={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.boxShadow=T.shadow;}}
          >{k}</button>
        ))}
      </div>
      {!isSetup&&pinConfig?.guest&&(
        <div style={{marginTop:28,fontSize:12,color:T.muted,textAlign:"center",fontFamily:"'Noto Sans',sans-serif"}}>Owner and guest PINs both accepted</div>
      )}
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}`}</style>
    </div>
  );
}

function LoginScreen({ onLogin }) {
  // Public-facing screen — default to Lao per OQ-012 Lao-first positioning
  const lang = "lo";
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("+856");
  const kbOffset = useKeyboardOffset();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const CODES = [
    { flag:"🇱🇦", code:"+856", name:"Laos" },{ flag:"🇹🇭", code:"+66", name:"Thailand" },
    { flag:"🇺🇸", code:"+1", name:"USA" },{ flag:"🇬🇧", code:"+44", name:"UK" },
    { flag:"🇸🇬", code:"+65", name:"Singapore" },{ flag:"🇨🇳", code:"+86", name:"China" },
    { flag:"🇯🇵", code:"+81", name:"Japan" },{ flag:"🇰🇷", code:"+82", name:"Korea" },
    { flag:"🇻🇳", code:"+84", name:"Vietnam" },{ flag:"🇰🇭", code:"+855", name:"Cambodia" },
    { flag:"🇲🇲", code:"+95", name:"Myanmar" },{ flag:"🇦🇺", code:"+61", name:"Australia" },
  ];
  const submit = async () => {
    if (!phone.trim() || phone.trim().length < 6) { setError("Please enter a valid phone number"); return; }
    setLoading(true); setError("");
    try {
      const { user, isNew, phone: fullPhone, countryCode } = await signInWithPhone(phone.trim(), code);
      onLogin(user, isNew, fullPhone, countryCode);
    } catch (e) {
      setError(e.message?.includes("422") ? "Invalid phone number format." : "Could not sign in. Please try again.");
      setLoading(false);
    }
  };
  return (
    <div style={{ minHeight:"100dvh", background:T.bg, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", padding:"24px 20px", position:"relative", overflow:"hidden" }}>
      <AnimalBg />
      <div style={{ textAlign:"center", marginBottom:36, zIndex:1, display:"flex", flexDirection:"column", alignItems:"center" }}>
        <Logo size={180} />
        <div style={{ fontFamily:"'Noto Sans',sans-serif", fontSize:28, fontWeight:800, color:T.dark, letterSpacing:-1, marginTop:8 }}>Phajot · ພາຈົດ</div>
        <div style={{ fontSize:13, color:T.muted, marginTop:6, textAlign:"center", maxWidth:320, lineHeight:1.5, fontFamily:"'Noto Sans',sans-serif", fontWeight:400 }}>{t(lang,"slogan")}</div>
      </div>
      <div style={{ background:T.surface, backdropFilter:"blur(20px)", borderRadius:28,
        padding:"28px 24px", width:"100%", maxWidth:380, boxShadow:T.shadowLg, zIndex:1,
        transform:kbOffset>0?`translateY(-${Math.min(kbOffset*0.6,180)}px)`:undefined,
        transition:"transform .3s ease" }}>
        <div style={{ fontWeight:800, fontSize:18, color:T.dark, marginBottom:6, fontFamily:"'Noto Sans',sans-serif" }}>Welcome back 👋</div>
        <div style={{ fontSize:13, color:T.muted, marginBottom:22, lineHeight:1.5 }}>
          Enter your phone number to continue. First time? We'll set you up automatically.
        </div>
        <div style={{ display:"flex", gap:8, marginBottom:14 }}>
          <select value={code} onChange={e=>setCode(e.target.value)} style={{ padding:"13px 10px", borderRadius:14, border:"1.5px solid rgba(45,45,58,0.12)", background:"rgba(172,225,175,0.06)", fontSize:14, color:T.dark, fontFamily:"'Noto Sans',sans-serif", outline:"none", cursor:"pointer", flexShrink:0 }}>
            {CODES.map(c=><option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
          </select>
          <input value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,""))} onKeyDown={e=>e.key==="Enter"&&submit()}
            placeholder="20 123 4567" type="tel" autoFocus
            style={{ flex:1, padding:"13px 16px", borderRadius:14, border:`1.5px solid ${phone.length>5?"#ACE1AF":"rgba(45,45,58,0.12)"}`, background:"rgba(172,225,175,0.06)", fontSize:15, color:T.dark, fontFamily:"'Noto Sans',sans-serif", outline:"none", transition:"border-color .2s ease" }}/>
        </div>
        {error&&(<div style={{ fontSize:13, color:"#C0392B", marginBottom:12, padding:"8px 12px", borderRadius:10, background:"rgba(255,179,167,0.15)" }}>{error}</div>)}
        <button onClick={submit} disabled={loading} style={{ width:"100%", padding:"15px", borderRadius:18, border:"none", cursor:"pointer", background:loading?"rgba(172,225,175,0.4)":"linear-gradient(145deg,#ACE1AF,#7BC8A4)", color:"#1A4020", fontWeight:800, fontSize:16, fontFamily:"'Noto Sans',sans-serif", boxShadow:loading?"none":"0 6px 24px rgba(172,225,175,0.5)", transition:"all .2s ease" }}>
          {loading ? "Signing in…" : "Continue →"}
        </button>
        <div style={{ textAlign:"center", marginTop:16, fontSize:11, color:T.muted, lineHeight:1.6 }}>
          Your phone number is your identity. No password needed.<br/>Your data is saved securely and syncs across all your devices.
        </div>
      </div>
    </div>
  );
}

// ═══ ROOT APP ════════════════════════════════════════════════
export default function App(){
  const [profile, setProfile]           = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [booting, setBooting]           = useState(true);
  const [userId, setUserId]             = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [streakToast, setStreakToast]   = useState(null);

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
    localStorage.setItem("phanote_pins", JSON.stringify(cfg));
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
      if (event === "TOKEN_REFRESHED" && session?.user) await loadUserData(session.user.id);
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
          userId: uid,
        });
        supabase.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", uid).then(()=>{});
        dbTrackEvent(uid, "app_open").then(()=>{});
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
      const pinCfg = pinRow?.pin_config || JSON.parse(localStorage.getItem("phanote_pins") || "null") || {owner:null,guest:null};
      setPinConfig(pinCfg);
      localStorage.setItem("phanote_pins", JSON.stringify(pinCfg));
      if (pinCfg?.owner) setPinRole(null);
    } catch {
      const pinCfg = JSON.parse(localStorage.getItem("phanote_pins") || "null");
      if (pinCfg?.owner) setPinRole(null);
    }
    setLoadingProfile(false);
  };

  const handleLogin = async (user, isNew, phone, countryCode) => {
    setUserId(user.id);
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
      if (bonusToast) setStreakToast(bonusToast);
    } catch (e) { console.error("Save tx error:", e); }
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
    } catch (e) { console.error("Update error:", e); }
  };

  const handleDeleteTransaction = async (txId) => {
    if (!window.confirm("Delete this transaction?")) return;
    setTransactions(prev => prev.filter(tx => tx.id !== txId));
    try {
      await dbUpdateTransaction(txId, { is_deleted: true, deleted_at: new Date().toISOString() });
      await dbTrackEvent(userId, "transaction_deleted", { txId });
    } catch (e) { console.error(e); }
  };

  const handleReset = async () => {
    if (!window.confirm(t(profile?.lang||"lo","reset_confirm"))) return;
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

  return (
    <>
      {(pinRole === null || pinSetupMode) && (
        <PinLock
          pinConfig={pinConfig}
          pinInput={pinInput}
          pinShake={pinShake}
          onKey={pinSetupMode ? handleSetupKey : handlePinKey}
          isSetup={!!pinSetupMode}
          setupMode={pinSetupMode}
          setupStep={pinSetupStep}
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
          streakToast={streakToast}
          onStreakToastDone={()=>setStreakToast(null)}
          pinRole={pinRole}
          pinConfig={pinConfig}
          savePinConfig={savePinConfig}
          setPinRole={setPinRole}
          setPinSetupMode={(mode)=>{ setPinSetupMode(mode); setPinInput(""); setPinSetupStep("enter"); setPinSetupFirst(""); }}
        />
      )}
    </>
  );
}