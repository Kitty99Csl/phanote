# Sprint A Extension — Backlog flagged during zombie-modal sweep

Items discovered while applying useClickGuard across modals.
Not fixed in this sprint; queued for Sprint B or later.

## Parent-side wrapper bugs (related to click-guard effectiveness)

### BudgetScreen.jsx:159 — fire-and-forget onSave wrapper
Current:
    onSave={amount => { saveBudget(editCat.id, selectedCur, amount); setEditCat(null); }}

Problem: `saveBudget` is async but the wrapper does not await it.
The Promise is discarded. Modal's visual busy state never shows
because the wrapper returns undefined instantly.

Fix: make the wrapper async and await:
    onSave={async amount => { await saveBudget(editCat.id, selectedCur, amount); setEditCat(null); }}

### BudgetScreen.jsx:36 — saveBudget has no try/catch
Async function with optimistic state update + Supabase upsert.
On failure, throws an unhandled rejection. User sees no error.
Adds to the "surface insert errors as toasts" backlog.

## Other patterns to audit in Sprint B

- HomeScreen / TransactionsScreen / BudgetScreen / GoalsScreen
  save handler patterns (verify each screen's parent wrappers
  properly await modal callbacks and close after)
- 4 unguarded fetch() calls still need fetchWithTimeout helper
- Native browser dialogs → shared ConfirmDialog

### HomeScreen.jsx:71 — handleEditSave is sync, fires async updates without awaiting
Current:
    const handleEditSave=(updated)=>{
      if(!editTx)return;
      setShowEdit(false);setEditTx(null);
      onUpdateCategory(editTx.id, updated.categoryId, ...);
      ...
    };

Problem: onUpdateCategory is async but the wrapper doesn't await.
Same fire-and-forget pattern as BudgetScreen:159. Modal's busy
state flashes ~0ms because parent returns undefined. Should be
async and await.

### dbSaveMemory fire-and-forget in HomeScreen.handleEditSave
Current:
    dbSaveMemory(...).catch(()=>{});

Memory write failures are invisible to user. Same error-swallowing
pattern noted earlier. Belongs in the error-surfacing backlog.

### GoalsScreen.jsx:47 — updateGoal has no try/catch
Current:
    const updateGoal = async (id, data) => {
      await supabase.from("goals").update(data).eq("id", id);
      setGoals(prev => prev.map(g => g.id === id ? { ...g, ...data } : g));
      setEditGoal(null);
    };

Problem: if the Supabase update fails, it throws an unhandled
rejection, and the optimistic local state update still runs —
leaving the local state out of sync with the database. User sees
no error. Fix: add try/catch, show a toast on error, skip the
local update if DB failed.

## ✅ Positive example — use as template for Sprint B

### GoalsScreen.jsx:252-253 — parent wrappers done RIGHT
Both createGoal and updateGoal wrappers:
  1. Are async and return their Promise implicitly or explicitly
  2. Await the Supabase call before closing the modal
  3. Close the modal AFTER the await resolves (not before)

This means GoalModal's useClickGuard busy state is visible for the
~100-500ms Supabase call — real user feedback, not cosmetic.

When fixing BudgetScreen:159 and HomeScreen:71 (fire-and-forget
wrappers noted earlier), use these GoalsScreen wrappers as the
template. Both need only:
  - async arrow wrapper
  - await the inner call
  - set state to close after the await

### StatementScanFlow — missing Thai translations for statementError* keys
The StatementScanFlow i18n keys use a 3-key + partial pattern.
Existing keys (statementErrorParse, statementErrorNetwork,
statementErrorRateLimit) all have EN + LO but no TH entries.
Sprint A Ext added statementErrorTimeout following the same
partial pattern.

Thai users fall back to English via t() helper. Not a regression
from Sprint A Ext — this gap has existed since Session 6 when
StatementScanFlow was written. Add all 4 Thai keys in the Sprint D
i18n marathon.

Keys needing Thai:
- statementErrorParse
- statementErrorNetwork
- statementErrorRateLimit
- statementErrorTimeout (added Sprint A Ext Hour 2)
