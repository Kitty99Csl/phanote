# 🏃 SPRINT B — Execution Plan (Session 10)

### Start here tomorrow morning · April 15, 2026

> This is the step-by-step plan for Session 10. Open this file first thing in the morning. Work through it in order. When a priority is done, check the box. If something blocks, stop and ask before pushing through.

---

## 🌱 Morning Check-In

Before you start writing any code, do these four things:

1. Open Codespaces. Wait for it to boot.
2. `git pull origin main` — should already be at `aa78f9e` + Session 9 docs wrap-up.
3. `nvm use 24.13.1` — verify `node --version` matches `.nvmrc` exactly.
4. `curl -s https://app.phajot.com/ | grep -oE 'index-[A-Za-z0-9_-]+\.js'` — confirm production is running `index-CWOl1l1h.js` or newer. Write the hash down somewhere — you'll check it again at the end of the session.

If any of these four fail, stop and investigate before writing any code. Session 9's entire lesson was "don't assume merged = shipped."

---

## 🎯 Sprint B Goal

Stop silent failures. Make busy states visible. Finish what Session 8 started.

**Definition of done for the whole sprint:**
- 5 parent-wrapper bugs fixed
- Shared toast system catches Supabase write failures
- `app_events` and `monthly_reports` RLS adversarially verified
- Sheet migration finished on 3 remaining modals (if time)
- Production bundle hash different from session start
- Wife's account still works after deploy

---

## ⚡ Priority B — Parent-Wrapper Hygiene Sweep

**Estimate:** ~1 hour · **Files touched:** 3

### The Pattern

The positive template lives at `GoalsScreen.jsx:252-253`. Look at it first. It's the shape every other wrapper should copy:

```javascript
onSave={async (patch) => {
  await updateGoal(goal.id, patch);
  setEditingGoal(null);
}}
```

The bug is the opposite shape — fire-and-forget, no `await`, swallowed errors:

```javascript
// WRONG
onSave={(patch) => {
  saveGoal(patch);
  close();
}}
```

Wrong-shape means: if `saveGoal` fails, nobody knows. The modal closes happily. The user thinks it saved. It didn't.

### The 5 Sites

Fix them in this order. Each is a 5–10 line change.

- [ ] **`BudgetScreen.jsx:159`** — fire-and-forget `onSave` wrapper on budget modal. Wrap in async, await the save, then close.

- [ ] **`BudgetScreen.jsx:36`** — `saveBudget` has no try/catch. Add try/catch. On error, show a toast (use the new toast system from Priority C — if Priority C ships first, use it; otherwise just `console.error` for now and come back after Priority C).

- [ ] **`HomeScreen.jsx:71`** — `handleEditSave` has the same fire-and-forget pattern as BudgetScreen. Same fix.

- [ ] **`HomeScreen.jsx` dbSaveMemory** — `.catch(() => {})` is swallowing errors. Replace with proper logging. This one should NOT show a toast to the user (memory save failure is background, not user-facing), but it MUST log to console so Sentry picks it up in Sprint E.

- [ ] **`GoalsScreen.jsx:47`** — `updateGoal` has no try/catch. Wrap it. Error path should show a toast.

### Verification

After all 5 fixes:

```bash
npm run build    # must build clean
npm run lint     # if lint is set up
```

Manual test on mobile viewport:
1. Open Phajot → add a transaction → edit it → save — confirm it works
2. Open Phajot → set a budget → save — confirm it works
3. Open Phajot → edit a goal → save — confirm it works
4. Try each with network throttled in DevTools to simulate slow save — you should see a spinner/disabled state, not an instant close

Commit as: `fix(session-10): parent-wrapper hygiene sweep (5 sites)`

---

## 🔔 Priority C — Error-Surfacing Toasts

**Estimate:** ~2–3 hours · **Files touched:** 5–7

### What to Build

A shared toast system that lives at the App root, receives error events from anywhere in the component tree, and displays them for a few seconds before auto-dismissing. Messages are multilingual.

### Implementation Sketch

**Step 1 — Create the Toast component**

New file: `src/components/Toast.jsx`

- Accept a `toast` object: `{ id, message, type: 'error' | 'info' | 'success', duration: 4000 }`
- Render as a bottom-of-screen floating card with celadon or red background (depending on type)
- Respect safe-area insets
- Dismiss on tap or auto-dismiss after `duration`
- Warm, friendly error copy — never "ERROR" or stack traces

**Step 2 — Create the toast store**

New file: `src/lib/toast.js`

- Zustand-style simple store OR React Context with useReducer
- Exposes `showToast(message, type)` and `dismissToast(id)`
- Mount `<ToastContainer />` once at App root

**Step 3 — Wire into the catch blocks**

Replace silent catches with toast calls:

- `dbInsertTransaction` catch → `showToast(t('errorSave'), 'error')`
- `saveBudget` catch → `showToast(t('errorBudget'), 'error')`
- `updateGoal` catch → `showToast(t('errorGoal'), 'error')`
- `dbSaveMemory` catch → keep silent (background), but `console.error` so Sentry catches it in Sprint E

**Step 4 — Add i18n keys**

In `src/lib/i18n.js`, add to all three language dicts:
- `errorSave` — "Hmm, couldn't save that. Try again?" / Lao / Thai equivalents
- `errorBudget` — "Budget didn't save. Try again in a moment?"
- `errorGoal` — "Goal didn't update. Try again?"
- `errorGeneric` — "Something didn't go through. Try again?"

Copy should be warm, never blame the user, always offer a next step. Follow Codex §14 brand voice.

### Verification

