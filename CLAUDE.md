# CLAUDE.md — Phajot project context

> **Status:** Current source of truth (operating rules + sprint context)

## Project
Phajot (ພາຈົດ) — multi-currency personal finance PWA for Laos (LAK, THB, USD). Solo developer: Kitty. For personal + family use first, public launch later.

- Repo: Kitty99Csl/phanote (repo name intentionally preserved post-rename)
- Main branch: main
- Working branch: main
- Live: app.phajot.com, api.phajot.com, phajot.com (legacy phanote.com domains 301 redirect)

## Second product: Tower

Phajot now has a sister product called **Tower** — an internal operator dashboard for Kitty (the Speaker) to oversee Phajot's health, chat with AI departments (Sentinels), investigate users, and plan work. Tower is being built in Sprints F–J (Sessions 14–20). Before Tower can be built, Sprints B, C, D, and E must ship the prerequisites.

- **Domain:** `tower.phajot.com` (live — Sprint F, Session 15)
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
- Frontend: React 19 + Vite 8, src/App.jsx is **432 lines** (after Session 7 refactor from 5,480 lines, grew in Sprint C auth wiring; thin root shell, logic lives in src/lib/, src/hooks/, src/components/, src/modals/, src/screens/)
- DB: Supabase (Singapore)
- Worker: Cloudflare Workers at workers/phanote-api-worker.js (v4.7.0), name "phanote-parser" (filename preserved post-rename)
- AI parse: Gemini 2.5 Flash
- AI advise: Claude Haiku 4.5
- AI OCR: Gemini 2.5 Flash Vision
- Worker endpoints: /parse, /advise, /ocr, /parse-statement, /monthly-report, /health
- Deploy worker: npx wrangler deploy (requires CLOUDFLARE_API_TOKEN)
- Snapshot for chat Claude: docs/snapshots/phanote-api-worker.js (read-only, refresh at session end)

## Development environment notes

**Cloudflare Pages `.pages.dev` URLs are geo-blocked in Laos.** Default CF Pages URLs (`<project>.pages.dev`) cannot be used as Speaker-reachable staging/preview URLs. All CF Pages projects intended for Speaker's iteration must be accessed via custom subdomain on the phajot.com zone (e.g., `tower.phajot.com`, `app.phajot.com`, future `staging.phajot.com`). Cloudflare automatically CNAMEs custom subdomains when you own the underlying domain. Identified: Session 15, 2026-04-18.

## Required reading before editing

