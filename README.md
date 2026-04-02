# 🐾 Phanote · ພາໂນດ · พาโนด

Multi-currency expense tracker for life in Southeast Asia.

## Quick Start

### 1. Clone and install
```bash
git clone https://github.com/Kitty99Csl/phanote.git
cd phanote
npm install
```

### 2. Set up environment
```bash
cp .env.example .env.local
# Edit .env.local with your Supabase + Gemini keys
```

### 3. Set up Supabase database
Go to your Supabase project → SQL Editor, and run these files in order:
1. `supabase/migrations/001_profiles.sql`
2. `supabase/migrations/002_categories.sql`
3. `supabase/migrations/003_remaining_tables.sql`
4. `supabase/seed.sql`

### 4. Enable Supabase Auth
In Supabase dashboard → Authentication → Providers:
- Enable Email provider (already on by default)
- Disable "Confirm email" for testing (Settings → Auth → toggle off email confirmation)

### 5. Run development server
```bash
npm run dev
```
Open http://localhost:3000

## Tech Stack
- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth + RLS)
- **AI:** Google Gemini Flash 2.0
- **Deploy:** Cloudflare Pages
- **Fonts:** Plus Jakarta Sans + Sarabun + Noto Sans Lao

## Project Structure
```
src/
├── components/      # Reusable UI components
├── pages/           # Route-level views
├── hooks/           # Custom React hooks
├── lib/             # Supabase client, Gemini parser, helpers
├── store/           # Zustand state management
├── i18n/            # Translation files (lo/th/en)
└── index.css        # Tailwind + design tokens
supabase/
├── migrations/      # SQL migration files
└── seed.sql         # Default categories
```

## Phase 1 Checklist
- [x] Project scaffolding
- [x] Database schema + migrations
- [x] Default categories (17 expense + 7 income, 3 languages)
- [x] Supabase auth (email/password)
- [x] Gemini AI parser
- [x] Login page
- [ ] Onboarding wizard (language → currency → categories)
- [ ] Home screen (wallet card + input bar + transactions)
- [ ] Transaction CRUD
- [ ] Budget screen
- [ ] Analytics screen
- [ ] Settings screen
- [ ] Bottom navigation
- [ ] Multi-language UI
- [ ] Deploy to app.phanote.com
