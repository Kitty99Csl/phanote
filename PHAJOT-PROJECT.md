# 📒 PHAJOT — MASTER PROJECT DOCUMENT
### Aligned with Project Codex v1.0 · Enriched with Competitor Analysis
### Last Updated: April 2, 2026

> This document extends the **Project Codex** (the single source of truth). All design rules, development rules, and core principles come from the Codex. This document adds: competitor analysis, expanded feature scope informed by Parnuan, and implementation details.

---

## 0. NORTH STAR (from Codex)

> *"Phajot (ພາຈົດ) — from 'Pha' (ພາ), meaning to lead or guide, and 'Jot' (ຈົດ), meaning to jot or write. An app that gently leads you toward financial clarity."*

**One-line pitch:** Phajot is a cozy, multi-currency personal finance tracker built for life in Laos — where you hold LAK, THB, and USD at the same time — designed to make recording money feel as easy and satisfying as chatting with a friend.

**The 5-Second Rule (Codex §4.2):**
> A user must be able to log a transaction in under 5 seconds from app open.

This is the single most important UX metric. Every decision in this document must pass this test.

---

## 1. COMPETITOR ANALYSIS — PARNUAN (ป้านวล)

### 1.1 Overview
| Field | Value |
|---|---|
| Website | parnuan.com / app.parnuan.com |
| Platform | LINE bot + LIFF web app (no standalone web) |
| Pricing | Free + Pro ฿65/mo or ฿365/yr |
| Language | Thai + basic English |
| Currency | THB only |
| Mascot | "Auntie Nuan" (ป้านวล) — elderly Thai woman character |

### 1.2 Parnuan free features
- Natural language logging via LINE chat (Thai + English)
- AI auto-categorization with honest fallback ("I couldn't categorize this correctly")
- Onboarding wizard: 2-step category selection (expense → income)
- Custom categories with duplicate detection and reorder
- Summary dashboard: date range, savings, expense/income cards, donut chart
- Budget per category with configurable period (monthly, custom start day)
- Transaction list: date grouping, daily totals, edit/delete
- Filter by type: All / Expense / Income toggle
- Streak tracking with fire emoji, levels, and "next level" progress
- Streak notifications
- LINE Rich Menu: 8-button grid (Log, Summary, Analytic, Category, List, Subscribe, News, Setting, Help)
- 5-tab LIFF web app: Summary, Analytics, Categories, Transactions, Settings

### 1.3 Parnuan Pro features (฿65/mo or ฿365/yr)
- Receipt photo OCR
- Voice message logging
- Excel export
- Custom month start date
- Automatic monthly report
- Recurring transactions (subscriptions, rent, loans — calendar view)
- AI Memory (learns categorization from historical data)
- Advanced analytics
- Daily reminders (push notifications)

### 1.4 Parnuan growth features
- Referral: "Invite friends — Get 1 month free"
- Gift: "Buy as Gift" option
- Pro badges throughout free UI as upsell

### 1.5 Phajot advantages over Parnuan
| Advantage | Detail |
|---|---|
| Multi-currency | THB + LAK + USD (Parnuan: THB only) |
| Lao language | Full Lao script UI + AI parsing (Parnuan: none) |
| Standalone web app | Works in any browser (Parnuan: LINE only) |
| Desktop support | Responsive web (Parnuan: mobile LIFF only) |
| Regional play | Laos + Thailand + expats (Parnuan: Thailand only) |

---

## 2. EXPANDED FEATURE SCOPE

### 2.1 Free tier (all Parnuan free features + Phajot originals)

