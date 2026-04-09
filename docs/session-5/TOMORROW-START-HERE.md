# PHANOTE — Session 5 Day 2 Start Guide
### Picking up after Monthly Wrap Phase 1A

---

## Current status

- Session 4: CLOSED (all wife feedback issues resolved)
- Session 5 Day 1: Monthly Wrap Phase 1A shipped (backend endpoint live)
- Session 5 Day 2 (next): Monthly Wrap Phase 1B (frontend UI)

## What's live right now

- Worker version 4.3.0 with /monthly-report endpoint
- Generates narratives in en/lo/th
- Stats computation tested with real data
- Accessible at https://api.phanote.com/monthly-report
- Kill switch active, rate limited

## What to do next session

**Primary task: Phase 1B — Monthly Wrap Frontend UI (60-90 min)**

### Claude Code prompt for investigation

Use this prompt to start:

```
MONTHLY WRAP PHASE 1B — Frontend UI

CONTEXT: Phase 1A is done. POST /monthly-report endpoint is live at
api.phanote.com and returns { narrative, stats, cached, model }.

The endpoint expects:
{
  user_id, month ("YYYY-MM"), lang ("en"|"lo"|"th"),
  transactions: [{d, t, a, c, cat, n}],
  prev_month_expense: { LAK?: number, THB?: number, USD?: number }
}

TONIGHT'S GOAL: Build the frontend UI to call this endpoint and display
the result.

INVESTIGATION PHASE:
1. Read src/App.jsx — find the Analytics/Summary section
2. Find where goals and budgets are displayed
3. Check if there's a natural place to add a "Monthly Wrap" card/button
4. Read the existing Sheet component pattern
5. Check how monthly_reports table is accessed (if at all)

PLAN:
a) Where to add the trigger button (Analytics screen? Dashboard?)
b) MonthlyWrapModal component using Sheet
c) How to compute prev_month_expense from the transactions array
d) Loading state while waiting for AI narrative
e) Display layout for narrative + key stats
f) Caching: check monthly_reports before calling worker, insert after
g) Error handling (worker down, empty month, etc.)

DO NOT code yet — show the plan first.
```

### After investigation, build:

1. **Trigger** — "Monthly Wrap" card in the Analytics section
2. **Modal** — MonthlyWrapModal using existing Sheet component
3. **Data prep** — compute prev_month_expense from loaded transactions
4. **API call** — POST to /monthly-report with correct payload
5. **Cache** — check monthly_reports table first, insert after generation
6. **Display** — narrative text + key stat cards (top category, biggest day)
7. **States** — loading spinner, error message, cached indicator

### Test cases

| Test | Expected |
|---|---|
| Click "Monthly Wrap" with transactions | Narrative appears in correct language |
| Click again (same month) | Cached result loads instantly |
| Switch language and regenerate | New narrative in new language |
| Month with 0 transactions | Graceful "no data" message |
| Worker is down (kill switch) | Friendly error, not raw JSON |

---

## Guard rails

1. **Use existing Sheet component** — no new modal patterns
2. **Don't refactor App.jsx** — that's a separate task
3. **Mobile-first** — test at 390px viewport
4. **Test in all 3 languages**
5. **One commit for the full Phase 1B**

---

## Files to touch

| File | What |
|---|---|
| src/App.jsx | Add MonthlyWrapModal + trigger button |
| (No worker changes) | Phase 1A is done |

---

## Quick start checklist

1. Open Codespaces + VS Code Desktop
2. `git pull origin session-4` (if needed)
3. Paste the investigation prompt to Claude Code
4. Review plan, then approve
5. Test on phone, commit, push

---

*"Phanote · ພາໂນດ · พาโนด — Lead your notes. Know your money."* 🐾🌿
