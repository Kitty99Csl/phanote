# PHAJOT — Live Roadmap

> **Status:** Current source of truth (live roadmap, updated every session wrap-up)

> Last updated: 2026-04-26 (Session 26 — Sprint M.2b1 + M.2b2 CLOSED; Sprint M.2b3 next)

## Current State
- **Active sprint:** Sprint M (Truthfulness Hardening) — **Part 1 + 2a + 2b1 + 2b2 CLOSED**, Part 2b3 pending (final batch)
- **Production hash (Phajot main app):** **index-6cXL-RDb.js** (Sprint M.2b2 deploy 2026-04-26, flipped from index-DekFTcxm.js → index-C3dtQtFg.js → index-6cXL-RDb.js)
- **Tower bundle:** index-DX3GSv9O.js (Session 23 deploy, unchanged)
- **Worker version:** 4.8.2 (unchanged since Sprint I)
- **Supabase-js version:** 2.104.0
- **Migrations applied:** 16 (latest: 016 — `complete_pin_reset` SECURITY DEFINER RPC)
- **Latest commit:** `<this wrap>` (Session 26 wrap — M.2b1 + M.2b2 closed)
- **Next action:** Sprint M.2b3 — StatementScanFlow handleImport + deleteBatch + App.jsx return shape (~75-90 min, fresh energy required)

---

## External review pivot — 2026-04-24

Between Session 23 close and Session 24 open, two external reviews surfaced:

1. **GPT Codex 5.4** — full repo static review (1 pass, 7 batches)
2. **Peer review** — a human company peer (AI consultant) reviewed the same surface

Both converged on three themes:
1. **Truthfulness under failure** — Supabase write paths optimistically update UI before confirming persistence. Silent failures hide from users.
2. **Mobile modal foundations** — shared Sheet geometry, keyboard offset, and input path have real usability bugs confirmed by Speaker + wife in daily use.
3. **Tower / admin truthfulness** — hardcoded healthy status, `user_id: null` observability gaps.

Full artifacts: `docs/review/2026-04-24/`:
- `FULL-REVIEW-SUMMARY.md` — GPT Codex's consolidated summary (as-received, preserved verbatim)
- `REVIEW-LOG.md` — GPT Codex's per-batch review log (as-received)
- `TRIAGE.md` — CTO analysis: which findings are legit, which are partial, which to reject
- `SPRINT-M-SCOPE.md` — Sprint M definition of done + scope lock (Session M.2b targets still active)
- `SPRINT-N-PREVIEW.md` — Sprint N shape (pending Phase A live device data)

---

## Revised roadmap — post-review priority stack

**Top = do first.**

| Priority | Sprint | Theme | Est. sessions | Status | Rationale |
|----------|--------|-------|---------------|--------|-----------|
| 🔥 **ACTIVE** | **Sprint M.2b — Truthfulness Hardening Part 2 remainder** | BudgetScreen + StatementScanFlow + streak.js + data-quality | 1 session (~2 hrs) | **NEXT** | Sprint M.2a closed GoalsScreen; M.2b closes remaining screen-level writes |
| ✅ DONE | **Sprint M.2a — Truthfulness Hardening Part 2 (Section A)** | GoalsScreen rollback patterns | 1 session | **CLOSED 2026-04-25** | Commits c5bd19d + wrap |
| ✅ DONE | **Sprint M.1 — Truthfulness Hardening Part 1** | Backend helpers + loadUserData retry UI | 1 session | **CLOSED 2026-04-24** | Commits 3d0eba7 + wrap |
| 🔥 NEXT | **Sprint N — UX Hardening (Mobile)** | Modal audit, keyboard-offset fixes, Sheet geometry rework | 2-3 sessions (~6-8 hrs) | Pending M close | Speaker + wife confirm active daily friction |
| 📋 Then | **Sprint O — OCR Instrumentation** | Migration 017 + worker `/parse-statement` instrumentation | 1 session (~2 hrs) | Pending | Prerequisite for Sprint I-real and Sprint L |
| 📋 Then | **Sprint J — Tower Workshop + Archive** | Read-only docs-reading rooms | 1-2 sessions (~4-6 hrs) | Pending | Completes Tower v1 |
| 📋 Then | **Sprint I-real — OCR Reliability Room** | Uses Sprint O data for observability UI | 2-3 sessions | Pending | Needs 1-2 weeks of Sprint O data |
| 📋 Then | **Sprint L — OCR Pipeline Hardening** | Preprocessing, validators, benchmarks | 2-3 sessions | Pending | Data-driven per Sprint I-real |
| 🟡 Later | **Sprint P — Tower Honesty** | Real system state, worker user_id, SPA fallback | 1 session | Pending | Quick win |
| 🟡 Later | **Sprint K — Public Launch Prep** | Landing, LINE OTP, ToS, payment flow | 4-5 sessions | Pending | Only after M, N, O, I-real |
| 🟢 Backlog | **Docs authority cleanup** | Relabel 6 named docs as historical | 30 min task | Pending | Not a sprint |

