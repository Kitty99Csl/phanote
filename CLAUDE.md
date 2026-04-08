# CLAUDE.md — Phanote project context

## Project
Phanote (ພາໂນດ / พาโนด) — multi-currency personal finance PWA for Laos (LAK, THB, USD). Solo developer: Kitty. For personal + family use first, public launch later.

- Repo: Kitty99Csl/phanote
- Main branch: main
- Working branch: session-4
- Live: app.phanote.com, api.phanote.com, phanote.com

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
2. PHANOTE-PROJECT.md (feature scope)
3. PHANOTE-ACTION-PLAN.md (screen-by-screen plan)

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
- StreakModal kbOffset crash: In src/App.jsx, the StreakModal component references `kbOffset` but never declares it with `useKeyboardOffset()`. Crashes when user taps streak badge. Fix: add `const kbOffset = useKeyboardOffset();` at top of StreakModal function body.

## Current session
Session 4 in progress. Completed:
- Rate limiting on worker (v4.1)
- AI kill switch env vars (v4.2)

Remaining:
- RLS on Supabase profiles and transactions
- Shared Sheet component + modal refactor
- Usage limits system (Free/Trial/Pro tiers)
- Observability (Sentry + admin views)
- Monthly Wrap feature
- Foundation polish (paid_by column, legal pages, i18n)

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
