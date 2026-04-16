# 🔍 TOWER — Risks from External Audits

### Cross-Check Between the Phanote QA & Product Audit PDFs and Current State · Version 1.0

> This document cross-references the findings from two external audits against Phajot's current state as of Session 9 (April 14, 2026) and assigns each to a specific sprint.

---

## 1. SOURCE DOCUMENTS

Two audit PDFs were provided by Kitty on April 14, 2026:

1. **Phanote QA & Product Audit** — code/UX/security review of the public GitHub repo. Reviewed App.jsx, core screens, components, parser, database helpers, Supabase auth helper, and the Cloudflare Worker.
2. **Phajot Homepage Improvement Report** — landing page review for clarity, trust, and conversion.

Both were written against Phajot code that predates Sessions 7, 8, and 9. Some findings are already addressed by subsequent work; some are still open. This document sorts them.

---

## 2. PHANOTE QA & PRODUCT AUDIT — FINDINGS STATUS

### Executive Summary from the Audit

> *"Overall assessment: good product foundation, medium engineering risk, high opportunity if the next 2–4 weeks focus on trust, consistency, and core flows rather than adding more features."*

This recommendation aligns exactly with the roadmap in `docs/tower/ROADMAP.md`. Sprints B, C, and D are the "trust, consistency, and core flows" phase the audit called for.

### Finding-by-Finding Status

| # | Audit Finding | Priority | Status | Assigned To |
|---|---|---|---|---|
| 1 | Replace pseudo-phone-auth with safer auth model | P0 | ✅ **Resolved in Session 11** · commit `770af58` + hotfix `8be34f5` · 2026-04-16 — LoginScreen rewritten with password auth, MigrationScreen for legacy accounts, deploy-verified on phone + desktop. Old `signInWithPhone` is dead code (zero callers). See `docs/session-11/SUMMARY.md`. | ~~Sprint C~~ — **done** |
| 2 | Fix statement import navigation end-state | P1 | 🟡 **Likely still open** — not mentioned in Session 5–9 summaries. Needs verification. | Backlog — flag for a future sprint |
| 3 | Finish i18n — hardcoded strings in login, onboarding, settings, wallet cards, modals | P1 | 🔴 **Still open** — marked as Sprint D marathon | **Sprint D** |
| 4 | Centralized modal / gate patterns (Pro + guest) | P1 | ✅ **Resolved in Session 10** · commits `05f8f7d` (Sheet migration) + `b6b2598` (ConfirmSheet for Pro gate) · 2026-04-15 — 9 modals now use Sheet, zero raw-div modals remain, Pro gate uses ConfirmSheet variant="upgrade". | ~~Sprint B Priority A + Sprint K~~ — **done** |
| 5 | Error handling for optimistic writes | P1 | ✅ **Resolved in Session 10** · commit `2e99fad` (toast system) · 2026-04-15 — 5 catch sites wired with multilingual toasts. 4 deferred sites documented in `docs/session-10/SUMMARY.md`. | ~~Sprint B Priority C~~ — **done** |
| 6 | Analytics render-time calculations (memoization) | P2 | 🟡 **Unknown** — Session 7 extracted AnalyticsScreen but memoization status not verified | Backlog — low priority, flag for Session 15 (Engine Room work) |
| 7 | Settings overload (control center feeling) | P2 | 🔴 **Still open** — audit recommends 5 clear sections | **Sprint D** |
| 8 | Native `alert()` / `window.confirm()` for OCR Pro lock + delete | P1 | ✅ **Resolved in Session 10** · commit `b6b2598` · 2026-04-15 — new `ConfirmSheet` component replaces all 6 sites (5 from initial grep + 1 bare `confirm()` in StatementScanFlow that the first grep missed). 9 i18n keys added (lo/th/en). | ~~Sprint C~~ — **done ahead of schedule** |

### Summary

**4 of 8 audit findings closed as of April 16, 2026.** Rows 1 (auth P0), 4 (modal/gate patterns), 5 (error handling), and 8 (native alert/confirm) all resolved across Sessions 10–11. **4 of 8 remain open**: row 2 (statement import nav, backlog), row 3 (i18n hardcoded strings, Sprint D), row 6 (analytics memoization, backlog), row 7 (settings overload, Sprint D). **Zero P0 findings remain open.** The remaining 4 are P1/P2. None require net-new engineering thinking — the fixes are understood. The roadmap in `docs/tower/ROADMAP.md` is specifically structured to close these in order.

**The audit's spirit matches the roadmap:** tighten what exists before adding anything new. Sprints B/C/D are the tightening phase.

### Audit Finding 2 — Statement Import Navigation

This finding is the only one where the current status is uncertain. The audit described:

> *"After import, the code closes the flow, opens transactions, and sets the background tab to home. That is logically inconsistent and can create confusing navigation state."*

**Action:** During Sprint B or C, verify the current statement import end-state. If still broken, add a ~1 hour fix to Sprint C scope.

### Audit Finding 6 — Analytics Memoization

