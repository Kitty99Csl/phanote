# Session 26 — Sprint M.2b1 + M.2b2 SHIPPED

**Date:** 2026-04-26  
**Theme:** Sprint M.2b — Truthfulness hardening (BudgetScreen + streak/dedup/categories)  
**Duration:** ~3 hours including pre-flight + Batch 2 + Batch 4 + supporting + breaks  
**Sprint:** M.2b (Parts 1 of 3 + 2 of 3 of 3)  
**Prior HEAD:** 0aac92b (Session 25 / Sprint M.2a wrap)  
**Post HEAD:** f663579 (M.2b2 feat) → <this wrap>

---

## Session outcome

**4 batches shipped to production today, across 2 feat commits + 1 wrap.**

| # | Batch | Commit | Bundle |
|---|-------|--------|--------|
| 1 | Sprint M.2b1 — BudgetScreen.saveBudget | b539310 | DekFTcxm → C3dtQtFg |
| 2 | Sprint M.2b2 — streak.js + constants.js + categories.js | f663579 | C3dtQtFg → 6cXL-RDb |
| 3 | This wrap | <hash> | hold at 6cXL-RDb |

**Five review findings closed:**
- Review-P2-10 — BudgetScreen no rollback on failed save
- Review-P2-7 — categories.js unknown → food/salary
- Review-P2-8 — constants.js txDedupKey missing currency/type
- Review-P2-11 — streak.js local/persisted drift
- Plus: Sprint M.2a's Review-P1-5 partial close completes structurally

**One open thread for next session:** Sprint M.2b3 = StatementScanFlow (Batch 3, the largest).

---

## Work completed

### Phase A — Design lock (~15 min)

Sprint M.2 Phase A questions confirmed:
- D-M2-Q1: StatementScanFlow honest count → A (deferred to M.2b3)
- D-M2-Q3: streak.js full revert → A (applied in M.2b2)
- D-M2-Q4 (NEW for M.2b1): BudgetScreen capture full budgets map → A

### Phase B Batch 2 — BudgetScreen.jsx (~15 min)

Single function `saveBudget` (L38) hardened:
- Capture `previousBudgets` map before optimistic mutation
- `{ error }` destructure replaces `res.error`
- `setBudgets(previousBudgets)` on catch (the actual revert)
- `throw e` removed (OT-M-8 compliance)

Both upsert (positive amount) and delete (zero amount) paths covered by single revert.

Smoke test: 4/4 passed (happy + offline failure for both upsert and delete paths).

Shipped: commit b539310, bundle DekFTcxm → C3dtQtFg in 25s.

### Phase B Batch 4 — streak.js (~10 min)

`updateStreak` hardened with telemetry-style pattern:
- `previousProfile = currentProfile` capture
- `{ error } = await ...` destructure
- `if (error) throw error` force catch on Supabase data errors
- Catch: `console.warn` + `setProfile(previousProfile)` + `return null`

Telemetry-style decision (not user-facing toast): streak update is a side-effect of transaction-add. If lib threw, caller's existing try/catch would fire `toastSaveError` lying about the transaction (which actually did save). Silent revert preserves truth.

No new i18n keys. No caller change needed (App.jsx L488 already gates celebration toast on `if (bonusToast)`).

### Phase B Supporting fixes — constants.js + categories.js (~5 min)

Two one-line truthfulness fixes:

**constants.js L3 (txDedupKey):**
- Before: `${date}|${amount}|${description}`
- After: `${date}|${amount}|${currency}|${type}|${description}`
- Bug fixed: same-day same-amount-description across LAK/THB/USD no longer collide; income vs expense gift of same amount no longer collide.
- Caller compatibility: all 4 call sites in StatementScanFlow.jsx pass full tx objects; no breakage.

**categories.js L156 (normalizeCategory fallback):**
- Before: unknown → 'salary' (income) or 'food' (expense)
- After: unknown → 'other_inc' (income) or 'other' (expense)
- Bug fixed: AI mis-categorizations no longer silently dump into Food/Salary, preserving wife's category data integrity.
- Both `other` and `other_inc` canonical IDs already existed (L36, L46) with neutral 📦 emoji + 3-language labels.

Combined commit f663579 with Batch 4. Bundle C3dtQtFg → 6cXL-RDb in 30s.

### Phase C — Smoke testing

- Batch 2 (Budget): full 4-test suite passed in browser under Node 24.13.1 / npm 11.8.0
- Batch 4 + supporting: skipped dedicated smoke (silent revert is invisible UX, data-quality changes have no UI surface)

### Phase D — Ship

Two atomic feat commits + 1 wrap commit (this one).

---

## Pre-session env setup

Local Windows env was set up Session 25; today's pre-flight verified:
- Node 24.13.1 active ✅
- npm 11.8.0 active ✅
- node_modules clean (137M, 0 vulns)
- .env.local intact
- Lockfile compatible
- Dev server boots in ~330-850ms

No env friction this session. Investment from Session 25 paid off.

---

## File manifest

