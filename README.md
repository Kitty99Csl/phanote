# Phajot · ພາຈົດ

> Where did your money go? Let Phajot tell you.
> ເງິນເຈົ້າໄປໃສ? ດຽວພາຈົດບອກໃຫ້ຟັງ

Multi-currency personal finance PWA for life in Laos — where you hold LAK, THB, and USD at the same time. Built solo by [Kitty](https://github.com/Kitty99Csl).

**Live:** [app.phajot.com](https://app.phajot.com) · [phajot.com](https://phajot.com) (landing) · [api.phajot.com](https://api.phajot.com) (worker)

## What it does

- **Natural language logging** — type "coffee 45000 LAK" or "ເຂົ້າປຽກ 50,000" or "กาแฟ 95 บาท" and Phajot parses the amount, currency, category, and type
- **Multi-currency wallets** — LAK, THB, USD tracked separately with per-currency safe-to-spend
- **AI auto-categorization** — local parser for fast path, Gemini 2.5 Flash as fallback. 5-second rule: transaction to saved in under 5s
- **OCR bank statement scan** (Pro) — upload screenshots from LDB, JDB, or BCEL One and Phajot extracts all transactions with Gemini Vision
- **Dedicated TransactionsScreen** — search bar + 3-axis filtering (period × currency × type) + pagination
- **Analytics with drill-down** — heatmap calendar, clickable donut slices, top 5 spending days, day popovers
- **Import history** — batch undo for statement imports
- **Monthly Wrap** (Pro) — AI-generated story of your month
- **Lao-first UI** — full Lao script throughout, with English and Thai fallbacks
- **Streaks + XP** — gamified daily logging with level progression

## Tech stack

- **Frontend:** React 19 + Vite 8, deployed to Cloudflare Pages
- **Backend:** Supabase (PostgreSQL + Auth + RLS) in Singapore region
- **Worker:** Cloudflare Worker at api.phajot.com (parse + OCR + monthly wrap + advisor)
- **AI:**
  - Gemini 2.5 Flash (text parsing)
  - Gemini 2.5 Flash Vision (bank statement OCR)
  - Claude Haiku 4.5 (AI advisor + monthly wrap)
- **State:** Zustand (auth) + local component state
- **Fonts:** Noto Sans Lao Looped (Lao display), DM Sans (body), DM Serif Display (headlines)

## Quick start

### 1. Clone and install
```bash
git clone https://github.com/Kitty99Csl/phanote.git
cd phanote
npm install
```

### 2. Environment variables
Create `.env.local`:
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Supabase setup
In the Supabase SQL editor, run migrations in order:
```
supabase/migrations/001_profiles.sql
supabase/migrations/002_categories.sql
supabase/migrations/003_remaining_tables.sql
supabase/seed.sql
```

Then enable RLS on every table (non-negotiable per project rules).

### 4. Run dev server
```bash
npm run dev
```
Open [localhost:5173](http://localhost:5173).

### 5. Worker deploy (optional)
The worker lives at `workers/phanote-api-worker.js`. Deploy with:
```bash
npx wrangler deploy
```
Requires `CLOUDFLARE_API_TOKEN` + `GEMINI_API_KEY` + `ANTHROPIC_API_KEY` as Worker secrets.

## Project structure

```
src/
├── App.jsx              # Main app (~5500 lines — refactor planned)
├── main.jsx             # React entry
├── index.css            # Global styles + design tokens
├── components/
│   └── Sheet.jsx        # Shared keyboard-aware bottom sheet
├── lib/
│   ├── supabase.js      # Supabase client
│   ├── gemini.js        # AI parser client
│   └── currencies.js    # Currency helpers
├── pages/
│   └── Login.jsx        # Phone auth page
├── store/
│   └── authStore.js     # Zustand auth store
└── assets/              # Images + logo tiers

workers/
└── phanote-api-worker.js  # Cloudflare Worker (parse, OCR, advisor, wrap)

supabase/
├── migrations/          # SQL schema migrations
└── seed.sql             # Default categories

landing/                 # Marketing site (phajot.com)
docs/                    # Session summaries (session-1 through session-6)
public/                  # PWA assets + logo files
```

## Plan tiers

| | Free | Trial (7-day) | Pro ($2.99/mo) |
|---|---|---|---|
| Parse | Local only | 20 AI parses | Unlimited |
| Advisor | — | 3 | 150/mo + 5s cooldown |
| OCR | — | 3 | 150/mo |
| Monthly Wrap | — | 1 | Unlimited |
| Daily cap | 100 tx | Unlimited | Unlimited |

## Design principles

- **5-second rule** — logging a transaction must take under 5 seconds from app open
- **Mobile-first** — all layouts tested at 390px first
- **Warm, never judgmental** — the app is a friend telling you about your money over coffee, not a bank dashboard
- **No harsh borders** — shadows + glassmorphism, border radius 14-28px
- **3-language parity** — every feature tested in English, Lao, Thai

## Brand

Renamed from "Phanote" to "Phajot" in April 2026 due to a trademark conflict with AIDC Laos. The new name preserves the meaning:
- **Pha** (ພາ) = to lead / guide
- **Jot** (ຈົດ) = to jot / write

An app that gently leads you toward financial clarity.

**Logo:** capybara hugging a celadon green notebook with "phajot" on the left page and "ພາຈົດ" on the right page. Warm brown line art, pink blush cheeks.

**Palette:** Celadon green `#ACE1AF` on near-white `#F7FCF5` background, dark forest text, soft coral for expenses.

## Development rules

See [CLAUDE.md](CLAUDE.md) for full project context. Non-negotiables:

1. Never edit the worker in Cloudflare's web editor — always local + `wrangler deploy`
2. Never commit API keys or secrets
3. Every Supabase table must have RLS enabled
4. Test in all 3 languages (English, Lao, Thai)
5. Any file over 800 lines must be split before adding features (App.jsx refactor pending)
6. All new modals must use the shared Sheet component

## Session history

- **Session 1:** Scaffolding + auth + onboarding wizard
- **Session 2:** Home screen + transaction CRUD + AI parsing
- **Session 3:** Analytics + Budget + Goals + Streaks
- **Session 4:** Rate limiting + AI kill switch + parse pipeline tiers + wife feedback sprint
- **Session 5:** Lao-first branding + slogan lock + landing page refresh + brand identity
- **Session 6:** Phajot migration + OCR bank statement + dedicated TransactionsScreen + heatmap analytics

See [docs/session-6/SUMMARY.md](docs/session-6/SUMMARY.md) for the latest session details and [TOMORROW-START-HERE.md](TOMORROW-START-HERE.md) for Session 7 priorities.

## License

Private. Not open-source at this time.

---

*Phajot · ພາຈົດ — a calm financial garden for Southeast Asia.*
