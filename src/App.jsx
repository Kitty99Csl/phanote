/**
 * PHANOTE — Phase 1 MVP
 * ═══════════════════════════════════════════════════════════
 * Full app: Onboarding → Home (Wallet + AI Quick-Add + Transactions)
 *
 * TO ACTIVATE SUPABASE:
 *   1. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env
 *   2. npm install @supabase/supabase-js
 *   3. Uncomment the Supabase sections marked [SUPABASE]
 *
 * TO ACTIVATE GEMINI (via your Cloudflare Worker):
 *   1. Deploy workers/gemini-parser.js (template below)
 *   2. Set VITE_WORKER_URL in .env
 *   3. Uncomment [GEMINI] sections, comment out [ANTHROPIC] section
 *
 * AI PARSING NOTE:
 *   This demo uses the Anthropic API directly for prototyping.
 *   Per the Phanote Codex §16 Rule 3: move AI calls to
 *   your Cloudflare Worker before going to production.
 */

import { useState, useEffect, useRef, useCallback } from "react";

// ─── SUPABASE CLIENT [SUPABASE] ─────────────────────────────
// import { createClient } from "@supabase/supabase-js";
// const supabase = createClient(
//   import.meta.env.VITE_SUPABASE_URL,
//   import.meta.env.VITE_SUPABASE_ANON_KEY
// );
// ────────────────────────────────────────────────────────────

const SUPABASE_URL = "https://mmvyipjbufafqfjdcuqj.supabase.co";

// ─── DESIGN TOKENS ──────────────────────────────────────────
const T = {
  primary:    "#C9B8FF",
  celadon:    "#ACE1AF",
  bg:         "#F7FCF5",
  surface:    "rgba(255,255,255,0.88)",
  dark:       "#2D2D3A",
  muted:      "#9B9BAD",
  expense:    "#FFB3A7",
  income:     "#ACE1AF",
  radius:     "20px",
  radiusSm:   "14px",
  shadow:     "0 4px 24px rgba(45,45,58,0.07)",
  shadowLg:   "0 12px 40px rgba(45,45,58,0.13)",
};

// ─── CURRENCY CONFIG ─────────────────────────────────────────
const CURR = {
  LAK: {
    symbol: "₭", name: "Lao Kip",
    bg: "linear-gradient(145deg, #FFE27D 0%, #FFAA5E 100%)",
    pill: "#FFAA5E", pillText: "#7A3E00",
  },
  THB: {
    symbol: "฿", name: "Thai Baht",
    bg: "linear-gradient(145deg, #C9B8FF 0%, #A8C5FF 100%)",
    pill: "#C9B8FF", pillText: "#3A2A7A",
  },
  USD: {
    symbol: "$", name: "US Dollar",
    bg: "linear-gradient(145deg, #ACE1AF 0%, #7BC8A4 100%)",
    pill: "#ACE1AF", pillText: "#1A4D2B",
  },
};

const fmt = (amount, currency) => {
  const { symbol } = CURR[currency];
  if (currency === "LAK") return `${symbol}${Math.round(amount).toLocaleString()}`;
  return `${symbol}${Number(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
};

const fmtCompact = (amount, currency) => {
  if (currency === "LAK") {
    if (amount >= 1_000_000) return `₭${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `₭${(amount / 1_000).toFixed(0)}K`;
    return `₭${Math.round(amount)}`;
  }
  const sym = CURR[currency].symbol;
  if (amount >= 1000) return `${sym}${(amount / 1000).toFixed(1)}K`;
  return `${sym}${Number(amount).toFixed(2)}`;
};

// ─── TRANSLATIONS ─────────────────────────────────────────────
const i18n = {
  en: {
    welcome: "Welcome to Phanote",
    tagline: "ພາໂນດ · พาโนด · Your money, your story",
    pick_lang: "Choose your language",
    pick_currency: "Your main currency",
    pick_expense_cats: "Select your expense categories",
    pick_income_cats: "Select your income categories",
    next: "Next →",
    start: "Start tracking! 🐾",
    morning: "Good morning",
    afternoon: "Good afternoon",
    evening: "Good evening",
    balance: "Balance",
    income_label: "Income",
    expense_label: "Expenses",
    this_month: "this month",
    placeholder: 'e.g. "coffee 45000 LAK" or "ເຂົ້າ 50,000" or "กาแฟ 95 บาท"',
    parsing: "Reading your transaction…",
    recent: "Recent",
    today: "Today",
    yesterday: "Yesterday",
    empty: "No transactions yet",
    empty_sub: "Type anything above to log your first one",
    home: "Home",
    analytics: "Analytics",
    budget: "Budget",
    settings: "Settings",
    coming_soon: "Coming in Phase 2",
    confirm_q: "Did you mean?",
    confirm_yes: "Yes, save it",
    confirm_edit: "Let me fix it",
    reset: "Reset app",
    reset_confirm: "This will clear all data. Are you sure?",
  },
  lo: {
    welcome: "ຍິນດີຕ້ອນຮັບ Phanote",
    tagline: "ພາໂນດ — ຕິດຕາມການເງິນຂອງທ່ານ",
    pick_lang: "ເລືອກພາສາ",
    pick_currency: "ສະກຸນເງິນຫຼັກ",
    pick_expense_cats: "ເລືອກໝວດລາຍຈ່າຍ",
    pick_income_cats: "ເລືອກໝວດລາຍຮັບ",
    next: "ຕໍ່ໄປ →",
    start: "ເລີ່ມເລີຍ! 🐾",
    morning: "ສະບາຍດີຕອນເຊົ້າ",
    afternoon: "ສະບາຍດີຕອນທ່ຽງ",
    evening: "ສະບາຍດີຕອນແລງ",
    balance: "ຍອດເງິນ",
    income_label: "ລາຍຮັບ",
    expense_label: "ລາຍຈ່າຍ",
    this_month: "ເດືອນນີ້",
    placeholder: "ພິມຕາມສະດວກ… ເຊັ່ນ: ເຂົ້າປຽກ 50,000 LAK",
    parsing: "ກຳລັງວິເຄາະ…",
    recent: "ລ່າສຸດ",
    today: "ມື້ນີ້",
    yesterday: "ມື້ວານ",
    empty: "ຍັງບໍ່ມີລາຍການ",
    empty_sub: "ພິມດ້ານເທິງເພື່ອບັນທຶກ",
    home: "ຫນ້າຫລັກ",
    analytics: "ວິເຄາະ",
    budget: "ງົບ",
    settings: "ຕັ້ງຄ່າ",
    coming_soon: "ມາໃນ Phase 2",
    confirm_q: "ຖືກຕ້ອງບໍ?",
    confirm_yes: "ຖືກ, ບັນທຶກ",
    confirm_edit: "ແກ້ໄຂ",
    reset: "ລ້າງຂໍ້ມູນ",
    reset_confirm: "ຈະລ້າງທຸກຂໍ້ມູນ. ແນ່ໃຈບໍ?",
  },
  th: {
    welcome: "ยินดีต้อนรับสู่ Phanote",
    tagline: "พาโนด — ติดตามการเงินของคุณ",
    pick_lang: "เลือกภาษา",
    pick_currency: "สกุลเงินหลัก",
    pick_expense_cats: "เลือกหมวดรายจ่าย",
    pick_income_cats: "เลือกหมวดรายรับ",
    next: "ถัดไป →",
    start: "เริ่มเลย! 🐾",
    morning: "อรุณสวัสดิ์",
    afternoon: "สวัสดีตอนบ่าย",
    evening: "สวัสดีตอนเย็น",
    balance: "ยอดเงิน",
    income_label: "รายรับ",
    expense_label: "รายจ่าย",
    this_month: "เดือนนี้",
    placeholder: "พิมพ์ตามสะดวก… เช่น กาแฟ 95 บาท",
    parsing: "กำลังวิเคราะห์…",
    recent: "ล่าสุด",
    today: "วันนี้",
    yesterday: "เมื่อวาน",
    empty: "ยังไม่มีรายการ",
    empty_sub: "พิมพ์ด้านบนเพื่อบันทึก",
    home: "หน้าหลัก",
    analytics: "วิเคราะห์",
    budget: "งบประมาณ",
    settings: "ตั้งค่า",
    coming_soon: "มาใน Phase 2",
    confirm_q: "ถูกต้องไหม?",
    confirm_yes: "ใช่ บันทึก",
    confirm_edit: "แก้ไข",
    reset: "ล้างข้อมูล",
    reset_confirm: "จะลบข้อมูลทั้งหมด ยืนยันไหม?",
  },
};