This finding is also uncertain. Session 7 extracted `AnalyticsScreen.jsx` from the monolith, but pure-move refactors don't add memoization. The analytics screen likely still does filtering/sorting/grouping in render.

**Action:** Defer to Session 15 (Sprint G, Engine Room). When Tower's Engine Room reads from the same data sources, we'll naturally profile and memoize both surfaces at once.

---

## 3. PHAJOT HOMEPAGE IMPROVEMENT REPORT — FINDINGS STATUS

The homepage report is scoped to the marketing site at `phajot.com`, not the app at `app.phajot.com`. Every finding is about the landing page.

### Summary of Findings

| Finding | Status | Assigned To |
|---|---|---|
| Hero leads with poetry, not pain | 🔴 Open | Sprint K (landing rewrite) |
| Too many features competing for attention | 🔴 Open | Sprint K |
| Not enough proof (screenshots, demos, examples) | 🔴 Open | Sprint K |
| CTA strategy too broad | 🔴 Open | Sprint K |
| Premium messaging needs outcome language | 🔴 Open | Sprint K |

**All 5 landing page findings are deferred to Sprint K (Session 19+).** This is correct. Landing page work is launch-readiness work — there's no point rewriting it before Tower and the real auth are in place. A beautifully persuasive landing page that drives signups to a pseudo-phone-auth app is not a win.

### What to Save for Sprint K

The homepage report includes specific copy suggestions worth preserving verbatim for when Sprint K happens:

- **Hero headline options:** "Where did your money go? Phajot helps you see it clearly." / "Track daily spending in LAK, THB, and USD — without the usual hassle." / "Stop guessing. Start seeing where your money really goes."
- **Subheadline option:** "Built for life in Laos, Phajot helps you record spending in seconds, understand habits over time, and become more aware of where your money goes."
- **Problem block:** "You spend a little here, a little there, sometimes in kip, sometimes in baht, sometimes in dollars. At the end of the month, the money is gone — but the reason is not clear. Phajot turns that blur into a visible pattern."
- **Premium framing:** "Upgrade for faster logging, deeper monthly insight, cleaner summaries, and stronger awareness of your real spending behavior."

These match Phajot's warm, Lao-first brand voice. Iron Wolf (the Growth Sentinel) should own this work when Sprint K arrives.

---

## 4. CROSS-CUTTING INSIGHT

Reading both audits together surfaces one meta-finding that neither document says explicitly:

> **The code audit found the app is too silent. The homepage audit found the marketing is too loud. Both are trust problems in opposite directions.**

- The code silently swallows errors, silently drifts from the database, silently fails to deploy, silently uses a weak auth model.
- The marketing loudly lists features, loudly uses poetic language, loudly advertises Pro tiers with no proof underneath.

Tower's Sentinels address both at once:
- **Sentinel** makes the silent failures visible (error monitoring, uptime, RLS verification)
- **Iron Wolf** makes the loud marketing quieter and more honest (hero rewrite, proof strip, simplified CTA)

The same trust deficit shows up in both layers. The same mindset fixes both.

---

## 5. AUDIT RE-RUN SCHEDULE

The current audits were snapshots of code before Sessions 7–9. They should be re-run:

- **After Sprint D (Session 12, ~April 28)** — most P0/P1 findings should be closed by then. A fresh audit will give a clearer picture of what's actually still broken vs what was just stale-reading.
- **Before Sprint K (pre-launch)** — final audit before inviting strangers.

Each re-run should be done by either (a) a different auditor (GPT, Gemini, a human reviewer) or (b) the same auditor with updated code, never by the same AI that wrote the fixes.

---

## 6. WHAT THESE AUDITS DID NOT COVER

Important gaps — neither audit addressed these, but they matter:

- **Internal tooling needs.** Neither audit knew Tower was coming. Tower is structurally necessary and both audits missed it.
- **Observability gap.** No Sentry, no cost tracking, no audit log. Not in either PDF because both assumed they existed.
- **Schema drift.** The database has drifted from migrations. Not in either PDF because neither saw the SQL side.
- **Deploy pipeline fragility.** Session 9's silent deploy failure for 2 days. Not in either PDF because the audits were of code, not infrastructure.

All four of these are addressed in the roadmap (`docs/tower/ROADMAP.md`) but none came from the audits. They came from lived experience in Sessions 7–9.

**Lesson:** External audits are useful but partial. The best risk-finding comes from using the thing daily and writing down what hurts. That's what `docs/RISKS.md` is for.

---

## 7. CHANGELOG

| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-04-14 | Initial cross-check. 6 of 8 QA audit findings mapped to Sprints B/C/D. All 5 homepage findings deferred to Sprint K. Two findings (statement import, analytics memoization) flagged as needing verification. |
| v1.1 | 2026-04-15 | Session 10: rows 4, 5, 8 closed. 3 of 8 resolved. |
| v1.2 | 2026-04-16 | Session 11: row 1 (P0 auth) closed. 4 of 8 resolved. Zero P0 findings remain. |
