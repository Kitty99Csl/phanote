# 📒 PHAJOT — PROJECT CODEX

> **Status:** Current source of truth (product philosophy + design system)

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
| **Current Version** | v0.6.2 — Session 9 RLS hardening + CF Pages deploy pipeline fix |
| **Status** | 🟡 Family Testing |
| **Last Codex Update** | April 14, 2026 · Session 9 |

> **Updated [2026-04-14] (Session 9):** CF Pages deploy pipeline fix (Node 24.13.1 exact pinning + `engines` field + lockfile regeneration under matching npm 11.8.0) unblocks 2 days of stuck commits — Session 8 Sprint A + Ext had merged to main but was never actually deployed to `app.phajot.com` due to silent CF Pages build failures. RLS hardening complete: `ai_memory` data leak (USING(true) permissive SELECT policy) dropped, `goals` RLS enabled (was rowsecurity=false with inert policy), `profiles` policies deduped 6→1 canonical, `transactions` policies deduped 7→1 canonical. Adversarial verification with second test user (User B, `5e3629a1-aa60-4c25-a013-11bf40b8e6b9`) proves cross-user SELECT/INSERT are blocked while self-access still works. See `docs/session-9/SUMMARY.md`, `docs/session-9/RLS-HARDENING.md`, `docs/RISKS.md`. Two new CLAUDE.md non-negotiable rules (11 + 12) capture the Session 9 lessons: verify production bundle hash after merge, pin exact Node version.

