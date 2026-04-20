# PHAJOT — Live Roadmap

> **Status:** Current source of truth (live roadmap, updated every session wrap-up)

> Last updated: 2026-04-20 (Session 21.5 close — Sprint I.5 CLOSED; Sprint I.6 inserted for R21-14 + R21-15 bundle)

## Current State
- **Active sprint:** I.5 CLOSED 2026-04-20 (Session 21.5 — R21-13 `savePinConfig` PIN persistence HIGH fix). Sprint I.6 next (R21-14 + R21-15 account security settings cluster), then Sprint I Part 2 Tower Room 6 UI (Session 22).
- **Session 21.5:** closed this commit · Session 21.6 next: R21-14 password change + R21-15 disable owner PIN (bundled as "account security settings gap" cluster, ~45-60 min target)
- **Production hash (Phajot):** index-CQswCaAm.js (CF Pages production post-R21-13 fix; flipped from Session 21 close baseline index-xMpsmdvy.js). Rule 11 verified.
- **Tower bundle:** 890.55KB raw / 256KB gzip — `index-DJwN4vkN.js` (unchanged — no Tower work across Session 21 or 21.5).
- **Worker version:** 4.8.1 (unchanged since Session 21 Commit 2).
- **Latest commit:** `<this wrap>` (Session 21.5 wrap — docs atomic per Rule 20)
- **Next action:** Session 21.6 opening per docs/session-ritual.md; lock 5 design questions at Phase A; implement R21-14 (password change) + R21-15 (disable PIN) bundled; smoke + commit + wrap.
- **Notable milestone:** Sprint I.5 CLOSED — R21-13 HIGH fix shipped and smoke-verified against production Supabase. Triple-defect stack in `savePinConfig` (fire-and-forget IIFE + catch {} + missing `{ error }` shape check) resolved. Unblocks public launch for PIN-related concerns. Organic Phase C discovery surfaced R21-14 + R21-15 (Session 21.6 scope).

## Sprint Progress

### Sprint B — Trust & Safety Round 1 (Session 10, Apr 15)
| # | Commit | What | Hash |
|---|--------|------|------|
| 1 | 6b4911f | Parent-wrapper sweep (5 sites) | CZZVjtlT |
| 2 | 2e99fad | Toast system | CiaE2sAV |
| 3 | 05f8f7d | Sheet migration (3 modals) | CewyGnUw |
| 4 | 8f79045 | Sprint B wrap-up docs | — |
| 5 | 2ac2897 | Schema capture (004) | — |
| 6 | b597bc5 | Close schema drift risk | — |
| 7 | b6b2598 | Native dialog replacement | BeOPC5lm |
| 8 | ea26479 | Close 3 audit P1 findings | — |
**RLS:** All 7 tables adversarially verified
**Status:** COMPLETE

### Sprint C — Auth Replacement (Session 11, Apr 16)
| # | Commit | What | Hash | Status |
|---|--------|------|------|--------|
| 1 | 59f35be | Deploy-verify + wife protocols | — | Done |
| 2 | 53208a9 | legacy_auth migration (005) | — | Done |
| 3 | c3d4a24 | Auth i18n keys | DiF26egM | Done |
| 4 | 45162b0 | auth.js helpers | — | Done |
| 5 | 45db331 | MigrationScreen component | — | Done |
| 6 | 770af58 | LoginScreen rewrite + App.jsx | Cz7dMZg6 | Done |
| 7 | 8be34f5 | PinLock + migration flicker hotfix | CEFkIaIU | Done |
**Deploy-verify:** Tests A/B/C passed on phone + desktop
**Status:** COMPLETE

