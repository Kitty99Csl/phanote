# PHAJOT — Live Roadmap

> **Status:** Current source of truth (live roadmap, updated every session wrap-up)

> Last updated: 2026-04-27 (Session 27 — Sprint M.2b3 SHIPPED; Sprint M FORMALLY CLOSED)

## Current State
- **Active sprint:** Sprint N (UX Hardening — Mobile) — pending Phase A live device audit
- **Production hash (Phajot main app):** **index-D8N37nO9.js** (Sprint M.2b3 deploy 2026-04-27, flipped from index-6cXL-RDb.js)
- **Tower bundle:** index-DX3GSv9O.js (Session 23 deploy, unchanged)
- **Worker version:** 4.8.2 (unchanged since Sprint I)
- **Supabase-js version:** 2.104.0
- **Migrations applied:** 16 (latest: 016 — `complete_pin_reset` SECURITY DEFINER RPC)
- **Latest commit:** `<this wrap>` (Session 27 wrap — Sprint M FORMALLY CLOSED)
- **Next action:** Sprint N Phase A live device audit (Speaker + wife, 30-45 min) — NON-NEGOTIABLE before any code work

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
| 🔥 **ACTIVE** | **Sprint N — UX Hardening (Mobile)** | Modal audit, keyboard-offset fixes, Sheet geometry rework | 2-3 sessions (~6-8 hrs) | **NEXT** — pending Phase A live device audit | Speaker + wife confirm active daily friction |
| ✅ DONE | **Sprint M — Truthfulness Hardening (FULL)** | M.1 + M.2a + M.2b1 + M.2b2 + M.2b3 across Sessions 24-27 | 4 sessions | **FORMALLY CLOSED 2026-04-27** | All Review-P1 truthfulness findings closed; wife scenario closed |
| ✅ DONE | **Sprint M.2b3 — StatementScanFlow truthful import (FINAL batch)** | handleAddTransaction return shape + handleImport honest counting + 3-state done UI + deleteBatch hardening | 1 session | **CLOSED 2026-04-27** | Commits 8edec33 + wrap |
| ✅ DONE | **Sprint M.2b1 + M.2b2 — BudgetScreen + streak/dedup/categories** | Screen-level writes hardening | 1 session | **CLOSED 2026-04-26** | Commits b539310 + f663579 + wrap |
| ✅ DONE | **Sprint M.2a — Truthfulness Hardening Part 2 (Section A)** | GoalsScreen rollback patterns | 1 session | **CLOSED 2026-04-25** | Commits c5bd19d + wrap |
| ✅ DONE | **Sprint M.1 — Truthfulness Hardening Part 1** | Backend helpers + loadUserData retry UI | 1 session | **CLOSED 2026-04-24** | Commits 3d0eba7 + wrap |
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

### Sprint M.2b3 — StatementScanFlow Truthfulness (Session 27) — CLOSED 2026-04-27 ★ Sprint M FINAL ★

| # | Commit | What | Status |
|---|--------|------|--------|
| 1 | 8edec33 | StatementScanFlow truthful import (handleAddTransaction return shape + handleImport honest counting + 3-state done UI + handleRetry + deleteBatch capture-revert-toast + 4 new i18n keys + Thai gap closures) | ✅ |
| 2 | `<this wrap>` | Session 27 wrap docs (includes CLAUDE.md Rule 22) | ✅ |

**Bundle:** index-6cXL-RDb.js → index-D8N37nO9.js (push → CF Pages flip in 31s)
**Risks closed:** Review-P1-3, OT-M-8 (Rule 22 added to CLAUDE.md), OT-M.2b3-1 through OT-M.2b3-6
**Open threads carried to Sprint N or P:** OT-M.2b3-extra-1 (batchId duplication on retry), OT-M.2b3-extra-2 (HomeScreen onDeleteBatch prop gap), OT-M.2b3-extra-3 (Tower warn-level log scraping)

**Sprint M (Truthfulness Hardening) FORMALLY CLOSES at this wrap commit.** 5 sub-sprints (M.1 + M.2a + M.2b1 + M.2b2 + M.2b3), 4 sessions (24-27), 9 commits, 8 files hardened, wife scenario closed.

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
| Session 26 (M.2b2) | index-6cXL-RDb.js | index-DX3GSv9O.js | 4.8.2 | Sprint M.2b2 streak + supporting |
| **Session 27** | **index-D8N37nO9.js** | index-DX3GSv9O.js | 4.8.2 | Sprint M.2b3 (M FINAL) ← current |

---

## Cross-sprint risk register (open items)

See `docs/RISKS.md` for full open/closed risk tracking. Open post-Session-27:

- **Review-P1-3** — CLOSED Session 27 (Sprint M.2b3 — StatementScanFlow truthful import shipped commit 8edec33)
- **Review-P1-5 partial** — GoalsScreen save/delete (DELETE + ADD CLOSED Sprint M.2a; updateGoal legacy throw audit deferred to Sprint N)
- **Review-P1-6** — ProUpgradeScreen inert CTA (DEFERRED — by-design pre-launch, Sprint K)
- **Review-P1-4** — Sheet.jsx + modal keyboard geometry (Sprint N — ACTIVE)
- **Review-P2-12, P2-13** — P2 findings remaining (Sprint N + Sprint P) — P2-7, P2-8, P2-10, P2-11 CLOSED Session 26; P1-3 closed Session 27
- **OT-M-5, OT-M-6** — Sprint P (Tower honesty)
- **OT-M-7** — Sprint N (handleUpdateCategory caller audit)
- **OT-M-8** — CLOSED Session 27 (merged to CLAUDE.md as Rule 22)
- **OT-M.2-1 through OT-M.2-6** — Sprint M.2a open threads; OT-M.2-6 → Sprint N (updateGoal legacy throw)
- **OT-M.2b3-extra-1, -2, -3** — Sprint N or Sprint P (cosmetic / observability — see Session 27 SUMMARY.md)

---

## Notes for next CTO / next Claude

1. **Sprint M ships from local Windows reliably.** Session 25 fixed the env (Node 24.13.1 + .env.local + lockfile-verified `npm ci`). Sessions 26-27 confirmed it works. Codespaces still available as fallback.

2. **Handler contract rule (OT-M-8) DONE.** Merged to CLAUDE.md as Rule 22 in Session 27 wrap. Future handlers must declare caller context (modal vs event) in design phase.

3. **OT-M-7 → Sprint N.** `handleUpdateCategory` Session 10 throw — verify `EditTransactionModal` and `QuickEditToast` callers have try/catch. Same applies to `updateGoal` in GoalsScreen (OT-M.2-6).

4. **Sprint M.2b3 (StatementScanFlow) shipped Session 27.** The highest blast radius batch landed clean — Phase A 5-question lock + 5 build steps + Phase C-Lite smoke + Phase D atomic commits, no rework. Pattern: design lock + paste-back review still pays for itself on high-risk batches.

5. **Sprint N starts with live device audit (Phase A) — NON-NEGOTIABLE.** Speaker + wife spend 30-45 min testing every modal on real iPhone before coding begins. This is the ONLY way to surface real keyboard-geometry friction. DevTools mobile sim does NOT substitute.

6. **Production deploy speed today: 31 seconds (push → hash flip).** Highly variable. Always poll the bundle hash, never assume timing. Always verify in incognito (Session 23.5 cache-lying learning).

7. **Review artifacts live in `docs/review/2026-04-24/`** — preserve as historical record.
