# 📒 PHAJOT — PROJECT CODEX
### The Single Source of Truth · Version 1.4
> **Rule:** Before writing any complex code, review this document. Before closing any major phase, update this document. This codex is a living contract between the developer and the project.

---

## 0. THE NORTH STAR

> *"Phajot (ພາຈົດ) — from 'Pha' (ພາ), meaning to lead or guide, and 'Jot' (ຈົດ), meaning to jot or write. An app that gently leads you toward financial clarity. Built because every month, a husband and wife in Laos would ask each other: 'Wait… what did we spend this month?' Phajot is the answer — easy, fun, and fulfilling to use. It solves the most common household headache without feeling like a chore."*

**One-line pitch:** Phajot is a cozy, multi-currency personal finance tracker built for life in Laos — where you hold LAK, THB, and USD at the same time — designed to make recording money feel as easy and satisfying as chatting with a friend.

---

## 1. PROJECT IDENTITY

| Field | Value |
|---|---|
| **App Name** | Phajot |
| **Brand Name (Lao)** | ພາຈົດ |
| **Brand Pronunciation** | pha-jot |
| **Primary Domain (PWA)** | `app.phajot.com` |
| **Marketing Domain** | `phajot.com` ✅ LIVE |
| **Current Version** | v0.4.0 — Phase 2 Stable |
| **Status** | 🟡 Family Testing |
| **Last Codex Update** | April 7, 2026 · Session 4 |

> **Updated [2026-04-10]:** Renamed Phanote → Phajot (trademark conflict). All domains migrated: phajot.com, app.phajot.com, api.phajot.com. Legacy phanote.com 301-redirects to phajot.com.

---

## 2. THE PROBLEM

People living in Laos operate across three currencies simultaneously (LAK, THB, USD) in their daily lives and bank accounts. No existing personal finance app handles this natively. Existing tools like Parnuan (Thailand) are built for single-currency markets and feel either too rigid, too boring, or too complex for casual daily logging.

**The real blocker isn't awareness — it's friction.** If recording a transaction takes more than 5 seconds or requires too many taps, users simply won't do it. Especially in a household setting where logging is a habit, not a job.

**Secondary problem:** Traditional finance apps feel like filing taxes. They are cold, corporate, and stressful. Money management should feel encouraging, not punishing.

---

## 3. TARGET AUDIENCE

### Phase 1–2 (Internal Alpha)
- **Primary Users:** The developer and his wife (Vientiane, Laos)
- **Profile:** Adult couple, multilingual (Lao/Thai/English), tech-comfortable, mobile-first
- **Device usage:** iOS and Android smartphones, PWA via browser

### Phase 3–4 (Soft Launch)
- **Extended Family:** Close relatives invited to test before public launch
- **Early Adopters:** Expats, Thai/Lao mixed households, digital-savvy young professionals in Laos and Northern Thailand

### Phase 5+ (Public)
- **SEA Region Users:** Anyone managing multi-currency finances in the Mekong region
- **Subscription target:** Freemium → Pro conversion, Family Plans

---

## 4. CORE DESIGN PHILOSOPHY

### 4.1 The "Professional-Cute Hybrid" Rule
The UI must always feel like it was designed for **competent adults who also enjoy cozy things.** It should never look like:
- A children's app (no primary colors, no crayon fonts)
- A banking dashboard (no harsh borders, no cold blues, no dense tables)
- A generic SaaS tool (no flat white + gray monotone)

### 4.2 The 5-Second Rule
> **A user must be able to log a transaction in under 5 seconds from app open.**

This is the single most important UX metric. Every design and architecture decision must be evaluated against this rule.

### 4.3 The "Financial Friend" Principle
The app should respond to the user the way a warm, witty, financially-savvy friend would — not a robot, not a bank teller. AI responses, toast messages, and empty states must all carry personality.

### 4.4 No-Line Rule (with exceptions)
- ❌ No harsh `1px solid` borders on cards, modals, or containers
- ✅ Use soft `box-shadow` and glassmorphism for depth
- ✅ **Exception:** Bottom navigation bar icons and tab components MAY use subtle border lines

---

## 5. DESIGN SYSTEM — CONFIRMED

> **Updated [2026-04-07]:** Lavender abandoned. Celadon green confirmed. Heat map colour scale confirmed.

