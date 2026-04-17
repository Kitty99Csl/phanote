# Session 14 Summary — Sprint D Close

**Duration:** April 17, 2026
**Model:** Claude Opus 4.7 (fresh chat, new model)
**Commits shipped:** 5 (4 code + 1 docs)
**Status:** Sprint D formally closed. Ready for Sprint E (observability) next session.
**Branch:** `main` (direct)

## What happened

Session 14 opened with `index-dqQyI8JV.js` in production and Sprint D at ~95% complete. Remaining work: StreakModal i18n, GoalModal i18n, Settings reorganization (5 sections), and the EditTransactionModal silent-return fix carried from Sprint D-ext backlog.

Five commits shipped. Four changed the production bundle, each verified via Rule 11. The fifth is a new docs pattern (provisional translation tracking) that seeds the Sprint H Language Strings Admin Panel with a pre-loaded work queue.

## Commits

| # | Commit | Type | What | Hash change |
|---|---|---|---|---|
| 1 | `155d09c` | feat | i18n StreakModal + StreakBadge + streak.js (32 keys) | `dqQyI8JV` → `BiywABVn` |
| 2 | `e7fe1a7` | feat | i18n GoalModal (5 new + 6 reuses) | `BiywABVn` → `DNy6ACqS` |
| 3 | `858d3a0` | feat | Settings 7→5 reorganization + obsolete key purge | `DNy6ACqS` → `CtlS9t5-` |
| 4 | `391d63e` | fix | EditTransactionModal toast on invalid amount | `CtlS9t5-` → `B3mY1iQw` |
| 5 | `14409d6` | docs | I18N-PROVISIONAL-KEYS tracking file | — (docs-only) |

## 1. `155d09c` — StreakModal + StreakBadge + streak.js i18n

Largest commit of the session. 28 hardcoded strings identified across 3 files plus the `streakDayAbbrev` single-char pill abbreviation flagged by CC during implementation (32 keys total × 3 langs = 96 entries).

Two architecture decisions landed here:

- **LEVELS[] kept as English identifiers** in `streak.js`. StreakModal calls `t(lang, "level" + level.label)` to resolve. Keeps `streak.js` testable without i18n context.
- **Bonus toast returns `{ key, params }`** instead of a formatted string. App.jsx formats at display time. Cleanly separates streak business logic from presentation concerns.

Level names extracted directly from Session 13's `guideStreaksTipLevels` concatenated string — zero retranslation, preserves Speaker-approved `ມາສເຕີ້/มาสเตอร์` (Master loanword).

Speaker's native-intuition edits on the 21 streak keys materially improved the translations — notably fixing `streakMilestones` (Lao had been "important note"), softening `streakEarnXp` from "ຫາ" (find) to "ຮັບ" (receive), and adding the "ອີກ/อีก" particle flow in `streakPctToLevel` and `streakXpNeeded` for natural conversational rhythm.

## 2. `e7fe1a7` — GoalModal i18n

55% reuse ratio (6 of 11 strings reused from existing goal/edit keys). Only 5 new keys added. Single file edit — `lang` was already destructured from `profile` via a dead-code path and just needed the `t` import wired.

Validation note from investigation: the original Session 12 audit conflated EditTransactionModal with GoalModal's validation, claiming a name+amount check. GoalModal does have that three-condition check at line 43; EditTransactionModal does not. This scope clarification set up the narrower commit #4 below.

## 3. `858d3a0` — Settings 7→5 reorganization (closes audit P2 #7)

Two structural changes + one obsolete key purge:

- Merged "Help" + "Account" sections into single "Help & Account" header. Guide + Log Out buttons preserved, still in separate cards for visual rhythm.
- Renamed "Statement Tools" → "Tools" (future-proof for CSV export, recurring, bulk delete as they ship).
- Deleted duplicate Danger Zone "Reset all data" button — pre-commit verification confirmed it called the same `onReset` handler as the Account Log Out (not a latent bug, just UI duplication).

Obsolete `statementToolsSection` i18n key removed. Side-effect fix: the rename surfaced a missing TH translation on the old key that had been silently falling back to EN in production.

Props signature preserved (10 props in, 10 props out). Zero call-site changes in HomeScreen.

## 4. `391d63e` — EditTransactionModal silent-return toast

Scope landed narrower than Session 12 audit suggested. EditTransactionModal's save handler validates only the amount (not the name — description falls back to original on empty, which is graceful behavior). Single validation branch: `if (!a || a <= 0) return;`

