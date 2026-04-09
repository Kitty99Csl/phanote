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

### OQ-012 — Lao-first positioning + official slogan locked

**Status:** Decision made, execution planned for Session 6
**Priority:** 🟢 Brand/marketing foundation
**Captured:** Session 5 Day 1, April 10 2026

**Decision summary:**
Phanote repositions as a Lao-first product publicly while maintaining
Thai as a supported language in the app. This clarifies our market
position (Laos = main market), leans into our differentiator vs Parnuan
(Thai-only), and establishes a clear brand voice rooted in Lao-native
warmth rather than translated marketing-speak.

---

## 🏆 OFFICIAL SLOGAN (LOCKED)

### Lao (primary, native, poetic):
**ເງິນເຈົ້າໄປໃສ? ດຽວພາໂນດບອກໃຫ້ຟັງ**

### English (support, conversational):
**Where did your money go? Let Phanote tell you.**

### Why this slogan works:
- Uses "ດຽວ" (diew) — a natural Lao conversational particle meaning
  "hold on, let me...", giving it friend-voice rather than app-voice
- "ບອກໃຫ້ຟັງ" literally means "tell you to listen" — how Lao people
  talk over coffee, not how banks talk
- English uses "Let Phanote tell you" (humble, invitational) instead of
  "Phanote tells you" (transactional)
- Question → friendly answer rhythm creates satisfying resolution
- Non-judgmental: reflective (where IT WENT) not controlling (where it goes)
- Connects naturally to Monthly Wrap feature (the "storytelling" feature)
- Originates in Lao first, not translated from English marketing-speak
- Differentiates clearly from any other finance app tone

### Where this slogan goes:
- Landing page hero (phanote.com)
- App splash screen (optional)
- App store listing
- Social media bios
- README / GitHub description
- Marketing materials

---

## 🎯 LAO-FIRST POSITIONING STRATEGY

### Public-facing (what the world sees)
- **Primary language:** Lao
- **Secondary language:** English
- **Market positioning:** "The Lao finance app" — clearly native to Laos
- **Differentiator:** Where Parnuan is Thai-only, Phanote is Lao-first
- **Visual identity:** Already Lao-appropriate (celadon green, Lao typography)

### App-facing (what users see in the product)
- **Default language for new users:** Lao (change from current default)
- **Supported languages in-app:** Lao, English, Thai (all 3 remain)
- **Language picker:** Shows all 3 during onboarding and in settings
- **Existing users:** Keep their current language preference (no force-switch)

### Data/parser-facing (what the system accepts)
- **Transaction input:** Still accepts Lao, Thai, and English text
- **OCR receipts:** Still handles Thai text on receipts (common — Thai
  products sold in Laos, border region shopping)
- **Parser rules:** Keep all existing Thai keyword patterns (wife + Lao
  users type Thai words via Thai keyboards)
- **ai_memory:** No changes — learns from whatever user types

### Why we keep Thai in the app but remove it from marketing
1. Many Lao users also type Thai (common keyboard, cultural overlap)
2. Bills/receipts in Laos often have Thai text (imported goods)
3. Removing Thai UI would punish existing users (wife included)
4. Marketing as "Lao-first" doesn't require removing Thai functionality
5. Grab model: positions as "Southeast Asia" app, supports 15 languages
   under the hood

---

## 📋 EXECUTION PLAN (Session 6)

### Phase A — Landing page refresh (30-45 min)
- Edit landing/index.html
- Update hero section with new slogan (Lao primary, English support)
- Remove Thai hero copy and feature description translations
- Update meta tags (og:description, twitter:description) to Lao + English
- Update og:image alt text
- Test on phone viewport
- Deploy via git push → Cloudflare Pages auto-deploys phanote.com
- Verify live

### Phase B — App default language change (15-20 min)
- Find where default language is set for new users in src/App.jsx
- Change default from current value to "lo" (Lao)
- ONLY affects new users (existing users keep their preference)
- Test onboarding flow with a fresh account
- Commit + push

### Phase C — Marketing copy alignment (10 min)
- Update CLAUDE.md to note the positioning change
- Update project_codex.md § Brand Voice to include the official slogan
- Update README if it exists
- Commit docs update

### Phase D — Verify nothing broke (15 min)
- Open app in Lao — does it feel right?
- Open app in English — still fully translated?
- Open app in Thai — still works? (regression check)
- Try logging a Thai transaction — still parses?
- Try OCR on a Thai receipt — still works?

**Total Session 6 estimated time: 70-90 min**

---

## ⚠️ What we are NOT doing

To prevent scope creep:
- ❌ NOT removing Thai i18n strings from src/App.jsx
- ❌ NOT removing Thai from the language switcher
- ❌ NOT changing existing user language preferences
- ❌ NOT removing Thai keyword parser rules
- ❌ NOT removing Thai OCR support
- ❌ NOT touching the monthly_reports table schema (has all 3 languages)
- ❌ NOT breaking any existing Thai-language wife workflows

Only affected:
- ✅ Landing page (public marketing)
- ✅ New user default language
- ✅ Brand positioning docs

---

## 🎨 Slogan usage guidelines

### When to use the full slogan (both languages)
- Landing page hero
- App store listing
- Pitch deck cover slide

### When to use just the Lao version
- Social media posts targeted at Lao users
- Inside the app (if we add a marketing banner)
- Physical materials (stickers, cards if we print)

### When to use just the English version
- International press
- GitHub README
- English-language social media

### When to shorten to micro-slogan
- App icon caption, tagline fields with character limits
- Shortened form: "Where did your money go?" (English) or
  "ເງິນເຈົ້າໄປໃສ?" (Lao)

---

## 📊 Decision metrics

How we'll know this worked:
- Wife prefers the Lao UI (she stays on Lao after trying English)
- New users consistently choose Lao during onboarding (vs picking something else)
- Landing page conversion rate (visitor → signup) stays same or improves
- No regression in Thai user experience
- Social/community engagement in Lao-speaking groups increases

---

## 🏷 Related OQs
- OQ-011 — OCR bank statement scanning (should also be Lao-first when shipped)
- Monthly Wrap (Phase 1A/1B shipped) — already Lao-capable, aligns with positioning

---