> **Updated [2026-04-13] (Session 8 Sprint A + Ext):** Post-refactor stabilization + credential remediation in 5 commits. Fixed 5 critical bugs from real-device testing (2 latent ReferenceErrors from Session 7's pure-move refactor, 1 parse hang, 2 iOS keyboard bugs). Swept the codebase for two anti-patterns and shipped shared infrastructure for both: `useClickGuard` hook (applied to 7 action buttons eliminating zombie-modal duplicate saves) and `fetchWithTimeout` helper (applied to 4 endpoints with per-endpoint timeouts: `/ocr` 20s, `/advise` 30s, `/monthly-report` 30s, `/parse-statement` 60s). Migrated GoalModal to Sheet (last high-priority raw-div modal; Sheet now used by 6 modals). Remediated leaked Gemini API key committed in scaffold commit `209370c` — rotated on Cloudflare, tightened `.gitignore` to canonical Vite patterns, forensic audit of history confirmed only the Gemini key was exposed. Phone-tested 5/5 on iOS Safari. See `docs/session-8/SUMMARY.md`.

> **Updated [2026-04-13] (Session 7):** Back-filled Sessions 5, 6, and 7 in a single codex update. Session 5 shipped Monthly Wrap (Pro). Session 6 shipped Phajot rename + OCR statement scanning + dedicated TransactionsScreen + analytics heatmap. Session 7 decomposed src/App.jsx from 5,480 lines to 340 lines across 45 extracted files (-93.8%, 26 pure-move commits, zero regressions).

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

> **Updated [2026-04-13]:** Added Session 5 and 6 additions. Session 5 shipped Monthly Wrap as a Pro feature. Session 6 added a dedicated Transactions screen (search + 3-axis filter + pagination), inline transaction edit, analytics heatmap calendar, clickable donut drill-down, top 5 biggest spending days, month navigation, and cross-session import dedup with batch undo. The Pro tier's OCR row splits into receipt OCR (always available) and bank statement OCR (Session 6).

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
| F18 | Dedicated Transactions screen with search, 3-axis filter (period × currency × type), pagination | ✅ Live (Session 6) |
| F19 | Inline transaction edit — description, amount, category, currency, type toggle | ✅ Live (Session 6) |
| F20 | Analytics heatmap calendar with percentile-based spend colors + month navigation | ✅ Live (Session 6) |
| F21 | Clickable donut drill-down and top-5 biggest days list (→ Transactions screen filtered) | ✅ Live (Session 6) |
| F22 | Cross-session import dedup + batch undo for statement-scanned transactions | ✅ Live (Session 6) |

### 6.2 Pro tier

| # | Feature | Status |
|---|---|---|
| P1a | Receipt photo OCR — single-receipt quick scan (Gemini Vision) | ✅ Live |
| P1b | Bank statement OCR — LDB / JDB / BCEL multi-image upload with cross-session dedup and batch undo (Gemini Vision) | ✅ Live (Session 6) |
| P2 | AI Financial Advisor chat | ✅ Live (⚠️ not gated yet) |
| P3 | Monthly Wrap — AI monthly report + stats (Claude Haiku 4.5) | ✅ Live (Session 5) |
| P4 | Excel/CSV export | 🔜 Phase 5 |
| P5 | Recurring transactions | 🔜 Phase 5 |
| P6 | AI Memory (learns user patterns) | ✅ Live (ai_memory table) |
| P7 | Past months analytics | ✅ Live (Session 6 — monthOffset nav + heatmap) |
| P8 | Daily reminders (push) | 🔜 Phase 5 |

### 6.3 Category System

> **Updated [2026-04-07]:** Expanded from 14 to 24 expense categories.

**24 Expense categories:**
`food` `groceries` `drinks` `coffee` `transport` `travel` `rent` `utilities` `phone_internet` `household` `shopping` `health` `beauty` `fitness` `entertainment` `subscriptions` `gaming` `education` `family` `donation` `debt_payment` `fees` `repair` `other`

**8 Income categories:**
`salary` `freelance` `selling` `bonus` `investment` `gift` `transfer` `other_inc`

---

## 7. TECH STACK

> **Updated [2026-04-13]:** Session 5 shipped Monthly Wrap on Claude Haiku 4.5 (not Gemini as previously planned). Session 6 added bank statement OCR via `/parse-statement` (Gemini 2.5 Flash Vision, LDB/JDB/BCEL detection). Session 7 decomposed src/App.jsx from 5,480 → 340 lines across a new multi-layer structure (src/lib/, src/hooks/, src/components/, src/modals/, src/screens/).
>
> **Updated [2026-04-07]:** AI stack revised. phanote.com live.

### 7.1 Official Stack (Current)

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React + Vite → `src/App.jsx` (340 lines) + `src/lib/` + `src/hooks/` + `src/components/` + `src/modals/` + `src/screens/` | Multi-layer after Session 7 refactor (was 5,480-line monolith) |
| Hosting (App) | Cloudflare Pages | Auto-deploy → `app.phajot.com` |
| Hosting (Landing) | Cloudflare Pages (separate project) | `phanote-com` → `phajot.com` |
| Database | Supabase (PostgreSQL, Singapore) | 7 tables live (RLS ⚠️ on `profiles` + `transactions`) |
| Auth | Phone → silent email/password | `{phone}@phanote.app` |
| AI — Parse | **Gemini 2.5 Flash** | `/parse` — best Lao/Thai NLP |
| AI — Advisor | **Claude Haiku 4.5** | `/advise` — best conversational |
| AI — OCR | **Gemini 2.5 Flash Vision** | `/ocr` — best Lao script OCR |
| AI — Bank Statement OCR | **Gemini 2.5 Flash Vision** | `/parse-statement` — live (Session 6), LDB/JDB/BCEL detection |
| AI — Monthly Wrap | **Claude Haiku 4.5** | `/monthly-report` — live (Session 5) |
| Worker | Cloudflare Workers | `api.phajot.com` v4.4.0 |
| Dev environment | GitHub Codespaces | `super-duper-capybara` |

### 7.2 AI Architecture — Definitive

> **Updated [2026-04-13]:** Now five endpoints live. `/monthly-report` shipped Session 5 on Claude Haiku 4.5 (quality > cost, decided in Day 1 review). `/parse-statement` shipped Session 6 on Gemini 2.5 Flash Vision for multi-image bank statement extraction (LDB / JDB / BCEL).
>
> **Updated [2026-04-07]:** Two-provider model confirmed.

| Endpoint | Model | Purpose | Cost |
|---|---|---|---|
| Local parser JS | Built-in v4 | ~90% inputs, <5ms | $0 |
| ai_memory table | Supabase | Known patterns, skips API | $0 |
| `/parse` fallback | Gemini 2.5 Flash | Ambiguous inputs only | ~$0.0001/call |
| `/advise` | Claude Haiku 4.5 | AI financial advisor | ~$0.0004/call |
| `/ocr` | Gemini 2.5 Flash Vision | Receipt scanning | ~$0.0003/photo |
| `/monthly-report` | **Claude Haiku 4.5** | Monthly narrative + stats | ~$0.0024/call |
| `/parse-statement` | **Gemini 2.5 Flash Vision** | Bank statement multi-image OCR (LDB/JDB/BCEL, 10-image cap) | ~$0.003/call (est.) |

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

> **Updated [2026-04-13]:** Sessions 5 and 6 added significant schema. `monthly_reports` is now live (Session 5 Day 1, Apr 9 2026). `transactions` gained `category_name`, `category_emoji`, `ai_confidence` (replaces `confidence`), `source`, `is_deleted`, `batch_id`. `profiles` gained `phone`, `phone_country_code`, `avatar`, `custom_categories`, `exp_cats`, `inc_cats`, `pin_config`, `last_seen_at`, `app_version`, `onboarding_complete`. `app_events.payload` is actually `event_data`. The `ai_memory` description here was partially fictitious — corrected against `src/lib/db.js`.
>
> **Updated [2026-04-07]:** monthly_reports table designed (not yet run).

### Live tables (7)

```
profiles        — id, display_name, avatar, language, base_currency,
                  onboarding_complete, phone, phone_country_code,
                  custom_categories (jsonb), exp_cats (jsonb), inc_cats (jsonb),
                  streak_count, streak_last_date, xp, is_pro,
                  pin_config (jsonb), last_seen_at, app_version, created_at
                  RLS: ⚠️ DISABLED — fix before public launch

transactions    — id (uuid), user_id, amount, currency, type, description, date,
                  category_name, category_emoji,
                  source, ai_confidence, raw_input, note,
                  is_deleted (default false), batch_id (nullable, for statement-scan undo),
                  created_at
                  RLS: ⚠️ DISABLED — fix before public launch

budgets         — id, user_id, category_id, currency, monthly_limit, created_at
                  UNIQUE(user_id, category_id, currency)
                  RLS: ✅ ENABLED

goals           — id, user_id, name, emoji, target_amount, saved_amount,
                  currency, deadline (YYYY-MM), is_completed, created_at
                  RLS: ✅ ENABLED

ai_memory       — id, user_id, input_pattern, category_name, type,
                  confidence, usage_count, created_at, updated_at
                  UNIQUE(user_id, input_pattern)
                  RLS: ✅ ENABLED (read-all, write-own)

app_events      — id, user_id, event_type, event_data (jsonb),
                  app_version, platform, created_at
                  RLS: ✅ ENABLED

monthly_reports — id, user_id, month (YYYY-MM),
                  narrative_lo, narrative_th, narrative_en (text per language),
                  stats (jsonb), generation_model, generated_at
                  UNIQUE(user_id, month)
                  RLS: ✅ ENABLED
                  Live since Session 5 Day 1 (2026-04-09). Frontend (MonthlyWrapModal)
                  caches narratives here; worker `/monthly-report` is a pure AI proxy
                  and does NOT touch this table.
```

### Schema drift notes

The `supabase/migrations/` baseline (4 files) is **stale** and no longer authoritative. Most schema changes since Session 2 were applied via the Supabase dashboard SQL editor and never back-ported to git. The only authoritative current schema lives in production Supabase. Specific known drifts:

- `categories` table — declared in migration `002_categories.sql`, **zero production code references**. The app uses hardcoded defaults from `src/lib/categories.js` plus per-user JSONB overrides on `profiles.custom_categories` / `exp_cats` / `inc_cats`. Effectively dead.
- `recurring_rules` table — declared in migration `003_remaining_tables.sql`, **zero production code references**. Vestigial placeholder for the recurring-transactions feature (still 🔜 Phase 5).
- `transactions.recurring_id` — FK column declared in migration `003`, never read or written by live code.
- `transactions.category_id` (uuid FK) — declared in migration `003`, superseded by `category_name` + `category_emoji` text columns. May still physically exist in prod as a deprecated column.
- `ai_memory` migration declares `category_id` (uuid FK) and `currency` columns — neither is touched by live code. Live code uses `category_name` (text) instead.

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

> **Updated [2026-04-13]:** Sessions 5, 6, and 7 advanced Phase 3 substantially. Monthly Wrap shipped (Session 5). The Phajot rename + DNS migration, OCR bank statement scanning, dedicated TransactionsScreen, analytics heatmap, and clickable donut drill-down all shipped (Session 6). The src/App.jsx refactor (deferred from Session 5 plan) finally landed (Session 7, 5,480 → 340 lines, 26 pure-move commits). Real device testing happened during Session 6 (BCEL screenshots verified). Lao translation review confirmed natural by wife — no formal review needed (Session 5 Day 1). RLS security fix and recurring transactions remain pending.
>
> **Updated [2026-04-07]:** Phases 1–2 complete. Phase 3 revised. Phases 4–5 added.

### ✅ Phase 1 — Foundation MVP
Auth, onboarding, quick-add, wallet cards, transaction list, budget bars, multi-language, deploy. **DONE.**

### ✅ Phase 2 — Pro Features (Core)
OCR, AI Advisor, Analytics, Goals, Streaks/XP, Safe-to-Spend, PIN security. **DONE (family testing).**

### 🔨 Phase 3 — Stability + Monthly Wrap + Refactor (Current)
1. Monthly Wrap Pro feature — ✅ Done (Session 5, Claude Haiku 4.5 backend, validated by wife)
2. Phajot rename + DNS migration — ✅ Done (Session 6, 12 commits)
3. OCR bank statement scanning — ✅ Done (Session 6, LDB/JDB/BCEL via Gemini Vision)
4. Dedicated Transactions screen + analytics heatmap + drill-down — ✅ Done (Session 6)
5. src/App.jsx refactor — ✅ Done (Session 7, 5,480 → 340 lines, 26 pure-move commits, multi-layer src/ structure)
6. Real device testing — ✅ Done (Session 6, BCEL screenshots verified)
7. Lao translation review — ✅ Done (Session 5, wife confirmed natural)
8. RLS security fix — 🔜 Still pending, blocking public launch
9. Recurring transactions — 🔜 Deferred to Session 8+

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
| wrangler.toml dashboard drift | Low | High | Document dashboard-bound api.phajot.com Custom Domain in a wrangler.toml comment, or migrate the Custom Domain into the routes array so the toml is the single source of truth. |

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
| v1.5 | 2026-04-11 | Session 5: Monthly Wrap backend (Pro), worker v4.3.0 with /monthly-report endpoint and monthly_reports cache table, new Phajot logo, Thai removed from onboarding LANGS, landing page refresh, first real wife validation (would pay yearly), Lao naturalness confirmed |
| v1.6 | 2026-04-11 | Session 6: Phajot rename (Phanote -> Phajot, brand + domains), OCR bank statement scan (/parse-statement endpoint, LDB/JDB/BCEL detection), dedicated TransactionsScreen with search + 3-axis filter + pagination, analytics heatmap calendar + clickable donut drill-down, cross-session import dedup, batch undo, worker v4.4.0 |
| v1.7 | 2026-04-13 | Session 7: App.jsx decomposition (5,480 -> 340 lines, -93.8%, 26 pure-move commits), new multi-layer structure across src/lib/ src/hooks/ src/components/ src/modals/ src/screens/, cleanup sweep (orphan headers, dead files, 4 unused npm deps, dead lib symbols), 2 pre-existing latent bugs discovered and flagged for Session 8 |

---

*"Phajot · ພາຈົດ — Lead your jots. Know your money. Live without the headache."* 🐾