### Sprint D — i18n + Settings (Sessions 12-13, Apr 16+)
| # | Commit | What | Hash | Status |
|---|--------|------|------|--------|
| 1 | 932a8bc | Delete signInWithPhone dead code | — | Done |
| 2 | c3b74a0 | Namespace phanote_pins per-user | BkevNGeM | Done |
| 3 | 6dcb578 | i18n LoginScreen (3 strings) | — | Done |
| 4 | e0804ef | i18n PinLock (8 strings + lang prop) | — | Done |
| 5 | b5cd68b | i18n OnboardingScreen (4 strings) | — | Done |
| 6 | 0695707 | i18n SettingsScreen (23 strings) | BLP-ChCs | Done |
| 7 | 61402e5 | i18n QuickEditToast (1 string) | — | Done |
| 8 | dcfb87f | i18n AddSavingsModal (4 strings + lang prop) | — | Done |
| 9 | 98a9648 | i18n WalletCards (2 strings, zero new keys) | — | Done |
| 10 | fe02751 | i18n BudgetScreen + GoalsScreen (6 strings) | — | Done |
| 11 | 7ceb361 | i18n SetBudgetModal (7 strings, 3 reused) | — | Done |
| 12 | 17fae99 | i18n EditTransactionModal (9 strings, 3 reused) | oPuRioVP | Done |
| 13 | 6dbd012 | Consolidate decisions folder | — | Done |
| 14 | 44bad73 | i18n StatementScanFlow + 4 Thai fills | BJD95Wbr | Done |
| 15 | c10130f | i18n AnalyticsScreen + locale fix | DmeXjngF | Done |
| 16 | 86ccb94 | PIN UX clarity explainer | BG1Hl7nq | Done |
| 17 | 1109ae1 | i18n ProUpgradeScreen (25 keys) | C-_BiQBs | Done |
| 18 | e94d88f | i18n GuideScreen (66 keys, largest commit) | dqQyI8JV | Done |
| 19 | 155d09c | i18n StreakModal + StreakBadge + streak.js (32 keys) | BiywABVn | Done |
| 20 | e7fe1a7 | i18n GoalModal (5 new + 6 reuses) | DNy6ACqS | Done |
| 21 | 858d3a0 | Settings 7→5 reorganization | CtlS9t5- | Done |
| 22 | 391d63e | EditTransactionModal silent-return toast (Sprint D-ext) | B3mY1iQw | Done |
| 23 | 14409d6 | I18N-PROVISIONAL-KEYS tracking file | — | Done |
**Progress:** ~210 strings i18n'd across 18 screens/components + 2 infra cleanups. All production-visible screens and modals done.
**Status:** COMPLETE ✅

### Sprint E — Observability (Session 14) — UNLOCKS TOWER

| Item | Status | Commit | Notes |
|---|---|---|---|
| 1. Tower Sentinel skeleton | ✅ | 0ce4820 | 7 STATUS.md files |
| 2. Migration 006 + Rule 19 + wrangler route | ✅ | caa4b1a | Schema drift reconciliation |
| 3. AI call instrumentation | ✅ | e21d7d2 | 5 endpoints logged |
| 4. /health enrichment | ✅ | 67e8859 | Worker v4.6.0 |
| 5a. ErrorBoundary | ✅ | cbc8620 | Lo/th/en branded fallback |
| 5b. Sentry wiring | ✅ | 4ba9788 | Worker v4.7.0, bundle BJCgj50K |
| 6. UptimeRobot | ✅ | 6fdd24e | stats.uptimerobot.com/FbQp9qBnJr |
| 7. Claude Projects (Vanguard + Osiris) | ✅ | 2cd5690 | SPRINT E CLOSED 8/8 |

**Status:** COMPLETE ✅ (8/8)

### Sprint F — Tower Lobby (Sessions 15-17) — CLOSED 2026-04-20

| Item | Status | Commit | Notes |
|---|---|---|---|
| 1. tower/ Vite app + CF Pages project | ✅ | 428ad78 | Vite 8 + Tailwind 4, matches main app toolchain |
| 2. Admin gate via is_admin + RLS (Migration 007 + Migration 008 phantom backfill) | ✅ | c3e7307, 186a819, fc9c6d6, ae587a9, d4c58e5 | 3-layer defense-in-depth live |
| 3. Tower Lobby layout + nav shell | ✅ | 8df2959 | Router, sidebar, 4 route placeholders |
| 4. Room 1: live /health display | ✅ | ca85d44 | 4 module cards (Worker, Supabase, Gemini, Anthropic) + manual refresh |
| 5. Room 2: ai_call_log filtered table | ✅ | 021e7a1 | 100 rows + client-side Endpoint/Status/Provider filters + cursor-based Load more |
| 6. Room 3: ai_daily_stats summary cards + 14-day table | ✅ | 267c37e | 4 Today (UTC) cards + 14-day aggregate table, no chart |
| Mid-sprint: Migration 009 admin read paths | ✅ | a791872 | Additive `admins see all ai calls` policy + `admin_daily_stats` wrapper view |
| Mid-sprint: Migration 010 drift view correction | ✅ | b963774 | DROP drift view + recreate per 009 §3 intent |

