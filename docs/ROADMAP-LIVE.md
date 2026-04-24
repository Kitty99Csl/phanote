# PHAJOT — Live Roadmap

> **Status:** Current source of truth (live roadmap, updated every session wrap-up)

> Last updated: 2026-04-24 (Post-Sprint-I external review pivot — Sprints M + N inserted before all other planned work; full review artifacts in `docs/review/2026-04-24/`)

## Current State
- **Active sprint:** NONE — Sprint I CLOSED 2026-04-22. Sprint M scope-locked but not yet started. External review reshuffled the roadmap (see next section).
- **Production hash (Phajot main app):** index-CJY85dLV.js (unchanged since Session 21.6)
- **Tower bundle:** index-DX3GSv9O.js (Session 23 deploy, verified via incognito 2026-04-23)
- **Worker version:** 4.8.2 — deployed `api.phajot.com` 2026-04-21
- **Supabase-js version:** 2.104.0
- **Migrations applied:** 16 (latest: 016 — `complete_pin_reset` SECURITY DEFINER RPC)
- **Latest commit:** `<this wrap>` (roadmap pivot, docs-only)
- **Next action:** Sprint M.1 — Truthfulness Hardening (backend helpers)

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
- `SPRINT-M-SCOPE.md` — Sprint M definition of done + scope lock
- `SPRINT-N-PREVIEW.md` — Sprint N shape (pending Phase A live device data)

The review is authoritative guidance for the next ~4-5 sessions. Sprints I-real, J, and L are deferred until truthfulness + UX foundations are hardened.

---

## Revised roadmap — post-review priority stack

**Top = do first.**

| Priority | Sprint | Theme | Est. sessions | Rationale |
|----------|--------|-------|---------------|-----------|
| 🔥 **NEXT** | **Sprint M — Truthfulness Hardening** | All Supabase write helpers inspect `{ error }`; callers roll back optimistic UI on failure; profile-fetch-fail never routes to onboarding | 2 sessions (~5 hrs) | Same class as R21-13 bug from Session 21.5. Trust-level issue — wife+family depend on never being lied to about save success. |
| 🔥 NEXT | **Sprint N — UX Hardening (Mobile)** | Modal audit, keyboard-offset fixes, Sheet geometry rework, input path density, minimum-viable-device policy | 2-3 sessions (~6-8 hrs) | Speaker + wife confirm active daily friction. Buttons off-screen. Modals over-translated. Existential for retention. |
| 📋 Then | **Sprint O — OCR Instrumentation** | Migration 017 adds OCR columns to `ai_call_log`; worker `/parse-statement` populates them; data accumulates for ~1 week | 1 session (~2 hrs) | Prerequisite for Sprint I (real) and Sprint L. Was Session 24 plan; pushed back. |
| 📋 Then | **Sprint J — Tower Workshop + Archive** | Read-only docs-reading rooms for operator use | 1-2 sessions (~4-6 hrs) | Completes Tower v1 building metaphor. Lower priority — Tower serves its purpose as-is. |
| 📋 Then | **Sprint I-real — OCR Reliability Room** | Uses Sprint O data to build actual observability UI (per-bank error rates, confidence distribution, cost per 100 scans) | 2-3 sessions (~4-6 hrs) | Needs 1-2 weeks of data from Sprint O. Displaced original Sprint I scope. |
| 📋 Then | **Sprint L — OCR Pipeline Hardening** | Image preprocessing, bank validators, benchmark dataset, baseline accuracy | 2-3 sessions (~6-8 hrs) | Data-driven per Sprint I-real findings. |
| 🟡 Later | **Sprint P — Tower Honesty** | Real system state (not hardcoded), worker observability `user_id` population, SPA fallback | 1 session (~2 hrs) | Quick win once Sprint N done. |
| 🟡 Later | **Sprint K — Public Launch Prep** | Landing rewrite, LINE OTP, ToS + PDPA + Privacy, payment flow wiring | 4-5 sessions (~10-15 hrs) | Only after M, N, O, I-real. Forever-docs land here. |
| 🟢 Backlog | **Docs authority cleanup** | Relabel 6 named docs as historical snapshots, point to ROADMAP-LIVE.md | 30 min task (squeeze in) | Not a sprint, just hygiene. |

### What changed vs pre-review roadmap

**Before:**
Sprint I CLOSED → Sprint ?? (TBD) → Sprint J → Sprint L → Sprint K+

**After:**
Sprint I CLOSED → Sprint M → Sprint N → Sprint O → Sprint J → Sprint I-real → Sprint L → Sprint P → Sprint K

