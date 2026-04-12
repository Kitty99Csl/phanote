# CLAUDE.md — Phajot project context

## Project
Phajot (ພາຈົດ) — multi-currency personal finance PWA for Laos (LAK, THB, USD). Solo developer: Kitty. For personal + family use first, public launch later.

- Repo: Kitty99Csl/phanote
- Main branch: main
- Working branch: session-4
- Live: app.phanote.com, api.phanote.com, phanote.com

## Brand Identity

> **Rename history:** Renamed from "Phanote" to "Phajot" in April 2026 due to trademark conflict with AIDC Laos. Code + UI + logo migrated in commit 608fe5c. DNS migration completed 2026-04-10 across 8 staged steps — phajot.com, app.phajot.com, api.phajot.com are now primary. Legacy phanote.com domains 301 redirect cleanly. Auth identifiers (email domain, password prefix, localStorage keys, repo name, worker filename) intentionally preserved to avoid breaking existing users.

**Slogan (locked, Session 5 Day 1):**
- Lao (primary): ເງິນເຈົ້າໄປໃສ? ດຽວພາຈົດບອກໃຫ້ຟັງ
- English: Where did your money go? Let Phajot tell you.
- Uses "ດຽວ" (diew) particle for conversational Lao friend-voice
- Connects to Monthly Wrap feature (storytelling theme)

**Logo:** Capybora hugging celadon green spiral notebook with
"phajot" on left page and "ພາຈົດ" on right page. Warm brown line art
with pink blush cheeks. Landscape aspect (823×433). Transparent PNG
at 6 resolution tiers (32-1024px).

**Positioning:** Lao-first publicly (landing + login), Thai still
accessible via Settings for existing users.

**Typography:**
- Headlines / Lao display: Noto Sans Lao Looped (warm, rounded)
- Body English: DM Sans
- Display English: DM Serif Display
- Colors: Celadon green #ACE1AF, warm brown line art, pink blush

**Voice:** Warm, conversational, never judgmental. Like a friend
telling you about your money over coffee, not a bank dashboard.

## Tech stack
- Frontend: React + Vite, src/App.jsx is 3,381 lines (needs refactor into multi-layer structure)
- DB: Supabase (Singapore)
- Worker: Cloudflare Workers at workers/phanote-api-worker.js, name "phanote-parser"
- AI parse: Gemini 2.5 Flash
- AI advise: Claude Haiku 4.5
- AI OCR: Gemini 2.5 Flash Vision
- Deploy worker: npx wrangler deploy (requires CLOUDFLARE_API_TOKEN)

## Required reading before editing
1. project_codex.md (the bible — design rules, UX, architecture)
2. PHAJOT-PROJECT.md (feature scope)
3. PHAJOT-ACTION-PLAN.md (screen-by-screen plan)

## Non-negotiable rules
1. Never edit worker in Cloudflare web editor — always local + wrangler deploy
2. Never commit API keys or secrets
3. Every Supabase table must have RLS enabled
4. 5-second rule: logging a transaction must take under 5 seconds
5. Mobile-first (test at 390px first)
6. Test in all 3 languages (English, Lao ລາວ, Thai ไทย)
7. Any file > 800 lines must be split before adding features
8. All new modals must use a shared Sheet component (when created) — keyboard-aware, safe-area-aware, button-always-visible
9. No console.log with sensitive data
10. Ask Kitty before architectural decisions. Don't guess.

## Known bugs to fix
- (none active — Session 6 fixes all shipped)

## Current state: Session 6 complete, Session 7 not yet started

**Session 6 shipped (April 9-11, 2026)** — 26 commits. See `docs/session-6/SUMMARY.md` for full details.

### Major deliverables
- **Phajot brand migration**: 8-step DNS migration complete, zero downtime
- **OCR bank statement scan** (backend + frontend): Gemini Vision, LDB/JDB/BCEL support, 6-step flow, batch undo, cross-session dedup
- **Dedicated TransactionsScreen**: search + 3-axis filters + pagination + drill-down from Analytics
- **Analytics heatmap**: calendar grid + summary line + above-avg dots + day popover + top 5 biggest days list
- **Clickable donut slices**: drill to filtered TransactionsScreen
- **Home refactor**: shows ALL today's transactions with "TODAY (N)" header, sort by date DESC at display layer
- **Transaction editing**: currency, type toggle, inline amount/description edit
- **Fixed**: stale closure in EditTransactionModal, word-boundary regex for "50thb"

### Next session: Session 7 (open)
See `TOMORROW-START-HERE.md` for 5 priority options: LINE bot, recurring transactions, CSV export, wife testing, bulk actions.

### Still on the backlog
- ⏳ RLS on Supabase (profiles, transactions) — **STILL BLOCKING public launch**
- ⏳ App.jsx refactor into multi-layer structure (now 5480 lines)
- ⏳ Budget progress bars, top merchants, advanced filters
- ⏳ Family/shared accounts

## Recent key learnings (from Session 6)

1. **JS regex `\b` doesn't fire between digits and letters** — "50thb" failed `\bthb\b`. Drop `\b` on short currency codes.
2. **Display-layer sorting beats state-layer sorting** — Supabase + optimistic adds create unreliable array order. Always sort at render time.
3. **Cross-session dedup is cheap client-side** — Set of existing tx hashes, no schema change needed
4. **Stale closures in useEffect cleanup need refs** — category list must rebuild from NEW type, not stale closure
5. **Heatmaps need context** — colored squares alone aren't useful; pair with summary line + above-avg indicators + top days list
6. **Sort bugs hide until data volume grows** — `slice(0, 5)` worked with 3 manual entries, broke with 14 imported

Older Session 4-5 learnings still apply:
- SQL diagnostics beat code guessing
- Audit patterns, not instances
- Short-word fuzzy matching is dangerous (≤5 char exact match only)
- `.single()` → `.maybeSingle()` in Supabase (0 rows throws 406)

## Parse pipeline architecture (locked 2026-04-09)

Thresholds and design decisions:
- Local confidence ≥ 0.60: save immediately, AI corrects in background (fast path)
- Local confidence < 0.60: await AI up to 3 seconds, pick best result (slow path)
- No local result: show ConfirmModal, wait for user (existing flow)
- Fuzzy match confidence: 0.65 (above threshold → fast path)
- Fuzzy rules: exact match only for 3-5 char words, edit distance 1 for 6+ chars
- Lao/Thai: exact regex only (Levenshtein doesn't work on non-Latin)

**Do not change these without testing with real Lao/Thai/English inputs.** The 3s AI timeout preserves the 5-second rule.

## Plan tiers
- Free: local parser only, no AI, 100 tx/day cap
- Trial (7 days, one-shot): 20 AI parses, 3 Advisor, 3 OCR, 1 Monthly Wrap
- Pro ($2.99/mo): 150 Advisor/mo, 150 OCR/mo, 5s Advisor cooldown, unlimited parse

## Design tokens
- Celadon green: #ACE1AF
- Background: #F7FCF5
- Dark text: #2D2D3A
- Font: Noto Sans + Noto Sans Lao
- Border radius: 14-28px, no harsh borders, use shadows + glassmorphism

## Git workflow
- Branches: session-N-feature
- Commit format: feat/fix/chore/refactor/docs(session-N): description
- Never push to main directly

## How Kitty works
- Uses Codespaces (not local). Limited IT background, strong product instincts.
- Prefers short structured answers with headers, tables, action steps.
- Values: clarity, warmth, respect for users, no shame about spending.
- Explain WHY before HOW. Don't just execute — teach.
- When unsure, ASK before doing.
