/**
 * PHANOTE — Main API Worker v4.2
 * Domain: api.phanote.com
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
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// ─── RATE LIMITING (in-memory, per-IP) ───────────────────────────
// Protects against abuse and runaway scripts.
// Per-IP limits — real users won't ever hit these.
const rateLimitCache = new Map();

const RATE_LIMITS = {
  "/parse":  120,  // 120 req/min per IP
  "/advise":  20,  // 20 req/min per IP
  "/ocr":     15,  // 15 req/min per IP
  "/monthly-report": 10,  // 10 req/min per IP (monthly feature)
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
// readable/writable from admin.phanote.com admin panel.
// Worker will check Supabase first, fall back to these env vars.
function isFeatureEnabled(env, feature) {
  const varName = {
    parse: "AI_ENABLED",
    advise: "ADVISOR_ENABLED",
    ocr: "OCR_ENABLED",
    monthly_report: "MONTHLY_WRAP_ENABLED",
  }[feature];
  return env[varName] === "true";
}

function disabledResponse(feature) {
  const messages = {
    parse: "AI parsing is temporarily unavailable. Please enter your transaction manually.",
    advise: "AI advisor is temporarily unavailable. Please try again later.",
    ocr: "Receipt scanning is temporarily unavailable. Please enter manually.",
    monthly_report: "Monthly wrap is temporarily unavailable. Please try again later.",
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
const PARSE_SYSTEM = `You are a financial transaction parser for Phanote, a personal finance app based in Laos.

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

// ─────────────────────────────────────────────
const callGemini = async (env, payload) => {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
  );
  return res.json();
};

// ─── AMOUNT SAFETY FIX ───────────────────────────────────────────
// Lao receipts use . as thousands separator: 573.000 means 573000
const fixAmount = (a, currency) => {
  const n = Number(a);
  if ((currency === "LAK" || !currency) && n > 0 && n < 1000) return n * 1000; // threshold: valid LAK is rarely under ₭1,000
  return n;
};

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

export default {
  async fetch(request, env) {
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
      return Response.json({
        status: "ok", service: "Phanote API", version: "4.3.0",
        parse: "gemini-2.5-flash", advise: "claude-haiku-4-5", ocr: "gemini-2.5-flash-vision", monthly_report: "claude-haiku-4-5",
        routes: ["/parse", "/advise", "/ocr", "/monthly-report"],
        features: ["rate_limiting", "kill_switch"],
        status_flags: {
          ai_parse: isFeatureEnabled(env, "parse"),
          advisor: isFeatureEnabled(env, "advise"),
          ocr: isFeatureEnabled(env, "ocr"),
          monthly_wrap: isFeatureEnabled(env, "monthly_report"),
        },
      }, { headers: CORS });
    }

    if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: CORS });

    // ─── POST /parse — Gemini 2.5 Flash ─────────────────────────
    if (url.pathname === "/parse") {
      // Kill switch check
      if (!isFeatureEnabled(env, "parse")) return disabledResponse("parse");

      try {
        const body = await request.json();
        const text = body.text || "";
        if (!text.trim()) return Response.json({ error: "Empty input" }, { status: 400, headers: CORS });

        const data = await callGemini(env, {
          system_instruction: { parts: [{ text: PARSE_SYSTEM }] },
          contents: [{ parts: [{ text }] }],
          generationConfig: { response_mime_type: "application/json", temperature: 0.1, maxOutputTokens: 1024 },
        });

        const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
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

        const systemPrompt = `You are Phanote's warm, friendly AI financial advisor for users in Laos and Thailand managing LAK, THB, and USD.

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

        const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": env.ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5",
            max_tokens: 1024,
            system: systemPrompt,
            messages: [{ role: "user", content: question }],
          }),
        });

        const data = await claudeRes.json();
        if (data.error) return Response.json({ error: data.error.message }, { status: 500, headers: CORS });
        const reply = data?.content?.[0]?.text || "I couldn't generate a response. Please try again.";
        return Response.json({ reply }, { headers: CORS });

      } catch (e) {
        return Response.json({ error: e.message }, { status: 500, headers: CORS });
      }
    }

    // ─── POST /ocr — Gemini 2.5 Flash Vision (Paid Tier 1) ────────
    if (url.pathname === "/ocr") {
      // Kill switch check
      if (!isFeatureEnabled(env, "ocr")) return disabledResponse("ocr");

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

        const data = await callGemini(env, {
          contents: [{
            parts: [
              { inline_data: { mime_type: mimeType, data: imageBase64 } },
              { text: ocrPrompt },
            ],
          }],
          generationConfig: { temperature: 0, maxOutputTokens: 4096 },
        });

        if (data.error) return Response.json({ error: data.error.message || "Gemini error", detail: JSON.stringify(data.error) }, { status: 500, headers: CORS });
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

    // ─── POST /monthly-report — Claude Haiku ──────────────────────
    // Monthly Wrap: warm narrative + computed stats for a given month.
    // Frontend sends transactions; worker computes stats + generates narrative.
    if (url.pathname === "/monthly-report") {
      if (!isFeatureEnabled(env, "monthly_report")) return disabledResponse("monthly_report");

      try {
        const body = await request.json();
        const { user_id, month, lang = "en", transactions = [], prev_month_expense } = body;

        if (!month || !/^\d{4}-\d{2}$/.test(month))
          return Response.json({ error: "Invalid or missing month (expected YYYY-MM)" }, { status: 400, headers: CORS });
        if (!transactions.length)
          return Response.json({ error: "No transactions for this month" }, { status: 400, headers: CORS });

        const { raw: stats, formatted: f } = computeWrapStats(transactions, prev_month_expense, month);

        const langInstruction = lang === "lo"
          ? "Reply in Lao (ພາສາລາວ). Use Lao script."
          : lang === "th" ? "Reply in Thai (ภาษาไทย)." : "Reply in English.";

        const systemPrompt = `You are Phanote's warm, end-of-month financial storyteller for users in Laos and Thailand managing LAK, THB, and USD.

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

        const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": env.ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5",
            max_tokens: 1024,
            system: systemPrompt,
            messages: [{ role: "user", content: `Generate the monthly wrap narrative for ${month}.` }],
          }),
        });

        const data = await claudeRes.json();
        if (data.error) {
          // Partial success: return stats even if narrative fails
          return Response.json({ narrative: null, error: "narrative_failed", detail: data.error.message, stats, cached: false }, { status: 200, headers: CORS });
        }

        const narrative = data?.content?.[0]?.text || null;
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