| Token | Value |
|---|---|
| Background | `#F7FCF5` |
| Surface | `rgba(255,255,255,0.9)` |
| Celadon (brand) | `#ACE1AF` |
| Celadon mid | `#5DB87A` |
| Celadon dark | `#1A4020` |
| Dark text | `#1a2e1a` |
| Muted | `#9B9BAD` |
| Income green | `#1A5A30` |
| Expense red | `#C0392B` |
| Font | Noto Sans + Noto Sans Lao |
| Border radius | 18–24px cards, 12–16px buttons |
| Background animals | kawaii PNG @ 4–6% opacity, green-tinted |

### Heat Map Colour Scale (Monthly Wrap)

> **Updated [2026-04-07]:** Confirmed Option B — Celadon → Coral.

| Stop | Hex | Meaning |
|---|---|---|
| Empty / no data | `transparent` | No transactions |
| Low spend | `#f0fdf0` | Very low |
| Low-mid | `#ace1af` | Below average |
| Mid-high | `#f5b3a0` | Above average |
| High spend | `#c0392b` | Peak day |

---

## 6. FEATURE SCOPE

### 6.1 Free tier

| # | Feature | Status |
|---|---|---|
| F1 | Natural language logging (LO/TH/EN mix) | ✅ Live |
| F2 | Multi-currency wallets (LAK/THB/USD) | ✅ Live |
| F3 | AI auto-categorization with confidence fallback | ✅ Live |
| F4 | Onboarding wizard (Language → Currency → Categories) | ✅ Live |
| F5 | Custom categories | ✅ Live |
| F6 | Summary dashboard | ✅ Live |
| F7 | Budget per category per currency | ✅ Live |
| F8 | Budget alerts (encouraging tone) | ✅ Live |
| F9 | Transaction list (date grouped) | ✅ Live |
| F10 | Edit/delete entries | ✅ Live |
| F11 | Streak tracking with levels and XP | ✅ Live |
| F12 | AI toast messages with personality | ✅ Live |
| F13 | Multi-language UI (lo/th/en) | ✅ Live |
| F14 | Today summary strip (tappable → Analytics) | ✅ Live (Session 4) |
| F15 | 24 Lao-specific categories | ✅ Live (Session 4) |
| F16 | Transaction filters (today/recent/all) | ✅ Live |
| F17 | PIN security (owner + guest PIN) | ✅ Live |

### 6.2 Pro tier

| # | Feature | Status |
|---|---|---|
| P1 | Receipt photo OCR (Gemini Vision) | ✅ Live |
| P2 | AI Financial Advisor chat | ✅ Live (⚠️ not gated yet) |
| P3 | Monthly Wrap — AI monthly report + heat map | 🔜 Session 5 |
| P4 | Excel/CSV export | 🔜 Phase 5 |
| P5 | Recurring transactions | 🔜 Phase 5 |
| P6 | AI Memory (learns user patterns) | ✅ Live (ai_memory table) |
| P7 | Past months analytics | 🔜 Session 5 (part of Monthly Wrap) |
| P8 | Daily reminders (push) | 🔜 Phase 5 |

### 6.3 Category System

> **Updated [2026-04-07]:** Expanded from 14 to 24 expense categories.

**24 Expense categories:**
`food` `groceries` `drinks` `coffee` `transport` `travel` `rent` `utilities` `phone_internet` `household` `shopping` `health` `beauty` `fitness` `entertainment` `subscriptions` `gaming` `education` `family` `donation` `debt_payment` `fees` `repair` `other`

**8 Income categories:**
`salary` `freelance` `selling` `bonus` `investment` `gift` `transfer` `other_inc`

---

## 7. TECH STACK

> **Updated [2026-04-07]:** AI stack revised. phanote.com live.

### 7.1 Official Stack (Current)

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React + Vite → `src/App.jsx` | 4,272 lines — single file |
| Hosting (App) | Cloudflare Pages | Auto-deploy → `app.phajot.com` |
| Hosting (Landing) | Cloudflare Pages (separate project) | `phanote-com` → `phajot.com` |
| Database | Supabase (PostgreSQL, Singapore) | 6 tables live, 1 designed |
| Auth | Phone → silent email/password | `{phone}@phanote.app` |
| AI — Parse | **Gemini 2.5 Flash** | `/parse` — best Lao/Thai NLP |
| AI — Advisor | **Claude Haiku 4.5** | `/advise` — best conversational |
| AI — OCR | **Gemini 2.5 Flash Vision** | `/ocr` — best Lao script OCR |
| AI — Monthly Wrap | Gemini 2.5 Flash | `/monthly-report` — planned |
| Worker | Cloudflare Workers | `api.phajot.com` v4.4.0 |
| Dev environment | GitHub Codespaces | `super-duper-capybara` |

