# SPRINT-CURRENT.md

> **This file is updated at every sprint close per Rule 20. It is the single source of truth for current sprint state.**

---

## Sprint H — CLOSED 2026-04-20

**Session:** 19 (H-2 Language Strings closed) → 20 (Tower UX redesign across all 6 rooms)
**Theme:** Language Strings + Tower UX redesign

### Items shipped

| # | Item | Status | Key commits |
|---|------|--------|-------------|
| H-2 | Language Strings Admin Panel (DB-backed i18n + admin UI + UX polish) | ✅ | da185fd, 9648feb, 02ec8d0, c7adb4a, 48324bf |
| H-3 | Tower UX redesign — primitives + Shell + Sidebar + 5 monitoring rooms ported + Language Strings full editor-first redesign | ✅ | 85f0480, dec20c0, a7816be, 42de77e |

### Sprint H final state

- DB-backed i18n live across main app + Tower admin UI (H-2, Session 19)
- Tower on unified design system across all 6 rooms (H-3, Session 20)
- 10 shared primitives in `tower/src/components/shared.jsx` (Module, Stat, StatusPill, Kicker, PageTitle, Btn, Select, MeterBar, LiveDot, CornerBrackets + ACCENTS)
- New Shell layout + Sidebar with room codes A-00 / A-01 / A-02 / B-01 / B-02 / C-01
- Language Strings editor-first: side panel + coverage widget + pill filter + Noto Sans Lao/Thai
- Orphan files deleted: `tower/src/layouts/ShellLayout.jsx`, `tower/src/components/StatusChip.jsx`
- Tower bundle: 890.55KB raw / 256KB gzip (index after Session 20 wrap)

**Status: COMPLETE ✅ — Closed Session 20, 2026-04-20**

---

## Sprint I — Part 1 CLOSED 2026-04-20

**Session:** 21
**Theme:** Admin-Approved Recovery System (DB + worker + main-app UI)

### Items shipped

| # | Item | Status | Key commits |
|---|------|--------|-------------|
| I-1 | Migrations 014 + 015 — `user_recovery_state` + `tower_admin_actions` + additive admin-read policies + `is_admin()` SECURITY DEFINER recursion fix | ✅ | 22c5e86 |
| I-2 | Worker v4.8.1 — 8 endpoints across 3 groups (user recovery / admin approval / admin summary) + Fallback A for PostgREST embed failure | ✅ | e4393b0 |
| I-3 | Main-app Forgot PIN flow — i18n 17 keys × 3 langs + `src/lib/recovery.js` + `<SetNewPin>` + PinLock Forgot button + App.jsx recovery detection hook | ✅ | a9eda3c |

### Sprint I Part 1 final state

- 15 migrations applied (001–015; 014 + 015 shipped this session)
- Worker v4.8.1 live at `api.phajot.com` — 8 new endpoints (3 `/recovery/*`, 5 `/admin/users/*`)
- Main app bundle on CF Pages: `index-xMpsmdvy.js` (production) — Rule 11 verified ≠ pre-Session-21 baseline `index-RVdx7aXp.js`
- Speaker's PIN temporarily set to `9999` during Commit 2 smoke test (live per acknowledgment); serves as marker for "just recovered" state until Speaker restores via Settings
- Smoke test 9/9 pass on Commit 2 adversarial curl sequence

**Deferred items:**
- Browser smoke test Scenarios B/D/E (Forgot PIN UI, recovery completion, expired recovery) → Session 21.5 opening
- R21-10 worker file split (support-console.js at 1300 lines) → Session 22 natural boundary

**Status: Part 1 COMPLETE ✅ — Closed Session 21, 2026-04-20**

---

## Sprint I.5 — CLOSED 2026-04-20

**Session:** 21.5 (same-day hotfix after Session 21 close)
**Theme:** R21-13 HIGH — `savePinConfig` DB persistence bug fix

### Items shipped

| # | Item | Status | Commits |
|---|------|--------|---------|
| I.5-1 | `savePinConfig` async + throws on `{ error }` shape + callers updated (3 sites) | ✅ | 98f758d |
| I.5-2 | Browser smoke: Tests 1/2/3 + implicit Session 21 Scenarios B/D | ✅ | — |
| I.5-3 | Rule 11 production hash verification (`index-xMpsmdvy.js` → `index-CQswCaAm.js`) | ✅ | — |
| I.5-4 | Session 21.5 wrap docs atomic Rule 20 update | ✅ | `<this wrap>` |