**Bonus work shipped (Cosmodrome visual direction):**

| Commit | What |
|---|---|
| ce39de5 | Destiny-inspired theme redesign (celadon light → dark slate + ember) |
| 51e2192 | Pass 1 — atmosphere polish (radial gradients + noise + vignette + status pulses) |
| 2f5faa7 | Pass 2 — Tower design spec v1 + tactical density (HeaderStrip + StatusChip + TacticalPlaceholder + module codes) |

**Infrastructure (outside git):** CF Pages project `tower-phajot` live, `tower.phajot.com` custom domain active, Cloudflare Access application "Phajot Tower" gating Speaker email (policy `782108c8-7169-438e-9088-77ffb3c49080`).

**Status:** COMPLETE ✅ (6/6 items + bonus Cosmodrome direction + 2 mid-sprint migrations) — Closed 2026-04-20 Session 17

### Sprint G — Engine Room (Session 18) — CLOSED 2026-04-19

| Item | Status | Key commits | Notes |
|---|---|---|---|
| G-1: Room 4 Engine Room | ✅ | 274ee14, fa1f216, 65a2086, 857a2ca | System Integrity HUD + hourly AI traffic chart |
| G-2: Migration 011 drift reconciliation | ✅ | 82f7221 | 4 drift items: admin_user_summary dropped, ai_memory policies canonicalized, profiles/transactions policies renamed |

**Also shipped:** e76ff61 (hash placeholder fix), 374c820 (LINE roadmap removal)

**Status:** COMPLETE ✅ (2/2 items) — Closed 2026-04-19 Session 18

### Sprint H — Language Strings + Tower UX Redesign (Sessions 19–20) — CLOSED 2026-04-20

#### H-2: Language Strings ✅ CLOSED 2026-04-20 (Session 19)

| Item | Status | Key commits | Notes |
|---|---|---|---|
| Migration 012 — translations table schema | ✅ | da185fd | RLS, trigger, index |
| Migration 013 — 425-row seed | ✅ | 9648feb | ON CONFLICT DO NOTHING, 38 TH nulls |
| Phase 2 — main app DB fetch + cache | ✅ | 02ec8d0 | 7-day localStorage cache, silent fallback |
| Phase 3 — Tower admin UI | ✅ | c7adb4a | Inline edit, search/filter, Sync button |
| Phase 3b — shared/ extraction | ✅ | c7adb4a | Rule 16, −187KB Tower bundle |
| Phase 3c — UX polish | ✅ | 48324bf | Show missing only, cell affordance, row flash |

**Status:** COMPLETE ✅ (all 6 items)

#### H-3: Tower UX Redesign ✅ CLOSED 2026-04-20 (Session 20)

| Item | Status | Key commits | Notes |
|---|---|---|---|
| Phase 1 — Foundation: shared primitives + Shell + Sidebar | ✅ | 85f0480 | 10 primitives, new layout, Google Fonts CDN |
| Hotfix — Language Strings min-w-0 column collapse | ✅ | dec20c0 | 2-line fix between Phase 1 and Phase 2 |
| Phase 2 — Port 5 monitoring rooms to primitives | ✅ | a7816be | Lobby/Health/Engine/AI Calls/Daily Stats; data logic preserved verbatim |
| Phase 3 — Language Strings full editor-first redesign | ✅ | 42de77e | 380px side panel + coverage widget + pill filter + Noto Sans Lao/Thai |
| Phase 4 — Wrap + orphan deletion + docs | ✅ | `<this>` | ShellLayout.jsx + StatusChip.jsx deleted |