| # | Feature | Source | Codex Ref |
|---|---------|--------|-----------|
| F1 | Natural language logging (TH/LO/EN mix) | Codex §6.1 | ✓ |
| F2 | Multi-currency wallets (LAK/THB/USD) | Codex §6.2 | ✓ |
| F3 | AI auto-categorization with confidence fallback | Codex §10 | ✓ |
| F4 | Onboarding wizard (Language → Currency → Categories) | Codex §6.7 | ✓ (3 steps) |
| F5 | Custom categories (add, edit, reorder, disable) | Codex §6.3 | ✓ |
| F6 | Category management (expense/income tabs, reorder) | From Parnuan | New |
| F7 | Summary dashboard (savings, expense/income, donut) | Codex §6.4 | ✓ |
| F8 | Budget per category per currency | Codex §6.6 | ✓ |
| F9 | Budget alerts (encouraging tone, not alarming) | Codex §6.6 | ✓ |
| F10 | Transaction list (date grouped, daily totals) | Codex §6.4 | ✓ |
| F11 | Transaction filters (All/Expense/Income) | From Parnuan | New |
| F12 | Edit/delete entries | From Parnuan | New |
| F13 | Select multiple (bulk delete) | From Parnuan | New |
| F14 | Streak tracking with levels and XP progress | Codex §6.5 | ✓ |
| F15 | Streak notifications (PWA browser push) | Codex §6.5 | ✓ |
| F16 | AI toast messages with personality | Codex §14 | ✓ |
| F17 | Multi-language UI (lo/th/en) | Codex §9 | ✓ |
| F18 | BCEL-style wallet card (3 currencies visible) | Codex §6.2 | ✓ |
| F19 | Manual entry via "+" button | From Parnuan | New |

### 2.2 Pro tier (matching Parnuan Pro + Phajot extras)

| # | Feature | Source | Codex Ref |
|---|---------|--------|-----------|
| P1 | Receipt photo OCR (Gemini Vision) | Codex §6.1 | ✓ |
| P2 | Voice note logging + transcription | Codex §6.1 | ✓ |
| P3 | Excel/CSV export | Codex §6.8 | ✓ |
| P4 | Custom month start date | From Parnuan | New |
| P5 | Automatic monthly report | From Parnuan | New |
| P6 | Recurring transactions (calendar view) | From Parnuan | New |
| P7 | AI Memory (learns user patterns) | Codex §6.8 | ✓ |
| P8 | Advanced analytics (trends, comparisons) | Codex §6.8 | ✓ |
| P9 | Daily reminders (push notifications) | From Parnuan | New |
| P10 | Google Drive export link | Codex §6.8 | ✓ |

### 2.3 Growth features

| # | Feature | Source |
|---|---------|--------|
| G1 | Referral program (invite → 1 month Pro free) | From Parnuan |
| G2 | Gift subscription ("Buy as Gift") | From Parnuan |
| G3 | Donation option (PromptPay/BCEL QR) | Codex §12 |
| G4 | Marketing landing page (phanote.com) | Codex §7.4 |

### 2.4 LINE bot features (Phase 3)

| # | Feature | Source |
|---|---------|--------|
| L1 | Text message → AI parse → save | Codex Phase 3 |
| L2 | Photo message → OCR → save (Pro) | Codex Phase 3 |
| L3 | Voice note → transcribe → save (Pro) | New |
| L4 | Rich Menu (8-button grid) | From Parnuan |
| L5 | Flex Message confirmation cards | From Parnuan |
| L6 | Account linking (LINE ↔ web) | Codex Phase 3 |
| L7 | Budget alerts via LINE push | New |

---

## 3. DESIGN SYSTEM (from Codex §5, authoritative)

### 3.1 Color palette (Codex §5.1)
| Token | Color | Usage |
|---|---|---|
| --color-primary | Celadon Green #ACE1AF | Primary brand, CTAs |
| --color-secondary | Nyanza #E9FFDB | Light accent surfaces |
| --color-tertiary | Soft Coral #FFC6C2 | Expense, warning accents |
| --color-bg | Near-white green #F7FCF5 | App background |
| --color-surface | Light green #e9f5e3 | Secondary surfaces |
| --color-accent | Medium green #5aae5f | Active states, buttons |
| --color-accent-dark | Deep green #3d8a42 | Pressed states, gradients |
| --color-text-primary | Dark forest #1a2e1a | Primary text |
| --color-text-muted | Sage #5a7a5a | Secondary text |
| --color-expense | Soft coral #e8857a | Expense indicators |
| --color-income | Green #3da873 | Income indicators |

> **Color change (April 2026):** Switched from lavender to celadon/nyanza green palette. The green says "finance/nature" more naturally and matches the Phajot brand values of calm clarity.

