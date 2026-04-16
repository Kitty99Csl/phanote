# PHAJOT — Live Roadmap
> Last updated: 2026-04-16 · Session 12 · Commit dd8ba84

## Current State
- **Active sprint:** D (i18n + Settings) — ~70% COMPLETE
- **Session:** 12
- **Commits today:** 12 code + 3 docs = 15 total
- **Production hash:** index-oPuRioVP.js
- **Next action:** Session 13 finishes Sprint D — remaining modals + Settings reorg + PIN UX copy

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
| 13 | — | i18n StreakModal + GoalModal (~18 strings) | — | Session 13 |
| 14 | — | i18n StatementScanFlow + 4 Thai keys (~8 strings) | — | Session 13 |
| 15 | — | i18n AnalyticsScreen gaps (~12 strings) | — | Session 13 |
| 16 | — | Settings reorganization (5 sections) | — | Session 13 |
| 17 | — | PIN UX clarity copy | — | Session 13 |
| 18 | — | i18n GuideScreen + ProUpgradeScreen (~65 strings) | — | Session 13 (if time) |
**Progress:** 67 strings i18n'd across 10 screens/components + 2 infra cleanups. 9 keys reused.
**Status:** IN PROGRESS (~70%)

### Sprint E — Observability (Session 14, ~Apr 28) — UNLOCKS TOWER
- Sentry (frontend + worker)
- AI cost tracking (ai_call_log table)
- Worker /health enrichment
- docs/tower/ Sentinel skeleton
- First 2 Claude Projects (Vanguard + Osiris)
- External uptime monitor
**Status:** NOT STARTED

### Sprint F — Tower Lobby (Session 15, ~May 5)
- Create tower/ Vite app
- CF Pages project for tower.phajot.com
- Hard-gate to Speaker
- Room 1 (Lobby) with live data
- Dark mode
**Status:** NOT STARTED

### Sprints G-J — Tower Rooms (Sessions 16-19)
- G: Engine Room (technical health)
- H: Admin Panel (user investigation) + **Language Strings Admin Panel** — data-driven i18n via Supabase `translations` table, inline edit UI at `tower.phajot.com/admin/language-strings`, fallback chain DB → code-level i18n.js → English → key name. Wife/admins edit translations without redeploying. ~2 days within Sprint H budget.
- I: Command Center (Sentinel chat)
- J: Workshop + Archive
**Status:** NOT STARTED

### Sprint K+ — Public Launch (Session 20+)
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
| 3 | i18n hardcoded strings | P1 | Open (Sprint D, ~70% done — 10 screens/components complete, ~55 strings remain) |
| 4 | Modal/gate patterns | P1 | Closed (05f8f7d + b6b2598, Session 10) |
| 5 | Error handling | P1 | Closed (2e99fad, Session 10) |
| 6 | Analytics memoization | P2 | Open (backlog) |
| 7 | Settings overload | P2 | Open (Sprint D, deferred to Session 13) |
| 8 | Native dialogs | P1 | Closed (b6b2598, Session 10) |

**Zero P0 open. Two P1 open. Two P2 open.**

## Bundle Hash History
| Session | Start | End | Key commits |
|---------|-------|-----|-------------|
| 9 | BCwqjvty | CWOl1l1h | Deploy pipeline fix |
| 10 | CWOl1l1h | BeOPC5lm | Parent wrappers, toast, Sheet, ConfirmSheet |
| 11 | BeOPC5lm | CEFkIaIU | Auth i18n, LoginScreen rewrite, hotfix |
| 12 | CEFkIaIU | oPuRioVP | Dead code deletion, localStorage fix, i18n sweep (10 screens/components) |

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
