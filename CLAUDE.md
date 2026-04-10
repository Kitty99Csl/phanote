# CLAUDE.md — Phajot project context

## Project
Phajot (ພາຈົດ) — multi-currency personal finance PWA for Laos (LAK, THB, USD). Solo developer: Kitty. For personal + family use first, public launch later.

- Repo: Kitty99Csl/phanote
- Main branch: main
- Working branch: session-4
- Live: app.phanote.com, api.phanote.com, phanote.com

## Brand Identity

> **Rename history:** Renamed from "Phanote" to "Phajot" in April 2026 due to trademark conflict with AIDC Laos. Code + UI + logo migrated in commit 608fe5c. Infrastructure (api.phanote.com, app.phanote.com, worker, repo name) staged — will flip when phajot.com DNS is attached to Cloudflare.

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
- ~~StreakModal kbOffset crash~~ — FIXED in commit 4f8cd5e (Day 1)

## Current session: Session 4 + Session 5 refactor

**Session 4 in progress** — see `docs/session-4/DAY-2-SUMMARY.md`:

### Day 1 (April 8)
- ✅ Part 1.2: Rate limiting on worker (v4.1.0)
- ✅ Part 1.3: AI kill switch (v4.2.0, env vars)
- ✅ Part 1.4: Sheet component + 2 modal migrations
- ✅ Part 1.4.1: Sheet BottomNav overlap + iPhone SE maxHeight fixes
- ✅ CLAUDE.md auto-loaded project context
- ✅ StreakModal kbOffset crash fix

### Day 2 (April 9) — Wife Feedback Sprint
- ✅ Part 1.5: **Parse pipeline Tier 1** (confidence threshold + AI wait + save confidence)
- ✅ Part 1.6: **Parse pipeline Tier 3** (fuzzy matching + 10 keyword patterns + 5 audit fixes)
- ✅ Part 1.7: **Polish** (ai_memory 406 fix + friendly OCR errors + 0.47 SQL cleanup)

### Day 3 (next session — planned)
- ⏳ **Part 1.8: AI Advisor scope fix** (wife feedback Issue 2, 60-90 min, HIGH PRIORITY)
- ⏳ Part 1.1: RLS on Supabase (profiles, transactions) — STILL BLOCKING public launch

### Deferred to Session 5 or later
- ⏳ Tier 2 category picker modal (when both local + AI < 0.60)
- ⏳ Part 2: Usage limits system
- ⏳ Part 3: Observability (Sentry, admin views)
- ⏳ Part 4: Monthly Wrap feature
- ⏳ Part 5: Foundation polish

**Session 5 (planned)** — App.jsx refactor into multi-layer structure. 2 hours estimated.

## Recent key learnings (from Session 4 Day 2)

1. **SQL diagnostics beat code guessing** — Run queries against real data first
2. **Audit patterns, not instances** — Finding one bug means there are likely more
3. **Short-word fuzzy matching is dangerous** — Use exact match for ≤5 char words
4. **Rule order matters in CAT_RULES** — First match wins, use negative lookahead to refine
5. **Wife as QA > any synthetic test** — Real user inputs catch what tests miss
6. **`.single()` → `.maybeSingle()` in Supabase** — 0 rows throws 406, remember forever

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