**Status:** COMPLETE ✅ (5/5 commits, zero rollbacks)

#### Admin Panel (user investigation) — moved to Sprint I

Original H-1 Admin Panel item re-classified as Sprint I work — Session 20 closed Sprint H by shipping the design system that Sprint I builds on top of. Admin Panel will be the first room implemented post-redesign.

### Sprint I — Admin-Approved Recovery System (Sessions 21 + 21.5 + 22)

**Part 1 — DB + worker + main-app UI (Session 21, CLOSED 2026-04-20)**

| # | Commit | What | Status |
|---|--------|------|--------|
| 1 | 22c5e86 | Migrations 014 + 015 — recovery state + admin read paths + is_admin() SECURITY DEFINER recursion fix | ✅ |
| 2 | e4393b0 | Worker v4.8.1 — 8 endpoints (3 user recovery + 2 admin approval + 3 admin summary) + Fallback A | ✅ |
| 3 | a9eda3c | Main-app Forgot PIN flow — i18n + `src/lib/recovery.js` + `<SetNewPin>` + PinLock Forgot button + App.jsx recovery hook | ✅ |
| 4 | `<this wrap>` | Session 21 wrap docs | ✅ |

**Status:** Part 1 COMPLETE ✅

**Part 1 definition of done — all met:**
- 15 migrations applied (014 + 015 new)
- Worker v4.8.1 live, all 8 endpoints smoke-tested via curl (9/9 pass)
- Main app Commit 3 built clean, bundle hash verified on production (index-xMpsmdvy.js ≠ pre-Session-21 baseline)
- Rule 17 preserved (worker writes all credential state)
- Rule 15 preserved (17 new i18n keys × en/lo/th)
- Rule 20 atomic SPRINT-CURRENT + ROADMAP-LIVE update this commit
- Rule 11 production hash verified

**Session 21.5 — Hotfix inserted (R21-13 HIGH)**

Single scope: `savePinConfig` PIN persistence bug + browser smoke scenarios B/D/E deferred from Session 21.

**Part 2 — Tower Room 6 Admin Support Console UI (Session 22)**

- Room 6: pending requests queue (manual refresh), search + summary side panel, approve buttons wired to Commit 2 endpoints, view recent transactions accordion
- Every read logs to `tower_admin_reads` + `tower_admin_actions` per privacy-sensitive contract (already worker-side; Tower UI just triggers)
- Additional Migration 016 bundle: R21-6 unauthorized admin attempt audit + R21-8 atomic `complete_pin_reset` RPC
- R21-10 support-console.js split (Option 2b)
- R21-11 PostgREST embed investigation
- R21-12 app_events schema audit

**Status:** Part 2 NOT STARTED — Session 22

### Sprints I–J — Tower Rooms (Sessions 21–22)
- I: Command Center (Sentinel chat) + **OCR Reliability Room** — attempts/failures/success rates per bank, average review corrections, confidence distribution, cost per 100 scans, most common row errors. Feeds Sprint L hardening decisions with real data.
- J: Workshop + Archive
**Status:** Not started

### Sprint L — OCR Pipeline Hardening (Sessions 20-21, ~May-Jun 2026)

New sprint added 2026-04-16 based on external advisor review. Treat Lao OCR as pipeline problem, not model problem.

| # | Item | Notes | Status |
|---|------|-------|--------|
| 1 | Image preprocessing (browser-side) | Contrast normalization, deskew detection, resolution scaling, thermal-print binarization | Not started |
| 2 | Strengthen /parse-statement prompt | Strict JSON schema, structural validation expectations | Not started |
| 3 | Bank-specific validators | BCEL + LDB first (most used), JDB later | Not started |
| 4 | Benchmark dataset | ~50 labeled real statements, anonymized family samples | Not started |
| 5 | Benchmark current Gemini pipeline | Accuracy baseline, bank-by-bank error rates | Not started |
| 6 | Conditional: evaluate cloud OCR | ONLY IF baseline <85%, compare Google Document OCR vs Azure | Conditional |