### Modified (4 files)
- `src/screens/BudgetScreen.jsx` — saveBudget (+4/-3, M.2b1)
- `src/lib/streak.js` — updateStreak (+6/-2, M.2b2)
- `src/lib/constants.js` — txDedupKey (+1/-1, M.2b2)
- `src/lib/categories.js` — normalizeCategory (+1/-1, M.2b2)

### Unchanged
- `src/screens/StatementScanFlow.jsx` — DEFERRED to Sprint M.2b3 (next session)
- `src/screens/GoalsScreen.jsx` — already hardened in M.2a (Session 25)
- `src/lib/db.js` — already hardened in M.1 (Session 24)
- `src/App.jsx` — already hardened in M.1 (Session 24); will need cross-file change in M.2b3

---

## Metrics

| Metric | Value |
|--------|-------|
| Session duration | ~3 hours including breaks |
| Sub-sprints shipped | 2 (M.2b1 + M.2b2) |
| Functions hardened | 2 (saveBudget, updateStreak) |
| One-line fixes | 2 (txDedupKey, normalizeCategory) |
| Files modified | 4 |
| New i18n keys | 0 |
| ESLint new errors | 0 |
| Smoke tests run | 4 (Budget) |
| Commits | 3 (b539310 + f663579 + this wrap) |
| Bundle hash flips | 2 |
| Rollbacks | 0 |
| Review findings closed | 4 (Review-P2-7, P2-8, P2-10, P2-11) |
| Open threads carried | 1 (Sprint M.2b3 = StatementScanFlow) |

---

## Learnings

### 1. Pace flexibility within Sprint M

Original Sprint M.2 plan: single 2.5h session. Reality: Sprint M.2 split into M.2a (Session 25) + M.2b1 + M.2b2 + M.2b3 (next session). Each sub-sprint atomic.

Pattern works because each batch is independently valuable — wife sees real improvements without all-or-nothing.

### 2. Telemetry-style pattern joins the toolkit

streak.js Batch 4 introduced a third pattern variant alongside Sprint M.1's two:
- **Modal-callable handlers** throw (caller branches UX)
- **FAF event handlers** revert + toast no-throw (OT-M-8)
- **Background side-effects** revert + console.warn no-toast (Batch 4 streak.js, also dbTrackEvent)

The third variant is appropriate when the side-effect's failure shouldn't lie about the user-initiated action's status.

### 3. CC Phase 0 investigation pays off again

constants.js + categories.js fixes were one-liners. CC's investigation revealed:
- categories.js fallback infrastructure (`other`/`other_inc`) ALREADY EXISTED at L36, L46, L154 — fix at L156 just needed to use what was there
- txDedupKey caller compat already complete — all 4 call sites pass full tx objects

Without Phase 0, both fixes might have looked harder than they were. With Phase 0, they were 1-line each.

### 4. Pre-flight env check is now standard rhythm

After break + before any sprint work, pre-flight (Node, npm, env, dev server) takes ~30s and prevents 30+ min of mid-session debugging. Cemented as standard rhythm post Sprint M.1's Phase C deferral lesson.

### 5. CTO arithmetic estimation drift continues

Today's actuals vs estimates:
- Batch 2: spec ~+3/-2, actual +4/-3
- Batch 4: spec ~+5, actual +6
- Combined supporting: spec ~+9/-3, actual +10/-4

Pattern persists. CC's post-edit `wc -l` counts > CTO's pre-edit estimates.

---

## What Sprint M.2b1 + M.2b2 do NOT do

Scope discipline:
- ❌ NO StatementScanFlow.jsx — Sprint M.2b3 (next session, the BIG one)
- ❌ NO App.jsx handleAddTransaction return shape — Sprint M.2b3
- ❌ NO Sheet.jsx / modal geometry — Sprint N
- ❌ NO updateGoal Session 10 throw audit — Sprint N
- ❌ NO Tower changes — Sprint P
- ❌ OT-M-8 to CLAUDE.md merge — pending Sprint M.2b3 wrap (final Sprint M close)

---

## Next — Sprint M.2b3

Pre-locked scope:
- src/screens/StatementScanFlow.jsx handleImport — honest "Imported N of M" UX
- src/screens/StatementScanFlow.jsx deleteBatch — same Sprint M.1 pattern
- src/App.jsx handleAddTransaction — return `{ ok }` for caller to count failures
- New i18n keys: statementImportPartial, statementImportAllFailed (× 3 languages)
- 3-state UI in "done" step

**Estimated:** 1 session, ~75-90 min.

**Pre-flight requirement:** Speaker should be FRESH. Real money math, multi-currency batch import. Not a "let's push through" batch.

**5 design questions pre-drafted in CC's Phase 0 report:**
- D-Batch3-Q1: handleAddTransaction return shape (recommended: `{ ok }`)
- D-Batch3-Q2: App.jsx toast suppression during batch (recommended: isBatch flag)
- D-Batch3-Q3: deleteBatch toast strategy
- D-Batch3-Q4: New i18n key naming
- D-Batch3-Q5: "done" UI states (single template vs branched)

CC's Phase 0 investigation report archived in this session's transcript at the M.2b3 prep section.

---

*Session 26 closed 2026-04-26. Sprint M.2b1 + M.2b2 of M.2b complete.*
