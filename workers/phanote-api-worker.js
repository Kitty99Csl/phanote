/**
 * PHAJOT — Main API Worker v4.5.0
 * Domains: api.phanote.com (legacy), api.phajot.com
 *
 * /parse  → Gemini 2.5 Flash (best Lao/Thai text understanding)
 * /advise → Claude Haiku    (best conversational financial reasoning)
 * /ocr    → Gemini 2.5 Flash Vision (best Lao script OCR)
 *
 * Session 4 changes:
 * - v4.1: Added per-IP rate limiting (in-memory)
 * - v4.2: Added AI kill switch (Option A — fail safe)
 *         Env vars: AI_ENABLED, ADVISOR_ENABLED, OCR_ENABLED
 *         Missing or any value !== "true" means DISABLED.
 * Session 14 changes:
 * - v4.5: AI instrumentation — every call logs to public.ai_call_log
 *         via Supabase REST (service_role, fire-and-forget).
 *         callClaude() wrapper added, callGemini refactored to
 *         consistent shape, logAICall + classifyError helpers added.
 */

import * as Sentry from '@sentry/cloudflare';
import { computeCostUsd, PRICING_VERSION } from './lib/ai-costs.js';
import { handleSupportConsoleRoute } from './lib/support-console/index.js';
import { requireAuth, AuthError } from './lib/support-console/helpers.js';

// Worker version
const WORKER_VERSION = '4.8.2';

// Build-time constant. Updated on every deploy.
// Future (Sprint E-ext): a deploy hook will replace the
// __DEPLOYED_AT__ placeholder pattern with the real timestamp.
// For now, manually bump to the commit's deploy time.
const DEPLOYED_AT = '2026-04-20T10:57:56Z';

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Plan-Tier",
};

// ─── /health caches (worker-global, persist across warm instances) ───
let supabasePingCache = {
  ok: null,
  last_checked_at: null,
  ping_ms: null,
};
const PING_CACHE_TTL_MS = 60 * 1000;

let aiStatsCache = {
  fetched_at: null,
  data: null,
};
const STATS_CACHE_TTL_MS = 60 * 1000;