Replaced silent return with `showToast(t(lang, "editTxErrorBadAmount"), "error"); return;`. Uses existing Session 10 toast infrastructure. One new i18n key, single message covers all three failure modes (empty, zero, negative) — split into two messages would give the user precision they don't need.

Closes the last known silent-return UX gap in the app.

## 5. `14409d6` — I18N-PROVISIONAL-KEYS.md tracking file

New pattern. As Session 14 shipped, each translation was tagged 🟢 (confident) / 🟡 (provisional) / 🔴 (placeholder) during chat review. The 🟡 and 🔴 entries now live in `docs/decisions/I18N-PROVISIONAL-KEYS.md` as the pre-loaded work queue for the Sprint H Language Strings Admin Panel.

When the admin panel ships in Sprint H, Wife (or any admin) opens this file, filters the `translations` table by the listed keys, and tunes inline — no redeploy required.

15 provisional entries logged for Session 14. Protocol established for all future i18n sessions: tag in chat, roll 🟡/🔴 into this file at commit time, cap the file at ~50 active entries before requiring a tuning pass.

## Rule 11 compliance

Every bundle-changing commit verified:

| Stage | Hash |
|---|---|
| Session start | `index-dqQyI8JV.js` |
| After StreakModal | `index-BiywABVn.js` |
| After GoalModal | `index-DNy6ACqS.js` |
| After Settings | `index-CtlS9t5-.js` |
| After EditTx toast | `index-B3mY1iQw.js` |

5 distinct hashes, 4 bundle changes. Zero silent deploy failures.

## Session 14 totals