### 3.2 Typography (Codex §5.2 + prototype evolution)
- **Codex specifies:** Inter or Noto Sans (Lao + Thai + Latin support)
- **Prototype uses:** Plus Jakarta Sans (headlines) + Sarabun (Thai body) + Noto Sans Lao
- **Decision needed:** Test both on real devices during Phase 1.
- **Rule:** All text must render correctly in Lao, Thai, and Latin simultaneously.

### 3.3 Animal theme (Codex §5.3)
- Rotating cast: Capybara, Red Panda, Cat, Bunny, Penguin, Fox, Panda, Hedgehog, Otter
- Background pattern at **4–6% opacity** only
- Animals are ambiance, not mascots
- Never compete with content

### 3.4 Glassmorphism (Codex §5.4)
```css
background: rgba(255, 255, 255, 0.75);
backdrop-filter: blur(12px);
border-radius: 20px;
box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
/* NO border: 1px solid ... */
```

### 3.5 No-Line Rule (Codex §4.4)
- No harsh 1px solid borders on cards, modals, or containers
- Use soft box-shadow and glassmorphism for depth
- Exception: Bottom nav may use subtle borders for interactive clarity

---

## 4. TECH STACK (from Codex §7.1)

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | React + Vite + Tailwind CSS | Fast SPA, lightweight, PWA support |
| Deployment | Cloudflare Pages | Global edge, SEA-optimized, free tier |
| Backend / DB | Supabase (PostgreSQL) | Auth, RLS, real-time, storage |
| Serverless | Cloudflare Workers | LINE webhooks, background jobs |
| AI / Parsing | Gemini Flash 2.0 | Multilingual + vision, low cost |
| PWA | Vite PWA Plugin (Workbox) | Service worker, offline (Phase 4+) |
| Payments | Stripe + PromptPay + BCEL QR | SEA-appropriate methods |

### Security principles (Codex §7.2 + §16)
- No API keys in frontend. Ever.
- RLS on every table. Standard: USING (auth.uid() = user_id)
- Stay on free tiers as long as possible.

---

## 5. DATABASE SCHEMA (Codex §8, expanded with Parnuan features)

### profiles
```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users,
  display_name text,
  language text DEFAULT 'en',
  base_currency text DEFAULT 'LAK',
  streak_count int DEFAULT 0,
  streak_last_date date,
  level int DEFAULT 1,
  xp int DEFAULT 0,
  is_pro boolean DEFAULT false,
  pro_expires_at timestamptz,
  referral_code text UNIQUE,
  referred_by uuid REFERENCES profiles,
  budget_start_day int DEFAULT 1,
  onboarding_complete boolean DEFAULT false,
  line_user_id text,
  created_at timestamptz DEFAULT now()
);
```

### categories
```sql
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles,
  name_lo text, name_th text, name_en text,
  emoji text, type text,
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  sort_order int,
  created_at timestamptz DEFAULT now()
);
```

### transactions
```sql
CREATE TABLE transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles NOT NULL,
  amount decimal(15,2) NOT NULL,
  currency text NOT NULL,
  type text NOT NULL,
  category_id uuid REFERENCES categories,
  description text,
  date date NOT NULL DEFAULT CURRENT_DATE,
  receipt_url text, voice_url text,
  source text DEFAULT 'web',
  ai_confidence decimal(3,2),
  is_recurring boolean DEFAULT false,
  recurring_id uuid,
  created_at timestamptz DEFAULT now()
);
```

### budgets
```sql
CREATE TABLE budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles NOT NULL,
  category_id uuid REFERENCES categories,
  currency text NOT NULL,
  amount decimal(15,2) NOT NULL,
  period text DEFAULT 'monthly',
  alert_at_percent int DEFAULT 80,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

### recurring_rules (Pro — from Parnuan)
```sql
CREATE TABLE recurring_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles NOT NULL,
  amount decimal(15,2) NOT NULL,
  currency text NOT NULL, type text NOT NULL,
  category_id uuid REFERENCES categories,
  description text, frequency text,
  day_of_month int, day_of_week int,
  start_date date NOT NULL, end_date date,
  next_run_date date NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