async function checkSupabaseHealth(env) {
  const now = Date.now();
  const cacheAge = supabasePingCache.last_checked_at
    ? now - new Date(supabasePingCache.last_checked_at).getTime()
    : Infinity;

  if (cacheAge < PING_CACHE_TTL_MS && supabasePingCache.ok !== null) {
    return {
      ...supabasePingCache,
      cache_age_seconds: Math.floor(cacheAge / 1000),
    };
  }

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    supabasePingCache = {
      ok: false,
      last_checked_at: new Date().toISOString(),
      ping_ms: null,
    };
    return { ...supabasePingCache, cache_age_seconds: 0 };
  }

  const start = Date.now();
  try {
    // Lightweight connectivity probe: select one row (head request-like)
    const res = await fetch(
      `${env.SUPABASE_URL}/rest/v1/ai_call_log?select=id&limit=1`,
      {
        headers: {
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );
    const ping_ms = Date.now() - start;
    supabasePingCache = {
      ok: res.ok,
      last_checked_at: new Date().toISOString(),
      ping_ms,
    };
  } catch (err) {
    supabasePingCache = {
      ok: false,
      last_checked_at: new Date().toISOString(),
      ping_ms: Date.now() - start,
    };
  }

  return { ...supabasePingCache, cache_age_seconds: 0 };
}

async function getAIStats(env) {
  const now = Date.now();
  const age = aiStatsCache.fetched_at
    ? now - new Date(aiStatsCache.fetched_at).getTime()
    : Infinity;

  if (age < STATS_CACHE_TTL_MS && aiStatsCache.data) {
    return aiStatsCache.data;
  }

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString();

  try {
    const res = await fetch(
      `${env.SUPABASE_URL}/rest/v1/ai_call_log?` +
      `select=provider,endpoint,status,created_at&` +
      `created_at=gte.${oneHourAgo}&` +
      `order=created_at.desc&limit=1000`,
      {
        headers: {
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );

    if (!res.ok) return null;

    const rows = await res.json();

    const providers = {
      gemini: { success: 0, error: 0, last_success_at: null, last_error_at: null },
      anthropic: { success: 0, error: 0, last_success_at: null, last_error_at: null },
    };
    const endpoints = {};
    let total = 0;
    let errors = 0;

    for (const row of rows) {
      total++;
      const isError = row.status !== 'success';
      if (isError) errors++;

      if (providers[row.provider]) {
        if (isError) {
          providers[row.provider].error++;
          if (!providers[row.provider].last_error_at || row.created_at > providers[row.provider].last_error_at) {
            providers[row.provider].last_error_at = row.created_at;
          }
        } else {
          providers[row.provider].success++;
          if (!providers[row.provider].last_success_at || row.created_at > providers[row.provider].last_success_at) {
            providers[row.provider].last_success_at = row.created_at;
          }
        }
      }

      endpoints[row.endpoint] = (endpoints[row.endpoint] || 0) + 1;
    }

    const data = {
      ai_volume_last_hour: { total, errors, by_endpoint: endpoints },
      gemini: {
        last_success_at: providers.gemini.last_success_at,
        last_error_at: providers.gemini.last_error_at,
        calls_last_hour: providers.gemini.success + providers.gemini.error,
        errors_last_hour: providers.gemini.error,
      },
      anthropic: {
        last_success_at: providers.anthropic.last_success_at,
        last_error_at: providers.anthropic.last_error_at,
        calls_last_hour: providers.anthropic.success + providers.anthropic.error,
        errors_last_hour: providers.anthropic.error,
      },
    };

    aiStatsCache = { fetched_at: new Date().toISOString(), data };
    return data;
  } catch (err) {
    console.error('getAIStats failed:', err?.message);
    return null;
  }
}

function computeStatus(supabase, aiStats) {
  if (!supabase.ok && supabase.last_checked_at &&
      (Date.now() - new Date(supabase.last_checked_at).getTime()) > 5 * 60 * 1000) {
    return { status: 'error', status_reason: 'supabase_unreachable_5min' };
  }
  if (!supabase.ok) {
    return { status: 'error', status_reason: 'supabase_ping_failed' };
  }

  if (supabase.cache_age_seconds > 90) {
    return { status: 'degraded', status_reason: 'supabase_ping_stale' };
  }

  if (aiStats) {
    const total = aiStats.ai_volume_last_hour.total;
    const errorRate = total > 0 ? aiStats.ai_volume_last_hour.errors / total : 0;
    if (errorRate > 0.05) {
      return { status: 'degraded', status_reason: 'ai_error_rate_elevated' };
    }

    const fifteenMinAgo = Date.now() - 15 * 60 * 1000;
    for (const provider of ['gemini', 'anthropic']) {
      const lastErr = aiStats[provider]?.last_error_at;
      if (lastErr && new Date(lastErr).getTime() > fifteenMinAgo) {
        return { status: 'degraded', status_reason: `${provider}_recent_errors` };
      }
    }
  }

  return { status: 'ok', status_reason: null };
}

// ─── RATE LIMITING (in-memory, per-IP) ───────────────────────────
// Protects against abuse and runaway scripts.
// Per-IP limits — real users won't ever hit these.
const rateLimitCache = new Map();

const RATE_LIMITS = {
  "/parse":  120,  // 120 req/min per IP
  "/advise":  20,  // 20 req/min per IP
  "/ocr":     15,  // 15 req/min per IP
  "/monthly-report": 10,  // 10 req/min per IP (monthly feature)
  "/parse-statement": 10,  // 10 req/min per IP (expensive multi-image call)
};

function checkRateLimit(ip, route) {
  const limit = RATE_LIMITS[route];
  if (!limit) return true; // unlisted routes not limited (e.g. /health)

  const key = `${ip}:${route}`;
  const now = Date.now();
  const entry = rateLimitCache.get(key) || { count: 0, reset: now + 60000 };

  if (now > entry.reset) {
    entry.count = 0;
    entry.reset = now + 60000;
  }

  entry.count++;
  rateLimitCache.set(key, entry);

  // Periodic cleanup to prevent memory bloat
  if (rateLimitCache.size > 5000) {
    for (const [k, v] of rateLimitCache.entries()) {
      if (now > v.reset) rateLimitCache.delete(k);
    }
  }

  return entry.count <= limit;
}

// ─── AI KILL SWITCH (Option A — fail safe) ───────────────────────
// Reads Cloudflare env vars. Default state when missing is DISABLED.
// To enable a feature: set variable to exactly "true" in Cloudflare dashboard.
// Any other value (missing, "false", "TRUE", typo) = DISABLED.
//
// This is Phase 1 of the kill switch plan.
// Phase 2 (Session 6+): move to Supabase-backed feature flags
// readable/writable from admin.phajot.com admin panel.
// Worker will check Supabase first, fall back to these env vars.
function isFeatureEnabled(env, feature) {
  const varName = {
    parse: "AI_ENABLED",
    advise: "ADVISOR_ENABLED",
    ocr: "OCR_ENABLED",
    monthly_report: "MONTHLY_WRAP_ENABLED",
    parse_statement: "STATEMENT_ENABLED",
  }[feature];
  return env[varName] === "true";
}

function disabledResponse(feature) {
  const messages = {
    parse: "AI parsing is temporarily unavailable. Please enter your transaction manually.",
    advise: "AI advisor is temporarily unavailable. Please try again later.",
    ocr: "Receipt scanning is temporarily unavailable. Please enter manually.",
    monthly_report: "Monthly wrap is temporarily unavailable. Please try again later.",
    parse_statement: "Bank statement scanning is temporarily unavailable.",
  };
  return Response.json({
    error: "feature_disabled",
    feature,
    message: messages[feature],
  }, { status: 503, headers: CORS });
}

// ─── PARSE SYSTEM — Gemini 2.5 Flash ────────────────────────────
// Uses Gemini's superior Lao/Thai language understanding
// Category names MUST match App.jsx normalizeCategory keys exactly
const PARSE_SYSTEM = `You are a financial transaction parser for Phajot, a personal finance app based in Laos.

PRIMARY MARKET: Laos (LAK, Lao script ພາສາລາວ)
SECONDARY: Thailand (THB, Thai script) — Lao users sometimes shop in Thailand or use Thai terms
ALSO SUPPORTED: English — used by the app owner and for merchant names

USERS write in: Lao (primary), English, Thai, or mixed. Prioritize Lao context when ambiguous.

CRITICAL — NUMBER SHORTHANDS (Lao-first):
- ພັນ (Lao) / พัน (Thai) / "k" = × 1,000  →  50ພັນ or 50k = 50000
- ແສນ (Lao) / แสน (Thai) = × 100,000  →  1.5ແສນ = 150000
- ລ້ານ (Lao) / ล้าน (Thai) = × 1,000,000  →  2ລ້ານ = 2000000
- Output "amount" as plain integer. Strip all commas and periods.

CURRENCY — DEFAULT IS LAK:
- ₭, ກີບ, kip, LAK = LAK  ← PRIMARY (most transactions)
- ฿, บาท, baht, THB = THB  ← used for Thai purchases
- $, dollar, USD = USD      ← used by app owner
- No currency stated + amount > 10,000 → LAK
- No currency stated + amount < 5,000 and Thai context → THB
- Otherwise → LAK

TYPE:
- income: ເງິນເດືອນ/salary, ຂາຍ/sell, ໄດ້ຮັບ/received, freelance, bonus, dividend
- expense: everything else

CATEGORIES — use these exact strings only:
Expense: food | groceries | drinks | coffee | transport | travel | rent | utilities | phone_internet | household | shopping | health | beauty | fitness | entertainment | subscriptions | gaming | education | family | donation | debt_payment | fees | repair | other
Income: salary | freelance | selling | bonus | investment | gift | transfer | other_inc

KEY LAO DISAMBIGUATION (Lao is primary market):
- groceries: ຊື້ຂອງກິນ ຊື້ຂອງ ຕະຫຼາດ Villa Market fresh market (buying ingredients for home) — NOT restaurant eating
- food: ອາຫານ ເຂົ້າ ຕຳ ເຝີ ລາບ ໝູກະທະ restaurant meals street food
- utilities: ຄ່າໄຟ ຄ່ານ້ຳ EDL Nam Papa electricity water garbage fee — NOT rent
- phone_internet: ຄ່າໂທ ຄ່າເນັດ ເຕີມ Unitel ETL wifi bill — NOT utilities
- rent: ຄ່າເຊົ່າ apartment room rent only — NOT bills
- household: ຂອງໃຊ້ເຮືອນ detergent cleaning appliances furniture
- subscriptions: netflix spotify icloud youtube premium disney+ Line TV — recurring apps
- family: ໃຫ້ພໍ່ ໃຫ້ແມ່ ສົ່ງໃຫ້ childcare baby milk parents support
- donation: ເຮັດບຸນ ໃສ່ບາດ ຖວາຍ ວັດ merit temple monk alms — very common in Laos
- debt_payment: ຜ່ອນ ໜີ້ ກູ້ loan installment repayment
- fees: ຄ່າທຳນຽມ ATM fee transfer fee visa fee bank charge
- repair: ຊ່ອມ motorbike repair phone repair home fix
- transfer: BCEL JDB LDB OnePay ໂອນ — if bank + item mentioned, use ITEM category, set payment_provider
- entertainment: ມໍລຳ morlam karaoke concert movie party — events/shows only
- subscriptions vs entertainment: netflix/spotify = subscriptions; concert ticket = entertainment

MULTI-ITEM: If multiple lines/items detected, parse each and sum total. Pick best overall category.

Return ONLY valid JSON:
Single: {"amount":number,"currency":"LAK"|"THB"|"USD","type":"expense"|"income","category":"...","subcategory":"...","description":"Short Label","confidence":0.0-1.0,"payment_provider":"BCEL"|null}
Multi:  {"amount":number,"currency":"LAK"|"THB"|"USD","type":"expense"|"income","category":"...","subcategory":"...","description":"Short Label","confidence":0.0-1.0,"payment_provider":"BCEL"|null,"items":[{"name":"...","amount":number}]}`;

// ─── STATEMENT SYSTEM — Gemini 2.5 Flash Vision ─────────────────
// Multi-image bank statement extractor for LDB, JDB, BCEL One.
// Handles all 3 banks in one prompt. Output: structured transaction list
// with categorization and bank/currency auto-detection.
const STATEMENT_PROMPT = `You are extracting transactions from bank statement screenshots from Lao banks. Multiple screenshots may be from the same scrolling session of one statement.

SUPPORTED BANKS (auto-detect from screenshot):
1. LDB — Card-style list. Red ▲ with minus sign = OUT (expense). Green ▼ no sign = IN (income). Header shows account number and currency (LAK/USD/THB). Each row has merchant/name, ref number (FT...), memo, datetime, amount.
2. JDB — Dark theme. Title says "Statement". Header shows Account Type, Account No, Available Balance with currency. Red minus = OUT. Green no sign = IN. Month group headers ("April 2026"). Rows have type label (MOBILE TRANSFER, FEE ATM, LAPNET OUTGOING TRANSFER, etc), date+time, amount.
3. BCEL One — Colored badge circles: ONP (OnePay), ACC, LMP, TRI (transfer in), TRO (transfer out), SAL, FEE. Header shows account number with currency. Red amount = OUT, green amount = IN. Rows have type, reference, merchant, account, datetime, amount.

EXTRACTION RULES:

Sign convention (CRITICAL):
- Red color OR minus sign = OUT (expense) — output positive amount with type:"expense"
- Green color OR no sign = IN (income) — output positive amount with type:"income"
- NEVER output negative amounts. Use type field instead.

Currency:
- Read from account header at top of screenshot (LAK / USD / THB)
- If header shows multiple currencies or unclear, check inline amount text
- Default to LAK if truly unknown

Amount cleaning:
- Strip commas: "1,000.00" → 1000
- LAK uses no decimals typically: "5,000" → 5000
- USD/THB use 2 decimals: "21.32" → 21.32

Date/time:
- Parse to ISO format YYYY-MM-DD for date
- Parse time to HH:MM:SS (24h) if available, else null
- Use month group headers ("April 2026") to disambiguate dates without year

Description:
- For LDB: use the merchant/name + memo if memo is meaningful
- For JDB: use the type label (MOBILE TRANSFER) + any details
- For BCEL: use the merchant name primarily, fall back to type if no merchant
- Keep Lao script as-is, do not translate
- Strip refs/codes from description (put in ref_number field instead)

Reference number (optional):
- LDB: FT260274CKD0 style
- BCEL: VO7MIFC0ERWW or 8JSQBO6RNF87 style
- JDB: 001MBAP780165329276 style
- Set to null if not visible

Categorization (use these IDs only):
EXPENSES: food, groceries, drinks, coffee, transport, travel, rent, utilities, phone_internet, household, shopping, health, beauty, fitness, entertainment, subscriptions, gaming, education, family, donation, debt_payment, fees, repair, other
INCOME: salary, freelance, selling, bonus, investment, gift, transfer, other_inc

Special rules:
- Bank fees / ATM fees / FEE badge / transfer fees → category: "fees" (expense)
- Bank interest / "Interest" / ດອກເບ້ຍ → category: "investment" (income)
- Internal transfers between user's own accounts → category: "transfer"
- BCEL ONP merchant "ປ້ຳນ້ຳມັນ" → "transport"
- BCEL "LAZY B COFFEE" → "coffee"
- Coffee shops → "coffee", restaurants/food → "food"
- Unknown merchant → "other"

Payment provider:
- Always set payment_provider to "LDB", "JDB", or "BCEL" based on the bank detected

Partial rows:
- If a row at the top or bottom of a screenshot is cut off, SKIP it silently
- Do not invent missing data

OUTPUT FORMAT (JSON only, no markdown):
{
  "bank": "LDB" | "JDB" | "BCEL",
  "currency": "LAK" | "USD" | "THB",
  "account_hint": "0302****3168" or null,
  "transactions": [
    {
      "date": "2026-03-31",
      "time": "23:25:00" or null,
      "type": "expense" | "income",
      "amount": 1.07,
      "currency": "USD",
      "description": "Interest",
      "category": "investment",
      "payment_provider": "LDB",
      "ref_number": "030200141XXXXXXX-20260331" or null
    }
  ]
}

Return ONLY valid JSON. No markdown fences. No commentary.`;

// ─────────────────────────────────────────────
// Wraps Gemini API calls. Returns {ok, data, duration_ms, tokens_in, tokens_out}
// on success; {ok:false, status, duration_ms, error, tokens_in:0, tokens_out:0}
// on failure. Token counts pulled from data.usageMetadata when available.
const callGemini = async (env, payload) => {
  const start = Date.now();
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
    );
    const data = await res.json();
    const duration_ms = Date.now() - start;
    if (!res.ok || data.error) {
      return {
        ok: false,
        status: res.status,
        duration_ms,
        error: data?.error?.message || `HTTP ${res.status}`,
        tokens_in: 0,
        tokens_out: 0,
      };
    }
    return {
      ok: true,
      data,
      duration_ms,
      tokens_in: data?.usageMetadata?.promptTokenCount || 0,
      tokens_out: data?.usageMetadata?.candidatesTokenCount || 0,
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      duration_ms: Date.now() - start,
      error: err?.message || 'network',
      tokens_in: 0,
      tokens_out: 0,
    };
  }
};

// Wraps Anthropic Claude API calls. Returns same shape as callGemini.
async function callClaude(env, payload) {
  const start = Date.now();
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    const duration_ms = Date.now() - start;
    if (!res.ok || data.error) {
      return {
        ok: false,
        status: res.status,
        duration_ms,
        error: data?.error?.message || `HTTP ${res.status}`,
        tokens_in: 0,
        tokens_out: 0,
      };
    }
    return {
      ok: true,
      data,
      duration_ms,
      tokens_in: data?.usage?.input_tokens || 0,
      tokens_out: data?.usage?.output_tokens || 0,
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      duration_ms: Date.now() - start,
      error: err?.message || 'network',
      tokens_in: 0,
      tokens_out: 0,
    };
  }
}

