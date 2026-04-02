/**
 * PHANOTE — Cloudflare Worker: Gemini Transaction Parser
 * ═══════════════════════════════════════════════════════════════
 * Deploy this to Cloudflare Workers as the secure AI backend.
 *
 * Setup:
 *   1. wrangler secret put GEMINI_API_KEY
 *   2. wrangler deploy
 *   3. Set VITE_WORKER_URL=https://your-worker.workers.dev in .env
 *
 * Per Phanote Codex §16 Rule 3: Never expose API keys in the frontend.
 */

const SYSTEM_PROMPT = `You are a financial transaction parser for a personal finance app used in Laos.
The user may write in Lao, Thai, English, or any mixture of all three.
Currencies: LAK (Lao Kip, default), THB (Thai Baht), USD (US Dollar).
Infer expense vs income from context — salary/income words = income, everything else = expense.

Extract and return ONLY valid JSON (no markdown, no explanation):
{
  "amount": <number>,
  "currency": "LAK"|"THB"|"USD",
  "type": "expense"|"income",
  "category": "food"|"transport"|"rent"|"shopping"|"health"|"entertainment"|"salary"|"freelance"|"gift"|"investment"|"other",
  "description": "<short cleaned label in the same language as input>",
  "confidence": <0.0-1.0>
}`;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: CORS });
    }

    const url = new URL(request.url);

    // ─── POST /parse ────────────────────────────────────────────
    if (url.pathname === "/parse") {
      const { text } = await request.json();
      if (!text?.trim()) {
        return Response.json({ error: "Empty input" }, { status: 400, headers: CORS });
      }

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: SYSTEM_PROMPT + "\n\nUser input: " + text }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 256 },
          }),
        }
      );

      const data = await geminiRes.json();
      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

      try {
        const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
        return Response.json(parsed, { headers: CORS });
      } catch {
        return Response.json(
          { amount: 0, currency: "LAK", type: "expense",
            category: "other", description: text.slice(0, 40), confidence: 0.3 },
          { headers: CORS }
        );
      }
    }

    return new Response("Not found", { status: 404, headers: CORS });
  },
};