### ai_memory (Pro — from Parnuan)
```sql
CREATE TABLE ai_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles NOT NULL,
  input_pattern text,
  category_id uuid REFERENCES categories,
  currency text, confidence decimal(3,2),
  usage_count int DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

---

## 6. AI PARSING (Codex §10)

- Model: gemini-2.0-flash (cost efficiency critical)
- Call from Cloudflare Worker or Supabase Edge Function only
- Log ai_confidence for every transaction
- If confidence < 0.7: gentle confirmation UI
- If AI can't categorize: honest admission + edit option (Parnuan pattern)
- Cache frequent patterns to reduce API calls

---

## 7. MONETIZATION (Codex §12)

| Plan | Monthly | Annual |
|---|---|---|
| Free | $0 | $0 |
| Pro | $2.99 / ฿100 / ₭70,000 | $29.99 / ฿999 / ₭6,999,000 |
| Family | TBD | TBD (Phase 5) |

> Parnuan charges ฿65/mo. Our ฿100/mo reflects multi-currency + Lao language value.

---

## 8. PHASED ROADMAP (Codex §11 + Parnuan features)

### Phase 1 — Foundation MVP (Week 1–2)
Goal: app.phanote.com usable daily by founder + wife.
- Supabase auth, onboarding (3 steps), quick-add with Gemini, wallet cards, transactions, budgets, multi-language UI, deploy.

### Phase 2 — Pro Features (Week 3–4)
- Receipt OCR, voice logging, recurring transactions, streaks + XP, export, filters, daily reminders, Pro gate.

### Phase 3 — LINE Bot (Week 5–6)
- LINE Official Account, webhook, text/photo/voice logging, Rich Menu, Flex Messages, account linking.

### Phase 4 — Growth (Week 7–8)
- Landing page, payments, referral, gift, AI Memory, advanced analytics, auto monthly report.

### Phase 5 — Scale (Month 3+)
- Family accounts, Telegram bot, PWA offline, currency exchange rates, AI fine-tuning (Codex §6.9).

---

## 9. BRAND VOICE (Codex §14)

Warm, witty but not annoying, encouraging never shaming, multilingual by nature.

Toast examples:
- 🍜 ເຂົ້າປຽກ — -₭50,000 · Fueled up! That's the good stuff. 🐾
- ☕ Coffee — -฿95 · Third one today. We believe in you anyway. ✨
- 💼 Salary — +$800 · Money in! Now let's track it well together.
- 🏠 Rent — -₭3,500,000 · Big one. But you've got it covered. 🌿

---

## 10. RISK REGISTER (Codex §15)

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Gemini fails on mixed-language | Medium | Critical | Prompt engineering + confidence fallback + test corpus |
| Lao script broken on phones | Medium | High | Test real devices + Noto Sans Lao |
| Solo dev burnout | Medium | High | Weekly check-ins + phase discipline |
| Supabase free tier limits | Low | Medium | Monitor; Pro is $25/mo |
| Gemini API costs at scale | Low→High | High | Cache patterns + batch + monitor usage |
| LINE webhook complexity | Low | Medium | Isolated in Phase 3 |
| Payment integration in Laos | Medium | High | PromptPay fallback + Stripe |

---

## 11. DEVELOPMENT RULES (Codex §16)

1. Codex first.
2. 5-second rule.
3. No API keys in frontend.
4. RLS on every table.
5. Mobile first (390px).
6. Test in all 3 languages.
7. Clean over clever.
8. Phase discipline.
9. Update the Codex.

---

## 12. OPEN DECISIONS

| Decision | Options | Notes |
|---|---|---|
| Color palette | Celadon green (#ACE1AF, #F7FCF5) — DECIDED | Switched from lavender to green |
| Typography | Codex (Inter) vs Prototype (Plus Jakarta Sans + Sarabun) | Test Thai/Lao rendering |
| Cards | Glassmorphism (Codex) vs Solid white (Prototype) | Test readability |
| Nav tabs | 4 tabs vs 5 tabs (adding Transactions tab like Parnuan) | Test both |

---

*This document is subordinate to the Project Codex. When in conflict, the Codex wins.*

*"Phajot · ພາຈົດ — Lead your jots. Know your money. Live without the headache."* 🐾
