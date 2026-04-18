# PHAJOT — Live Roadmap

> **Status:** Current source of truth (live roadmap, updated every session wrap-up)

> Last updated: 2026-04-19 (Session 16 close — Sprint F 50% complete)

## Current State
- **Active sprint:** F (Tower Lobby) — in progress · Session 15 shipped Items 1 + 3 + Cosmodrome · Session 16 shipped Items 2 + 4 · Session 17 ships Items 5 + 6 (Sprint F closes)
- **Session 16:** closed this commit · Session 17 next: complete Sprint F (Items 5 + 6)
- **Production hash (Phajot):** index-BJCgj50K.js (unchanged — main app untouched in Session 16)
- **Tower bundle:** index-C5RzeSTp.js (Room 1 /health live) — Tower live at tower.phajot.com (3-layer gate: CF Access + Supabase login + is_admin RLS)
- **Worker version:** 4.7.0
- **Latest commit:** ca85d44 (Room 1 /health module cards — Item 4 closed; this wrap commit supersedes)
- **Next action:** Session 17 — complete Sprint F Items 5 (ai_call_log table) + 6 (ai_daily_stats cards)
- **Notable milestone:** Three-layer defense-in-depth live — CF Access (edge) + Supabase login (app) + is_admin RLS (database)

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

### Sprint F — Tower Lobby (Sessions 15-16)

| Item | Status | Commit | Notes |
|---|---|---|---|
| 1. tower/ Vite app + CF Pages project | ✅ | 428ad78 | Vite 8 + Tailwind 4, matches main app toolchain |
| 2. Admin gate via is_admin + RLS (Migration 007 + Migration 008 phantom backfill) | ✅ | c3e7307, 186a819, fc9c6d6, ae587a9, d4c58e5 | 3-layer defense-in-depth live |
| 3. Tower Lobby layout + nav shell | ✅ | 8df2959 | Router, sidebar, 4 route placeholders |
| 4. Room 1: live /health display | ✅ | ca85d44 | 4 module cards (Worker, Supabase, Gemini, Anthropic) + manual refresh |
| 5. Room 2: ai_call_log filtered table | ⏸ | — | Session 17 (per DECISIONS.md Q4) |
| 6. Room 3: ai_daily_stats summary cards + 14-day table | ⏸ | — | Session 17 (no chart per DECISIONS.md Q5) |

**Bonus work shipped (Cosmodrome visual direction):**

| Commit | What |
|---|---|
| ce39de5 | Destiny-inspired theme redesign (celadon light → dark slate + ember) |
| 51e2192 | Pass 1 — atmosphere polish (radial gradients + noise + vignette + status pulses) |
| 2f5faa7 | Pass 2 — Tower design spec v1 + tactical density (HeaderStrip + StatusChip + TacticalPlaceholder + module codes) |

**Infrastructure (outside git):** CF Pages project `tower-phajot` live, `tower.phajot.com` custom domain active, Cloudflare Access application "Phajot Tower" gating Speaker email (policy `782108c8-7169-438e-9088-77ffb3c49080`).

**Status:** IN PROGRESS — 4/6 items + bonus Cosmodrome direction (Session 16 shipped 2+4; Session 17 ships 5+6 to close Sprint F)

### Sprints G-J — Tower Rooms (Sessions 16-19)
- G: Engine Room (technical health)
- H: Admin Panel (user investigation) + **Language Strings Admin Panel** — data-driven i18n via Supabase `translations` table, inline edit UI at `tower.phajot.com/admin/language-strings`, fallback chain DB → code-level i18n.js → English → key name. Wife/admins edit translations without redeploying. ~2 days within Sprint H budget.
- I: Command Center (Sentinel chat) + **OCR Reliability Room** — attempts/failures/success rates per bank, average review corrections, confidence distribution, cost per 100 scans, most common row errors. Feeds Sprint L hardening decisions with real data.
- J: Workshop + Archive
**Status:** NOT STARTED

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