### Sprint I.5 final state

- R21-13 HIGH **CLOSED** — `savePinConfig` now async + properly propagates Supabase `{ error }` responses. 3 call sites updated with try/catch + best-effort revert + user toast. Recovery-flow call site uses `.catch()` with `console.warn` only (worker write is authoritative — user-facing error would mislead).
- Main app bundle (CF Pages production): `index-CQswCaAm.js` (post-fix)
- New i18n key `pinSaveFailed` × en/lo/th

**Unexpected discoveries (→ Session 21.6 bundle):**
- R21-14 MEDIUM opened — no password change flow in Settings
- R21-15 MEDIUM opened — no disable-owner-PIN option

**Status: COMPLETE ✅ — Closed Session 21.5, 2026-04-20**

---

## Sprint I.6 — CLOSED 2026-04-21

**Session:** 21.6
**Theme:** Account security settings cluster — R21-14 (password change) + R21-15 (disable owner PIN)

### Items shipped

| # | Item | Status | Commits |
|---|------|--------|---------|
| I.6-1 | 6 design questions locked at Phase A (Q1-Q6 + Obs1/Obs2 polishes) | ✅ | — |
| I.6-2 | Password change flow in Settings (R21-14): NEW ChangePasswordModal, supabase-js bumped 2.101.1 → 2.104.0 for currentPassword API | ✅ | 03b39e2 |
| I.6-3 | Disable PIN flow in Settings (R21-15): Remove button + destructive ConfirmSheet + PIN-verify step via new setPinSetupMode="disable-confirm" + guest cascade | ✅ | 03b39e2 |
| I.6-4 | Session 21.6 wrap docs atomic Rule 20 update | ✅ | `<this wrap>` |

### Sprint I.6 final state

- R21-14 MEDIUM **CLOSED** — password change self-service via Settings, supabase-js `currentPassword` API integration
- R21-15 MEDIUM **CLOSED** — owner PIN disable self-service, guest-cascade, structural Forgot-PIN-button auto-hide
- Main app bundle (CF Pages production): `index-CJY85dLV.js` (post-fix), flipped from `index-CQswCaAm.js` (21.5 close)
- 15 new i18n keys × 3 languages
- Account-security cluster COMPLETE — no open self-service gaps for family-beta users

**Deferred:** D21.6-Q4 (ConfirmSheet array refactor at 5 instances — defer to 6-8 threshold) · D21.6-Q6 (80ms cancel-race ship-as-drafted per INFO decision)

**Status: COMPLETE ✅ — Closed Session 21.6, 2026-04-21**

---

## Sprint I Part 2 — CLOSED 2026-04-21

**Session:** 22
**Theme:** Tower Room 6 Admin Support Console UI (C-02)

### Items shipped

| # | Item | Status | Commits |
|---|------|--------|---------|
| I-4 | Tower Room 6 Admin Support Console UI — 10 new files (5 components + 4 hooks + orchestrator), 2 file edits (App.jsx route + Sidebar nav) | ✅ | e1b3239 |
| I-9 | `app_events.level` schema audit (Path C — UI conditional render on null; backend tweak deferred to Session 23) | ✅ | e1b3239 |
| — | Session 22 wrap docs atomic Rule 20 update | ✅ | `<this wrap>` |

### Sprint I Part 2 final state

- Room 6 live at `tower.phajot.com/admin/support` (C-02)
- Consumes worker endpoints from Session 21 Sprint I Part 1 Commit 2 (search / summary / view-transactions / approve-pin / approve-password)
- Pending queue uses direct Supabase admin-read RLS (R22-1 tracks worker endpoint for Session 23)
- 7 design decisions locked (D22-Q1..Q7) + I-9 Path C + concurrency acceptance
- 1 new risk opened (R22-1 LOW — pending queue unaudited reads)
- Tower bundle flipped from `index-DJwN4vkN.js` (Session 20) to `<new CF hash>` (Speaker verifies via DevTools)

**Scope explicitly deferred to Session 23:**
- I-5: R21-11 PostgREST embedded resource investigation
- I-6 + I-7: Migration 016 (R21-6 unauthorized-admin audit + R21-8 atomic complete_pin_reset RPC)
- I-8: R21-10 workers/lib/support-console.js split
- I-9 worker tweak sibling: drop level filter + rename field
- R22-1: `GET /admin/pending-requests` worker endpoint

**Status: COMPLETE ✅ — Closed Session 22, 2026-04-21**

---