const t = (lang, key) => i18n[lang]?.[key] || i18n.en[key] || key;

// ─── DEFAULT CATEGORIES ───────────────────────────────────────
const EXPENSE_CATS = [
  { id: "food",          emoji: "🍜", en: "Food",          lo: "ອາຫານ",       th: "อาหาร" },
  { id: "transport",     emoji: "🛵", en: "Transport",     lo: "ຂົນສົ່ງ",      th: "เดินทาง" },
  { id: "rent",          emoji: "🏠", en: "Rent / Bills",  lo: "ຄ່າເຊົ່າ",     th: "ค่าเช่า" },
  { id: "shopping",      emoji: "🛍️", en: "Shopping",     lo: "ຊື້ເຄື່ອງ",    th: "ช้อปปิ้ง" },
  { id: "health",        emoji: "💊", en: "Health",        lo: "ສຸຂະພາບ",      th: "สุขภาพ" },
  { id: "entertainment", emoji: "🎉", en: "Entertainment", lo: "ບັນເທີງ",      th: "บันเทิง" },
  { id: "other",         emoji: "📦", en: "Other",         lo: "ອື່ນໆ",        th: "อื่นๆ" },
];

const INCOME_CATS = [
  { id: "salary",     emoji: "💼", en: "Salary",     lo: "ເງິນເດືອນ",     th: "เงินเดือน" },
  { id: "freelance",  emoji: "💰", en: "Freelance",  lo: "ຟຣີແລນ",        th: "ฟรีแลนซ์" },
  { id: "gift",       emoji: "🎁", en: "Gift",       lo: "ຂອງຂວັນ",       th: "ของขวัญ" },
  { id: "investment", emoji: "📈", en: "Investment", lo: "ການລົງທຶນ",      th: "การลงทุน" },
  { id: "other_inc",  emoji: "📦", en: "Other",      lo: "ອື່ນໆ",          th: "อื่นๆ" },
];

const ALL_CATS = [...EXPENSE_CATS, ...INCOME_CATS];

const catLabel = (cat, lang) =>
  (lang === "lo" ? cat.lo : lang === "th" ? cat.th : cat.en) || cat.en;

const findCat = (id) => ALL_CATS.find((c) => c.id === id) || ALL_CATS[0];

// ─── STORAGE HELPERS (localStorage) ──────────────────────────
// [SUPABASE] swap these for supabase calls in production
const store = {
  get: (key) => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
  set: (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} },
  del: (key) => { try { localStorage.removeItem(key); } catch {} },
};

// ─── AI PARSER ────────────────────────────────────────────────
const PARSE_SYSTEM = `You are a financial transaction parser for a personal finance app used in Laos.
The user may write in Lao, Thai, English, or any mixture of all three.
Currencies: LAK (Lao Kip, default), THB (Thai Baht), USD (US Dollar).
Infer expense vs income from context — salary/income words = income, everything else = expense.

Extract and return ONLY valid JSON (no markdown, no explanation):
{
  "amount": <number>,
  "currency": "LAK"|"THB"|"USD",
  "type": "expense"|"income",
  "category": "food"|"transport"|"rent"|"shopping"|"health"|"entertainment"|"salary"|"freelance"|"gift"|"investment"|"other",
  "description": "<short cleaned label>",
  "confidence": <0.0-1.0>
}`;

// [ANTHROPIC] — Prototype only. Move to Cloudflare Worker for production.
const parseWithAI = async (text) => {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 200,
        system: PARSE_SYSTEM,
        messages: [{ role: "user", content: text }],
      }),
    });
    const data = await res.json();
    const raw = data.content?.[0]?.text || "{}";
    return JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch {
    // Fallback: simple regex parse
    const numMatch = text.match(/[\d,]+(?:\.\d+)?/);
    const amount = numMatch ? parseFloat(numMatch[0].replace(/,/g, "")) : 0;
    const currency =
      /THB|baht|บาท/i.test(text) ? "THB" :
      /USD|dollar|\$/i.test(text) ? "USD" : "LAK";
    return { amount, currency, type: /income|salary|freelance|gift|investment/i.test(text) ? "income" : "expense", category: "other",
             description: text.slice(0, 40), confidence: 0.4 };
  }
};

