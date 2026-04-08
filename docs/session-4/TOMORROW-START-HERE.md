# PHANOTE — Tomorrow's Plan (Session 4 Day 3)
### Start here when you come back

---

## 🌿 Welcome back, Kitty!

If you're reading this, it's the morning (or whenever) after Session 4 Day 2. Here's exactly where we left off and what to do next.

---

## 📊 Current Status

### What's shipped (Day 1 + Day 2)
- ✅ 10 commits on `session-4` branch, all pushed to GitHub
- ✅ Sheet component + modal migrations
- ✅ Parse pipeline Tier 1 (confidence + AI wait)
- ✅ Parse pipeline Tier 3 (fuzzy matching + keywords + audit)
- ✅ Polish: ai_memory fix + friendly OCR errors

### What's still pending from wife's feedback
- ⏳ **AI Advisor scope fix** — Issue 2, not yet started
- ✅ Category "Other" bug — dramatically better now (80% solved by Tier 1+3)

### What's still pending from Session 4 playbook
- 🔴 RLS on Supabase (profiles + transactions) — BLOCKING public launch
- 🟡 Tier 2 category picker modal
- 🟡 Usage limits system
- 🟡 Monthly Wrap feature
- 🟡 Observability / Sentry

---

## 🎯 Recommended Day 3 Plan

### 🥇 Priority 1 — AI Advisor Scope Fix (60-90 min)

**Why first:** This is the last piece of wife's feedback. Everything else can wait.

**What to do:**

1. **Start Claude Code with this investigation prompt:**

```
AI ADVISOR SCOPE FIX — Session 4 Day 3, Priority 1

CONTEXT: From Session 4 Day 2 investigation, we know the issue:
- The /advise endpoint in workers/phanote-api-worker.js receives only a 
  summary string, not individual transactions
- The buildSummary() function in src/App.jsx only sends:
  - Monthly totals by currency (income, expense, net)
  - Top 5 expense categories (aggregated amounts)
  - Goals list
  - Budgets list
- Wife wants to ask "how much did we spend on food today" which requires
  transaction-level data with dates and categories

DECISION (locked from Session 4 Day 2):
We're going with Option A: send last 7 days of transactions to the Advisor
alongside the summary. Cap at ~50 transactions to control token cost.

PLEASE PROPOSE THE IMPLEMENTATION PLAN BEFORE CODING:

1. Read src/App.jsx buildSummary() function
2. Read AiAdvisorModal (around line 3076)
3. Read workers/phanote-api-worker.js /advise endpoint and system prompt

Then propose:

a) How to select the last 7 days of transactions
   - Filter by date >= 7 days ago
   - Sort by date desc (newest first)
   - Cap at 50 transactions

b) What format to send to the worker
   - Suggest JSON array of {date, category_name, amount, currency, description}
   - Or a structured text table?
   - Consider what's easiest for Claude Haiku to parse

c) Updated system prompt for /advise
   - Tell Claude Haiku it now has individual transactions
   - Give examples of date/category questions it can answer
   - Preserve the existing summary context
   - Warn it not to invent transactions that aren't in the data

d) Frontend changes needed
   - Update buildSummary() or create a new buildContext() function
   - Send transactions in the /advise request body
   - No UI changes needed (just backend + system prompt)

e) Token cost estimate
   - Rough estimate: 50 transactions × ~30 tokens each = 1500 tokens per query
   - Plus summary (~500 tokens) = ~2000 total
   - Claude Haiku cost: acceptable for Pro users, heavy for free

f) Risk assessment
   - What could break?
   - Is rate limiting still fine?
   - Edge cases (empty data, data too old, etc.)

DO NOT code yet. Show me the plan, I'll review with my CTO (partner Claude
in chat), then approve.
```

2. **Review Claude Code's plan with CTO Claude** (paste the plan to chat)

3. **Approve or request changes**

4. **Apply, test, commit**

**Test cases to verify after implementation:**

| Question | Expected behavior |
|---|---|
| "How much did I spend on food today?" | Returns today's food total |
| "What's my biggest expense this week?" | Returns the category with highest total in last 7 days |
| "Did I buy coffee yesterday?" | Returns yes/no with details |
| "What's my total this month?" | Existing summary question still works |
| "Am I on track with my budget?" | Existing budget question still works |

---

### 🥈 Priority 2 — RLS on Supabase (30 min, security)

**Why second:** This is BLOCKING public launch. Must fix before inviting anyone.

**What to do:**

1. Open https://supabase.com/dashboard → Phanote project → SQL Editor

2. Run this SQL (verified safe, tested in staging equivalents):

```sql
-- Protect profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own profile" ON profiles
  FOR ALL USING (auth.uid() = id);

-- Protect transactions table
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own transactions" ON transactions
  FOR ALL USING (auth.uid() = user_id);
```

3. **Test immediately after running:**
   - Log into Phanote on your phone
   - Can you still see your transactions? ✅
   - Log into Phanote with wife's account on another device
   - Can she see HER transactions? ✅
   - Can she see YOUR transactions? ❌ (should be NO)

4. If anything breaks, rollback with:

```sql
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
DROP POLICY "users own profile" ON profiles;
DROP POLICY "users own transactions" ON transactions;
```

**Risk:** Low. Reversible in 10 seconds. Other tables already have RLS and work fine, so the pattern is proven.

---

### 🥉 Priority 3 (if time) — Tier 2 Category Picker (60 min)

**Why third:** Nice to have but not blocking. The remaining "Other" cases after Tier 1+3 are genuinely ambiguous inputs, so the picker would help on those edge cases.

**What to do:** Design a `<Sheet>`-based modal with all 24 category chips. Show it when both local AND AI confidence are below 0.60. User taps a chip, saves with confidence 1.0.

**Use the existing Sheet component** (proven pattern from Day 1).

---

## 🛡 Guard Rails for Tomorrow

1. **Start with RLS if wife is going to use the app today.** Security first if testing continues.

2. **Don't skip the investigation phase for AI Advisor.** Same careful flow as Tier 1/3.

3. **Token cost matters.** The Advisor will now use more tokens per call. Make sure rate limiting is still in place.

4. **Test with real questions your wife would ask.** Not just technical verification.

5. **One commit per logical fix.** Don't mix RLS SQL + Advisor code in one commit.

---

## 📋 Docs to Update Tomorrow

After shipping, update:
- `PHANOTE-SESSION-4-DAY-2.md` → add a Day 3 section
- `PHANOTE-DECISIONS-LOG.md` → log any new decisions (e.g., token budget for Advisor)
- `PHANOTE-OPEN-QUESTIONS.md` → resolve OQ-008 (AI Advisor scope) and maybe OQ-001 (RLS)
- `CLAUDE.md` → mark Part 1.1 and Part 1.8 as done

---

## 💚 Remember

You're doing this because:
1. Your wife asked for it
2. It makes the app actually useful
3. You're learning how to build products the right way

The next session is mostly execution — the hard thinking (investigation, planning, decisions) was done in Day 2. Tomorrow is just "build what we planned."

**Take breaks. Drink water. Eat. Your wife is your best QA.** 🐾

---

## 🎯 First 3 Actions Tomorrow Morning

1. Open Codespaces + VS Code Desktop
2. Paste the "AI ADVISOR SCOPE FIX" prompt to Claude Code
3. Come back to chat with Partner Claude (CTO) with Claude Code's plan

That's it. Everything else flows from there. 🌿

---

*"Phanote · ພາໂນດ · พาโนด — Lead your notes. Know your money."* ✨