---

## Sprint archive

### Sprint A — Pre-Rules Discipline (Sessions 1-8) — CLOSED 2026-04-13
Initial build, MVP, bug fixes. No formal sprint structure.

### Sprint B — Stability Cleanup (Sessions 9-10) — CLOSED 2026-04-15
Session 9 RLS hardening (6/6 adversarial probes pass). Session 10 Priority A/B/C (commits 05f8f7d, 6b4911f, 2e99fad).

### Sprint C — Onboarding Refinement (Session 11) — CLOSED 2026-04-16
Legacy auth migration, loginWithPassword. 8 commits.

### Sprint D — i18n Marathon (Sessions 12-14) — CLOSED 2026-04-17
All user-facing screens translated en/lo/th. 350 i18n keys.

### Sprint E — Observability foundation (Session 14) — CLOSED 2026-04-17
Migration 006 (ai_call_log, ai_daily_stats matview, tower_admin_reads). **Note:** OCR-specific columns missing per OQ-015 — Sprint O addresses.

### Sprint F — Tower Rooms 1-3 (Sessions 15-17) — CLOSED 2026-04-20
Lobby, Health, AI Calls, Daily Stats. Migrations 009/010. 6/6 items + 2 bonus.

### Sprint G — Engine Room (Session 18) — CLOSED 2026-04-19
Room 4 System Integrity HUD + hourly AI traffic chart. Migration 011. 2/2 items.

### Sprint H — Language Strings + Tower UX Redesign (Sessions 19-20) — CLOSED 2026-04-20
H-2: Migrations 012-013 translations table + 425-row seed. H-3: Full Tower design system redesign. 5/5 commits, zero rollbacks.

### Sprint I — Admin-Approved Recovery System (Sessions 21 + 21.5 + 21.6 + 22 + 23) — CLOSED 2026-04-22

