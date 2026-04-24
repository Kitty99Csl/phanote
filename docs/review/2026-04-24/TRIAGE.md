# External Review Triage — CTO Analysis

**Review source:** GPT Codex 5.4 + human peer review (AI consultant, company peer-to-peer)
**Review received:** 2026-04-24
**Analyst:** Chat Claude (CTO role) + code verification via project knowledge
**Purpose:** Filter signal from noise, prioritize action, shape roadmap pivot

---

## Review quality assessment

**Source strength:** HIGH.
- GPT Codex 5.4 reads actual code well (stronger than generalist LLMs at static analysis)
- Human peer adds product judgment an LLM alone can't provide
- Review is structured, file-level specific, and triaged by priority

**Confirmed post-verification:** ~70% of findings are legitimate code-level bugs; ~20% are partial (directionally right but miss nuance); ~10% are not-applicable (Tower scope misunderstandings, pre-launch state misread as bugs, docs hygiene).

**The review CAUGHT the same class of bug as R21-13 from Session 21.5** — that's a strong validation of the review's signal quality. R21-13 was fixed in isolation; this review shows the class pattern exists in 5+ other helpers.

---

## Finding-by-finding verdict

### P1 findings

#### F1: Profile-load failures misroute authenticated users to onboarding

**Source:** src/App.jsx loadUserData
**Code-verified:** YES. The try/catch silently swallows errors, then setLoadingProfile(false) fires with profile still null, which causes OnboardingScreen to render.

**Verdict:** LEGIT P1
**Severity:** HIGH — happens on any transient network failure. Wife on bad wifi could see onboarding today.
**Target:** Sprint M.1 Batch 3
**Estimated fix:** 30 min

---

#### F2: dbUpdateTransaction silent failures

**Source:** src/lib/db.js
**Code-verified:** YES. Multiple helpers have no error check. Same pattern across dbSaveMemory, dbUpsertProfile. dbTrackEvent has empty try/catch. Only dbInsertTransaction has error check (template for fix).

**Verdict:** LEGIT P1 — CONFIRMED BY HISTORY
**Severity:** HIGH — same class as R21-13. Every transaction edit could silently fail.
**Target:** Sprint M.1 Batch 1
**Estimated fix:** 45 min (4 helpers + verify all callers)

---

#### F3: StatementScanFlow reports success before saves land

**Source:** src/screens/StatementScanFlow.jsx handleImport
**Code-verified:** YES. Loop calls onAdd(txObj) fire-and-forget (no await). setSaveProgress counts up regardless of success. Step always reaches "done". onAdd in App.jsx calls dbInsertTransaction — which HAS error check — but the error doesn't propagate back to StatementScanFlow.

**Verdict:** LEGIT P1
**Severity:** HIGH — user scans BCEL statement, 19 of 20 transactions import silently, "Imported 20!" lies. Missing transaction surfaces as subtle analytics drift.
**Target:** Sprint M.2 Batch 3
**Estimated fix:** 45 min (signature change + loop fix + UX honest-count)

---

#### F4: Sheet.jsx mobile keyboard geometry breaks

**Source:** src/components/Sheet.jsx
**Code-verified:** PARTIAL. Sheet.jsx USES useKeyboardOffset correctly but has hardcoded assumptions:
- marginBottom hardcoded 90px for BottomNav
- maxHeight 88dvh minus same 90px — may leave no room on short phones
- translateY by kbOffset can over-translate on iOS Safari where visualViewport is flaky

**Plus:** Speaker + wife direct testimony: "buttons go off screen, input covered by menu bar"

**Verdict:** LEGIT P1 — CONFIRMED BY END USER
**Severity:** CRITICAL — wife-confirmed daily friction. Higher weight than any code review.
**Target:** Sprint N (entire sprint, needs live device audit first)
**Estimated fix:** 2+ sessions

---

#### F5: Edit/goal modals lose header while scrolling

**Source:** src/modals/EditTransactionModal.jsx, src/modals/GoalModal.jsx
**Code-verified:** NOT YET — needs live code check in Sprint N Phase A
**Verdict:** NEED LIVE VERIFICATION
**Severity:** Unknown until verified
**Target:** Sprint N Phase A audit

---

#### F6: ProUpgradeScreen inert primary CTA

**Source:** src/screens/ProUpgradeScreen.jsx
**Code-verified:** YES. Button literally has no onClick handler. File comment explicitly says "CTA button has no onClick handler (dead button)".

**Verdict:** LEGIT but INTENTIONAL
**Severity:** Not a bug NOW — Phajot is pre-launch, no payment gateway yet, Pro is manually toggled via is_pro=true in Supabase for family accounts. Becomes a required feature when Sprint K (public launch) starts.
**Target:** Sprint K (DEFERRED)
**Estimated fix:** Depends on payment provider choice

---

#### F7: GoalsScreen silent save/delete failures

**Source:** src/screens/GoalsScreen.jsx
**Code-verified:** PARTIAL. Post-Session-10 state:
- updateGoal — Has try/catch + error check (fixed Session 10)
- createGoal — Has error check
- performDeleteGoal — NO error check, optimistic filter happens regardless
- addSavings — NO error check, optimistic progress happens regardless