Sprints M and N are NEW (review-driven).
Sprint O was previously Session 24 pre-work; now formalized as a short sprint.
Sprint I gets re-scoped as "OCR Reliability Room only" since the admin-recovery scope is done.
Sprint P is NEW (review-driven, clean-up of Tower/worker truthfulness).
Sprint K is unchanged but further back in queue.

---

## Sprint archive

### Sprint A — Pre-Rules Discipline (Sessions 1-8) — CLOSED 2026-04-13
Session 1-8: initial build, MVP, bug fixes. No formal sprint structure.

### Sprint B — Stability Cleanup (Sessions 9-10) — CLOSED 2026-04-15
Session 9 RLS hardening (6/6 adversarial probes pass).
Session 10 Priority A/B/C — modal migration, parent-side hygiene, silent-error toast (commits 05f8f7d, 6b4911f, 2e99fad).

### Sprint C — Onboarding Refinement (Session 11) — CLOSED 2026-04-16
Sprint C: legacy auth migration, loginWithPassword. 8 commits. Key insight: auto-signup path removed for anti-enumeration.

### Sprint D — i18n Marathon (Sessions 12-14) — CLOSED 2026-04-17
All user-facing screens translated en/lo/th. 350 i18n keys.

### Sprint E — Observability foundation (Session 14) — CLOSED 2026-04-17
Migration 006: ai_call_log, ai_daily_stats matview, tower_admin_reads audit. Worker logs all AI calls. **Note per 2026-04-24 review: ai_call_log lacks OCR-specific columns per OQ-015 — Sprint O addresses.**

### Sprint F — Tower Rooms 1-3 (Sessions 15-17) — CLOSED 2026-04-20
Lobby, Health, AI Calls, Daily Stats rooms. Migrations 009/010 (admin_daily_stats wrapper view). 6/6 items + 2 bonus items.

### Sprint G — Engine Room (Session 18) — CLOSED 2026-04-19
Room 4 System Integrity HUD + hourly AI traffic chart. Migration 011 drift reconciliation. 2/2 items.

### Sprint H — Language Strings + Tower UX Redesign (Sessions 19-20) — CLOSED 2026-04-20
H-2: Migrations 012-013 translations table + 425-row seed. Main-app DB fetch + cache + Tower admin UI.
H-3: Full Tower design system redesign. Noto Sans Lao/Thai. 5/5 commits, zero rollbacks.

### Sprint I — Admin-Approved Recovery System (Sessions 21 + 21.5 + 21.6 + 22 + 23) — CLOSED 2026-04-22

**Part 1** — DB + worker + main-app UI (Session 21) — 4 commits
**Part 1.5** — Hotfix savePinConfig (98f758d) — R21-13 fix
**Part 1.6** — Account security (R21-14 password + R21-15 disable PIN)
**Part 2** — Tower Room 6 Admin Support Console (Session 22) — e1b3239 + 488f17e
**Part 3** — Backend hygiene batch (Session 23) — 048b408 + f626862

**Sprint I FORMALLY CLOSED 2026-04-22** — 5 sessions, 11 commits total, 16 risks resolved (14 CLOSED + 1 STRUCTURALLY READY + 1 WON'T-FIX). Admin-approved recovery system production-ready for family-beta.

---

## Cross-sprint risk register (open items)

See `docs/RISKS.md` for full open/closed risk tracking. Key open items post-review:

- **Review-P1-1** — Profile-fetch-fail routes to onboarding (Sprint M.1 target)
- **Review-P1-2** — `dbUpdateTransaction` + siblings silent-write (Sprint M.1 target)
- **Review-P1-3** — StatementScanFlow reports success before saves land (Sprint M.2 target)
- **Review-P1-4** — Sheet.jsx + modal keyboard geometry breaks on mobile (Sprint N target)
- **Review-P1-5** — GoalsScreen performDeleteGoal + addSavings silent (Sprint M.2 target)
- **Review-P1-6** — ProUpgradeScreen inert CTA (DEFERRED — by-design pre-launch, Sprint K target)
- **Review-P2-*** — Multiple P2 findings across categories.js, constants.js, streak.js, BudgetScreen, Tower (Sprint M.2 + Sprint P)

---

## Notes for next CTO / next Claude

1. **Sprint M is a trust-hardening sprint, not a feature sprint.** Scope discipline matters — no new features, only making existing writes honest.
2. **Sprint N needs Phase A live device audit from Speaker + wife before coding.** Cannot build without data.
3. **The review CAUGHT real bugs** that match R21-13 pattern exactly. Same class. Session 23's `savePinConfig` fix was the template for how to fix siblings.
4. **Review artifacts live in `docs/review/2026-04-24/`** — preserve as historical record.
5. **Sprint K (launch prep) is NOT next.** Trust + UX foundations come first.