| Metric | Value |
|---|---|
| Commits | 5 (4 code + 1 docs) |
| New i18n keys | 39 (32 streak-family + 5 goal + 2 settings) |
| Obsolete keys removed | 1 (statementToolsSection) |
| New i18n entries (× 3 langs) | ~115 |
| Reused keys | 8 (6 goal + 2 streak/settings patterns) |
| Silent-return UX gaps closed | 1 |
| Settings sections | 7 → 5 |
| Audit findings closed | 2 (P1 #3 + P2 #7) |
| Bundle rebuilds | 4 |
| Rollbacks | 0 |
| Scope creeps | 0 |

## Audit ledger post-Session-14

| # | Finding | Priority | Status |
|---|---|---|---|
| 1 | Derived-password auth | P0 | Closed (770af58, Session 11) |
| 2 | Statement import end-state | P1 | Open (backlog) |
| 3 | i18n hardcoded strings | P1 | **Closed (Session 14)** |
| 4 | Modal/gate patterns | P1 | Closed (Session 10) |
| 5 | Error handling | P1 | Closed (Session 10) |
| 6 | Analytics memoization | P2 | Open (backlog) |
| 7 | Settings overload | P2 | **Closed (Session 14, `858d3a0`)** |
| 8 | Native dialogs | P1 | Closed (Session 10) |

**0 P0, 1 P1 open, 1 P2 open.** Down from 2 P1 + 2 P2 at Session 13 close.

## Lessons learned

1. **Native-speaker override is non-negotiable even on "provisional" translations.** Speaker's edits to the 21 streak keys weren't cosmetic polish — the original Lao `streakMilestones` literally meant "important note" and would have shipped wrong. The 🟢/🟡/🔴 tagging system helps me calibrate confidence, but it doesn't replace human review on native-script output.

2. **Audit descriptions drift over sessions.** The Session 12 audit description of EditTransactionModal's validation was accurate when written but matched GoalModal's shape, not EditTransactionModal's, by the time Session 14 implemented. Always re-investigate before implementing, even for "known" backlog items. CC caught this by reading the actual handler instead of trusting the audit line reference.

3. **Pre-commit verification of "duplicate" UI elements matters.** The Settings reorg could have deleted the Danger Zone Reset button naively. Verifying `onReset` behavior in `App.jsx` first confirmed it was truly a duplicate, not two buttons that were supposed to differ but got wired to the same handler by accident.

4. **Provisional translation tracking closes a real gap.** Sprint H is months away. Without `I18N-PROVISIONAL-KEYS.md`, Wife's first admin-panel session would start with a scavenger hunt for "what needs tuning." Now it starts with a pre-filtered queue. Designing-for-future-context during present work is a small tax that saves large tax later.

5. **Small i18n commits are lower risk than batched ones.** Session 13 shipped GuideScreen (66 keys) as one commit with a 5-batch review protocol — correct for that scale. Session 14 shipped four separate i18n/reorg commits — correct for this scale. The "which protocol" decision is a function of commit size, not a project-wide standard. Keep using judgment per commit.

6. **`streakDayAbbrev` is a model for scope-exception handling.** CC found an existing `day` key that would have overflowed the 24px pill in StreakBadge, flagged it during implementation instead of silently dropping the bug, added one extra key with justification, reported it in the commit summary. That's the exact shape of a legitimate mid-commit scope exception: flagged, justified, minimal, bundled in the same commit.

## Post-state

| Item | Value |
|---|---|
| Local `main` | `14409d6` |
| `origin/main` | `14409d6` |
| Production bundle | `index-B3mY1iQw.js` |
| i18n keys total (approx) | ~390 |
| Sprint D | **100% closed** |
| Sprint E | Not started (Session 15 kickoff) |
| Worker | `api.phajot.com` v4.4.0, unchanged |
| Working tree | clean |

## What's next (Session 15)

Sprint E — Observability. Unlocks Tower. Priorities from `TOMORROW-START-HERE.md`:

1. Sentry (frontend + worker) — ~30 min
2. `ai_call_log` table with OCR-specific columns per OQ-015 — ~1h
3. Worker `/health` enrichment — ~30 min
4. `tower_admin_reads` audit table — ~15 min
5. `docs/tower/` folder skeleton — ~30 min
6. First 2 Claude Projects (Vanguard + Osiris) — ~1h
7. External uptime monitor — ~15 min

**Estimated Session 15: 3-4h.** Ships the observability substrate that Sprints F-J build Tower on top of.

## Wife review items carried forward

From Session 14:
- 15 provisional translation keys in `docs/decisions/I18N-PROVISIONAL-KEYS.md`
- Manual phone test of EditTransactionModal toast (steps a-f in Session 14 chat handoff — verify Lao toast appears on invalid amount)

From Sessions 12-13 (still pending):
- Thai `งบ` (nav) vs `งบประมาณ` (guide topics) standardization check
- Thai `อยู่ในเส้นทาง` (Advisor Q2) — consider `ตามแผนไหม` or `ไปได้ดีไหม`
- `ມາສເຕີ້/มาสเตอร์` (Master) resonance check in streak context (now live in StreakModal in addition to GuideScreen)

None are blocking. All feed Sprint H's admin-panel queue.

---

## Sprint E — Observability Substrate (Session 14 afternoon)

Sprint E built the observability floor Phajot needs before public
launch: error tracking (Sentry), AI call logging (ai_call_log),
external uptime monitoring (UptimeRobot), and a structured /health
endpoint. Plus the Tower Sentinel documentation skeleton that
future Sprint F (Tower Lobby) will consume.

### Commits

| # | Item | Commit | Notes |
|---|---|---|---|
| 1 | docs/tower Sentinel skeleton | `0ce4820` | 7 STATUS.md files, Vanguard SPRINT-CURRENT.md |
| 2 | Migration 006 + Rule 19 + wrangler route | `caa4b1a` | 3 check constraints added, idempotent backfill for observability schema drift. New Rule 19: schema changes originate from migration files. |
| 3 | AI call instrumentation | `e21d7d2` | callClaude wrapper, logAICall helper, 5 endpoints instrumented. Worker 4.4.0 → 4.5.0. |
| 4 | /health endpoint enrichment | `67e8859` | Nested JSON, status=ok\|degraded\|error, Supabase ping (60s cache), AI stats from ai_call_log. Worker 4.5.0 → 4.6.0. |
| 5a | Frontend ErrorBoundary | `cbc8620` | Celadon-branded fallback UI, lo/th/en, window.location.reload(). Bundle B3mY1iQw → CLP6JP-c. |
| 5b | Sentry wiring (both sides) | `4ba9788` | @sentry/react + @sentry/cloudflare. Worker 4.6.0 → 4.7.0. Bundle CLP6JP-c → BJCgj50K. |
| 6 | UptimeRobot + Banshee STATUS | `6fdd24e` | 2 monitors live, status page at stats.uptimerobot.com/FbQp9qBnJr. |
| 7 | Claude Projects (Vanguard + Osiris) | pending | Scheduled for Speaker immediately after this docs wrap commit. |

### Discoveries during Sprint E

**Schema drift:** Migration 006 was NOT a greenfield create — the
observability schema already existed in Supabase from a prior
session's direct SQL Editor paste. This was discovered via
diagnostic queries during Item 2 and motivated the creation of
Rule 19. The 3 phantom tables (user_sessions, user_feedback,
admin_logs) flagged in the migration's drift diagnostic also
already exist without migration files — backlog item for
Session 15+ to backfill.

**AI cost data (rough estimate):** First /parse call logged at
$0.000087 USD. At ~100 calls/user/day that's ~$0.26/user/month in
AI cost. Well under 5% of Pro revenue ($2.99/mo). Pricing version
tagged as `v1-draft-2026-04-17` — Sprint E-ext will verify against
Anthropic + Google billing dashboards and bump to
`v2-verified-YYYY-MM-DD`.

**Worker robustness is a testing annoyance:** Forcing worker
errors for Sentry verification was hard because the handlers
catch everything gracefully. Sentry was passively verified instead
(deploy clean, secret set, wrapper active, no leak). Real errors
will populate Sentry over time.

**Sentry onboarding wizard is sticky:** Several minutes lost to
Sentry's "waiting for first event" UI not updating even after
events were confirmed arriving via Network tab. Fix: navigate
directly to /issues/?project=... URL instead of following the
onboarding flow.

**Cloudflare Workers per-isolate cache:** /health's 60s Supabase
ping cache works within a single warm isolate but different
requests often land on different isolates (low traffic = cold
starts). Acceptable at current scale (~288 UptimeRobot pings/day
= negligible DB load). Workers KV or Durable Objects would fix
it properly — deferred to Sprint K+ if needed.

### Known gaps after Sprint E (deferred to Sprint E-ext or Sprint F)

1. `user_id` + `plan_tier` in ai_call_log are null/'free'
   placeholders. Real auth context threading deferred.
2. AI pricing numbers are rough estimates. Verify against billing
   dashboards and bump PRICING_VERSION.
3. 3 phantom tables (user_sessions, user_feedback, admin_logs) need
   migration backfills (migration 007 candidate).
4. DEPLOYED_AT constant in worker is manually updated. Automate
   via GitHub Action or wrangler hook.
5. UptimeRobot email alerts only. Install mobile app for push,
   or switch to Better Stack if webhooks become essential.
6. Tower Lobby (Sprint F goal) will consume /health and
   ai_daily_stats. Matview hasn't been populated yet (runs
   nightly at 02:00 UTC — first real data lands tonight).