1. `project_codex.md` (the bible — design rules, UX, architecture)
2. `docs/ROADMAP-LIVE.md` (living roadmap — updated every session per Rule 18)
3. `docs/tower/CHARTER.md` (Tower's mission and structure)
4. `docs/tower/ROADMAP.md` (Tower sprint plan, Sprints B→K)
5. `docs/patterns.md` (optional context — working set of development patterns, soft guidance not rules)
6. `docs/session-ritual.md` (optional context — CC-executable opening/closing ritual templates)

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
18. **Update `docs/ROADMAP-LIVE.md` in every session wrap-up commit.** Move completed items to done, update commit hashes, update Current State section, update audit tracker. This is the living roadmap — it must always reflect the true project state.
19. **Database schema changes must originate from a migration file.** All schema changes to Supabase (new tables, columns, indexes, policies, cron jobs, materialized views) must first exist as a migration file in `supabase/migrations/NNN_description.sql` and be committed to git. Apply via `supabase db push` or by pasting the file contents into Supabase SQL Editor. Never paste ad-hoc SQL into the SQL Editor without the backing migration file. Emergencies excepted: if a production hotfix requires direct SQL Editor intervention, the same session must backfill a migration file documenting the change before work ends. Session 14 introduced this rule after discovering observability schema drift (migration 006 backfill). Direct SQL Editor edits bypass git history and make schema drift invisible until someone diffs production against migrations.
20. **Any sprint close commit must update both `docs/ROADMAP-LIVE.md` and the relevant `SPRINT-CURRENT.md` in the same commit. A sprint is not considered closed until both are updated.** This rule was introduced Session 15 after Vanguard caught that Session 14's commit 036b617 updated Sprint E's table in ROADMAP-LIVE.md but forgot the top-level state banner, producing stale-state drift that required a follow-up fix in 2cd5690. Partial updates across multiple commits create exactly this bug class. Future sprint-close commits must be rejected (by CC or Speaker review) if they touch SPRINT-CURRENT.md but not ROADMAP-LIVE.md, or vice versa.
21. **Reality-check before targeted edits.** When editing a file based on an external description of its contents (audit findings, memory, a spec from another Claude session), first read the current file state to verify the described contents match reality. Audits from memory are hypotheses, not facts. Session 15 proved this pattern twice: Codex's CLAUDE.md audit claimed `session-4` branch references that had already been fixed, and a Tower README link to `SPRINT-C-PLAN.md` was written from memory — the file doesn't exist. In both cases, CC's file read caught the error before a bad commit. Cost: 30 seconds of file reads. Benefit: avoiding wrong edits, broken links, and duplicated rules.

## Known bugs to fix
- (none active — Session 9 RLS hardening + deploy pipeline fix shipped, adversarially verified)

## Current state

For current session, sprint progress, commit hashes, and live infrastructure state, see `docs/ROADMAP-LIVE.md`. This file (CLAUDE.md) holds operating rules, stack info, and environment notes only — not operational state. Rule 20 codifies this separation: live execution truth lives in ROADMAP-LIVE.md and SPRINT-CURRENT.md, not here.

## Recent key learnings

### Session 21.5 learnings (Sprint I.5 hotfix — savePinConfig DB persistence)

- **Supabase JS does NOT throw on data-layer errors.** RLS denials, constraint violations, permission errors — none of them throw. They land in the `{ error }` field of the returned object. Any code that relies solely on `try/catch` for Supabase DB error detection has a latent silent-failure bug. **Always destructure `const { error } = await supabase.from(...)` and check explicitly.** This is the root cause of the R21-13 triple-defect stack.

- **Fire-and-forget IIFE + empty catch + missing response-shape check = invisible failures compound.** Each defect alone is minor; together they create a silent state-corruption bug class. A DB write that appears to succeed (React state + localStorage updated) but actually failed at the DB layer is the worst-case UX: user trusts the app, app betrays them on next session. Audit any `(async () => {...})()` pattern in DB-adjacent code for this triple-defect stack.

- **Optimistic-local-first write ordering with async-DB-second + caller-revert-on-throw is a clean pattern.** User sees instant UI response, DB write awaited separately, caller responsible for reverting local state on failure + showing toast. Best-effort revert via `saveFn(previousValue).catch(() => {})` is acceptable — if revert also fails, `loadUserData` reconciles on next login from the DB's actual state. R21-13 fix applied this pattern across 3 call sites.

- **Trust-mode paste-back catches non-drift concerns quickly.** Speaker flagged a mismatch-path behavior as possible drift during B2 paste-back review. CC traced it to pre-existing Session 7 code — confirmed no drift, avoided false scope creep. Takeaway: when a paste-back reviewer raises a behavioral question, answer with evidence (Read + diff trace) rather than either defending-by-default or over-correcting.

- **Manual smoke testing surfaces product gaps that code review cannot.** R21-14 (password change) and R21-15 (disable owner PIN) both surfaced organically during Phase C when Speaker tried to exercise account-security settings. Code review + paste-back can verify "does my code do what I wrote", but "what features am I missing?" needs user-exercising. Schedule a product-smoke pass per sprint, not just a code-smoke pass.

- **Recovery-handler writes via the same mutation function as Settings, but must not surface DB errors to user.** When two code paths converge on a shared write helper (like `savePinConfig`), they may have different error-surfacing requirements. The Session 21 recovery handler writes locally to sync state, but the worker already wrote the authoritative DB record via service role. A user-facing "save failed" toast in this context would be actively misleading (DB state is correct). Use `.catch(e => console.warn(...))` warn-only pattern. Document the invariant inline.

### Session 21 learnings (Sprint I Part 1 close — Admin-Approved Recovery System)

- **RLS self-reference antipattern (42P17) is a whole bug class.** Any admin policy that EXISTS-subqueries into the same table the policy protects → infinite recursion at query-plan time. Migration 014 shipped an admin-read policy ON `profiles` with `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)` and all four M014 admin policies (plus transitively M009's ai_call_log admin policy) were dead on arrival. Fix: `public.is_admin()` SECURITY DEFINER function. Policies reference the boolean return. No nested SELECT, no recursion. Ship the helper in any future migration that adds admin policies on RLS-gated tables.

- **INSERT RLS evaluates before SELECT query planning.** Session 21 adversarial test probe (a) — attempting INSERT into a table with no INSERT policy — correctly returned the user-facing "violates RLS" error. Probes (b) + (c) — SELECT statements — hit the recursion because RLS eval happens during planning, not before. Rule of thumb: if your only RLS probe is INSERT rejection, you've not exercised the SELECT planner and may have a latent recursion bug that only surfaces on a read. Always run both INSERT and SELECT probes.

- **PostgREST embedded resources can fail with 500 even after `NOTIFY pgrst, 'reload schema'`.** Migration 014 added `user_recovery_state` with an FK to `profiles(id)`. PostgREST should auto-detect the relationship and let `profiles?select=*,user_recovery_state(*)` embed work. In Session 21 smoke testing, this failed 500 in production even after schema reload. Fallback A is the safe pattern: fetch top-level resource first, then parallel per-row followups via explicit calls. 100 subrequests per 50-row query is well under CF paid-plan limits. R21-11 tracks investigation — may require explicit FK-name syntax or a grant that Migration 014 didn't emit.

- **Sequential write + self-healing fail-closed > atomic RPC when partial-failure modes don't leave dangerous intermediate state.** `/recovery/complete-pin-reset` does Step C (write new pin_config) then Step D (clear recovery flags). No atomic transaction across Supabase REST. If Step D fails after Step C: user has working new PIN; next login retries Step D idempotently. Adding a Postgres RPC for true atomicity would be correct but wasn't necessary in Session 21 — the 3 partial-failure modes all self-heal. Always trace through the concrete failure modes before committing to an RPC migration. R21-8 tracks the eventual RPC for Session 22.

- **Trust-summary paste-back on auth-path code catches issues paste-summary alone misses.** Session 21's trust mode required full paste-back for migrations, worker auth helpers, and main-app login-flow changes. This caught: M015 postflight confusion (operator ran comment block instead of DDL — two-attempt apply) + R21-5 pin_config null bypass mental-model issue + loadUserData's `setPinRole(null)` side-effect that would re-lock users post-recovery. Code review on auth-path code is load-bearing; summary mode is for non-security UI work only.

- **"CF Pages serves a different bundle hash than local build" is working-as-designed, not drift.** Session 9 learning restated: CF Pages builds in its own Node/npm env. Commit 3 local build → `index-InDWwRPz.js`; CF Pages production → `index-xMpsmdvy.js`. What matters for Rule 11: production hash ≠ pre-session baseline. Both were true in Session 21, so ship is verified. Don't chase the local hash on production.

- **Large commented postflight blocks in migration files can get mis-applied as DDL.** M015 first apply ran the `/* */` comment block as executable statements (no-op), skipping the actual CREATE FUNCTION + CREATE POLICY section. Second attempt ran Section 1 + Section 2 directly and succeeded. Future migrations should delimit executable DDL from verification comments more clearly — e.g. `-- === END DDL ===` marker or put postflight in a separate `.sql` file entirely.

- **Speaker team is Vanguard + Osiris (2 Sentinels), not the 7-Sentinel roster.** CLAUDE.md brand section lists 7 Sentinels aspirationally; actual live team in Speaker's Claude Projects is Vanguard + Osiris. Session 20 SUMMARY referenced Hawthorne — phantom reference, corrected Session 21 close.

### Session 20 learnings (Sprint H close — Tower UX redesign across all 6 rooms)

- **Design reference packages accelerate redesign massively.** Session 20's `docs/session-20/design-reference/check_tower.zip` contained `Tower Redesign.html` + 6 room JSX files + 7 screenshots. CC ported with adaptations for ES modules + react-router. Without the reference, a full UX redesign would have been 3x slower with more iteration. Prototype > description for complex visual work.

- **`min-w-0` on flex children is critical when wrapping tables inside flex layouts.** Old `ShellLayout` had `overflow-auto` on multiple levels, masking missing `min-w-0` in room containers. New `Shell` properly propagated `min-w-0` from main, exposing the latent bug — Language Strings table rendered with only the TH column visible (CODE/EN/LO collapsed to zero width). Default `min-width: auto` on flex children prevents columns from shrinking below intrinsic content width; when parent narrows, auto-width table columns collapse to zero. Hotfix `dec20c0` added `min-w-0` to LanguageStrings outer container + table wrapper. Future rooms with internal tables MUST add `min-w-0` to room's outermost container and any flex-child wrapping the table.

- **Phased redesign works — each phase shippable if fatigue or quota hits.** Session 20 split into 4 phases (foundation → monitoring rooms → editing room → wrap), each independently mergeable. Phase 1 alone gave a working (degraded) Tower; Phase 2 added primitive ports; Phase 3 the editor surface. The hotfix demonstrated phase isolation works for emergency intervention — stash Phase 2 work tree, commit fix on top of Phase 1, restore Phase 2 work tree. Clean separation kept the hotfix a 2-line diff.

- **Editor surfaces need different typography + density rules than monitoring.** Tower's tactical HUD (mono 11px / 9px) suits at-a-glance dashboards. Sustained editing (10-30 min translation sessions) needs sans-serif body, 15px minimum, generous padding. One-size-fits-all hurt the Language Strings room until Phase 3 redesigned it with Noto Sans Lao/Thai for proper script rendering.

- **Google Fonts CDN acceptable for admin-only surfaces.** Adds 0 bundle cost via external hosting. Trade-off: requires public CDN availability; not appropriate for offline-first user-facing apps. Tower is admin-only operator UI — this trade is fine. Self-hosting Noto Sans Lao + Noto Sans Thai + IBM Plex Sans + IBM Plex Mono would have added ~200KB to a 1-user surface.

### Session 19 learnings (Sprint H-2 close — Language Strings + shared/ extraction)

- **Cross-codebase Vite alias imports are a tree-shaking trap.** `@app → ../src` pulls transitive deps (Supabase client) into the consumer bundle even if only one file is imported. Fix: extract pure data to `shared/` directory with zero imports. Standard monorepo pattern. Session 19 identified this when Tower's Phase 3 import of `@app/lib/i18n` added a duplicate Supabase client (+275KB). Resolved by `shared/i18n-data.js` extraction (−187KB net).

- **For any generated file > ~500 lines, write a generator script instead of inlining via LLM.** CC hit the 32k output token limit mid-session while writing a 425-row SQL seed block. Pattern going forward: write `scripts/seed-*.mjs` (or similar), run it, commit the output. The script is the canonical source; the SQL file is the artifact.

- **"Never committed" is a silent failure mode.** Phase 3 + 3b worked correctly in the working tree but were never staged. CF Pages had nothing to deploy. Symptom: blank Tower page. Diagnosis: `git status` + bundle hash check. Lesson: always verify `git status` before declaring a phase "done." Don't assume the commit happened.

- **shared/ directory convention established.** `shared/` (sibling to `src/` and `tower/`) is the Rule 16-compliant extraction point for code shared between Phajot and Tower. Files in `shared/` must be pure data or pure logic with zero imports from either app. Vite alias `@shared → ../shared` set in both `vite.config.js` files.

- **Migration count is now 013.** Phase 1 shipped Migration 012 (translations table) and Phase 1b shipped Migration 013 (425-row seed).

### Session 18 learnings (Sprint G close + Migration 011 drift reconciliation)

- **Trust-summary mode for non-security file edits.** Paste-back stays mandatory for migrations, auth, worker code, RLS. For React components, docs, configs: summary is sufficient. Speaker confirmed explicitly mid-session. Reduces friction without sacrificing security posture.
- **CC paste output can duplicate content while file on disk is correct.** Before declaring a file broken based on visual output, verify via `wc -l` + `grep -c`. Migration 011 appeared doubled in chat; on-disk file was clean (190 lines, 1 header).
- **Don't pre-fill commit hashes in wrap docs.** Use `[pending]` placeholders, fill after commit runs. Session 18 opened with a fix (e76ff61) for this exact pattern.
- **Third-party iframes fail via X-Frame-Options without browser warning in development.** For every external embed, have a fallback plan before first production deploy. UptimeRobot X-Frame-Options: deny cost ~15 min.
- **When aggregation returns zero, check the join key first.** DB stored `/parse`; client had `parse`. One-character mismatch zeroed all endpoint rows. Verify string equality assumptions at system boundaries before debugging logic.
- **Native observability derived from existing data beats external integration.** "Observed uptime" from ai_call_log shows whether service worked for real users; synthetic pings show only reachability. More honest framing for an operator HUD.

### Session 17 learnings (Sprint F close + Migration 009/010 saga)

- **Postflight must check semantic identity, not just privilege existence.** Session 17's Migration 009 §3 silently failed during apply but postflight passed because it checked `has_table_privilege`, not view definition identity. Upgrade pattern: inspect `pg_views.definition` + column signature. Same family as Session 16's `profiles_policy` vs `profiles_user_access` drift learning. Candidate for `docs/patterns.md` promotion.
- **SQL Editor Select-All before Run is mandatory.** Partial execution silently caused two bugs in Session 17 (Migration 009 §1+§2 re-apply, §3 swallowed error). Always Select-All, then Run.
- **Pre-Session-14 direct-SQL drift was broader than phantom tables.** Session 14 found 3 phantom tables; Session 17 found 1 drift view; Session 18 found admin_user_summary view + 3 stale ai_memory policies + 2 policy naming drifts. Migration 011 closed all. Future: any new schema area should start with a pg_catalog probe.
- **Paste-back-with-file-write.** When CC writes a review-gated file (migration, security-critical component), the write instruction must bundle an immediate paste-back instruction. Summaries don't substitute for verbatim text when the reviewer needs to audit.

### Session 15 learnings (Sprint F start + Cosmodrome visual direction)

- **Reality-check before edits (now Rule 21).** Audits from memory are hypotheses; verify file state before editing. Caught two near-mistakes Session 15. See `docs/patterns.md` for the pattern, `docs/session-ritual.md` for the CC-executable ritual.
- **Mockup-in-chat overstates production feel by ~35%.** Chat widgets are narrow; production browsers are wide. Calibrate accordingly when reviewing mockups.
- **Visual-first before major UI changes.** 3 mockup directions rendered in-chat before Destiny redesign code. Saved ~2 iteration cycles.
- **CC runs reality checks, not Speaker.** Formalized as `docs/session-ritual.md`. Was previously ad-hoc.
- **Tower design system v1 approved.** See `docs/tower/design-system.md`. Dark tactical UI with Phajot identity — not a Destiny reskin.

### Session 9 learnings

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

---

*Last updated: 2026-04-20 (post Session 20 close) · Maintained by Speaker + Chat Claude · Used by Claude Code · For live state see docs/ROADMAP-LIVE.md*