**Verdict:** LEGIT P1 — scoped to 2 functions
**Severity:** HIGH — these are the most common user actions on goals
**Target:** Sprint M.2 Batch 1
**Estimated fix:** 20 min (apply Session 10 updateGoal pattern)

---

### P2 findings (condensed)

| # | Source | Verdict | Target Sprint | Est fix |
|---|--------|---------|---------------|---------|
| P2-1 | QuickAddBar.jsx density on narrow phones | LEGIT (wife-confirmed) | Sprint N | 30 min |
| P2-2 | AiAdvisorModal.jsx loses header during chat | Need verification | Sprint N Phase A | — |
| P2-3 | AnalyticsScreen.jsx gap months stuck | LEGIT (minor) | Sprint N Phase D OR future | 20 min |
| P2-4 | HomeScreen.jsx forces Home tab on import close | LEGIT (minor UX) | Sprint N Phase D | 10 min |
| P2-5 | LoginScreen.jsx centered card on short screens | Need verification | Sprint N | — |
| P2-6 | OnboardingScreen.jsx omits Thai | LEGIT + TRIVIAL | Squeeze into Sprint M or N | 5 min |
| P2-7 | categories.js unknown-to-food collapse | LEGIT | Sprint M.2 (optional) OR future | 10 min |
| P2-8 | constants.js dedup key ignores currency/type | LEGIT | Sprint M.2 Batch 3 add-on | 15 min |
| P2-9 | GoalsScreen performDeleteGoal (dupe of F7) | — | Sprint M.2 | — |
| P2-10 | BudgetScreen no rollback on failed save | LEGIT | Sprint M.2 Batch 2 | 20 min |
| P2-11 | streak.js local/persisted drift | LEGIT (Session 10 flagged) | Sprint M.2 Batch 4 | 25 min |
| P2-12 | StatementScanFlow can't use custom categories | Design gap not a bug | Sprint N or backlog | 30 min |
| P2-13 | StatementScanFlow batch deletion weak error handling | LEGIT (same class as F2) | Sprint M.2 Batch 3 add-on | 15 min |

### Tower findings

| # | Source | Verdict | Target |
|---|--------|---------|--------|
| T1 | HeaderStrip hardcoded "System Nominal" | TRUE — known debt | Sprint P |
| T2 | Lobby hardcoded healthy metrics | TRUE — known debt | Sprint P |
| T3 | ShellLayout desktop-only | REJECT — intentional design (Tower is operator-only tool for Speaker on desktop) | Document in docs/tower/CHARTER.md as intentional |
| T4 | BrowserRouter SPA fallback | VALID — one-line CF Pages config | Sprint P (quick win) |
| T5 | Worker user_id null on AI logs | TRUE — known debt | Sprint P or Sprint O (since it's in /parse-statement path) |

### Doc findings

Reviewer is right that some older docs present as "current" when they're historical snapshots. Quick-win fix: add "Status: historical snapshot" banners to the 6 named files, point readers to docs/ROADMAP-LIVE.md.

**Target:** 30-min backlog task. Squeeze into any sprint with slack. Not a standalone sprint.

---

## Scope discipline — findings NOT included in any sprint

**T3 — Tower responsive shell:** REJECTED. Tower is intentionally desktop-only. Adding responsive support is pure scope creep unless Speaker decides to use Tower on phone. Worth documenting as an intentional design choice so no one "fixes" it later.

**Pro upgrade flow:** DEFERRED to Sprint K. Not a bug today.

---

## Review to Sprint mapping summary

| Sprint | Findings addressed | Est time |
|--------|-------------------|----------|
| **Sprint M** (Truthfulness) | F1, F2, F3, F7, P2-7, P2-8, P2-10, P2-11, P2-13 | ~5 hrs (2 sessions) |
| **Sprint N** (UX Hardening) | F4, F5, P2-1, P2-2, P2-3, P2-4, P2-5, P2-12 | ~6-8 hrs (2-3 sessions) |
| **Sprint O** (OCR instrumentation) | (separate review-independent scope) | ~2 hrs |
| **Sprint P** (Tower/worker honesty) | T1, T2, T4, T5 | ~2 hrs |
| **Sprint K** (Public launch) | F6 ProUpgrade, forever-docs, payment | ~10-15 hrs |
| **Backlog squeeze** | P2-6 Thai onboarding, docs authority cleanup, T3 documentation | ~45 min |

---

## What this review does NOT say

**It does not say Phajot is broken.** Family-beta works. Sprint I's recovery system shipped. Bundle hashes stable.

**It does not say Sprint I wasted time.** The recovery work was genuine engineering and production-ready.

**It says:** before adding more features on top, harden the trust layer that everything else stands on. Exactly the right diagnosis.

---

## Open threads for next session

1. **Phase A design questions for Sprint M.1** — locked at session start before any code
2. **Live device audit needed for Sprint N Phase A** — Speaker + wife spend 30 min documenting exact modal friction (screenshots, devices, modals)
3. **Verify reviewer was right about handleUpdateProfile, dbTrackEvent call sites** — may surface more catches to fix in Sprint M.1

---

*Generated by Chat Claude, 2026-04-24, after reading full GPT Codex review + project knowledge verification.*
