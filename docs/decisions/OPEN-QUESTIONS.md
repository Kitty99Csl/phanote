# Phajot — Open Questions

> **Status:** Current source of truth (active questions + resolutions)
>
> Active questions awaiting decision at top. Resolved questions moved
> to bottom with resolution commit reference.

## Session 4 questions (2026-04-09)

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

---

## Session 5 questions (2026-04-10)

### OQ-011 — OCR: Support bank statement / notification screen scanning

**Status:** ✅ RESOLVED — Shipped in Session 6 as StatementScanFlow
**Priority:** HIGH user value (huge Laos workflow win)
**Captured:** Session 5 Day 1, April 10 2026

**What:** Currently OCR only handles shop/restaurant receipts (single
transaction at a time). User wants to scan bank app notification screens
(BCEL One message view, JDB app, etc.) and import multiple transactions
at once.

**User workflow (desired):**
1. User gets bank SMS/push notifications for transactions
2. User opens BCEL One -> Messages tab -> sees list of recent transactions
3. User screenshots the message list
4. User taps "Scan Receipt" in Phajot
5. OCR detects multiple transactions from the image
6. Phajot shows a preview with all detected rows
7. User reviews, edits or skips individual rows
8. User confirms -> all imported as separate transactions in one batch

**Why this matters for Laos:**
- BCEL One / JDB notifications are the primary source of financial data
  for most users (no open banking API in Laos)
- Manual entry of 5-10 transactions per week = too much friction
- This is the "bridge" between bank apps and Phajot without needing
  bank API integrations that don't exist
- Could unlock 10x more logging consistency for the average user

**Resolution:** Implemented as StatementScanFlow in Session 6. Multi-image
upload, multi-bank support, batch import with dedup, inline editing.

---

### OQ-012 — Lao-first positioning + official slogan locked

**Status:** ✅ RESOLVED (Session 5 Day 1, April 11, 2026)
**Priority:** Brand/marketing foundation
**Captured:** Session 5 Day 1, April 10 2026

**Decision summary:**
Phajot repositions as a Lao-first product publicly while maintaining
Thai as a supported language in the app. Slogan locked:
- Lao: ເງິນເຈົ້າໄປໃສ? ດຽວພາຈົດບອກໃຫ້ຟັງ
- English: Where did your money go? Let Phajot tell you.

**Resolution:** Implemented across app and landing page during Session 5.
Wife reaction confirmed the positioning works naturally.
Commits: `de8e176` (app), `3fc39a3` (landing page).
