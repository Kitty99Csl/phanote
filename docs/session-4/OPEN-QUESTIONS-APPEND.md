# PHANOTE — New Open Questions (April 9, 2026)
### Append these to PHANOTE-OPEN-QUESTIONS.md

---

### OQ-007 — Dedicated lottery category?

**Status:** Unresolved, deferred  
**Priority:** Low — functional as-is

**What:** Currently lottery (ຊື້ເລກ, ຫວຍ, หวย, lottery) is mapped to `entertainment`. Culturally in Laos, lottery is a very common expense — arguably deserves its own category.

**Options:**
- **A.** Keep as entertainment (current, simple) ← current
- **B.** Add dedicated "lottery" / "gambling" category (more accurate, requires updating 24 → 25 cats + i18n + icons + onboarding)
- **C.** Map to "other_expense" to avoid miscategorization

**Waiting on:** Kitty's wife feedback — does she mentally distinguish lottery from entertainment?

**If chosen:** ~30 min of work to add the new category everywhere.

---

### OQ-008 — AI Advisor scope: how much transaction data to send?

**Status:** Planned, not implemented  
**Priority:** 🔴 HIGH — blocks Issue 1 from wife feedback

**What:** Currently `/advise` worker receives only a monthly summary string from `buildSummary()`. Wife wants to ask "how much did we spend on food today" which requires individual transaction data with dates and categories.

**Options:**
- **A. Send last 7 days of transactions** (recommended)
  - Add date, category, amount, description per transaction
  - Cap at ~50 transactions to control Haiku token cost
  - Enables "today", "this week", daily breakdowns
  - Estimated effort: 60-90 min
  
- **B. Send full current month transactions**
  - More flexible (answers any month question)
  - Higher token cost, slower response
  - Could hit token limits on heavy users
  
- **C. Improve summary only**
  - Add daily totals + per-category breakdowns to summary text
  - Cheapest (no raw data sent)
  - Less flexible for complex questions

**Recommendation:** Option A — best balance of capability vs cost.

**Status:** Plan ready, implementation scheduled for next session (Session 4 Day 3).

---

### OQ-009 — AI Advisor: Pro-gating decision

**Status:** Unresolved, design question  
**Priority:** 🟡 MEDIUM — before public launch

**What:** The AI Advisor is currently free for all users. Once we fix the scope (OQ-008), each question will use Claude Haiku tokens. At scale, this becomes a real cost.

**Options:**
- **A.** Keep free but rate-limit (e.g., 3 questions/day for free users)
- **B.** Gate entirely behind Pro ($2.99/฿100/₭70,000 per month)
- **C.** Free tier gets "basic" summary answers, Pro gets full transaction context

**Recommendation:** Option C — free users still get value (monthly summary answers), Pro users get the full "chat with your money" experience.

**Decision needed before:** Public launch.

---

### OQ-010 — Should pending Session 4 items be split across multiple sessions?

**Status:** Planning question  
**Priority:** Low — organizational

**What:** The Session 4 playbook still has 5 major items remaining:
1. AI Advisor scope fix (Day 3 priority)
2. Tier 2 category picker modal
3. RLS on Supabase
4. Usage limits system
5. Monthly Wrap feature

That's potentially 8-12 hours of work. Should we:
- **A.** Keep everything in Session 4 and just extend it to Day 3, Day 4, etc.
- **B.** Close Session 4 after AI Advisor + RLS, start Session 5 for refactor + remaining features
- **C.** Reorganize into themed mini-sessions (Security Sprint, Feature Sprint, Refactor Sprint)

**Kitty's style preference:** Clear focused sessions with specific themes work better than "kitchen sink" sessions.

**Recommendation:** Option B — Session 4 closes after AI Advisor + RLS ship. Session 5 handles the App.jsx refactor + remaining features.
