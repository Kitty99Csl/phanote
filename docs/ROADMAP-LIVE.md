# PHAJOT — Live Roadmap
> Last updated: 2026-04-16 · Session 11 · Commit 8be34f5

## Current State
- **Active sprint:** C (auth replacement) — COMPLETE
- **Session:** 11
- **Commits today:** 7 + 1 hotfix
- **Production hash:** index-CEFkIaIU.js
- **Next action:** Sprint D (Session 12) — i18n marathon + Settings reorg

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
**Manual gate:** legacy_auth SQL run (all 10 rows true)
**Deploy-verify:** Tests A/B/C passed on phone + desktop
**Security audit:** loginWithPassword is signup-safe, dead code flagged
**Status:** COMPLETE

### Sprint D — i18n + Settings (Session 12, ~Apr 21)
- Sweep all hardcoded strings (lo/th/en) — closes audit P1 #3
- Settings reorganization (5 sections) — closes audit P2 #7
- Delete `signInWithPhone` dead code
- localStorage `phanote_pins` namespace per-user
- PIN UX clarity
**Status:** NOT STARTED

### Sprint E — Observability (Session 13, ~Apr 28) — UNLOCKS TOWER
- Sentry (frontend + worker)
- AI cost tracking (ai_call_log table)
- Worker /health enrichment
- docs/tower/ Sentinel skeleton
- First 2 Claude Projects (Vanguard + Osiris)
- External uptime monitor
**Status:** NOT STARTED

### Sprint F — Tower Lobby (Session 14, ~May 5)
- Create tower/ Vite app
- CF Pages project for tower.phajot.com
- Hard-gate to Speaker
- Room 1 (Lobby) with live data
- Dark mode
**Status:** NOT STARTED

### Sprints G-J — Tower Rooms (Sessions 15-18)
- G: Engine Room (technical health)
- H: Admin Panel (user investigation)
- I: Command Center (Sentinel chat)
- J: Workshop + Archive
**Status:** NOT STARTED

### Sprint K+ — Public Launch (Session 19+)
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
| 3 | i18n hardcoded strings | P1 | Open (Sprint D) |
| 4 | Modal/gate patterns | P1 | Closed (05f8f7d + b6b2598, Session 10) |
| 5 | Error handling | P1 | Closed (2e99fad, Session 10) |
| 6 | Analytics memoization | P2 | Open (backlog) |
| 7 | Settings overload | P2 | Open (Sprint D) |
| 8 | Native dialogs | P1 | Closed (b6b2598, Session 10) |

**Open:** 4 of 8 (0 P0, 2 P1, 2 P2)
**Closed:** 4 of 8 (1 P0, 2 P1, 1 P2... wait, recount)

P0: 1 closed (row 1)
P1: 3 closed (rows 4, 5, 8), 2 open (rows 2, 3)
P2: 0 closed, 2 open (rows 6, 7)

**Zero P0 open. Two P1 open. Two P2 open.**

## Bundle Hash History
| Session | Start | End | Key commits |
|---------|-------|-----|-------------|
| 9 | BCwqjvty | CWOl1l1h | Deploy pipeline fix |
| 10 | CWOl1l1h | BeOPC5lm | Parent wrappers, toast, Sheet, ConfirmSheet |
| 11 | BeOPC5lm | CEFkIaIU | Auth i18n, LoginScreen rewrite, hotfix |

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
