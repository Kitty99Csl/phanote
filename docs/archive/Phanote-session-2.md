# 📒 PHANOTE — Session Progress Report
### Session: April 3, 2026 (Day 2)
### Status: Phase 1 ✅ COMPLETE + AI Learning System 🧠

---

## ✅ WHAT'S LIVE RIGHT NOW

**URL:** https://app.phanote.com
**API:** https://api.phanote.com
**Repo:** https://github.com/Kitty99Csl/phanote

---

## INFRASTRUCTURE — ALL DONE ✅

| Service | Status | Details |
|---|---|---|
| Cloudflare Pages | ✅ Live | Auto-deploy on git push |
| Supabase | ✅ Connected | Singapore region |
| Cloudflare Worker | ✅ Live | api.phanote.com |
| Custom domains | ✅ Active | app.phanote.com + api.phanote.com |
| GitHub repo | ✅ Public | Kitty99Csl/phanote |
| Codespaces | ✅ Active | super-duper-capybara |

---

## TECH STACK — CONFIRMED

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React + Vite | Single file App.jsx |
| Hosting | Cloudflare Pages | Auto-deploy ✅ |
| Database | Supabase (PostgreSQL) | Singapore region |
| Auth | Phone → silent Supabase | No OTP for now |
| AI Parser | Claude Haiku via Worker | api.phanote.com/parse |
| AI Learning | Supabase ai_memory table | Self-learning ✅ |
| Worker | Cloudflare Workers | throbbing-feather-08a7 |

---

## API KEYS IN USE

| Key | Location | Used For |
|---|---|---|
| VITE_SUPABASE_URL | .env.local + Cloudflare | Database connection |
| VITE_SUPABASE_ANON_KEY | .env.local + Cloudflare | Database auth |
| GEMINI_API_KEY | Cloudflare Worker secret | Backup (not primary) |
| ANTHROPIC_API_KEY | Cloudflare Worker secret | Claude Haiku parsing |

---

## DATABASE SCHEMA — CURRENT STATE

### Tables
| Table | Purpose | RLS |
|---|---|---|
| profiles | User data, phone, avatar, preferences | DISABLED (temp) |
| transactions | All financial entries, soft delete | DISABLED (temp) |
| ai_memory | Learned patterns for instant parsing | Enabled |
| app_events | User behavior analytics | Enabled |
| user_sessions | Login tracking | Enabled |
| user_feedback | Bug reports, ratings | Enabled |
| admin_logs | Admin audit trail | Enabled |
| budgets | Monthly budget limits | - |
| categories | Custom categories | - |
| recurring_rules | Phase 2 recurring transactions | - |

### Key columns added (April 3 session)
**profiles:** phone, phone_country_code, avatar, custom_categories, exp_cats, inc_cats, last_seen_at, app_version, is_active

**transactions:** note, category_name, category_emoji, raw_input, edited_at, deleted_at, is_deleted

**ai_memory:** category_name, type, user_corrected (new)

### Views
- `admin_user_summary` — user analytics for admin panel
- `admin_daily_stats` — daily active users + events
- `top_patterns` — most common AI memory patterns

### ⚠️ PENDING
- RLS is DISABLED on profiles and transactions (temporary fix)
- Need to re-enable with correct policies before public launch

---

## FEATURES BUILT — PHASE 1

### Auth
- [x] Phone number login (silent Supabase auth)
- [x] Session persistence — stays logged in
- [x] Back button on onboarding
- [x] Shared account (wife enters same number)
- [ ] PIN/approval for shared access (Phase 3)

### Core App
- [x] Onboarding (name, avatar, language, currency, categories)
- [x] Compact 3-column wallet (LAK/THB/USD)
- [x] Tap wallet → expand income/expense detail
- [x] Transaction list grouped by Today/Yesterday/Date
- [x] Soft delete (data preserved for analytics)
- [x] Edit category (tap row → Edit button)
- [x] Inline notes on transactions
- [x] Background animal pattern (kawaii PNG)
- [x] Responsive mobile-first layout

### AI System
- [x] Local parser (instant, no API) — handles 80%+ of inputs
- [x] Claude Haiku via api.phanote.com/parse
- [x] Background AI correction (saves instantly, AI corrects silently)
- [x] ai_memory table — learns from every transaction
- [x] Quick Edit Toast — fix category after save
- [x] Category Picker modal — full grid picker
- [x] Category editing teaches ai_memory