### 7.2 AI Architecture — Definitive

> **Updated [2026-04-07]:** Two-provider model confirmed.

| Endpoint | Model | Purpose | Cost |
|---|---|---|---|
| Local parser JS | Built-in v4 | ~90% inputs, <5ms | $0 |
| ai_memory table | Supabase | Known patterns, skips API | $0 |
| `/parse` fallback | Gemini 2.5 Flash | Ambiguous inputs only | ~$0.0001/call |
| `/advise` | Claude Haiku 4.5 | AI financial advisor | ~$0.0004/call |
| `/ocr` | Gemini 2.5 Flash Vision | Receipt scanning | ~$0.0003/photo |
| `/monthly-report` | Gemini 2.5 Flash | Monthly narrative | ~$0.003/report |

**Two secrets required in Cloudflare Worker:**
- `GEMINI_API_KEY` — for `/parse` and `/ocr`
- `ANTHROPIC_API_KEY` — for `/advise` only

### 7.3 Domain Architecture (Current)

```
phajot.com           → Cloudflare Pages (landing/index.html) ✅ LIVE
app.phajot.com       → Cloudflare Pages (Vite build) ✅ LIVE
api.phajot.com       → Cloudflare Workers ✅ LIVE
```

---

## 8. DATABASE SCHEMA (Current State)

> **Updated [2026-04-07]:** monthly_reports table designed (not yet run).

### Live tables

```
profiles        — id, display_name, avatar, language, base_currency,
                  streak_count, streak_last_date, xp, is_pro,
                  custom_categories (jsonb), created_at
                  RLS: ⚠️ DISABLED — fix before public launch

transactions    — id (text), user_id, amount, currency, type,
                  category_id (text), description, note, date,
                  confidence, raw_input, created_at
                  RLS: ⚠️ DISABLED — fix before public launch

budgets         — id, user_id, category_id, currency, monthly_limit, created_at
                  UNIQUE(user_id, category_id, currency)
                  RLS: ✅ ENABLED

goals           — id, user_id, name, emoji, target_amount, saved_amount,
                  currency, deadline (YYYY-MM), is_completed, created_at
                  RLS: ✅ ENABLED

ai_memory       — id, user_id, input_pattern, category_name, type,
                  confidence, usage_count, user_corrected, created_at, updated_at
                  UNIQUE(user_id, input_pattern)
                  RLS: ✅ ENABLED (read-all, write-own)

app_events      — id, user_id, event_type, payload (jsonb), created_at
                  RLS: ✅ ENABLED
```

### Designed (run before Session 5)

```
monthly_reports — id, user_id, month (YYYY-MM),
                  narrative_lo, narrative_en, narrative_th,
                  stats (jsonb), generated_at
                  UNIQUE(user_id, month)
                  RLS: ✅ (will be enabled at creation)
```

---

## 9. MULTILINGUAL SYSTEM

- **Supported languages:** Lao (lo), Thai (th), English (en)
- **Implementation:** `i18n` object in App.jsx (~line 761), `t(lang, key)` helper
- **50+ string keys** per language
- **Lao script font:** Noto Sans Lao (loaded from Google Fonts)
- **AI prompts:** Gemini instructed to handle mixed-language input; replies in user's language

> **Updated [2026-04-07]:** Translation review with wife pending — some Lao strings may be slightly off. See OQ-007.

---

## 10. AI PARSING — CURRENT CONTRACT

