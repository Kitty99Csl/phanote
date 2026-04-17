// AI cost calculator for ai_call_log
//
// Pricing version: v1-draft-2026-04-17
//
// IMPORTANT: These rates are rough estimates. Verify against
// actual provider billing dashboards (Anthropic console, Google
// Cloud billing) before relying on cost data for business
// decisions. When verified, bump PRICING_VERSION and update
// rows logged with the new version going forward.
//
// Stored as USD per 1 million tokens (matches provider pricing
// page conventions).

export const PRICING_VERSION = 'v1-draft-2026-04-17';

const PRICING = {
  // Gemini 2.5 Flash — rough estimates, verify
  'gemini-2.5-flash': {
    input_per_million: 0.075,
    output_per_million: 0.30,
  },
  // Anthropic Claude Haiku 4.5 — public pricing
  'claude-haiku-4-5': {
    input_per_million: 1.00,
    output_per_million: 5.00,
  },
};

// Compute USD cost for a single AI call.
// Returns null if model unknown (logs the row with cost=null
// rather than guessing — visible in Tower as "uncosted").
export function computeCostUsd(model, tokensIn, tokensOut) {
  const rates = PRICING[model];
  if (!rates) return null;
  if (typeof tokensIn !== 'number' || typeof tokensOut !== 'number') {
    return null;
  }
  const inCost = (tokensIn / 1_000_000) * rates.input_per_million;
  const outCost = (tokensOut / 1_000_000) * rates.output_per_million;
  // Round to 6 decimal places to match numeric(10,6) column
  return Math.round((inCost + outCost) * 1_000_000) / 1_000_000;
}
