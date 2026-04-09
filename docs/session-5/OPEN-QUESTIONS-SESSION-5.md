# PHANOTE — Session 5 Open Questions

Tracking ideas, gaps, and pending decisions captured during Session 5.

---

### OQ-011 — OCR: Support bank statement / notification screen scanning

**Status:** Idea captured, not started
**Priority:** 🟡 HIGH user value (huge Laos workflow win)
**Captured:** Session 5 Day 1, April 10 2026

**What:** Currently OCR only handles shop/restaurant receipts (single
transaction at a time). User wants to scan bank app notification screens
(BCEL One message view, JDB app, etc.) and import multiple transactions
at once.

**User workflow (desired):**
1. User gets bank SMS/push notifications for transactions
2. User opens BCEL One → Messages tab → sees list of recent transactions
3. User screenshots the message list
4. User taps "Scan Receipt" in Phanote
5. OCR detects multiple transactions from the image
6. Phanote shows a preview with all detected rows
7. User reviews, edits or skips individual rows
8. User confirms → all imported as separate transactions in one batch

**Why this matters for Laos:**
- BCEL One / JDB notifications are the primary source of financial data
  for most users (no open banking API in Laos)
- Manual entry of 5-10 transactions per week = too much friction
- This is the "bridge" between bank apps and Phanote without needing
  bank API integrations that don't exist
- Could unlock 10x more logging consistency for the average user

**Technical considerations:**
- OCR system prompt needs a new "statement mode" vs "receipt mode"
- Option A: Auto-detect based on image content (complex)
- Option B: User explicitly picks mode before scanning (simpler)
- Statement format varies by bank (BCEL One vs JDB vs LDB all differ)
- Must parse per row: merchant name, date, amount, currency, tx type
- Must skip FAILED transactions (don't import errored ones)
- Must handle mixed currencies in one statement (LAK + USD)
- Must skip headers, footers, page titles
- Category classification per detected row (reuse existing CAT_RULES +
  fuzzy matching + AI fallback)
- Dedup logic: don't re-import transactions already in the database

**UX considerations:**
- Multi-transaction preview modal (new component, not the current single-
  receipt one)
- User can edit amount/category/name per row before confirming
- User can skip individual rows (checkbox pattern)
- Per-row confidence indicators
- Batch save to Supabase (single API call, multiple inserts)
- Handle partial failures gracefully (some rows save, some don't)

**Scope estimate:**
- Phase A — New OCR prompt for statement format: 1-2 hours
- Phase B — Multi-row preview UI: 2-3 hours
- Phase C — Testing with real BCEL/JDB screenshots: 1 hour
- **Total: 4-6 hours, dedicated session**

**Dependencies:**
- Can be built independently after Monthly Wrap Phase 1B ships (now done)
- Reuses existing OCR infrastructure (worker endpoint, Gemini vision)
- Could reuse existing Sheet component for preview modal

**Open sub-questions:**
- Mode toggle: auto-detect or explicit picker? Recommendation: explicit
  for Phase 1 (simpler), auto-detect in Phase 2
- Which bank apps to support first? Start with BCEL One (most common in
  Laos), add others based on wife feedback
- Failed transactions: skip automatically or show to user?
  Recommendation: auto-skip, tell user in preview ("3 failed tx ignored")
- Deduplication strategy: by amount+date+merchant? Or let user decide
  per row? Recommendation: highlight likely duplicates, let user choose

**Effort/Impact assessment:** HIGH effort, VERY HIGH user value. Should
be prioritized before public launch because it fundamentally changes
the logging workflow from "friction-heavy" to "effortless" for the
primary Laos use case.

**Proposed session for this work:** Session 6 or Session 7, depending
on wife's feedback from Monthly Wrap testing.

---