// Map HTTP status + error message to error_class enum
// (matches ai_call_log_error_class_check constraint).
function classifyError(status, errorMsg) {
  if (status === 429) return 'rate_limit';
  if (status === 408 || status === 504) return 'timeout';
  if (status >= 500 && status < 600) return 'provider_5xx';
  if (status >= 400 && status < 500) return 'provider_4xx';
  if (status === 0) return 'network';
  if (errorMsg && /timeout|timed out/i.test(errorMsg)) return 'timeout';
  if (errorMsg && /parse/i.test(errorMsg)) return 'parse_fail';
  return 'other';
}

// Insert one row into public.ai_call_log via Supabase REST.
// Fire-and-forget: errors logged to console but never thrown
// back to the caller. Failure to log MUST NOT affect the AI
// response returned to the user.
async function logAICall(env, ctx, row) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    // Defensive: missing config = silent skip, not crash
    return;
  }
  const insertPromise = fetch(
    `${env.SUPABASE_URL}/rest/v1/ai_call_log`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(row),
    }
  ).then(async (res) => {
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      // SECURITY: only log status code + safe error text fragment.
      // NEVER log the row body (may contain PII like raw_input)
      // or the auth header (would leak service_role key).
      console.error('ai_call_log insert failed:', res.status, txt.slice(0, 200));
    }
  }).catch((err) => {
    console.error('ai_call_log insert errored:', err?.message || 'unknown');
  });

  if (ctx && typeof ctx.waitUntil === 'function') {
    ctx.waitUntil(insertPromise);
  }
  // If ctx unavailable, the promise fires without keep-alive guarantee
}