7. Sentry release tracking uses 'unknown' — Sprint E-ext: inject
   VITE_COMMIT_SHA at build time via CF Pages env or GitHub Action.

### Rule 19 (new this sprint)

All database schema changes must originate from a migration file
in supabase/migrations/NNN_*.sql. Emergency ad-hoc SQL Editor
edits require same-session backfill. Migration 006 itself was
the backfill for existing observability drift. See CLAUDE.md for
full rule text.

### Translation key backlog (🟡 provisional)

The `errorBoundaryMessage` Lao string ("ມີບັນຫາເລັກນ້ອຍ
ບໍ່ຕ້ອງກັງວົນ ຂໍ້ມູນຂອງທ່ານຍັງປອດໄພ") is Speaker-reviewed but
flagged for Sprint H admin panel. Already in
docs/decisions/I18N-PROVISIONAL-KEYS.md.

### Session 14 final state

- Commits: 12 (5 Sprint D close + 7 Sprint E through Item 6)
- Production: app.phajot.com at index-BJCgj50K.js (commit 4ba9788),
  worker api.phajot.com at v4.7.0
- Rule 11 verified on all 4 bundle rebuilds
- Worker deployed 4x during Sprint E: 4.4.0 → 4.5.0 → 4.6.0 → 4.7.0
- New Sentry events received: 2 (frontend verification test), 0 worker events
- UptimeRobot: both monitors reporting 100% uptime
- Zero rollbacks, zero production incidents

### Next session

Session 15 begins with Sprint F — Tower Lobby. Sprint F's goal:
build a minimal admin-only viewer that reads /health +
ai_daily_stats + recent Sentry issues and displays them in a
single dashboard. Admin access gated via RLS + is_admin flag
(schema work). Expected scope: ~4-6 items, ~1 day.