**5 sessions, 11 commits total, 16 risks resolved** (14 CLOSED + 1 STRUCTURALLY READY + 1 WON'T-FIX). Admin-approved recovery system production-ready for family-beta.

### Session 23.5 — Roadmap pivot (post-external-review) — 2026-04-24

Roadmap restructured after external review (GPT Codex 5.4 + peer). Sprints M and N inserted. Commit `40eebb9`.

### Sprint M.1 — Truthfulness Hardening Part 1 (Session 24) — CLOSED 2026-04-24

| # | Commit | What | Status |
|---|--------|------|--------|
| 1 | 3d0eba7 | Backend helpers + loadUserData retry UI | ✅ |
| 2 | e26a509 | Session 24 wrap docs | ✅ |

**Bundle flip:** index-CJY85dLV.js → index-DhdWacHa.js  
**Risks closed:** Review-P1-1, Review-P1-2, Discovery-M1-1a, Discovery-M1-1b  
**Open threads captured:** OT-M-5, OT-M-6, OT-M-7, OT-M-8

### Sprint M.2a — GoalsScreen Truthfulness (Session 25) — CLOSED 2026-04-25

| # | Commit | What | Status |
|---|--------|------|--------|
| 1 | c5bd19d | GoalsScreen performDeleteGoal + addSavings hardening | ✅ |
| 2 | 0aac92b | Session 25 wrap docs | ✅ |

**Bundle flip:** index-DhdWacHa.js → index-DekFTcxm.js  
**Risks closed:** Review-P1-5 partial (DELETE + ADD halves; UPDATE half = updateGoal legacy out of scope)  
**Open threads carried:** OT-M.2-1 through OT-M.2-6

### Sprint M.2b1 — BudgetScreen Truthfulness (Session 26) — CLOSED 2026-04-26

| # | Commit | What | Status |
|---|--------|------|--------|
| 1 | b539310 | BudgetScreen saveBudget revert + OT-M-8 | ✅ |

**Bundle:** index-DekFTcxm.js → index-C3dtQtFg.js
**Risks closed:** Review-P2-10

### Sprint M.2b2 — streak/dedup/categories Truthfulness (Session 26) — CLOSED 2026-04-26

| # | Commit | What | Status |
|---|--------|------|--------|
| 1 | f663579 | streak.js + constants.js + categories.js | ✅ |
| 2 | `<this wrap>` | Session 26 wrap docs | ✅ |

**Bundle:** index-C3dtQtFg.js → index-6cXL-RDb.js
**Risks closed:** Review-P2-7, P2-8, P2-11
**Open threads carried:** OT-M.2b3-1 through OT-M.2b3-7

---

## Bundle hash history

| Session | Main app | Tower | Worker | Note |
|---------|----------|-------|--------|------|
| Session 20 | index-… | index-… | 4.7.x | Sprint H close |
| Session 21.6 | **index-CJY85dLV.js** | index-DcC1f2x6.js | 4.8.0 | Account security baseline (held 3 sessions) |
| Session 22 | index-CJY85dLV.js | index-DcC1f2x6.js | 4.8.0 | Tower Room 6 |
| Session 23 | index-CJY85dLV.js | **index-DX3GSv9O.js** | **4.8.2** | Backend hygiene |
| Session 23.5 | index-CJY85dLV.js | index-DX3GSv9O.js | 4.8.2 | Docs-only pivot |
| Session 24 | **index-DhdWacHa.js** | index-DX3GSv9O.js | 4.8.2 | Sprint M.1 |
| Session 25 | index-DekFTcxm.js | index-DX3GSv9O.js | 4.8.2 | Sprint M.2a (GoalsScreen) |
| Session 26 (M.2b1) | **index-C3dtQtFg.js** | index-DX3GSv9O.js | 4.8.2 | Sprint M.2b1 BudgetScreen |
| **Session 26 (M.2b2)** | **index-6cXL-RDb.js** | index-DX3GSv9O.js | 4.8.2 | Sprint M.2b2 streak + supporting ← current |

---

## Cross-sprint risk register (open items)

See `docs/RISKS.md` for full open/closed risk tracking. Open post-Session-26:

- **Review-P1-3** — StatementScanFlow reports success before saves land (Sprint M.2b3 target)
- **Review-P1-5 partial** — GoalsScreen save/delete (DELETE + ADD CLOSED Sprint M.2a; updateGoal legacy throw audit deferred to Sprint N)
- **Review-P1-6** — ProUpgradeScreen inert CTA (DEFERRED — by-design pre-launch, Sprint K)
- **Review-P1-4** — Sheet.jsx + modal keyboard geometry (Sprint N)
- **Review-P2-12, P2-13** — P2 findings remaining (Sprint M.2b3 + Sprint N + Sprint P) — P2-7, P2-8, P2-10, P2-11 CLOSED Session 26
- **OT-M-5, OT-M-6, OT-M-7, OT-M-8** — Sprint M.1 open threads (see Session 24 RISKS.md)
- **OT-M.2-1 through OT-M.2-6** — Sprint M.2a open threads (see Session 25 DECISIONS.md)
- **OT-M.2b3-1 through OT-M.2b3-7** — Sprint M.2b3 open threads (see Session 26 DECISIONS.md)

---

## Notes for next CTO / next Claude

1. **Sprint M.2b can ship from local Windows** — Session 25 fixed the env (Node 24.13.1 + .env.local + lockfile-verified `npm ci`). Codespaces still works as fallback.

2. **Handler contract rule (OT-M-8) needs documentation in CLAUDE.md at Sprint M.2b wrap.** Rule: modal-called handlers throw; event-called handlers revert + toast.

3. **OT-M-7 may merge into Sprint M.2b or N if trivial.** `handleUpdateCategory` Session 10 throw — verify `EditTransactionModal` and `QuickEditToast` callers have try/catch. Same applies to `updateGoal` in GoalsScreen (OT-M.2-6).

4. **Sprint M.2b Batch 3 (StatementScanFlow) is the highest blast radius batch in Sprint M.** Real money math, multi-currency, multi-row import. Run it FRESH, not tired.

5. **Sprint N starts with live device audit (Phase A) — NON-NEGOTIABLE.** Speaker + wife spend 30-45 min testing every modal before coding begins.

6. **Review artifacts live in `docs/review/2026-04-24/`** — preserve as historical record.