### Input Bar
- [x] Single compact row (− Out / + In toggle)
- [x] Works in Laos (api.phanote.com, not .workers.dev)
- [x] Enter key submits

### Settings
- [x] Avatar change (10 animals)
- [x] Language switcher (LO/TH/EN)
- [x] Base currency switcher
- [x] Logout button

---

## AI LEARNING SYSTEM — HOW IT WORKS

```
Parse Flow:
1. Check ai_memory table (usage_count >= 2) → instant if found
2. Local regex parser → instant for known keywords
3. Claude Haiku API → 1-3 seconds for complex inputs
4. Save result to ai_memory → learns for next time
5. Background correction → AI fixes category silently after local save
6. User correction → tap Edit → feeds back to ai_memory with 0.99 confidence
```

### AI Cost Estimate
- Claude Haiku: ~$0.00025 per parse
- 100 users × 5 new patterns/day = 500 API calls
- Cost: ~$0.125/day = ~$4/month
- As ai_memory grows → API calls drop → cost approaches $0

### Future AI Roadmap
- Month 6: Export ai_memory → fine-tune GPT-4o Mini
- Year 1: Own Lao/Thai finance model
- Cost at scale: $2-5/month

---

## KNOWN ISSUES / PENDING FIXES

| Issue | Priority | Notes |
|---|---|---|
| RLS disabled on profiles + transactions | HIGH | Re-enable before public launch |
| Refresh sometimes → login screen | MEDIUM | Session persistence issue |
| AI parsing still sends to api.phanote.com even when Laos has issues | LOW | Fallback to local works |
| Category icons all show 🍜 for some transactions | LOW | categoryId mapping issue |
| Old transactions show wrong category (from before AI) | LOW | Data migration needed |
| `api.phanote.com/health` returns 405 (GET not handled) | LOW | Update worker to handle GET |

---

## PHASE 2 FEATURES — NEXT SESSION

Priority order:

1. **Re-enable RLS properly** — security before more features
2. **Budget bars** — monthly limits per category with progress
3. **Streaks** — daily logging streak 🔥 + XP system
4. **Analytics tab** — spending charts, category breakdown
5. **Edit transaction amount** — not just category
6. **Recurring transactions** — monthly bills auto-log
7. **Export CSV/Excel** — Pro feature

---

## PHASE 3 — LINE BOT

```
api.phanote.com/line ← webhook ready (returns 501 for now)

When ready:
- LINE Official Account
- Text → parse → save to Supabase
- Photo → OCR → save
- Rich Menu (8 buttons)
- Flex Message confirmation
```

---

## AUTH ROADMAP (future)

| Phase | Method | Status |
|---|---|---|
| Now | Phone silent | ✅ Live |
| Phase 3 | LINE Login | Pending (register developers.line.biz) |
| Phase 3 | Google OAuth | Pending |
| Phase 4 | Facebook Login | Pending |
| Phase 5 | Real OTP (Firebase) | Future |

PIN/approval system for shared accounts noted for Phase 3.

---

## DESIGN SYSTEM — CONFIRMED

| Token | Value |
|---|---|
| Background | #F7FCF5 |
| Surface | rgba(255,255,255,0.9) |
| Celadon | #ACE1AF |
| Dark text | #1a2e1a |
| Muted | #9B9BAD |
| Income green | #1A5A30 |
| Expense red | #C0392B |
| Font | Noto Sans + Noto Sans Lao |
| Border radius | 18-24px |
| No harsh borders | Use shadows only |
| Background animals | /public/bg-pattern.png at 18% opacity |

---

## MONETIZATION PLAN (unchanged from Codex)

| Plan | Price | Features |
|---|---|---|
| Free | $0 | Core logging, 3 currencies, budgets |
| Pro | $2.99/฿100/₭70,000 per month | OCR, voice, AI memory, export |
| Family | TBD | Phase 5 |

---

## END OF DAY CHECKLIST

Before closing Codespaces:
```bash
git add .
git commit -m "chore: end of session April 3"
git push
```

Delete old Cloudflare API token:
- dash.cloudflare.com → Profile → API Tokens → delete old one

---

*Last updated: April 3, 2026 — End of Day 2 Session*
*"Phanote · ພາໂນດ · พาโนด — Lead your notes. Know your money."* 🐾
