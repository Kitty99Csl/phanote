# PHAJOT — Live Roadmap
> Last updated: 2026-04-16 · Session 12 · Commit 0695707

## Current State
- **Active sprint:** D (i18n + Settings) — 40% COMPLETE
- **Session:** 12
- **Commits today:** 6
- **Production hash:** index-BLP-ChCs.js
- **Next action:** Session 13 continues Sprint D — remaining i18n + Settings reorg

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
| 7 | — | i18n modals (6 files, ~39 strings) | — | Session 13 |
| 8 | — | i18n StatementScanFlow + Thai keys | — | Session 13 |
| 9 | — | i18n WalletCards + small gaps | — | Session 13 |
| 10 | — | Settings reorganization (5 sections) | — | Session 13 |
| 11 | — | PIN UX clarity copy | — | Session 13 |
| 12 | — | i18n GuideScreen + ProUpgradeScreen | — | Session 13 (if time) |
**Progress:** 38 strings i18n'd across 4 screens + 2 infra cleanups
**Status:** IN PROGRESS (40%)

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
- H: Admin Panel (user investigation)
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
| 3 | i18n hardcoded strings | P1 | Open (Sprint D, 40% done — 4 screens complete, ~124 strings remain) |
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
| 12 | CEFkIaIU | BLP-ChCs | Dead code deletion, localStorage fix, i18n sweep (4 screens) |

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