## Sprint I Part 3 — INSERTED — Backend hygiene batch

**Session:** 23 (next)
**Theme:** Consolidated backend cleanup across R21-6/8/10/11/12 + R22-1 + Migration 016

### Items

| # | Item | Status | Source |
|---|------|--------|--------|
| I-10 | R21-10 Split workers/lib/support-console.js (Option 2b — helpers / user-recovery / admin-approve / admin-summary) | ⏭️ Session 23 | Session 21 |
| I-11 | R21-11 PostgREST embed investigation; if resolvable, migrate Fallback A back to embed syntax | ⏭️ Session 23 | Session 21 |
| I-12 | R21-6 + R21-8 Migration 016 bundle: `unauthorized_admin_attempt` action_type + `complete_pin_reset()` defensive RPC with internal re-verification | ⏭️ Session 23 | Session 21 + Gemini S22 review |
| I-13 | R21-12 worker query tweak: drop `level=eq.error` filter, rename `app_errors_last_7d` → `events_last_7d`, Tower UI follow-up | ⏭️ Session 23 | Session 22 I-9 Path C sibling |
| I-14 | R22-1 `GET /admin/pending-requests` worker endpoint with tower_admin_reads logging; `usePendingQueue` migrates to worker | ⏭️ Session 23 | Session 22 R22-1 |

### I.III pre-conditions

- [ ] Reality check per `docs/session-ritual.md`
- [ ] Confirm HEAD includes Session 22 wrap
- [ ] Scope locked to backend hygiene only — no main-app or Tower UI work (I-14 touches Tower `usePendingQueue.js` minimally as part of R22-1 migration, no UI changes)
- [ ] 7 design questions pre-locked in Session 22 + Gemini review (Migration 016 defensive RPC pattern, worker split ordering, embed-vs-fallback policy)

**Target duration:** 2-2.5 hours, single worker deploy (v4.8.2 or v4.9.0)
**Status: NOT STARTED — next Session 23**

---

## Sprint I — Part 2 — Tower UI (Session 22)

**Session:** 22
**Theme:** Tower Room 6 (Admin Support Console UI) — consumes worker endpoints built in Sprint I Part 1

### Items

| # | Item | Status | Notes |
|---|------|--------|-------|
| I-4 | Tower Room 6 Admin Support Console UI (C-02) | ⏭️ Session 22 | Pending requests queue (manual refresh), search + summary side panel, approve buttons, confirm dialogs, view recent transactions accordion |
| I-5 | R21-11 PostgREST embedded resource investigation | ⏭️ Session 22 | If resolvable, migrate Fallback A back to embeds for perf |
| I-6 | R21-6 unauthorized admin attempt audit (Migration 016) | ⏭️ Session 22 | Extends tower_admin_actions.action_type CHECK |
| I-7 | R21-8 atomic `complete_pin_reset` RPC (bundle with R21-6 Migration 016) | ⏭️ Session 22 | |
| I-8 | R21-10 support-console.js split (Option 2b) | ⏭️ Session 22 | Natural post-Tower-UI split |
| I-9 | R21-12 app_events schema audit | ⏭️ Session 22 | |

**Status: NOT STARTED — Session 22**

---

## Archive reference

| Sprint | Closed | Session | Summary |
|--------|--------|---------|---------|
| B | 2026-04-15 | 10 | docs/session-10/SUMMARY.md |
| C | 2026-04-16 | 11 | docs/session-11/SUMMARY.md |
| D | 2026-04-17 | 14 | docs/ROADMAP-LIVE.md Sprint D table |
| E | 2026-04-17 | 14 | docs/ROADMAP-LIVE.md Sprint E table |
| F | 2026-04-20 | 17 | docs/session-17/SUMMARY.md |
| G | 2026-04-19 | 18 | docs/session-18/SUMMARY.md |
| H-2 | 2026-04-20 | 19 | docs/session-19/SUMMARY.md |
| H-3 | 2026-04-20 | 20 | docs/session-20/SUMMARY.md |
| H | 2026-04-20 | 20 | (sprint closed end of Session 20) |
| I Part 1 | 2026-04-20 | 21 | docs/session-21/SUMMARY.md |
| I.5 | 2026-04-20 | 21.5 | docs/session-21-5/SUMMARY.md |
| I.6 | 2026-04-21 | 21.6 | docs/session-21-6/SUMMARY.md |
| I Part 2 | 2026-04-21 | 22 | docs/session-22/SUMMARY.md |