> **Updated [2026-04-07]:** Gemini 2.5 Flash is the parse model (not Gemini 2.0 Flash as originally spec'd). 24 categories. `response_mime_type` NOT used for multimodal OCR.

### Parse Flow
```
1. Check ai_memory table (usage_count >= 2) → instant if found
2. Local parser v4 (300+ Lao/Thai/EN keywords) → instant, conf ≥ 0.88 saves directly
3. Gemini 2.5 Flash API → 1-3 seconds for ambiguous inputs
4. Save result to ai_memory → learns for next time
5. Background AI correction → if AI disagrees with local parse, silently updates category
6. User correction → tap Edit → saves to ai_memory with 0.99 confidence
```

### fixAmount Rule
```javascript
// Lao receipts use . as thousands separator (₭573.000 = 573000)
// Threshold < 1000 (not 10000 — that causes ₭9,000 → ₭9,000,000)
if (currency === "LAK" && n > 0 && n < 1000) return n * 1000;
```

---

## 11. PHASED ROADMAP

> **Updated [2026-04-07]:** Phases 1–2 complete. Phase 3 revised. Phases 4–5 added.

### ✅ Phase 1 — Foundation MVP
Auth, onboarding, quick-add, wallet cards, transaction list, budget bars, multi-language, deploy. **DONE.**

### ✅ Phase 2 — Pro Features (Core)
OCR, AI Advisor, Analytics, Goals, Streaks/XP, Safe-to-Spend, PIN security. **DONE (family testing).**

### 🔨 Phase 3 — Stability + Monthly Wrap (Current)
1. Monthly Wrap Pro feature (Session 5)
2. RLS security fix
3. Recurring transactions
4. Real device testing
5. Lao translation review with wife

### 🔜 Phase 4 — LINE Bot + Payments
- LINE bot webhook (`/line` endpoint)
- Pro payments: PromptPay → BCEL QR → Stripe
- Referral system
- Monthly Wrap share card (viral loop)

### 🔜 Phase 5 — Growth & Scale
- Public launch (50 beta users Vientiane)
- Boun festival calendar + Pi Mai budget planner
- Export CSV/Excel
- App Store / Play Store submission (PWA)
- Family accounts

### 🌏 Phase 6 — Long Term
- Small business mode ("Business toggle")
- Telegram bot
- PWA offline support (Workbox)
- Live LAK/THB/USD exchange rates
- AI fine-tuning on anonymized Lao transaction data

---

## 12. MONETIZATION MODEL

| Plan | Monthly | Annual | Notes |
|---|---|---|---|
| **Free** | $0 | $0 | Core logging, budgets, current month analytics |
| **Pro** | $2.99 / ฿100 / ₭70,000 | $29.99 / ฿999 / ₭6,999,000 | OCR, AI Advisor, Monthly Wrap, export |
| **Family** | TBD | TBD | Phase 6 |

### Payment Methods (Priority)
1. PromptPay QR (Thai users — largest accessible market via LINE bot)
2. BCEL QR (Lao users)
3. Stripe (international)
4. Manual `is_pro = true` in Supabase (current — family use only)

> **Updated [2026-04-07]:** Monthly Wrap added to Pro features. AI Advisor remains ungated (fix before public launch).

---

## 13. LOCALIZATION REFERENCE

### Currency Formatting
| Currency | Symbol | Format Example |
|---|---|---|
| LAK | ₭ | ₭ 50,000 |
| THB | ฿ | ฿ 1,250 |
| USD | $ | $12.50 |

### Language Codes
- Lao: `lo`
- Thai: `th`
- English: `en`

---

## 14. BRAND VOICE GUIDE

- **Warm** — like a friend, not a bank
- **Witty but not annoying** — one clever line, not a comedy routine
- **Encouraging, never shaming** — money stress is real; the app should reduce it
- **Multilingual by nature** — mixing Lao/Thai/English in one sentence is normal

### Toast Examples
- `"🍜 ເຂົ້າປຽກ — -₭50,000 · Fueled up! That's the good stuff. 🐾"`
- `"☕ Coffee — -฿95 · Third one today. We believe in you anyway. ✨"`
- `"💼 ເງິນເດືອນ — +₭4,500,000 · Money in! Let's track it well together."`
- `"🙏 ເຮັດບຸນ — -₭100,000 · Good karma and good accounting. 🌿"`

### Brand Voice (locked Session 5 Day 1)

- **Slogan:** ເງິນເຈົ້າໄປໃສ? ດຽວພາຈົດບອກໃຫ້ຟັງ / Where did your
  money go? Let Phajot tell you.
- **Mascot:** Pha the capybora (hugs notebook, pink cheeks, keeps
  your notes safe)
- **Font for Lao:** Noto Sans Lao Looped (rounded, warm, storytelling)
- **Animals rule updated:** Pha is the face of Phajot. Other animals
  remain as ambient background pattern at 4-6% opacity — this is the
  one exception to the "no mascot" rule.
- **Positioning:** Lao-first publicly (landing + login), Thai still
  accessible via Settings for existing users.
- **Validated April 11, 2026:** First real user (wife) confirmed the
  Lao slogan reads naturally and would pay yearly subscription.

---

## 15. RISK REGISTER

> **Updated [2026-04-07]:** Added risks identified in strategic review.

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Gemini parsing fails on mixed-language | Low (v4 local parser handles 90%) | Medium | Local parser + ai_memory fallback chain |
| Lao script broken on some phones | Medium | High | Test on real Android + iOS; Noto Sans Lao |
| Solo dev burnout | Medium | High | Phase discipline; one feature at a time |
| Supabase free tier limits | Low | Medium | Monitor; Pro is $25/mo |
| Gemini API costs at scale | Low→High | High | Cache via ai_memory; local parser first |
| RLS disabled causes data leak | High if launched now | Critical | Block on public launch |
| Bigger player enters Laos market | Medium (3–5yr) | High | Speed + cultural depth moat; launch fast |
| Low willingness to pay in Laos | Medium | Medium | Thai market + LINE bot pays better; keep free tier generous |

---

## 16. DEVELOPMENT RULES (The Phajot Code Contract)

1. **Codex first.** Before writing complex code, re-read the relevant section.
2. **5-second rule.** Every UX decision is evaluated against the 5-second logging target.
3. **No API keys in frontend.** Ever. All AI calls go through the Cloudflare Worker.
4. **RLS on every table.** No table goes to production without a Row Level Security policy.
5. **Mobile first.** Design at 390px width. Desktop is secondary.
6. **Test in all 3 languages.** Before marking UI done, test Lao + Thai + English.
7. **Clean over clever.** One developer — future-you must understand present-you's code.
8. **Phase discipline.** Don't build Phase 5 during Phase 3.
9. **Update the Codex.** When a phase completes or a major decision changes — update this before next session.
10. **Duplicate keys kill apps.** JavaScript silently accepts duplicate object keys. Always verify with Python Counter or equivalent after editing `normalizeCategory` or any large const map.
10. **UI/UX is a first-class concern.** Every feature must pass the UX checklist before being considered done:
    - **Reachable:** Every actionable button must be visible and tappable on the smallest target device (iPhone SE, 375×667). No hidden Save buttons. No footers pushed off-screen by long content.
    - **Keyboard-aware:** Any modal with an input must respond to the iOS/Android keyboard appearing. Use the shared `useKeyboardOffset` hook.
    - **Safe-area-aware:** Respect iPhone notch and home bar insets. Use `env(safe-area-inset-bottom)` in sticky footers.
    - **Scroll-aware:** If content can overflow, it must scroll — the container, not the page. Actionable buttons stay pinned outside the scroll area.
    - **Five-second rule:** If a core action takes more than 5 seconds from app open, it's broken.
    - **Error-gentle:** Errors never shame or scold. Always offer a next step.
    - **Loading-honest:** Any action over 500ms shows a loading state. No silent waits.
    - **Reuse shared components:** If a pattern exists in the codebase (`<Sheet>`, `<UsageBar>`, `<Chip>`, etc.), use it. Don't reinvent — that's how inconsistency and bugs sneak in.
    - **Mobile-first, always:** Test in mobile viewport before desktop. If it works on a phone, it works everywhere.

11. **Update the Codex.** When a major decision is made, record it here.
> **Updated [2026-04-07]:** Rule 10 added after Session 4 white-screen bug.

---

## 17. CODEX CHANGELOG

| Version | Date | Change Summary |
|---|---|---|
| v1.0 | 2025 | Initial codex |
| v1.1 | 2026-04-03 | Session 1: Auth, onboarding, wallet cards live |
| v1.2 | 2026-04-05 | Session 3: OCR, AI Advisor, Analytics, Streaks live; switched to Claude-only AI |
| v1.3 | 2026-04-06 | Session 3: PIN security, Safe-to-Spend, Guide screen |
| v1.4 | 2026-04-07 | Session 4: 24 categories, AI stack reverted to Gemini+Claude, phanote.com live, keyboard fixes, Monthly Wrap designed, strategic review complete |

---

*"Phajot · ພາຈົດ — Lead your jots. Know your money. Live without the headache."* 🐾