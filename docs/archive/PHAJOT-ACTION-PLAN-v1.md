> **Status:** Archived
> **Reason:** Historical reference from early April 2026. Content reflects pre-Session-10 project state.
> **Superseded by:** CLAUDE.md (operating rules), project_codex.md (product philosophy), docs/ROADMAP-LIVE.md (live roadmap).
> **Last original update:** 2026-04-11 (Session 6)

# Phajot — Pre-Development Checklist & Stitch Prompt

## YOUR ACTION ITEMS (before we start coding)

### 1. Accounts to set up (15 min total)

**GitHub Repository**
- [ ] Go to github.com → New Repository
- [ ] Name: `phanote`
- [ ] Private repo (for now)
- [ ] Don't initialize with README (we'll push from local)
- → Give me the repo URL when done

**Supabase Project**
- [ ] Go to supabase.com → New Project
- [ ] Project name: `phanote`
- [ ] Region: pick Singapore (closest to Laos)
- [ ] Generate a strong database password (save it!)
- → Give me: Project URL + Anon Key (from Settings → API)

**Google Gemini API Key**
- [ ] Go to aistudio.google.com → Get API Key
- [ ] Create key for a new or existing GCP project
- → Give me: the API key (I'll put it in environment variables, never in frontend code)

**Cloudflare Account**
- [ ] Go to cloudflare.com → Sign up (if you don't have one)
- [ ] We'll connect it to GitHub later for auto-deploy
- → Just confirm you have an account

**Domain (phanote.com)**
- [ ] Buy `phanote.com` from any registrar (Cloudflare, Namecheap, etc.)
- [ ] Or if already bought, point DNS to Cloudflare
- → Confirm domain status

### 2. Design assets (10 min)

**Green animal background (optional but nice)**
- [ ] Open your existing Canva animal design
- [ ] Change all animal colors from lavender (#b89dd4) to sage green (#8FBF8F or #7BA87B)
- [ ] Keep sparkles/stars
- [ ] Export as PNG (transparent bg if possible, white bg is fine too)
- [ ] Upload here → I'll embed it

**App icon / favicon (optional for now)**
- [ ] Simple green circle with "P" or a small leaf/coin icon
- [ ] 512x512 PNG for PWA manifest
- [ ] Can do this later

### 3. Stitch UI designs (20-30 min)

Use the prompt below in Stitch to generate all screens.
Review the outputs, screenshot the ones you like, upload here.
I'll match the code to your preferred designs.

---

## STITCH PROMPT

Copy this entire block into Stitch:

```
# Phajot — Multi-Currency Expense Tracker

## App Overview
Phajot (ພາຈົດ / ພາຈົດ) is a cozy, multi-currency personal finance tracker for Southeast Asia. Users in Laos hold LAK, THB, and USD simultaneously. The app supports Thai, Lao, and English input. It's a PWA at app.phajot.com.

## Design Direction: "Calm Financial Garden"
Professional-cute hybrid. Not a banking dashboard, not a children's app. Think: competent adults who enjoy cozy things. Like a premium stationery brand meets a friendly finance app.

## Color Palette
- Primary: Celadon Green #ACE1AF
- Secondary: Nyanza #E9FFDB  
- Tertiary: Soft Coral #FFC6C2
- Background: Near-white green #F7FCF5
- Surface/Cards: White #FFFFFF
- Text Primary: Dark forest #1a2e1a
- Text Secondary: Sage #5a7a5a
- Accent: #5aae5f (buttons, active states)
- Accent Dark: #3d8a42 (gradients, pressed states)
- Income: Green #3da873
- Expense: Coral #c75050
- Warning: Amber #d4993a

## Typography
- Headlines: Plus Jakarta Sans (bold, 22-32px)
- Body: Sarabun (regular, 14-15px) — supports Thai script
- Lao fallback: Noto Sans Lao
- Balance amounts should feel celebratory and bold (28-36px)

## Design Rules
- NO 1px solid borders on cards — use soft box-shadow only
- Cards: solid white, border-radius 20px, shadow: 0 4px 24px rgba(40,90,40,0.08)
- Background: subtle kawaii animal pattern at 4-6% opacity (capybara, sloth, cat, bunny, penguin, fox, panda, hedgehog, red panda, otter)
- Animals are ambiance, never competing with content
- Glassmorphic bottom nav: backdrop-blur, semi-transparent white
- Send/CTA buttons: gradient from #5aae5f to #e8857a (green to coral)
- Currency flags: small rounded rectangle SVG flags for 🇱🇦 LAK, 🇹🇭 THB, 🇺🇸 USD
- Mobile-first: design at 390px width

## Screens to Generate

### Screen 1: Home (main screen)
- Header: "Phajot" title + user avatar (top)
- BCEL-style wallet card showing ALL 3 currencies (LAK, THB, USD) with balances, tap to expand income/expense per currency
- Each currency row: flag icon + currency name + balance amount
- "Today" section with recent transactions grouped by date
- Each transaction: category emoji + description + amount (green for income, coral for expense) + currency flag
- Sticky input bar at bottom: text field "Type expense... กาแฟ 45 บาท" + send button
- Bottom nav: Home, Analytics, Budget, Transactions, Settings (5 tabs)
- Streak widget somewhere subtle: "🔥 7 days" with level progress

### Screen 2: Analytics
- Currency selector tabs at top (LAK | THB | USD)
- Balance per currency card with +/- vs last month indicator
- Donut chart: "Spending by Category" with percentage breakdown
- Category breakdown list: emoji + name + amount + budget comparison
- Monthly income vs expense summary at bottom

### Screen 3: Budget
- Currency tabs: LAK | THB | USD
- Total budget card with large number + progress bar (green/yellow/red based on usage %)
- Status badge: "On Track" / "Caution" / "Over Budget"
- Category budget cards: emoji + name + spent/limit + progress bar
- Color coding: green (<80%), amber (80-100%), red (>100%)
- "Adjust Budgets" button at bottom

### Screen 4: Transactions
- Date range picker at top
- Filter pills: All / Expense / Income
- Export button (with Pro badge)
- "Select multiple" option
- Transaction list grouped by date with daily totals
- Each row: category emoji + description + sub-info (source, time) + amount with currency
- Floating "+" button (FAB) for manual entry

### Screen 5: Settings
- Profile section: avatar + name + plan badge (Free/Pro)
- Streak display: "🔥 12 days · Level 3" with XP progress bar
- "Invite friends — Get 1 month free" banner
- Settings list:
  - Daily Reminder (Pro badge)
  - AI Memory (Pro badge)
  - Recurring Transactions (Pro badge)
  - Category Settings
  - Default Currency selector
  - Language: ภาษาไทย / ພາສາລາວ / English (chips)
  - Data Export
  - Billing History
- Danger zone: Delete Account (red)
- Logout button

### Screen 6: Onboarding Step 1 — Expense Categories
- Title: "Select Expense Categories"
- Subtitle: "Choose categories that suit your spending"
- "Select Recommended" / "Deselect All" toggle
- Grid of category pills (2 columns): emoji + name
- Selected = green filled, Unselected = white outlined
- Categories: Food, Coffee, Transport, Car Payment, Housing, Subscription, Shopping, Phone Bill, Internet, Utilities, Grocery, Health, Entertainment, Education, Personal Care, Gifts, Other
- "+ Add Custom" at bottom
- "Next" button

### Screen 7: Onboarding Step 2 — Income Categories
- Same layout as Step 1 but green theme
- Categories: Salary, Business, Commission, Freelance, Selling, Dividend, Other Income
- "Finish" button

### Screen 8: Upgrade to Pro
- "Buy as Gift" and "Enter Referral Code" buttons at top
- Feature carousel showing Pro features:
  - Receipt OCR
  - Voice logging
  - Recurring transactions (with calendar preview)
  - Daily reminders
  - AI Memory
  - Excel export
  - Advanced analytics
- Pricing cards: Monthly ฿100 | Yearly ฿999 (with "Best value" badge)
- "Upgrade to Pro" CTA button

## Important Notes
- All text should work in Thai, Lao, AND English — test with: "ເຂົ້າປຽກ 50,000 ₭" and "กาแฟ 45 บาท" and "Coffee $4.50"
- Currency formatting: ₭ 50,000 (LAK), ฿ 1,250 (THB), $ 12.50 (USD)
- The app should feel WARM and ENCOURAGING — money stress is real, the app should reduce it
- Toast notification example: "☕ Coffee — -฿45 · Third one today. We believe in you anyway. ✨"
```

---

## WHAT I'LL DO WHILE YOU PREPARE

Once you give me the Supabase + Gemini credentials, I'll:

1. Set up the full repo structure
2. Write all database migrations + seed categories
3. Build the auth flow (signup/login)
4. Build the onboarding wizard
5. Wire up Gemini AI parsing
6. Build the Home screen with real data
7. Deploy to Cloudflare Pages

We can start coding as soon as you have:
- ✅ GitHub repo created
- ✅ Supabase project URL + anon key
- ✅ Gemini API key

The domain and Cloudflare can come slightly later — we'll develop locally first.

---

## SESSION 6 COMPLETION LOG (April 9-11, 2026)

All items below shipped and verified. See docs/session-6/SUMMARY.md.

### Done
- [x] Phajot brand migration (8-step DNS, zero downtime)
- [x] OCR bank statement backend (POST /parse-statement, Gemini Vision)
- [x] OCR bank statement frontend (6-step flow, inline edit, import)
- [x] Cross-session dedup for statement imports
- [x] Import history with batch undo
- [x] Transaction editing (currency, type, amount, description)
- [x] Dedicated TransactionsScreen (search + 3-axis filter + pagination)
- [x] Home simplified to daily dashboard
- [x] Home sort fix (all today txs, date DESC)
- [x] Heatmap calendar with summary + above-average dots
- [x] Clickable donut slices + legend drill-down
- [x] Day popover with context before drill-in
- [x] Top 5 biggest spending days list
- [x] All docs updated for Phajot brand

### Session 7 Priorities (pick one)
- [ ] LINE bot integration (wife uses LINE daily, ~2-3 hours)
- [ ] Recurring transactions (salary, rent, subscriptions, needs schema)
- [ ] CSV export (one-button filtered export, ~1 hour)
- [ ] Wife testing + feedback capture (like Session 5 WIFE-REACTION.md)
- [ ] Bulk select/delete in TransactionsScreen (~1.5 hours)

### Backlog (discovered during Session 6)
- [ ] Budget progress bars on home
- [ ] Top merchants list in analytics
- [ ] Advanced filters (amount range, custom date picker)
- [ ] Week-over-week trend line
- [ ] Export filtered view
- [ ] Desktop max-width polish on fullscreen overlays
- [ ] Family/shared accounts