// [GEMINI via Worker] — Uncomment for production:
// const parseWithAI = async (text) => {
//   const res = await fetch(`${import.meta.env.VITE_WORKER_URL}/parse`, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ text }),
//   });
//   return res.json();
// };

// ─── TOAST MESSAGES ───────────────────────────────────────────
const TOASTS = {
  expense: [
    (desc, amt, cur) => `${desc} — ${fmt(amt, cur)} logged. Every kip tracked! 🐾`,
    (desc, amt, cur) => `${fmt(amt, cur)} out for ${desc}. You're on it. ✨`,
    (desc) => `${desc} done. Noted with care. 🌿`,
  ],
  income: [
    (desc, amt, cur) => `${fmt(amt, cur)} in! ${desc} — let's track it well together. 💚`,
    (desc, amt, cur) => `${desc} — +${fmt(amt, cur)} added. Money in! 🎉`,
  ],
};

const randomToast = (tx) => {
  const pool = TOASTS[tx.type];
  const fn = pool[Math.floor(Math.random() * pool.length)];
  return fn(tx.description, tx.amount, tx.currency);
};

// ═══════════════════════════════════════════════════════════════
// SHARED UI PRIMITIVES
// ═══════════════════════════════════════════════════════════════

const AnimalBg = () => (
  <svg
    aria-hidden="true"
    style={{ position: "fixed", inset: 0, width: "100%", height: "100%",
             opacity: 0.05, pointerEvents: "none", zIndex: 0 }}
  >
    <defs>
      <pattern id="phanote-bg" x="0" y="0" width="240" height="240" patternUnits="userSpaceOnUse">
        {/* Capybara */}
        <ellipse cx="50" cy="72" rx="32" ry="18" fill="#ACE1AF" />
        <ellipse cx="50" cy="56" rx="20" ry="15" fill="#ACE1AF" />
        <ellipse cx="64" cy="50" rx="11" ry="8" fill="#ACE1AF" />
        <circle cx="69" cy="45" r="4" fill="#ACE1AF" />
        {/* Cat */}
        <ellipse cx="180" cy="170" rx="24" ry="16" fill="#C9B8FF" />
        <ellipse cx="180" cy="156" rx="16" ry="14" fill="#C9B8FF" />
        <polygon points="168,145 172,132 178,145" fill="#C9B8FF" />
        <polygon points="182,145 188,132 194,145" fill="#C9B8FF" />
        {/* Red panda */}
        <ellipse cx="120" cy="120" rx="26" ry="17" fill="#FFB3A7" />
        <ellipse cx="120" cy="104" rx="16" ry="14" fill="#FFB3A7" />
        <circle cx="112" cy="100" r="5" fill="#FFB3A7" />
        <circle cx="128" cy="100" r="5" fill="#FFB3A7" />
        {/* Paw prints */}
        <circle cx="200" cy="40" r="5" fill="#ACE1AF" />
        <circle cx="192" cy="31" r="3" fill="#ACE1AF" />
        <circle cx="200" cy="29" r="3" fill="#ACE1AF" />
        <circle cx="208" cy="31" r="3" fill="#ACE1AF" />
        <circle cx="28" cy="200" r="5" fill="#C9B8FF" />
        <circle cx="20" cy="191" r="3" fill="#C9B8FF" />
        <circle cx="28" cy="189" r="3" fill="#C9B8FF" />
        <circle cx="36" cy="191" r="3" fill="#C9B8FF" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#phanote-bg)" />
  </svg>
);

const Toast = ({ msg, onDone }) => {
  useEffect(() => {
    const id = setTimeout(onDone, 4500);
    return () => clearTimeout(id);
  }, [onDone]);

  return (
    <div style={{
      position: "fixed", bottom: 90, left: "50%",
      transform: "translateX(-50%)",
      background: "rgba(30,30,40,0.93)", backdropFilter: "blur(14px)",
      color: "#fff", borderRadius: 18, padding: "12px 22px",
      fontSize: 13, lineHeight: 1.5, maxWidth: 320, textAlign: "center",
      zIndex: 999, boxShadow: "0 6px 28px rgba(0,0,0,0.22)",
      animation: "toastIn .3s cubic-bezier(.34,1.56,.64,1)",
      fontFamily: "'Noto Sans', sans-serif",
    }}>
      {msg}
    </div>
  );
};

const Pill = ({ children, active, color = T.celadon, onClick, small }) => (
  <button onClick={onClick} style={{
    padding: small ? "5px 12px" : "8px 16px",
    borderRadius: 999, border: "none", cursor: "pointer",
    background: active ? color : "rgba(172,225,175,0.12)",
    color: active ? "#1A4020" : T.muted,
    fontWeight: active ? 700 : 500,
    fontSize: small ? 12 : 13,
    fontFamily: "'Noto Sans', sans-serif",
    transition: "all .2s ease",
    transform: active ? "scale(1.04)" : "scale(1)",
    boxShadow: active ? `0 3px 10px ${color}66` : "none",
    whiteSpace: "nowrap",
  }}>
    {children}
  </button>
);

// ═══════════════════════════════════════════════════════════════
// ONBOARDING
// ═══════════════════════════════════════════════════════════════