- Force a Supabase error (disconnect network briefly) → toast appears
- Toast auto-dismisses after 4 seconds
- Toast is tappable to dismiss early
- Toast works on iPhone SE (375px) without getting cut off by keyboard
- Toast text appears in the user's current language
- No toast appears for successful saves (success is silent, failure is loud)

Commit as: `feat(session-10): shared toast system for supabase write failures`

---

## 🛡 Priority RLS Cleanup

**Estimate:** ~15 minutes · **Files touched:** 0 (pure SQL in Supabase dashboard)

### The Task

Run the 3 adversarial probes from `docs/session-9/RLS-HARDENING.md` against two tables that weren't verified in Session 9:

1. `app_events`
2. `monthly_reports`

### The Probes

For each table, open Supabase SQL Editor, run these as a single transaction:

```sql
-- Impersonate User B (the test user from Session 9)
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claims = '{"sub":"5e3629a1-aa60-4c25-a013-11bf40b8e6b9"}';

-- Probe 1: Can User B SELECT Kitty's rows? (should return 0)
SELECT count(*) FROM app_events WHERE user_id != '5e3629a1-aa60-4c25-a013-11bf40b8e6b9';

-- Probe 2: Can User B INSERT as another user? (should ERROR)
INSERT INTO app_events (user_id, event_type, event_data)
VALUES ('00000000-0000-0000-0000-000000000000', 'test', '{}'::jsonb);

-- Probe 3: Can User B SELECT their own rows? (should return ≥ 0, not error)
SELECT count(*) FROM app_events WHERE user_id = '5e3629a1-aa60-4c25-a013-11bf40b8e6b9';
```

Repeat the same 3 probes against `monthly_reports`.

### Expected Results

| Probe | app_events | monthly_reports |
|---|---|---|
| Cross-user SELECT | 0 rows | 0 rows |
| Cross-user INSERT | ERROR 42501 | ERROR 42501 |
| Self SELECT | ≥ 0 rows (no error) | ≥ 0 rows (no error) |

If all 6 probes pass: both tables are verified. Update `docs/session-9/RLS-HARDENING.md` with a small addendum: *"app_events and monthly_reports verified 2026-04-15 by Speaker."*

If any probe fails: stop, investigate, fix the RLS policy, re-test. Do not move on to Priority A.

No git commit needed — this is a database operation, logged in `RLS-HARDENING.md`.

---

## 🎨 Priority A — Sheet Migration Finish (If Time)

**Estimate:** ~2 hours · **Files touched:** 3

### Scope

Three raw-div modals still exist. Migrate them to the shared `Sheet` component using the `GoalModal` pattern from commit `bacdf06`.

- [ ] `src/modals/EditTransactionModal.jsx`
- [ ] `src/modals/SetBudgetModal.jsx`
- [ ] `src/modals/StreakModal.jsx`

### The Rules

1. **Preserve byte-identical `useClickGuard` wiring.** Do not change prop shapes.
2. **Preserve `kbOffset` behavior.** `Sheet` handles keyboard offset internally, so hand-rolled math should be removed, not preserved.
3. **Test each modal on iPhone SE viewport before moving to the next.** Session 7's pure-move refactor taught us that "looks the same" is not the same as "works the same."
4. **Commit each modal separately.** Three modals → three commits. Easier to revert if one breaks.

### Skip If

- You've been working for 4+ hours already — Priority A is genuinely optional and can slip to Session 11
- Any earlier priority took longer than estimated — don't push through exhaustion
- Real-device testing fails on any migrated modal — stop, investigate, don't move on

Commit as: `refactor(session-10): migrate EditTransactionModal to Sheet` (and similar for the others)

---

## 🌇 End-of-Session Checklist

Before you close Codespaces:

1. [ ] All intended commits are on a branch, pushed to `origin`
2. [ ] PR created (or direct merge to main if following Session 9 pattern)
3. [ ] **After merge:** `curl -s https://app.phajot.com/ | grep -oE 'index-[A-Za-z0-9_-]+\.js'` — confirm the hash is different from this morning's
4. [ ] Real device test: open `app.phajot.com` on iPhone → add a transaction → confirm no regressions
5. [ ] Update `docs/session-10/SUMMARY.md` (create if it doesn't exist) with what shipped
6. [ ] Update `docs/RISKS.md` — remove any risks that this session closed
7. [ ] Update `TOMORROW-START-HERE.md` — point to Sprint C for next session
8. [ ] Stop the Codespace to save quota

**Rule 11 is the hard one.** Do not mark Sprint B as "done" until production's bundle hash is confirmed different. "Merged to main" is not "shipped to users." Session 9 cost us 2 days of silent failures for forgetting this.

---

## 💚 Remember

You're doing this because the audit said so, and because silent failures are the worst user experience. Each fix today eliminates a class of bug forever.

- Take breaks. Drink water. Eat lunch.
- Wife is your best QA — show her the toasts in action if she's around.
- One commit per logical unit of work. Atomic, reversible, reviewable.
- If something feels harder than expected, stop and ask. The plan is not sacred.

**Sprint B is the first brick in the wall. Lay it well. Everything above it depends on it being straight.** 🐾

---

## 📋 Quick Reference Card

| Priority | Est | Files | Done? |
|---|---|---|---|
| B — Parent wrappers | 1h | 3 | [ ] |
| C — Toasts | 2–3h | 5–7 | [ ] |
| RLS cleanup | 15m | 0 (SQL) | [ ] |
| A — Sheet migration | 2h | 3 | [ ] (optional) |

**Total estimated:** 5–7 hours · **Minimum to call Sprint B done:** B + C + RLS cleanup (Priority A is optional)
