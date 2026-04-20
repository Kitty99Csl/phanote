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

## Sprint I.6 — INSERTED 2026-04-20 — Account security settings cluster

**Session:** 21.6
**Theme:** R21-14 (password change) + R21-15 (disable owner PIN) bundled scope

### Items

| # | Item | Status | Notes |
|---|------|--------|-------|
| I.6-1 | Design questions locked at Phase A (confirm-before-disable, guest cascade, password change pattern, MigrationScreen reuse, shared destructive-confirmation pattern) | ⏭️ next session | |
| I.6-2 | Password change flow in Settings (R21-14) | ⏭️ next session | Likely reuses MigrationScreen UI |
| I.6-3 | Disable PIN flow in Settings (R21-15) | ⏭️ next session | With guest-cascade + Forgot PIN button hide |
| I.6-4 | Shared destructive-change confirmation pattern | ⏭️ next session | ConfirmSheet extension or new component |

### I.6 pre-conditions

- [ ] Reality check per `docs/session-ritual.md`
- [ ] Confirm HEAD includes Session 21.5 wrap
- [ ] Scope locked to R21-14 + R21-15 only — no Tower work (that's Session 22)
- [ ] 5 design questions locked at Phase A before any code

**Target duration:** 45-60 min
**Status: NOT STARTED — next Session 21.6**

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