function OnboardingScreen({ onComplete }) {
  const [step, setStep] = useState(0); // 0=lang 1=currency 2=expense-cats 3=income-cats
  const [lang, setLang] = useState("en");
  const [baseCurrency, setBaseCurrency] = useState("LAK");
  const [expCats, setExpCats] = useState(EXPENSE_CATS.map((c) => c.id));
  const [incCats, setIncCats] = useState(INCOME_CATS.map((c) => c.id));

  const toggleCat = (id, list, setList) => {
    if (list.includes(id)) {
      if (list.length > 1) setList(list.filter((x) => x !== id));
    } else {
      setList([...list, id]);
    }
  };

  const advance = () => {
    if (step < 3) { setStep(step + 1); return; }
    onComplete({ lang, baseCurrency, expCats, incCats });
  };

  const cfg = CURR[baseCurrency];

  return (
    <div style={{
      minHeight: "100dvh", background: T.bg,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "24px 20px", position: "relative", overflow: "hidden",
    }}>
      <AnimalBg />

      {/* Wordmark */}
      <div style={{ textAlign: "center", marginBottom: 36, zIndex: 1 }}>
        <div style={{ fontSize: 48, lineHeight: 1 }}>🐾</div>
        <div style={{
          fontFamily: "'Noto Sans', sans-serif", fontSize: 32,
          fontWeight: 800, color: T.dark, letterSpacing: -1, marginTop: 8,
        }}>Phanote</div>
        <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
          ພາໂນດ · พาโนด
        </div>
      </div>

      {/* Step dots */}
      <div style={{ display: "flex", gap: 6, marginBottom: 28, zIndex: 1 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{
            height: 6, width: i === step ? 28 : 8,
            borderRadius: 3,
            background: i <= step ? T.celadon : "rgba(172,225,175,0.25)",
            transition: "all .35s cubic-bezier(.34,1.56,.64,1)",
          }} />
        ))}
      </div>

      {/* Card */}
      <div style={{
        background: T.surface, backdropFilter: "blur(20px)",
        borderRadius: 28, padding: "28px 24px",
        width: "100%", maxWidth: 400,
        boxShadow: T.shadowLg, zIndex: 1,
      }}>

        {/* ── Step 0: Language ── */}
        {step === 0 && (
          <>
            <h2 style={S.cardTitle}>{t(lang, "welcome")}</h2>
            <p style={S.cardSub}>{t(lang, "tagline")}</p>
            <p style={S.label}>{t(lang, "pick_lang")}</p>
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              {[
                { code: "lo", flag: "🇱🇦", label: "ລາວ" },
                { code: "th", flag: "🇹🇭", label: "ไทย" },
                { code: "en", flag: "🇬🇧", label: "English" },
              ].map(({ code, flag, label }) => (
                <button key={code} onClick={() => setLang(code)} style={{
                  flex: 1, padding: "16px 8px", borderRadius: 18,
                  border: "none", cursor: "pointer",
                  background: lang === code
                    ? "linear-gradient(145deg,#ACE1AF,#7BC8A4)"
                    : "rgba(172,225,175,0.1)",
                  transform: lang === code ? "scale(1.06)" : "scale(1)",
                  boxShadow: lang === code ? "0 4px 16px rgba(172,225,175,0.4)" : "none",
                  transition: "all .25s ease",
                }}>
                  <div style={{ fontSize: 26 }}>{flag}</div>
                  <div style={{
                    fontSize: 13, fontWeight: 700, color: T.dark,
                    marginTop: 6, fontFamily: "'Noto Sans', sans-serif",
                  }}>{label}</div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Step 1: Base currency ── */}
        {step === 1 && (
          <>
            <h2 style={S.cardTitle}>{t(lang, "pick_currency")}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
              {Object.entries(CURR).map(([code, c]) => (
                <button key={code} onClick={() => setBaseCurrency(code)} style={{
                  display: "flex", alignItems: "center", gap: 16,
                  padding: "16px 18px", borderRadius: 18,
                  border: "none", cursor: "pointer",
                  background: baseCurrency === code ? c.bg : "rgba(172,225,175,0.08)",
                  transition: "all .25s ease",
                  boxShadow: baseCurrency === code ? T.shadow : "none",
                  transform: baseCurrency === code ? "scale(1.02)" : "scale(1)",
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 14,
                    background: "rgba(255,255,255,0.55)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 24, fontWeight: 900, color: T.dark,
                    fontFamily: "'Noto Sans', sans-serif",
                  }}>{c.symbol}</div>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontWeight: 700, fontSize: 16, color: T.dark }}>{code}</div>
                    <div style={{ fontSize: 12, color: baseCurrency === code ? "rgba(45,45,58,0.6)" : T.muted }}>
                      {c.name}
                    </div>
                  </div>
                  {baseCurrency === code && (
                    <div style={{ marginLeft: "auto", fontSize: 18, color: T.dark }}>✓</div>
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Step 2: Expense cats ── */}
        {step === 2 && (
          <>
            <h2 style={S.cardTitle}>{t(lang, "pick_expense_cats")}</h2>
            <p style={S.cardSub}>Tap to toggle — at least one required</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
              {EXPENSE_CATS.map((cat) => {
                const on = expCats.includes(cat.id);
                return (
                  <button key={cat.id} onClick={() => toggleCat(cat.id, expCats, setExpCats)} style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "8px 14px", borderRadius: 14, border: "none", cursor: "pointer",
                    background: on ? "rgba(255,179,167,0.35)" : "rgba(172,225,175,0.1)",
                    fontWeight: on ? 700 : 500, fontSize: 13,
                    color: T.dark, fontFamily: "'Noto Sans', sans-serif",
                    transform: on ? "scale(1.06)" : "scale(1)",
                    transition: "all .2s ease",
                  }}>
                    <span style={{ fontSize: 16 }}>{cat.emoji}</span>
                    {catLabel(cat, lang)}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* ── Step 3: Income cats ── */}
        {step === 3 && (
          <>
            <h2 style={S.cardTitle}>{t(lang, "pick_income_cats")}</h2>
            <p style={S.cardSub}>Tap to toggle — at least one required</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
              {INCOME_CATS.map((cat) => {
                const on = incCats.includes(cat.id);
                return (
                  <button key={cat.id} onClick={() => toggleCat(cat.id, incCats, setIncCats)} style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "8px 14px", borderRadius: 14, border: "none", cursor: "pointer",
                    background: on ? "rgba(172,225,175,0.35)" : "rgba(172,225,175,0.1)",
                    fontWeight: on ? 700 : 500, fontSize: 13,
                    color: T.dark, fontFamily: "'Noto Sans', sans-serif",
                    transform: on ? "scale(1.06)" : "scale(1)",
                    transition: "all .2s ease",
                  }}>
                    <span style={{ fontSize: 16 }}>{cat.emoji}</span>
                    {catLabel(cat, lang)}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* CTA */}
      <button onClick={advance} style={{
        marginTop: 24, padding: "16px 52px", borderRadius: 24,
        border: "none", cursor: "pointer",
        background: "linear-gradient(145deg,#ACE1AF,#7BC8A4)",
        color: "#1A4020", fontWeight: 800, fontSize: 16,
        fontFamily: "'Noto Sans', sans-serif",
        boxShadow: "0 6px 24px rgba(172,225,175,0.5)",
        zIndex: 1, transition: "transform .15s ease",
      }}
        onPointerDown={(e) => (e.currentTarget.style.transform = "scale(0.96)")}
        onPointerUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        {step < 3 ? t(lang, "next") : t(lang, "start")}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SVG FLAGS
// ═══════════════════════════════════════════════════════════════

const Flag = ({ code, size = 32 }) => {
  const w = size, h = Math.round(size * 0.67), r = Math.round(size * 0.12);
  const flags = {
    USD: (
      <svg width={w} height={h} viewBox="0 0 60 40">
        {[0,1,2,3,4,5,6,7,8,9,10,11,12].map(i =>
          <rect key={i} y={i*3.08} width="60" height="3.08" fill={i%2===0?"#B22234":"#fff"}/>
        )}
        <rect width="24" height="21.5" fill="#3C3B6E"/>
        {[[2,2],[6,2],[10,2],[14,2],[18,2],[4,4.5],[8,4.5],[12,4.5],[16,4.5],
          [2,7],[6,7],[10,7],[14,7],[18,7],[4,9.5],[8,9.5],[12,9.5],[16,9.5],
          [2,12],[6,12],[10,12],[14,12],[18,12],[4,14.5],[8,14.5],[12,14.5],[16,14.5],
          [2,17],[6,17],[10,17],[14,17],[18,17]].map(([x,y],i) =>
          <circle key={i} cx={x+1.5} cy={y+1} r="0.9" fill="#fff"/>
        )}
      </svg>
    ),
    THB: (
      <svg width={w} height={h} viewBox="0 0 60 40">
        <rect width="60" height="40" fill="#A51931"/>
        <rect y="6.67" width="60" height="26.67" fill="#F4F5F8"/>
        <rect y="13.33" width="60" height="13.33" fill="#2D2A4A"/>
      </svg>
    ),
    LAK: (
      <svg width={w} height={h} viewBox="0 0 60 40">
        <rect width="60" height="40" fill="#CE1126"/>
        <rect y="10" width="60" height="20" fill="#002868"/>
        <circle cx="30" cy="20" r="6.5" fill="#fff"/>
      </svg>
    ),
  };
  return (
    <div style={{
      width: w, height: h, borderRadius: r, overflow: "hidden",
      flexShrink: 0, filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.15))",
      display: "inline-flex",
    }}>
      {flags[code]}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// WALLET CARDS — BCEL list style (tap row to expand)
// ═══════════════════════════════════════════════════════════════

function WalletCards({ transactions, lang }) {
  const [expanded, setExpanded] = useState(null);
  const currencies = ["LAK", "THB", "USD"];

  const getStats = (cur) => {
    const now = new Date();
    const mo = now.getMonth(), yr = now.getFullYear();
    const monthly = transactions.filter((tx) => {
      const d = new Date(tx.date);
      return d.getMonth() === mo && d.getFullYear() === yr && tx.currency === cur;
    });
    const allCur = transactions.filter((tx) => tx.currency === cur);
    const allIn  = allCur.filter((x) => x.type === "income").reduce((s, x) => s + x.amount, 0);
    const allOut = allCur.filter((x) => x.type === "expense").reduce((s, x) => s + x.amount, 0);
    const moIn   = monthly.filter((x) => x.type === "income").reduce((s, x) => s + x.amount, 0);
    const moOut  = monthly.filter((x) => x.type === "expense").reduce((s, x) => s + x.amount, 0);
    return { balance: allIn - allOut, income: moIn, expenses: moOut };
  };

  const toggle = (cur) => setExpanded(expanded === cur ? null : cur);

  return (
    <div style={{ padding: "0 16px" }}>
      <div style={{
        background: T.surface, backdropFilter: "blur(20px)",
        borderRadius: 24, boxShadow: T.shadowLg, overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "14px 20px 10px",
          fontSize: 10, fontWeight: 700, letterSpacing: 1.4,
          color: T.muted, textTransform: "uppercase",
          fontFamily: "'Noto Sans', sans-serif",
        }}>
          All Wallets
        </div>

        {currencies.map((cur, i) => {
          const cfg   = CURR[cur];
          const stats = getStats(cur);
          const open  = expanded === cur;
          const bal   = stats.balance;

          return (
            <div key={cur}>
              {/* Divider */}
              {i > 0 && (
                <div style={{ height: 1, background: "rgba(45,45,58,0.05)", margin: "0 20px" }} />
              )}

              {/* Main row */}
              <div
                onClick={() => toggle(cur)}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 20px", cursor: "pointer",
                  transition: "background .15s ease",
                }}
                onPointerEnter={e => e.currentTarget.style.background = "rgba(172,225,175,0.06)"}
                onPointerLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <Flag code={cur} size={36} />
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 15, fontWeight: 700, color: T.dark,
                    fontFamily: "'Noto Sans', sans-serif",
                  }}>{cfg.name}</div>
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>
                    {cur} · {cfg.symbol}
                  </div>
                </div>
                <div style={{
                  fontSize: 20, fontWeight: 800, color: bal < 0 ? "#C0392B" : T.dark,
                  fontFamily: "'Noto Sans', sans-serif", letterSpacing: -0.5,
                }}>
                  {bal < 0 && "−"}{cfg.symbol}{Math.abs(bal).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
                <div style={{
                  fontSize: 12, color: T.muted,
                  transform: open ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform .25s ease", marginLeft: 4,
                }}>▾</div>
              </div>

              {/* Expanded income/expense breakdown */}
              {open && (
                <div style={{
                  display: "flex", gap: 10, padding: "4px 20px 16px",
                  animation: "slideDown .2s ease",
                }}>
                  <div style={{
                    flex: 1, padding: "10px 14px", borderRadius: 14,
                    background: "rgba(172,225,175,0.15)",
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8,
                      color: "#2A7A40", textTransform: "uppercase" }}>Income</div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: "#1A5A30", marginTop: 4,
                      fontFamily: "'Noto Sans', sans-serif" }}>
                      +{fmt(stats.income, cur)}
                    </div>
                  </div>
                  <div style={{
                    flex: 1, padding: "10px 14px", borderRadius: 14,
                    background: "rgba(255,179,167,0.15)",
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8,
                      color: "#A03020", textTransform: "uppercase" }}>Expenses</div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: "#C0392B", marginTop: 4,
                      fontFamily: "'Noto Sans', sans-serif" }}>
                      −{fmt(stats.expenses, cur)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CONFIRM MODAL
// ═══════════════════════════════════════════════════════════════

function ConfirmModal({ parsed, lang, onConfirm, onEdit }) {
  const cat = findCat(parsed.category);
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(30,30,40,0.5)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }}>
      <div style={{
        background: "#fff", borderRadius: "28px 28px 0 0",
        padding: "28px 24px 100px",
        width: "100%", maxWidth: 430,
        animation: "slideUp .35s cubic-bezier(.34,1.2,.64,1)",
      }}>
        <div style={{ fontSize: 13, color: T.muted, fontWeight: 600, marginBottom: 16 }}>
          {t(lang, "confirm_q")}
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 14,
          background: T.bg, borderRadius: 20, padding: "16px 18px", marginBottom: 20,
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16, fontSize: 26,
            background: parsed.type === "expense"
              ? "rgba(255,179,167,0.25)" : "rgba(172,225,175,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>{cat.emoji}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: T.dark,
              fontFamily: "'Noto Sans', sans-serif" }}>
              {parsed.description}
            </div>
            <div style={{ fontSize: 13, color: T.muted, marginTop: 2 }}>
              {catLabel(cat, lang)} · {parsed.currency}
            </div>
          </div>
          <div style={{
            fontWeight: 800, fontSize: 18, fontFamily: "'Noto Sans', sans-serif",
            color: parsed.type === "expense" ? "#C0392B" : "#1A5A30",
          }}>
            {parsed.type === "expense" ? "-" : "+"}{fmt(parsed.amount, parsed.currency)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onEdit} style={{
            flex: 1, padding: "14px", borderRadius: 16, border: "none", cursor: "pointer",
            background: "rgba(155,155,173,0.12)", color: T.muted,
            fontWeight: 700, fontSize: 14, fontFamily: "'Noto Sans', sans-serif",
          }}>
            {t(lang, "confirm_edit")}
          </button>
          <button onClick={() => onConfirm(parsed)} style={{
            flex: 2, padding: "14px", borderRadius: 16, border: "none", cursor: "pointer",
            background: "linear-gradient(145deg,#ACE1AF,#7BC8A4)",
            color: "#1A4020", fontWeight: 800, fontSize: 14,
            fontFamily: "'Noto Sans', sans-serif",
            boxShadow: "0 4px 16px rgba(172,225,175,0.4)",
          }}>
            {t(lang, "confirm_yes")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// QUICK ADD BAR
// ═══════════════════════════════════════════════════════════════

function QuickAddBar({ lang, onAdd }) {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("idle"); // idle|parsing|confirm|error
  const [pending, setPending] = useState(null);
  const inputRef = useRef();

  const submit = useCallback(async () => {
    if (!input.trim() || status === "parsing") return;
    setStatus("parsing");
    const result = await parseWithAI(input);
    if (!result?.amount || result.amount <= 0) {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2500);
      return;
    }
    if (result.confidence < 0.7) {
      setPending({ ...result, rawInput: input });
      setStatus("confirm");
    } else {
      finalizeAdd({ ...result, rawInput: input });
    }
  }, [input, status]);

  const finalizeAdd = (parsed) => {
    const cat = findCat(parsed.category);
    onAdd({
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      amount: parsed.amount,
      currency: parsed.currency,
      type: parsed.type,
      categoryId: cat.id,
      description: parsed.description || parsed.rawInput || "",
      date: new Date().toISOString().split("T")[0],
      confidence: parsed.confidence,
      createdAt: new Date().toISOString(),
    });
    setInput("");
    setStatus("idle");
    setPending(null);
    inputRef.current?.focus();
  };

  return (
    <>
      <div style={{ padding: "0 16px" }}>
        <div style={{
          background: T.surface, backdropFilter: "blur(20px)",
          borderRadius: 20, padding: "10px 14px",
          boxShadow: T.shadow,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <div style={{ fontSize: 18, flexShrink: 0 }}>✏️</div>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder={t(lang, "placeholder")}
            style={{
              flex: 1, border: "none", outline: "none", background: "transparent",
              fontSize: 14, color: T.dark, fontFamily: "'Noto Sans', sans-serif",
              minWidth: 0,
            }}
          />
          <button
            onClick={submit}
            disabled={status === "parsing"}
            style={{
              width: 40, height: 40, borderRadius: 13, border: "none", cursor: "pointer",
              background: status === "error" ? "#FFB3A7"
                : status === "parsing" ? "rgba(172,225,175,0.4)"
                : T.celadon,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, transition: "all .2s ease", flexShrink: 0,
              boxShadow: status === "parsing" ? "none" : "0 3px 10px rgba(172,225,175,0.4)",
            }}
          >
            {status === "parsing" ? "⏳" : status === "error" ? "✗" : "↑"}
          </button>
        </div>
        {status === "parsing" && (
          <div style={{ fontSize: 12, color: T.muted, textAlign: "center",
            marginTop: 6, fontFamily: "'Noto Sans', sans-serif" }}>
            {t(lang, "parsing")}
          </div>
        )}
      </div>

      {status === "confirm" && pending && (
        <ConfirmModal
          parsed={pending}
          lang={lang}
          onConfirm={finalizeAdd}
          onEdit={() => { setStatus("idle"); setPending(null); }}
        />
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// TRANSACTION LIST
// ═══════════════════════════════════════════════════════════════

function TransactionList({ transactions, lang }) {
  if (transactions.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "52px 24px",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div style={{ fontSize: 52 }}>🐾</div>
        <div style={{ fontWeight: 700, fontSize: 17, color: T.dark,
          fontFamily: "'Noto Sans', sans-serif" }}>
          {t(lang, "empty")}
        </div>
        <div style={{ fontSize: 13, color: T.muted, maxWidth: 220, lineHeight: 1.6 }}>
          {t(lang, "empty_sub")}
        </div>
      </div>
    );
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const yestStr  = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const groups   = {};

  [...transactions].reverse().forEach((tx) => {
    const key = tx.date === todayStr ? t(lang, "today")
              : tx.date === yestStr  ? t(lang, "yesterday")
              : tx.date;
    (groups[key] = groups[key] || []).push(tx);
  });

  return (
    <div style={{ padding: "0 16px" }}>
      {Object.entries(groups).map(([date, txs]) => (
        <div key={date} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.muted,
            textTransform: "uppercase", letterSpacing: 1.2,
            marginBottom: 8, fontFamily: "'Noto Sans', sans-serif" }}>
            {date}
          </div>
          <div style={{
            background: T.surface, backdropFilter: "blur(20px)",
            borderRadius: 20, overflow: "hidden", boxShadow: T.shadow,
          }}>
            {txs.map((tx, i) => {
              const cat = findCat(tx.categoryId);
              return (
                <div key={tx.id} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "13px 16px",
                  borderBottom: i < txs.length - 1
                    ? "1px solid rgba(45,45,58,0.05)" : "none",
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 15, flexShrink: 0,
                    background: tx.type === "expense"
                      ? "rgba(255,179,167,0.2)" : "rgba(172,225,175,0.2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 22,
                  }}>{cat.emoji}</div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: 600, fontSize: 14, color: T.dark,
                      fontFamily: "'Noto Sans', sans-serif",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{tx.description || catLabel(cat, lang)}</div>
                    <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
                      {catLabel(cat, lang)}
                    </div>
                  </div>

                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{
                      fontSize: 15, fontWeight: 800,
                      color: tx.type === "expense" ? "#C0392B" : "#1A5A30",
                      fontFamily: "'Noto Sans', sans-serif",
                    }}>
                      {tx.type === "expense" ? "−" : "+"}{fmt(tx.amount, tx.currency)}
                    </div>
                    <div style={{
                      display: "inline-block", marginTop: 3,
                      fontSize: 10, fontWeight: 700,
                      padding: "2px 7px", borderRadius: 6,
                      background: CURR[tx.currency].pill,
                      color: CURR[tx.currency].pillText,
                    }}>{tx.currency}</div>
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

// ═══════════════════════════════════════════════════════════════
// STUB SCREENS (Phase 2 placeholders)
// ═══════════════════════════════════════════════════════════════

const StubScreen = ({ icon, title, lang }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", minHeight: 420, gap: 14, padding: 40 }}>
    <div style={{ fontSize: 64 }}>{icon}</div>
    <div style={{ fontWeight: 800, fontSize: 22, color: T.dark,
      fontFamily: "'Noto Sans', sans-serif" }}>{title}</div>
    <div style={{
      background: "rgba(172,225,175,0.15)", borderRadius: 14,
      padding: "10px 20px", fontSize: 13, fontWeight: 700,
      color: "#2A7A40",
    }}>{t(lang, "coming_soon")} 🚀</div>
  </div>
);

// ═══════════════════════════════════════════════════════════════
// BOTTOM NAV
// ═══════════════════════════════════════════════════════════════

function BottomNav({ active, onTab, lang }) {
  const tabs = [
    { id: "home",      icon: "🏠", label: t(lang, "home") },
    { id: "analytics", icon: "📊", label: t(lang, "analytics") },
    { id: "budget",    icon: "💰", label: t(lang, "budget") },
    { id: "settings",  icon: "⚙️", label: t(lang, "settings") },
  ];

  return (
    <div style={{
      position: "sticky", bottom: 0,
      background: "rgba(247,252,245,0.96)", backdropFilter: "blur(24px)",
      borderTop: "1px solid rgba(45,45,58,0.07)",
      display: "flex", zIndex: 200,
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
    }}>
      {tabs.map((tab) => (
        <button key={tab.id} onClick={() => onTab(tab.id)} style={{
          flex: 1, padding: "10px 0 8px", border: "none",
          background: "transparent", cursor: "pointer",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
          position: "relative",
        }}>
          {active === tab.id && (
            <div style={{
              position: "absolute", top: -1, left: "50%",
              transform: "translateX(-50%)",
              width: 32, height: 2, borderRadius: 2, background: T.celadon,
            }} />
          )}
          <div style={{
            fontSize: 22,
            filter: active !== tab.id ? "grayscale(1) opacity(0.45)" : "none",
          }}>{tab.icon}</div>
          <div style={{
            fontSize: 10, fontWeight: 700,
            color: active === tab.id ? T.dark : T.muted,
            fontFamily: "'Noto Sans', sans-serif",
          }}>{tab.label}</div>
        </button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// HOME SCREEN
// ═══════════════════════════════════════════════════════════════

function HomeScreen({ profile, transactions, onAdd, onReset }) {
  const [tab, setTab]     = useState("home");
  const [toast, setToast] = useState(null);
  const { lang }          = profile;

  const greet = () => {
    const h = new Date().getHours();
    if (h < 12) return t(lang, "morning");
    if (h < 17) return t(lang, "afternoon");
    return t(lang, "evening");
  };

  const dateStr = new Date().toLocaleDateString(
    lang === "th" ? "th-TH" : lang === "lo" ? "lo-LA" : "en-US",
    { weekday: "long", month: "long", day: "numeric" }
  );

  const handleAdd = (tx) => {
    onAdd(tx);
    setToast(randomToast({ ...tx, description: tx.description || findCat(tx.categoryId).en }));
  };

  return (
    <div style={{
      minHeight: "100dvh", background: T.bg,
      display: "flex", flexDirection: "column",
      maxWidth: 430, margin: "0 auto",
      position: "relative", overflow: "hidden",
    }}>
      <AnimalBg />
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 0 }}>

        {tab === "home" && (
          <>
            {/* Header */}
            <div style={{ padding: "52px 20px 18px", position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between",
                alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 12, color: T.muted,
                    fontFamily: "'Noto Sans', sans-serif" }}>{dateStr}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: T.dark,
                    marginTop: 4, fontFamily: "'Noto Sans', sans-serif" }}>
                    {greet()} 👋
                  </div>
                </div>
                <button onClick={onReset} style={{
                  width: 42, height: 42, borderRadius: 13,
                  background: "linear-gradient(145deg,#ACE1AF,#7BC8A4)",
                  border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 20,
                  boxShadow: "0 3px 10px rgba(172,225,175,0.4)",
                }} title={t(lang, "reset")}>🐾</button>
              </div>
            </div>

            {/* Wallet Cards */}
            <div style={{ position: "relative", zIndex: 1, marginBottom: 24 }}>
              <WalletCards transactions={transactions} lang={lang} />
            </div>

            {/* Transaction list */}
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{
                padding: "0 16px 10px",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: T.dark,
                  fontFamily: "'Noto Sans', sans-serif" }}>
                  {t(lang, "recent")}
                </div>
                <div style={{ fontSize: 12, color: T.muted }}>
                  {transactions.length} total
                </div>
              </div>
              <TransactionList transactions={transactions} lang={lang} />
            </div>

            {/* Spacer so content clears the sticky input bar */}
            <div style={{ height: 90 }} />
          </>
        )}

        {tab === "analytics" && <StubScreen icon="📊" title="Analytics" lang={lang} />}
        {tab === "budget"    && <StubScreen icon="💰" title="Budget"    lang={lang} />}
        {tab === "settings"  && (
          <div style={{ padding: "52px 20px 24px", position: "relative", zIndex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 22, color: T.dark,
              fontFamily: "'Noto Sans', sans-serif", marginBottom: 24 }}>Settings</div>
            <div style={{
              background: T.surface, backdropFilter: "blur(20px)",
              borderRadius: 20, overflow: "hidden", boxShadow: T.shadow,
            }}>
              {[
                { label: "Language", value: profile.lang.toUpperCase() },
                { label: "Base Currency", value: profile.baseCurrency },
                { label: "Transactions", value: transactions.length },
                { label: "Supabase URL", value: SUPABASE_URL.replace("https://", "").slice(0, 20) + "…" },
              ].map(({ label, value }, i, arr) => (
                <div key={label} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "16px 18px",
                  borderBottom: i < arr.length - 1 ? "1px solid rgba(45,45,58,0.05)" : "none",
                }}>
                  <span style={{ fontSize: 14, color: T.dark,
                    fontFamily: "'Noto Sans', sans-serif" }}>{label}</span>
                  <span style={{ fontSize: 13, color: T.muted, fontWeight: 600 }}>{value}</span>
                </div>
              ))}
            </div>
            <button onClick={onReset} style={{
              marginTop: 24, width: "100%", padding: "14px", borderRadius: 16,
              border: "none", cursor: "pointer",
              background: "rgba(255,179,167,0.15)", color: "#C0392B",
              fontWeight: 700, fontSize: 14, fontFamily: "'Noto Sans', sans-serif",
            }}>
              {t(lang, "reset")}
            </button>
          </div>
        )}
      </div>

      {/* Sticky input bar above nav — only on home tab */}
      {tab === "home" && (
        <div style={{
          position: "sticky", bottom: 0, zIndex: 150,
          background: "rgba(247,252,245,0.97)", backdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(45,45,58,0.06)",
          padding: "8px 0 4px",
        }}>
          <QuickAddBar lang={lang} onAdd={handleAdd} />
        </div>
      )}

      <BottomNav active={tab} onTab={setTab} lang={lang} />

      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SHARED STYLE OBJECTS
// ═══════════════════════════════════════════════════════════════

const S = {
  cardTitle: {
    fontFamily: "'Noto Sans', sans-serif",
    fontSize: 20, fontWeight: 800, color: T.dark, marginBottom: 6,
  },
  cardSub: {
    fontSize: 13, color: T.muted, marginBottom: 20, lineHeight: 1.5,
  },
  label: {
    fontSize: 14, fontWeight: 700, color: T.dark,
    fontFamily: "'Noto Sans', sans-serif",
  },
};

// ═══════════════════════════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════════════════════════

export default function App() {
  const [profile, setProfile]           = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [booting, setBooting]           = useState(true);

  // Load fonts
  useEffect(() => {
    const link = document.createElement("link");
    link.rel  = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=Noto+Sans+Lao:wght@400;700&display=swap";
    document.head.appendChild(link);
  }, []);

  // Inject global CSS
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      :root { font-family: 'Noto Sans', 'Noto Sans Lao', system-ui, sans-serif; }
      body { background: ${T.bg}; overscroll-behavior: none; }
      input { -webkit-appearance: none; }
      ::-webkit-scrollbar { display: none; }
      @keyframes toastIn {
        from { opacity: 0; transform: translateX(-50%) translateY(12px); }
        to   { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
      @keyframes slideUp {
        from { opacity: 0; transform: translateY(40px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes slideDown {
        from { opacity: 0; transform: translateY(-8px); }
        to   { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }, []);

  // Load persisted data
  useEffect(() => {
    const savedProfile = store.get("phanote_profile");
    const savedTx      = store.get("phanote_transactions") || [];
    if (savedProfile) setProfile(savedProfile);
    setTransactions(savedTx);
    setBooting(false);

    // [SUPABASE] Replace above with:
    // const { data: { session } } = await supabase.auth.getSession();
    // if (session) {
    //   const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
    //   const { data: txs } = await supabase.from("transactions").select("*, categories(*)").eq("user_id", session.user.id).order("date", { ascending: false });
    //   setProfile(profile);
    //   setTransactions(txs || []);
    // }
    // setBooting(false);
  }, []);

  const handleOnboarding = (data) => {
    const p = { ...data, createdAt: new Date().toISOString() };
    store.set("phanote_profile", p);
    setProfile(p);
  };

  const handleAddTransaction = (tx) => {
    const updated = [...transactions, tx];
    setTransactions(updated);
    store.set("phanote_transactions", updated);

    // [SUPABASE] Also insert to DB:
    // await supabase.from("transactions").insert({ ...tx, user_id: session.user.id });
  };

  const handleReset = () => {
    if (!window.confirm(t(profile?.lang || "en", "reset_confirm"))) return;
    store.del("phanote_profile");
    store.del("phanote_transactions");
    setProfile(null);
    setTransactions([]);
  };

  if (booting) return (
    <div style={{ minHeight: "100dvh", background: T.bg,
      display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: 40 }}>🐾</div>
    </div>
  );

  if (!profile) return <OnboardingScreen onComplete={handleOnboarding} />;

  return (
    <HomeScreen
      profile={profile}
      transactions={transactions}
      onAdd={handleAddTransaction}
      onReset={handleReset}
    />
  );
}