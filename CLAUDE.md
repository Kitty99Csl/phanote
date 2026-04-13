# CLAUDE.md — Phajot project context

## Project
Phajot (ພາຈົດ) — multi-currency personal finance PWA for Laos (LAK, THB, USD). Solo developer: Kitty. For personal + family use first, public launch later.

- Repo: Kitty99Csl/phanote (repo name intentionally preserved post-rename)
- Main branch: main
- Working branch: main (Session 8 Sprint A + Ext merged 2026-04-13 at `ac9bd77`, no working branch cut)
- Live: app.phajot.com, api.phajot.com, phajot.com (legacy phanote.com domains 301 redirect)

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
- Frontend: React 19 + Vite 8, src/App.jsx is **345 lines** (after Session 7 refactor from 5,480 lines; now a thin root shell, logic lives in src/lib/, src/hooks/, src/components/, src/modals/, src/screens/)
- DB: Supabase (Singapore)
- Worker: Cloudflare Workers at workers/phanote-api-worker.js (v4.4.0), name "phanote-parser" (filename preserved post-rename)
- AI parse: Gemini 2.5 Flash
- AI advise: Claude Haiku 4.5
- AI OCR: Gemini 2.5 Flash Vision
- Worker endpoints: /parse, /advise, /ocr, /parse-statement, /monthly-report, /health
- Deploy worker: npx wrangler deploy (requires CLOUDFLARE_API_TOKEN)
- Snapshot for chat Claude: docs/snapshots/phanote-api-worker.js (read-only, refresh at session end)

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
8. All new modals must use the shared `Sheet` component — keyboard-aware, safe-area-aware, button-always-visible
9. All new async action buttons (save/confirm/submit) must wrap their handler in `useClickGuard` — prevents zombie-modal duplicate saves. See `src/hooks/useClickGuard.js`.
10. All new `fetch()` calls to worker endpoints must use `fetchWithTimeout` from `src/lib/fetchWithTimeout.js` with an endpoint-appropriate timeout. Never bare `fetch()` to `api.phajot.com`.
11. No console.log with sensitive data
12. Ask Kitty before architectural decisions. Don't guess.

## Known bugs to fix
- (none active — Session 8 Sprint A + Ext fixes all shipped, phone-tested 5/5)

## Current state: Session 8 Sprint A + Ext complete, Sprint B open

**Session 8 Sprint A + Ext shipped (April 13, 2026)** — 5 commits. See `docs/session-8/SUMMARY.md` for full details.

### Major deliverables
- **Credential leak remediation**: `.env.local.bak` untracked + rotated Gemini key, `.gitignore` hardened to canonical Vite patterns, forensic audit confirmed only the Gemini key was ever in history
- **5 critical bugs fixed**: 2 latent silent `ReferenceError`s from Session 7 extraction, parse hang on no-local-result path (8s `Promise.race`), 2 modals migrated to `Sheet` to fix iOS keyboard hiding save buttons
- **Click-guard sweep**: new `useClickGuard` hook (ref-based synchronous re-entry block + `useState` visual feedback), applied to 7 action buttons across 6 files. Eliminates the entire class of "zombie modal" duplicate-save bugs
- **fetchWithTimeout sweep**: new helper + `FetchTimeoutError` class, applied to 4 endpoints with per-endpoint timeouts (`/ocr` 20s, `/advise` 30s, `/monthly-report` 30s, `/parse-statement` 60s) + localized timeout messages
- **GoalModal Sheet migration**: last raw-div modal from the top-priority Sheet list, -860 bytes
- **6 modals now on Sheet**: ConfirmModal, MonthlyWrapModal, OcrButton, AddSavingsModal, AiAdvisorModal, GoalModal

### Session 7 (shipped April 12, 2026) — App.jsx refactor
Multi-layer decomposition: src/App.jsx 5,480 → 345 lines, 45 extracted files, -93.8%, 26 pure-move commits, zero regressions. See git history before `0935ddf`.

### Next session: Sprint B (open)
See `TOMORROW-START-HERE.md` for priorities and `docs/session-8/SPRINT-A-EXT-BACKLOG.md` for follow-ups from the sweep.

### Still on the backlog
- ⏳ RLS on Supabase (profiles, transactions) — **STILL BLOCKING public launch**
- ⏳ 3 remaining raw-div modals for Sheet migration: EditTransactionModal, SetBudgetModal, StreakModal
- ⏳ 5 parent-side wrapper bugs flagged in docs/session-8/SPRINT-A-EXT-BACKLOG.md (fire-and-forget async, missing try/catch, silent error swallowing)
- ⏳ Error-surfacing toasts for silent insert failures
- ⏳ Native `window.confirm` → shared `ConfirmDialog`
- ⏳ Thai translation gap for `statementError*` keys (Sprint D i18n marathon)
- ⏳ Budget progress bars, top merchants, advanced filters
- ⏳ Family/shared accounts

## Recent key learnings (from Session 8 Sprint A + Ext)

1. **Silent `ReferenceError`s in React event handlers are the worst latent bug class** — build passes, app doesn't crash, failing feature just silently does nothing. Session 7 pure-move refactor introduced 2 of these because setter closures weren't rewired. Only real-device usage + careful audit catches them.
2. **`useRef` + `useState` for click guarding — they solve different problems and both are needed.** Ref blocks synchronous re-entry (tap-2 in the same event-loop tick before React re-renders). State drives the `disabled={busy}` visual feedback. Neither alone is enough.
3. **fetchWithTimeout is mandatory infrastructure for any AI-backed app** — Cloudflare Workers hang, Gemini times out, Claude backs off, mobile networks drop. "Infinite spinner" is the worst user-facing failure mode.
4. **`.env.local.bak` is a `.gitignore` glob trap** — the scaffold `.env.local` pattern doesn't match `.env.local.bak`. Always use canonical Vite patterns (`.env`, `.env.local`, `.env.*.local`, `*.env.bak`).
5. **Parent-side wrapper bugs are invisible to the modal** — a `() => { save(); close(); }` parent wrapper swallows the Promise, making the modal's visual busy state flash for 0ms even though the ref guard still works. Fix the wrapper, not the modal.
6. **Scope discipline across sweeps** — each codebase-wide sweep (security, Sprint A, click-guard, fetchWithTimeout, Sheet) landed as its own atomic commit with per-step verification. No cascading refactors. Easier to review, safer to merge, simpler to revert.
7. **`git filter-repo` to scrub leaked secrets is usually the wrong call** — for a rotated key, the dead string in history is harmless. History rewriting breaks every clone and invites more problems than it solves.
8. **When you find one instance of an anti-pattern, grep the whole codebase** — 9 of 11 action buttons had the zombie-modal click-guard gap. 4 of 5 fetch sites had the timeout gap. Patterns repeat.

### Session 6-7 learnings still apply
- **JS regex `\b` doesn't fire between digits and letters** — "50thb" failed `\bthb\b`. Drop `\b` on short currency codes.
- **Display-layer sorting beats state-layer sorting** — Supabase + optimistic adds create unreliable array order. Always sort at render time.
- **Cross-session dedup is cheap client-side** — Set of existing tx hashes, no schema change needed
- **Heatmaps need context** — colored squares alone aren't useful; pair with summary + above-avg indicators + top days list
- **Pure-move refactors are still risky** — Session 7 refactored 5480 → 345 lines with zero intentional logic changes and still shipped 2 silent ReferenceErrors. Grep every setter name in the extracted file.

### Older Session 4-5 learnings still apply
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
