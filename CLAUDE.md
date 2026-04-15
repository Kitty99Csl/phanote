# CLAUDE.md — Phajot project context

## Project
Phajot (ພາຈົດ) — multi-currency personal finance PWA for Laos (LAK, THB, USD). Solo developer: Kitty. For personal + family use first, public launch later.

- Repo: Kitty99Csl/phanote (repo name intentionally preserved post-rename)
- Main branch: main
- Working branch: main (Session 9 deploy fix + RLS hardening merged 2026-04-14 at `aa78f9e`, no working branch cut)
- Live: app.phajot.com, api.phajot.com, phajot.com (legacy phanote.com domains 301 redirect)

## Second product: Tower

Phajot now has a sister product called **Tower** — an internal operator dashboard for Kitty (the Speaker) to oversee Phajot's health, chat with AI departments (Sentinels), investigate users, and plan work. Tower is being built in Sprints F–J (Sessions 14–18). Before Tower can be built, Sprints B, C, D, and E must ship the prerequisites.

- **Domain:** `tower.phajot.com` (not yet live)
- **Access:** Solo — Speaker (Kitty) only in v1
- **Location in repo:** `tower/` folder (sibling to `src/` and `landing/`)
- **Deployment:** Separate Cloudflare Pages project
- **Single source of truth:** `docs/tower/CHARTER.md`

**The 7 Sentinels** (AI departments, each a separate Claude Project):
- **Sentinel** — Health & Protection (uptime, errors, security)
- **Vanguard** — Product & Sprint Leadership
- **Osiris** — QA (parser accuracy, regression, bug hunting)
- **Banshee** — DevOps & Infrastructure
- **Hawthorne** — Support (user feedback, FAQ)
- **Iron Wolf** — Growth (content, social, launch)
- **Ikora** — Archivist (legal, decisions, memory)

**The Speaker** — Kitty, the human who decides. All Sentinels report to the Speaker.

See `docs/tower/CHARTER.md` for the full mission and `docs/tower/ROADMAP.md` for the sprint plan.

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

1. `project_codex.md` (the bible — design rules, UX, architecture)
2. `PHAJOT-PROJECT.md` (feature scope)
3. `PHAJOT-ACTION-PLAN.md` (screen-by-screen plan)
4. `docs/tower/CHARTER.md` (Tower's mission and structure)
5. `docs/tower/ROADMAP.md` (current sprint plan, Sprints B→K)
6. `docs/tower/SPRINT-B-PLAN.md` (if working in Session 10)
7. `docs/tower/AUTH-DESIGN.md` (if working in Session 11 Sprint C)

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
11. **After merging user-visible changes to main, always `curl` production to verify the bundle hash changed.** "Merged to main" is NOT "shipped to users." CF Pages can fail silently and keep serving the previous build. Run: `curl -s https://app.phajot.com/ | grep -oE 'index-[A-Za-z0-9_-]+\.js'` and confirm the hash differs from what the previous session saw. Do not claim "shipped" until the hash is confirmed different.
12. **`.nvmrc` must pin exact Node version** (e.g. `24.13.1`, not just `24`). Lockfile must be regenerated under the same Node version CF Pages uses. Verify with `npm ci` (strict mode, same as CF Pages) before pushing lockfile changes. Major-version-only pinning caused 2 days of silent deploy failures in Session 9 (Node 24.11.1 vs 24.13.1 npm resolver drift).
13. No console.log with sensitive data
14. Ask Kitty before architectural decisions. Don't guess.
15. **No hardcoded user-facing strings.** All text shown to users must go through `src/lib/i18n.js` with keys for `lo`, `th`, and `en`. Sprint D enforces this retroactively; new code must follow it immediately. Hardcoded strings fail code review.
16. **Tower code lives in `tower/`, Phajot code lives in `src/`.** These are separate Vite apps in the same repo. They share `supabase/migrations/`, `docs/`, and `CLAUDE.md`, but do not import from each other. Never let a Phajot component import from `tower/`, and never let a Tower component import from `src/` — extract to `shared/` if needed.
17. **Tower is a viewer, not a writer.** Tower v1 can read everything and write almost nothing. Any write privilege must be explicitly discussed with the Speaker before being added. Default to read-only for new Tower features.

## Known bugs to fix
- (none active — Session 9 RLS hardening + deploy pipeline fix shipped, adversarially verified)

## Current state: Session 9 complete, Sprint B starting Session 10

**Session 9 shipped (April 14, 2026)** — CF Pages deploy pipeline fix + RLS hardening. See `docs/session-9/SUMMARY.md`, `docs/session-9/RLS-HARDENING.md`, `docs/RISKS.md`.

**Session 10 is Sprint B** — the first sprint of the Tower roadmap. Before Tower can be built, 4 prerequisite sprints must complete:
- **Sprint B (Session 10)** — Trust & safety round 1: parent wrappers, error toasts, RLS cleanup, Sheet migration. See `docs/tower/SPRINT-B-PLAN.md`.
- **Sprint C (Session 11)** — Real auth, schema drift captured, native dialogs replaced. See `docs/tower/AUTH-DESIGN.md`.
- **Sprint D (Session 12)** — i18n marathon + Settings reorganization.
- **Sprint E (Session 13)** — Observability floor (Sentry, AI cost log, `/health` enrichment, `docs/tower/` skeleton). **This sprint is what unlocks Tower.**

**Sprint F (Session 14) onward** builds Tower itself, one room per session through Session 18.

**Sprint K+ (Session 19+)** is public launch readiness — landing page rewrite, Pro gating, PDPA, LINE OTP, payments, LINE bot.

See `docs/tower/ROADMAP.md` for the full timeline.

## Recent key learnings (from Session 9)

1. **"Merged to main" ≠ "shipped to users".** 8 commits sat on `origin/main` for 2 days while CF Pages silently failed every build and kept serving the 2-day-old bundle. No notification, no dashboard warning visible without explicitly opening the Deployments tab. Always verify production bundle hash after a user-visible merge.
2. **Node minor version drift propagates through the bundled npm.** `.nvmrc = 24` let CF Pages auto-resolve to 24.13.1 while Codespace was on 24.11.1. The minor bump shipped a new npm (11.6.2 → 11.8.0) which writes more `@emnapi` optional-dep entries in the lockfile. `npm ci` on the old lockfile passed locally, failed on CF Pages.
3. **Three-layer Node pinning is belt-and-braces, not redundant.** `.nvmrc` (exact), `package.json` `engines` field, and regenerated lockfile each guard a different failure mode. Remove any one and the failure reopens.
4. **`USING(true)` is the worst shape of an RLS policy.** Looks like a policy, shows up in `pg_policies`, makes the table look protected. Allows everyone to read everything. Only caught by reading every policy's `qual` column during an audit. Session 9 found this on `ai_memory`.
5. **Adversarial SQL in the production database is the strongest RLS test.** `SET LOCAL role = 'authenticated'; SET LOCAL request.jwt.claims = '{"sub":"..."}'` impersonates a real user's auth.uid() resolution and proves policy enforcement end-to-end in under a minute. See `docs/session-9/RLS-HARDENING.md` for the template.
6. **Empty commits are legitimate diagnostic tools.** The `741ae93` webhook probe was essential to isolate the failure to the build step rather than the webhook. Don't be afraid to ship zero-change commits when the goal is to probe the pipeline.

### Session 8 Sprint A + Ext learnings still apply

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