// ─── AMOUNT SAFETY FIX ───────────────────────────────────────────
// Lao receipts use . as thousands separator: 573.000 means 573000
const fixAmount = (a, currency) => {
  const n = Number(a);
  if ((currency === "LAK" || !currency) && n > 0 && n < 1000) return n * 1000; // threshold: valid LAK is rarely under ₭1,000
  return n;
};

// ─── STATEMENT DEDUP HELPERS ─────────────────────────────────────
// Hash a transaction on date|time|amount|description for dedup across
// overlapping screenshots of the same bank statement scroll.
async function hashTx(tx) {
  const key = `${tx.date}|${tx.time || ""}|${tx.amount}|${(tx.description || "").toLowerCase().trim()}`;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  return Array.from(new Uint8Array(buf)).slice(0, 8).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function dedupeTransactions(txs) {
  const seen = new Set();
  const unique = [];
  let removed = 0;
  for (const tx of txs) {
    const h = await hashTx(tx);
    if (seen.has(h)) { removed++; continue; }
    seen.add(h);
    unique.push({ ...tx, _hash: h });
  }
  return { unique, duplicates_removed: removed };
}

// ─── MONTHLY WRAP — Stats computation ────────────────────────────
// Computes all stats from the transactions array + formats strings for prompt.
// Returns { raw: {...}, formatted: {...} }
function computeWrapStats(transactions, prevMonthExpense, month) {
  const sym = c => c === "LAK" ? "₭" : c === "THB" ? "฿" : "$";
  const fmtNum = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const fmt = (n, c) => `${sym(c)}${fmtNum(n)}`;

  const expByCur = {}, incByCur = {}, curCounts = {};
  const catExp = {}, dayExp = {}, dayTxs = {};
  const activeDays = new Set();

  // First pass: totals + determine primary currency
  for (const tx of transactions) {
    activeDays.add(tx.d);
    curCounts[tx.c] = (curCounts[tx.c] || 0) + 1;
    if (tx.t === "ex") expByCur[tx.c] = (expByCur[tx.c] || 0) + tx.a;
    else incByCur[tx.c] = (incByCur[tx.c] || 0) + tx.a;
  }

  const primaryCur = Object.entries(curCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "LAK";

  // Second pass: category + day breakdowns (primary currency)
  for (const tx of transactions) {
    if (tx.t !== "ex" || tx.c !== primaryCur) continue;
    catExp[tx.cat] = (catExp[tx.cat] || 0) + tx.a;
    dayExp[tx.d] = (dayExp[tx.d] || 0) + tx.a;
    if (!dayTxs[tx.d]) dayTxs[tx.d] = [];
    dayTxs[tx.d].push(tx);
  }

  const sortedCats = Object.entries(catExp).sort((a, b) => b[1] - a[1]);
  const topCat = sortedCats[0] || null;
  const top3 = sortedCats.slice(0, 3);

  const sortedDays = Object.entries(dayExp).sort((a, b) => b[1] - a[1]);
  const bigDay = sortedDays[0] || null;
  const bigDayTopTx = bigDay
    ? (dayTxs[bigDay[0]] || []).sort((a, b) => b.a - a.a).slice(0, 3)
    : [];

  const [yr, mo] = month.split("-").map(Number);
  const daysInMonth = new Date(yr, mo, 0).getDate();

  // vs last month
  let vsLastMonth = null;
  if (prevMonthExpense && Object.keys(prevMonthExpense).length) {
    vsLastMonth = {};
    for (const [cur, prev] of Object.entries(prevMonthExpense)) {
      if (prev > 0) vsLastMonth[cur] = Math.round(((expByCur[cur] || 0) - prev) / prev * 1000) / 10;
    }
    if (!Object.keys(vsLastMonth).length) vsLastMonth = null;
  }

  const fmtObj = obj => Object.entries(obj).map(([c, a]) => fmt(a, c)).join(", ") || "none";

  return {
    raw: {
      total_expense: expByCur,
      total_income: incByCur,
      top_category: topCat ? { name: topCat[0], amount: topCat[1], currency: primaryCur } : null,
      biggest_day: bigDay ? {
        date: bigDay[0], amount: bigDay[1], currency: primaryCur,
        top_transactions: bigDayTopTx.map(tx => ({ cat: tx.cat, amount: tx.a, n: tx.n })),
      } : null,
      active_days: activeDays.size,
      days_in_month: daysInMonth,
      transaction_count: transactions.length,
      vs_last_month: vsLastMonth,
      top_3_categories: top3.map(([name, amount]) => ({ name, amount, currency: primaryCur })),
    },
    formatted: {
      total_expense_by_currency: fmtObj(expByCur),
      total_income_by_currency: fmtObj(incByCur),
      top_category: topCat?.[0] || "none",
      top_category_amount: topCat ? fmt(topCat[1], primaryCur) : "none",
      biggest_day: bigDay?.[0] || "none",
      biggest_day_amount: bigDay ? fmt(bigDay[1], primaryCur) : "none",
      biggest_day_items: bigDayTopTx.map(tx => `${tx.n || tx.cat} (${fmt(tx.a, primaryCur)})`).join(", "),
      active_days: activeDays.size,
      days_in_month: daysInMonth,
      top_3_categories: top3.length
        ? top3.map((c, i) => `${i + 1}. ${c[0]}: ${fmt(c[1], primaryCur)}`).join("\n")
        : "No categories yet.",
      vs_last_month: vsLastMonth
        ? Object.entries(vsLastMonth).map(([c, pct]) => `${sym(c)} spending ${pct > 0 ? "up" : "down"} ${Math.abs(pct)}%`).join(", ")
        : null,
    },
  };
}

const handler = {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });

    const url = new URL(request.url);

    // ─── Rate limit check ───────────────────────────────────────
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    if (!checkRateLimit(ip, url.pathname)) {
      return Response.json({
        error: "rate_limited",
        message: "Too many requests. Please wait a moment and try again.",
      }, { status: 429, headers: { ...CORS, "Retry-After": "60" } });
    }

    if (url.pathname === "/" || url.pathname === "/health") {
      const supabase = await checkSupabaseHealth(env);
      const aiStats = await getAIStats(env);
      const { status, status_reason } = computeStatus(supabase, aiStats);

      const emptyProviderStats = { last_success_at: null, last_error_at: null, calls_last_hour: 0, errors_last_hour: 0 };

      const body = {
        status,
        status_reason,
        service: 'Phajot API',
        version: WORKER_VERSION,
        deployed_at: DEPLOYED_AT,
        dependencies: {
          supabase: {
            ok: supabase.ok,
            last_checked_at: supabase.last_checked_at,
            ping_ms: supabase.ping_ms,
            cache_age_seconds: supabase.cache_age_seconds,
          },
          gemini: aiStats?.gemini || emptyProviderStats,
          anthropic: aiStats?.anthropic || emptyProviderStats,
        },
        ai_volume_last_hour: aiStats?.ai_volume_last_hour || { total: 0, errors: 0, by_endpoint: {} },
        features: {
          ai_enabled: env.AI_ENABLED === 'true',
          advisor_enabled: env.ADVISOR_ENABLED === 'true',
          ocr_enabled: env.OCR_ENABLED === 'true',
          monthly_wrap_enabled: env.MONTHLY_WRAP_ENABLED === 'true',
          statement_enabled: env.STATEMENT_ENABLED === 'true',
        },
        routes: [
          'POST /parse',
          'POST /advise',
          'POST /ocr',
          'POST /parse-statement',
          'POST /monthly-report',
          'GET /health',
          // Support Console (Session 21 Sprint I, workers/lib/support-console.js):
          'POST /recovery/request-pin-reset',
          'GET /recovery/status',
          'POST /recovery/complete-pin-reset',
          'POST /admin/users/search',
          'GET /admin/users/:id/summary',
          'POST /admin/users/:id/view-transactions',
          'POST /admin/users/:id/approve-pin-reset',
          'POST /admin/users/:id/approve-password-reset',
        ],
      };

      return new Response(JSON.stringify(body, null, 2), {
        headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    // Support Console routes dispatched in workers/lib/support-console.js
    // (Session 21 Sprint I). Handles /recovery/* and /admin/users/* paths.
    // Called BEFORE the POST-only gate below because some routes (e.g.
    // GET /admin/users/:id/summary) are legitimate GETs and would be
    // 405-ed by the gate. Returns null for non-matching paths so the
    // rest of the dispatcher continues.
    const supportResponse = await handleSupportConsoleRoute(url, request, env, ctx);
    if (supportResponse) return supportResponse;

    if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: CORS });

    // ─── POST /parse — Gemini 2.5 Flash ─────────────────────────
    if (url.pathname === "/parse") {
      // Kill switch check
      if (!isFeatureEnabled(env, "parse")) return disabledResponse("parse");

      let authedUserId = null;
      let planTier = 'free';
      try {
        const auth = await requireAuth(request, env);
        authedUserId = auth.userId;
        planTier = request.headers.get("X-Plan-Tier") === "pro" ? "pro" : "free";
      } catch (err) {
        if (err?.isAuthError) {
          return Response.json(
            { error: err.message || "Authentication required" },
            { status: err.status, headers: CORS }
          );
        }
        throw err;
      }

      try {
        const body = await request.json();
        const text = body.text || "";
        if (!text.trim()) return Response.json({ error: "Empty input" }, { status: 400, headers: CORS });

        const result = await callGemini(env, {
          system_instruction: { parts: [{ text: PARSE_SYSTEM }] },
          contents: [{ parts: [{ text }] }],
          generationConfig: { response_mime_type: "application/json", temperature: 0.1, maxOutputTokens: 1024 },
        });

        logAICall(env, ctx, {
          user_id: authedUserId,
          plan_tier: planTier,
          endpoint: '/parse',
          provider: 'gemini',
          model: 'gemini-2.5-flash',
          status: result.ok ? 'success' : 'error',
          duration_ms: result.duration_ms,
          tokens_in: result.tokens_in,
          tokens_out: result.tokens_out,
          cost_usd: computeCostUsd('gemini-2.5-flash', result.tokens_in, result.tokens_out),
          error_class: result.ok ? null : classifyError(result.status, result.error),
          error_message: result.ok ? null : (result.error || '').slice(0, 500),
          metadata: { pricing_version: PRICING_VERSION, local_parse_hit: false, from_cache: false },
        });

        if (!result.ok) {
          return Response.json({ amount: 0, currency: "LAK", type: "expense", category: "other",
            description: "", confidence: 0.3, model: "fallback" }, { headers: CORS });
        }

        const raw = result.data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        const parsed = JSON.parse(raw);
        return Response.json({ ...parsed, model: "gemini-2.5-flash" }, { headers: CORS });

      } catch (e) {
        return Response.json({ amount: 0, currency: "LAK", type: "expense", category: "other",
          description: "", confidence: 0.3, model: "fallback" }, { headers: CORS });
      }
    }

    // ─── POST /advise — Claude Haiku ────────────────────────────
    // Keeping Claude for advise: superior conversational reasoning,
    // warmer tone, better at nuanced financial context
    if (url.pathname === "/advise") {
      // Kill switch check
      if (!isFeatureEnabled(env, "advise")) return disabledResponse("advise");

      let authedUserId = null;
      let planTier = 'free';
      try {
        const auth = await requireAuth(request, env);
        authedUserId = auth.userId;
        planTier = request.headers.get("X-Plan-Tier") === "pro" ? "pro" : "free";
      } catch (err) {
        if (err?.isAuthError) {
          return Response.json(
            { error: err.message || "Authentication required" },
            { status: err.status, headers: CORS }
          );
        }
        throw err;
      }

      try {
        const body = await request.json();
        const { question = "", lang = "en", summary = "", recentTransactions = [] } = body;
        if (!question.trim()) return Response.json({ error: "Empty question" }, { status: 400, headers: CORS });

        const langInstruction = lang === "lo"
          ? "Reply in Lao (ພາສາລາວ). Use Lao script."
          : lang === "th" ? "Reply in Thai (ภาษาไทย)." : "Reply in English.";

        const recentTxBlock = recentTransactions.length
          ? JSON.stringify(recentTransactions)
          : "No transactions in the last 7 days.";

        const systemPrompt = `You are Phajot's warm, friendly AI financial advisor for users in Laos and Thailand managing LAK, THB, and USD.

MONTHLY SUMMARY:
${summary || "No financial data available yet."}

RECENT TRANSACTIONS (last 7 days, newest first):
${recentTxBlock}

KEY: d=date, t=type(in/ex), a=amount, c=currency, cat=category, n=description

INSTRUCTIONS:
- ${langInstruction}
- Be warm, specific, and encouraging. Never shame spending.
- Reference their ACTUAL numbers when answering.
- You can now answer questions about specific days, categories, and individual transactions from the last 7 days.
- If asked about dates or transactions OUTSIDE the 7-day window, say "I only have details for the last 7 days, but here's what I can see from your monthly summary."
- NEVER invent or assume transactions that are not in the data above.
- Amounts in different currencies are NOT interchangeable. ₭1,000 ≠ ฿1,000 ≠ $1,000. Always mention the currency when citing amounts. Never add amounts across currencies.
- Keep response under 120 words — concise and actionable.
- Use 1-2 emojis max. If data is insufficient, say so honestly.`;

        const result = await callClaude(env, {
          model: "claude-haiku-4-5",
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{ role: "user", content: question }],
        });

        logAICall(env, ctx, {
          user_id: authedUserId,
          plan_tier: planTier,
          endpoint: '/advise',
          provider: 'anthropic',
          model: 'claude-haiku-4-5',
          status: result.ok ? 'success' : 'error',
          duration_ms: result.duration_ms,
          tokens_in: result.tokens_in,
          tokens_out: result.tokens_out,
          cost_usd: computeCostUsd('claude-haiku-4-5', result.tokens_in, result.tokens_out),
          error_class: result.ok ? null : classifyError(result.status, result.error),
          error_message: result.ok ? null : (result.error || '').slice(0, 500),
          metadata: { pricing_version: PRICING_VERSION, message_count: 1, context_tx_count: recentTransactions.length },
        });

        if (!result.ok) return Response.json({ error: result.error }, { status: 500, headers: CORS });
        const reply = result.data?.content?.[0]?.text || "I couldn't generate a response. Please try again.";
        return Response.json({ reply }, { headers: CORS });

      } catch (e) {
        return Response.json({ error: e.message }, { status: 500, headers: CORS });
      }
    }

    // ─── POST /ocr — Gemini 2.5 Flash Vision (Paid Tier 1) ────────
    if (url.pathname === "/ocr") {
      // Kill switch check
      if (!isFeatureEnabled(env, "ocr")) return disabledResponse("ocr");

      let authedUserId = null;
      let planTier = 'free';
      try {
        const auth = await requireAuth(request, env);
        authedUserId = auth.userId;
        planTier = request.headers.get("X-Plan-Tier") === "pro" ? "pro" : "free";
      } catch (err) {
        if (err?.isAuthError) {
          return Response.json(
            { error: err.message || "Authentication required" },
            { status: err.status, headers: CORS }
          );
        }
        throw err;
      }

      try {
        const body = await request.json();
        let imageBase64 = (body.image || "").replace(/^data:image\/\w+;base64,/, "");
        const mimeType = body.mimeType || "image/jpeg";

        if (!imageBase64) return Response.json({ error: "No image provided" }, { status: 400, headers: CORS });

        const ocrPrompt = `You are reading a receipt from LAOS (ປະເທດລາວ). LAO SCRIPT (ພາສາລາວ).

CRITICAL — LAO vs THAI SCRIPT:
This receipt is from Laos. Output item names in LAO SCRIPT exactly as printed.
Lao consonants: ກ ຂ ຄ ງ ຈ ສ ຊ ຍ ດ ຕ ຖ ທ ນ ບ ປ ຜ ຝ ພ ຟ ມ ຢ ຣ ລ ວ ຫ ອ ຮ
Common Lao food: ເຂົ້າ(rice) ໝູ(pork) ໄກ່(chicken) ຕຳ(salad) ເຝີ(pho) ໄຂ່(egg) ຊີ້ນ(meat)
Do NOT convert Lao to Thai script.

CRITICAL — NUMBERS:
Lao receipts use PERIOD (.) as thousands separator NOT decimal.
₭573.000 = 573000. ₭89.000 = 89000. ₭9.000 = 9000.
Output amounts as plain integers only.

RECEIPT FORMAT — each item 2 lines:
  Item name (Lao script)
  N x ₭unit_price    ₭line_total ← use RIGHT column
For N x price: multiply for line total.

Return ONLY valid JSON, no markdown backticks:
{"amount":NUMBER,"currency":"LAK","category":"food","description":"MERCHANT","confidence":0.9,"items":[{"name":"Lao name","amount":NUMBER}]}

Rules:
- amount = grand total plain integer
- currency: ₭/ກີບ/LAK=LAK (default), ฿/baht=THB, $=USD
- category: food, groceries, drinks, coffee, transport, travel, shopping, rent, utilities, phone_internet, household, health, beauty, fitness, entertainment, subscriptions, gaming, education, family, donation, debt_payment, fees, repair, other
- description = merchant name max 30 chars
- items = line items only, no subtotals/tax, max 12, amounts as integers`;

        const result = await callGemini(env, {
          contents: [{
            parts: [
              { inline_data: { mime_type: mimeType, data: imageBase64 } },
              { text: ocrPrompt },
            ],
          }],
          generationConfig: { temperature: 0, maxOutputTokens: 4096 },
        });

        logAICall(env, ctx, {
          user_id: authedUserId,
          plan_tier: planTier,
          endpoint: '/ocr',
          provider: 'gemini',
          model: 'gemini-2.5-flash',
          status: result.ok ? 'success' : 'error',
          duration_ms: result.duration_ms,
          tokens_in: result.tokens_in,
          tokens_out: result.tokens_out,
          cost_usd: computeCostUsd('gemini-2.5-flash', result.tokens_in, result.tokens_out),
          error_class: result.ok ? null : classifyError(result.status, result.error),
          error_message: result.ok ? null : (result.error || '').slice(0, 500),
          metadata: { pricing_version: PRICING_VERSION, image_count: 1 },
        });

        if (!result.ok) return Response.json({ error: result.error || "Gemini error" }, { status: 500, headers: CORS });
        const data = result.data;
        if (!data.candidates?.length) return Response.json({ error: "Could not read receipt", detail: JSON.stringify(data).slice(0,200) }, { status: 422, headers: CORS });

        const raw = (data.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
        if (!raw) {
          const reason = data.candidates?.[0]?.finishReason || "empty";
          return Response.json({ error: "Could not read receipt", detail: `finishReason: ${reason}` }, { status: 422, headers: CORS });
        }

        // Strip markdown fences
        const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

        const jsonStart = cleaned.indexOf("{");
        if (jsonStart === -1) return Response.json({ error: "Could not read receipt", detail: cleaned.slice(0,100) }, { status: 422, headers: CORS });
        let depth = 0, jsonEnd = -1;
        for (let i = jsonStart; i < cleaned.length; i++) {
          if (cleaned[i] === "{") depth++;
          else if (cleaned[i] === "}") { depth--; if (depth === 0) { jsonEnd = i; break; } }
        }

        if (jsonEnd === -1) {
          // Regex fallback for truncated response
          const am = cleaned.match(/"amount"\s*:\s*(\d+)/);
          const cu = cleaned.match(/"currency"\s*:\s*"([^"]+)"/);
          const ca = cleaned.match(/"category"\s*:\s*"([^"]+)"/);
          const de = cleaned.match(/"description"\s*:\s*"([^"]+)"/);
          if (am) return Response.json({ amount: fixAmount(Number(am[1]), cu?.[1]||"LAK"), currency: cu?.[1]||"LAK", category: ca?.[1]||"other", description: de?.[1]||"Receipt", confidence: 0.7, items: [], source: "gemini-2.5-flash" }, { headers: CORS });
          return Response.json({ error: "Could not parse receipt", detail: cleaned.slice(0,200) }, { status: 422, headers: CORS });
        }

        let parsed;
        try { parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1)); }
        catch(e) { return Response.json({ error: "Could not parse receipt", detail: e.message }, { status: 422, headers: CORS }); }

        const amount = fixAmount(parsed.amount, parsed.currency);
        if (!amount || amount <= 0) return Response.json({ error: "Could not find total amount" }, { status: 422, headers: CORS });

        const items = Array.isArray(parsed.items)
          ? parsed.items.map(it => ({ name: it.name || "", amount: fixAmount(it.amount, parsed.currency) }))
          : [];

        return Response.json({ amount, currency: parsed.currency||"LAK", category: parsed.category||"other", description: parsed.description||"Receipt", confidence: parsed.confidence||0.8, items, source: "gemini-2.5-flash" }, { headers: CORS });

      } catch (e) {
        return Response.json({ error: "OCR failed", detail: e.message }, { status: 500, headers: CORS });
      }
    }

    // ─── POST /parse-statement — Gemini 2.5 Flash Vision (multi-image) ──
    // Bank statement OCR: LDB / JDB / BCEL One. Accepts up to 10
    // screenshots in one call, extracts + categorizes transactions,
    // dedupes across overlapping scrolls via hashTx.
    if (url.pathname === "/parse-statement") {
      if (!isFeatureEnabled(env, "parse_statement")) return disabledResponse("parse_statement");

      let authedUserId = null;
      let planTier = 'free';
      try {
        const auth = await requireAuth(request, env);
        authedUserId = auth.userId;
        planTier = request.headers.get("X-Plan-Tier") === "pro" ? "pro" : "free";
      } catch (err) {
        if (err?.isAuthError) {
          return Response.json(
            { error: err.message || "Authentication required" },
            { status: err.status, headers: CORS }
          );
        }
        throw err;
      }

      try {
        const body = await request.json();
        const images = body.images || [];

        if (!Array.isArray(images) || images.length === 0) {
          return Response.json({ error: "At least 1 image required" }, { status: 400, headers: CORS });
        }
        if (images.length > 10) {
          return Response.json({ error: "Maximum 10 images per request" }, { status: 400, headers: CORS });
        }

        // Build multi-image Gemini call — each image becomes an inline_data part
        const imageParts = images.map(img => {
          const cleaned = (img.data || img).replace(/^data:image\/\w+;base64,/, "");
          const mime = img.mimeType || "image/png";
          return { inline_data: { mime_type: mime, data: cleaned } };
        });

        const result = await callGemini(env, {
          contents: [{
            parts: [
              ...imageParts,
              { text: STATEMENT_PROMPT },
            ],
          }],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 8192,
            response_mime_type: "application/json",
          },
        });

        logAICall(env, ctx, {
          user_id: authedUserId,
          plan_tier: planTier,
          endpoint: '/parse-statement',
          provider: 'gemini',
          model: 'gemini-2.5-flash',
          status: result.ok ? 'success' : 'error',
          duration_ms: result.duration_ms,
          tokens_in: result.tokens_in,
          tokens_out: result.tokens_out,
          cost_usd: computeCostUsd('gemini-2.5-flash', result.tokens_in, result.tokens_out),
          error_class: result.ok ? null : classifyError(result.status, result.error),
          error_message: result.ok ? null : (result.error || '').slice(0, 500),
          metadata: { pricing_version: PRICING_VERSION, image_count: images.length, multi_page: images.length > 1 },
        });

        if (!result.ok) return Response.json({ error: result.error || "Gemini error" }, { status: 502, headers: CORS });
        const data = result.data;

        // Extract response text
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (!text) {
          return Response.json({ error: "Empty Gemini response", debug: data }, { status: 502, headers: CORS });
        }

        // Parse JSON (strip fences if present)
        let parsed;
        try {
          const cleaned = text.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
          parsed = JSON.parse(cleaned);
        } catch (e) {
          return Response.json({ error: "Failed to parse Gemini JSON", raw: text.slice(0, 500) }, { status: 502, headers: CORS });
        }

        // Validate shape
        if (!parsed.transactions || !Array.isArray(parsed.transactions)) {
          return Response.json({ error: "Invalid response shape", parsed }, { status: 502, headers: CORS });
        }

        // Apply fixAmount (LAK thousands-separator safety) + ensure positive amounts
        const cleaned = parsed.transactions.map(tx => ({
          ...tx,
          amount: fixAmount(Math.abs(Number(tx.amount) || 0), tx.currency || parsed.currency),
        })).filter(tx => tx.amount > 0);

        // Dedupe across overlapping screenshots
        const { unique, duplicates_removed } = await dedupeTransactions(cleaned);

        return Response.json({
          bank: parsed.bank || null,
          currency: parsed.currency || null,
          account_hint: parsed.account_hint || null,
          transactions: unique,
          stats: {
            total_extracted: cleaned.length,
            duplicates_removed,
            final_count: unique.length,
            images_processed: images.length,
          },
        }, { headers: CORS });

      } catch (e) {
        return Response.json({ error: e.message, stack: e.stack?.slice(0, 500) }, { status: 500, headers: CORS });
      }
    }

    // ─── POST /monthly-report — Claude Haiku ──────────────────────
    // Monthly Wrap: warm narrative + computed stats for a given month.
    // Frontend sends transactions; worker computes stats + generates narrative.
    if (url.pathname === "/monthly-report") {
      if (!isFeatureEnabled(env, "monthly_report")) return disabledResponse("monthly_report");

      let authedUserId = null;
      let planTier = 'free';
      try {
        const auth = await requireAuth(request, env);
        authedUserId = auth.userId;
        planTier = request.headers.get("X-Plan-Tier") === "pro" ? "pro" : "free";
      } catch (err) {
        if (err?.isAuthError) {
          return Response.json(
            { error: err.message || "Authentication required" },
            { status: err.status, headers: CORS }
          );
        }
        throw err;
      }

      try {
        const body = await request.json();
        const { month, lang = "en", transactions = [], prev_month_expense } = body;

        if (!month || !/^\d{4}-\d{2}$/.test(month))
          return Response.json({ error: "Invalid or missing month (expected YYYY-MM)" }, { status: 400, headers: CORS });
        if (!transactions.length)
          return Response.json({ error: "No transactions for this month" }, { status: 400, headers: CORS });

        const { raw: stats, formatted: f } = computeWrapStats(transactions, prev_month_expense, month);

        const langInstruction = lang === "lo"
          ? "Reply in Lao (ພາສາລາວ). Use Lao script."
          : lang === "th" ? "Reply in Thai (ภาษาไทย)." : "Reply in English.";

        const systemPrompt = `You are Phajot's warm, end-of-month financial storyteller for users in Laos and Thailand managing LAK, THB, and USD.

Your job: Write a warm, specific, non-judgmental narrative summarizing the user's month. Think of it like a friend reflecting on their month over coffee.

=== THE MONTH ===
Month: ${month}
Language: ${lang}

=== THE NUMBERS (use only these — never invent) ===
Total expenses: ${f.total_expense_by_currency}
Total income: ${f.total_income_by_currency}
Top spending category: ${f.top_category} (${f.top_category_amount})
Biggest single day: ${f.biggest_day} (${f.biggest_day_amount})${f.biggest_day_items ? `\n  That day's highlights: ${f.biggest_day_items}` : ""}
Active logging days: ${f.active_days} of ${f.days_in_month}
${f.vs_last_month ? `Vs last month: ${f.vs_last_month}` : ""}

Top 3 categories:
${f.top_3_categories}

=== INSTRUCTIONS ===
- ${langInstruction} (write ONLY in ${lang})
- NEVER invent numbers not shown above.
- ALWAYS mention the currency explicitly (₭, ฿, $).
- NEVER add amounts across different currencies.
- Structure your narrative in this order:
  1. Opening — warm greeting to the month (1 sentence)
  2. Big picture — the key stat (top category or biggest day)
  3. Comparison — vs last month if available, otherwise a neutral observation
  4. Forward-looking — a gentle encouragement for next month (1 sentence)
- Keep under 120 words total.
- Use exactly 2-3 emojis (match the tone: 🌿 ☕ 🍜 🚗 💚 📊 🏡)
- Warm, never judgmental. If spending was high, say "you lived fully" not "you overspent".
- If spending decreased vs last month, say "nice awareness" not "good discipline".
- If data is thin (few transactions), acknowledge gently: "A quiet month of tracking — that's okay!"

=== TONE EXAMPLES ===

Good (en):
"April was a flavorful month ☕ You spent ₭3.2M, with food leading at ₭1.2M — that coffee habit is real and I love it for you! Your biggest day was April 8th (₭640k — dinner at MK and some Beer Lao). You're spending 8% more than March, but logging 25 days vs 18 — you're really paying attention. Let's see what May brings! 🌿"

Good (lo):
"ເດືອນເມສາຜ່ານໄປແບບມີລົດຊາດ ☕ ເຈົ້າໃຊ້ຈ່າຍ ₭3.2M, ກິນມາເປັນອັນດັບ 1 ທີ່ ₭1.2M — ນັ້ນແມ່ນກາເຟຊີວິດ! 🌿..."

Good (thin month):
"A quiet month of tracking — that's okay! 🌿 You logged 8 transactions totaling ₭420k, mostly groceries. When you're ready to track more, I'll be here 💚"

Bad (never do this):
"You spent WAY too much on food. Try to cut back in May."

=== OUTPUT ===
Return ONLY the narrative text. No JSON, no markdown, no headers.`;

        const result = await callClaude(env, {
          model: "claude-haiku-4-5",
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{ role: "user", content: `Generate the monthly wrap narrative for ${month}.` }],
        });

        logAICall(env, ctx, {
          user_id: authedUserId,
          plan_tier: planTier,
          endpoint: '/monthly-report',
          provider: 'anthropic',
          model: 'claude-haiku-4-5',
          status: result.ok ? 'success' : 'error',
          duration_ms: result.duration_ms,
          tokens_in: result.tokens_in,
          tokens_out: result.tokens_out,
          cost_usd: computeCostUsd('claude-haiku-4-5', result.tokens_in, result.tokens_out),
          error_class: result.ok ? null : classifyError(result.status, result.error),
          error_message: result.ok ? null : (result.error || '').slice(0, 500),
          metadata: { pricing_version: PRICING_VERSION, month_covered: month, tx_count: transactions.length },
        });

        if (!result.ok) {
          // Partial success: return stats even if narrative fails
          return Response.json({ narrative: null, error: "narrative_failed", detail: result.error, stats, cached: false }, { status: 200, headers: CORS });
        }

        const narrative = result.data?.content?.[0]?.text || null;
        if (!narrative) {
          return Response.json({ narrative: null, error: "empty_narrative", stats, cached: false }, { status: 200, headers: CORS });
        }

        return Response.json({ narrative, stats, cached: false, model: "claude-haiku-4-5" }, { headers: CORS });

      } catch (e) {
        return Response.json({ error: e.message }, { status: 500, headers: CORS });
      }
    }

    return new Response("Not found", { status: 404, headers: CORS });
  },
};

// Wrap with Sentry. If env.SENTRY_DSN is missing, withSentry is a
// safe no-op. The inner handler retains all existing behavior:
// /health, logAICall, callClaude/callGemini, rate limiting, etc.
export default Sentry.withSentry(
  (env) => ({
    dsn: env.SENTRY_DSN,
    environment: 'production',
    sendDefaultPii: false,
    tracesSampleRate: 0.1,
    release: WORKER_VERSION,
    ignoreErrors: [
      /rate limit/i,
      /429/,
    ],
  }),
  handler
);