Benefits before public launch:
- Real accuracy numbers per bank
- Data-driven decision on provider switch
- Bank validators catch structural errors OCR misses

Rejected alternatives:
- Ensemble OCR (premature for family-stage, doubles cost)
- Self-hosted/fine-tuned OCR (needs 1000+ labeled Lao statements we don't have)
- OpenAI advisor in Tower (contradicts Rule 17 'Tower is a viewer not writer', splits AI attention)

**Status:** NOT STARTED — scheduled after Sprint J completes

### Sprint K+ — Public Launch (Session 22+)
- Landing page rewrite
- LINE OTP at registration
- Payment system (PromptPay -> BCEL QR -> Stripe)
- PDPA review + Privacy Policy
- LINE bot integration
**Status:** NOT STARTED

## Audit Findings Tracker
| # | Finding | Priority | Status |
|---|---------|----------|--------|
| 1 | Derived-password auth | P0 | Closed (770af58, Session 11) |
| 2 | Statement import end-state | P1 | Open (backlog) |
| 3 | i18n hardcoded strings | P1 | **Closed (Session 14)** |
| 4 | Modal/gate patterns | P1 | Closed (05f8f7d + b6b2598, Session 10) |
| 5 | Error handling | P1 | Closed (2e99fad, Session 10) |
| 6 | Analytics memoization | P2 | Open (backlog) |
| 7 | Settings overload | P2 | **Closed (Session 14, 858d3a0)** |
| 8 | Native dialogs | P1 | Closed (b6b2598, Session 10) |

**Zero P0 open. One P1 open. One P2 open.**

## Bundle Hash History
| Session | Start | End | Key commits |
|---------|-------|-----|-------------|
| 9 | BCwqjvty | CWOl1l1h | Deploy pipeline fix |
| 10 | CWOl1l1h | BeOPC5lm | Parent wrappers, toast, Sheet, ConfirmSheet |
| 11 | BeOPC5lm | CEFkIaIU | Auth i18n, LoginScreen rewrite, hotfix |
| 12 | CEFkIaIU | oPuRioVP | Dead code deletion, localStorage fix, i18n sweep (10 screens/components) |
| 13 | oPuRioVP | dqQyI8JV | StatementScanFlow, AnalyticsScreen locale fix, PIN UX, ProUpgradeScreen, GuideScreen (largest) |
| 14 (Sprint D close) | dqQyI8JV | B3mY1iQw | StreakModal, GoalModal, Settings reorg, EditTx toast |
| 14 (Sprint E) | B3mY1iQw | BJCgj50K | ErrorBoundary (CLP6JP-c) → Sentry wiring (BJCgj50K). Worker 4.4.0 → 4.5.0 → 4.6.0 → 4.7.0 across commits e21d7d2, 67e8859, 4ba9788. |
| 15 (Sprint F partial) | BJCgj50K | BJCgj50K (unchanged) | Main app untouched — all work in `tower/`. Tower bundle: index-DYnDWyB4.js. 6 commits: 19bee35, 428ad78, 8df2959, ce39de5, 51e2192, 2f5faa7. |
| 15 (post-wrap docs) | BJCgj50K | BJCgj50K | Docs hygiene + decisions: 28af464, a175f1e, c55152b, 9dd4ef3, b54b4bd, be2dc0b |
| 16 (Sprint F continued) | BJCgj50K (main app unchanged) | BJCgj50K — Tower only: DYnDWyB4 → K63ln-YZ (admin gate) → C5RzeSTp (Room 1) | Items 2 + 4. Tower admin gate live (3-layer defense). Room 1 /health rendering 4 module cards with real data. 9 commits: cd78bc2, f2494c0, c3e7307, 186a819, fc9c6d6, ae587a9, d4c58e5, ca85d44, + this wrap. |
| 17 (Sprint F close) | BJCgj50K (main app unchanged) | BJCgj50K — Tower only: C5RzeSTp → CUKk-PSf (Room 2) → DpNRTJ91 (Room 2 tweak) → CuLQfJJZ (Room 3) → 2zR7DkDi (Room 3 tweak) | Items 5 + 6 + Migrations 009 + 010. Sprint F CLOSED. 6 commits: a791872, 021e7a1, bd5109c, 267c37e, b963774, + wrap. |
| 18 (Sprint G close) | BJCgj50K (main app unchanged) | BJCgj50K — Tower only: 2zR7DkDi → C26VOd0d (Recharts) → Bz0clCZ1 (fallback) → MLdjSdAs (HUD) → Bn-XNeS- (endpoint fix) | Engine Room + Migration 011 drift reconciliation. Sprint G CLOSED. 7 commits: e76ff61, 374c820, 274ee14, fa1f216, 65a2086, 857a2ca, 82f7221. |
| 19 (Sprint H-2 close) | BJCgj50K → post-02ec8d0 hash (Phase 2 translations init added to main app) | Tower: Bn-XNeS- → post-c7adb4a (Phase 3 + 3b, 884KB raw) → post-48324bf (Phase 3c, 884KB raw) | Language Strings shipped. Migrations 012+013. shared/i18n-data.js. Sprint H-2 CLOSED. 5 commits: da185fd, 9648feb, 02ec8d0, c7adb4a, 48324bf. |
| 20 (Sprint H close — UX redesign) | BJCgj50K (main app unchanged) | Tower: post-48324bf (884KB) → D0mfT_w2 (Phase 1, 886KB) → U46bquEx (Phase 2, 886KB) → B-SBURXM (Phase 3, 890KB) → DJwN4vkN (Phase 4 wrap, 890KB) | Tower UX redesign. 10 shared primitives + new Shell + Sidebar + 5 monitoring rooms ported + Language Strings full editor-first redesign + orphan cleanup. Sprint H CLOSED. 6 commits: 85f0480, dec20c0, a7816be, 42de77e, + this wrap. |
| 21 (Sprint I Part 1 close) | BJCgj50K → RVdx7aXp (CF rebuild on Session 20 docs-only commit) → xMpsmdvy (CF Pages production post-Commit-3) | Tower: DJwN4vkN (unchanged — no Tower work this session) | Admin-Approved Recovery System. 2 migrations (014 + 015 — M015 same-session hotfix for M014 RLS recursion bug). Worker v4.7.0 → v4.8.0 → v4.8.1 (v4.8.1 added Fallback A for PostgREST embed failure). 8 worker endpoints. Main-app Forgot PIN flow. 4 commits: 22c5e86, e4393b0, a9eda3c, 84646a1 (wrap). Speaker-built local bundle was index-InDWwRPz.js; CF Pages serves index-xMpsmdvy.js (different by design per Session 9 lesson). |
| 21.5 (Sprint I.5 hotfix) | xMpsmdvy → CQswCaAm | Tower: DJwN4vkN (unchanged) | R21-13 HIGH `savePinConfig` DB persistence fix. Triple-defect stack resolved (fire-and-forget IIFE + catch {} + missing `{ error }` shape check). 3 call sites updated with await + try/catch + revert + toast patterns; recovery handler uses `.catch()` warn-only (worker is authoritative). New i18n key `pinSaveFailed` × 3 langs. 3/3 smoke tests PASS against production Supabase. R21-14 + R21-15 opened organically during Phase C smoke → Session 21.6 bundle. 2 commits: 98f758d (fix), `<this wrap>` (docs). |

## The Tower Team
| Name | Role |
|------|------|
| Speaker | Kitty (human, decides) |
| Sentinel | Health & Protection |
| Vanguard | Product & Sprint Leadership |
| Osiris | QA |
| Banshee | DevOps & Infrastructure |
| Hawthorne | Support |
| Iron Wolf | Growth |
| Ikora | Archivist |

## Key Rules
- Rule 11: Always verify production hash after push
- Rule 12: `.nvmrc` must pin exact Node version
- Rule 15: No hardcoded user-facing strings
- Rule 16: tower/ and src/ never import from each other
- Rule 17: Tower is a viewer, not a writer
- Rule 18: Update this file in every session wrap-up commit
