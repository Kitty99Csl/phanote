# Session 10 Summary — Sprint B: Trust & Safety Round 1

**Duration:** April 15, 2026 (single session)
**Commits shipped:** 3 (all on `main`, no working branch cut)
**RLS work:** 2 tables adversarially verified in Supabase SQL Editor by Speaker, no git commits
**Status:** Complete — all 4 Sprint B priorities shipped, Rule 11 satisfied at every step
**Branch:** `main` (direct, following Session 9 pattern)

## What happened

Session 10 was Sprint B — the first sprint of the Tower roadmap. Before Tower can be built, 4 prerequisite sprints must complete, and Sprint B was scoped as "stop silent failures, make busy states visible, finish what Session 8 started." Four priorities ran in order:

1. **Priority B** — parent-wrapper hygiene sweep (5 fire-and-forget `onSave` sites)
2. **Priority C** — shared toast system for Supabase write failures
3. **Priority A** — 3 remaining raw-div modals migrated to shared Sheet
4. **Priority RLS cleanup** — adversarially verify `app_events` and `monthly_reports`

All four shipped. Zero raw-div modals remain in the codebase. All 7 user-data tables now have adversarially-verified RLS. Silent DB write failures now surface to users through warm, multilingual toasts.

**Rule 11 compliance:** the production bundle hash was verified after every commit. All three commits flipped the hash cleanly:

| Stage | Commit | Hash | Verification |
|---|---|---|---|
| Morning baseline | — | `index-CWOl1l1h.js` | confirmed (Session 9 deploy) |
| After Priority B | `6b4911f` | `index-CZZVjtlT.js` | ✓ flipped on first check |
| After Priority C | `2e99fad` | `index-CiaE2sAV.js` | ✓ flipped on first check |
| After Priority A | `05f8f7d` | `index-CewyGnUw.js` | ✓ flipped after ~90s, stable across 2 checks |

The Priority A build took longer for CF Pages to deploy than the first two (which flipped instantly) — not unusual, CF Pages build times vary, and the hash still matched the local build byte-for-byte once it landed.

## The commits

### 1. `6b4911f` — fix(session-10): parent-wrapper hygiene sweep (5 sites)

Fixed 5 fire-and-forget `onSave` wrappers flagged in `docs/session-8/SPRINT-A-EXT-BACKLOG.md`. Used `GoalsScreen.jsx:252-253` as the positive template — the arrow function must **return** the Promise so the modal's `await onSave()` has something to wait on, making the click-guard busy state visible for the full save duration.

Sites fixed:

| # | Site | Problem | Fix |
|---|---|---|---|
| 1 | `BudgetScreen.jsx:159` | `onSave={amt => { saveBudget(...); setEditCat(null); }}` — braces block implicit return, modal awaits `undefined` | Strip braces: `onSave={amt => saveBudget(...)}`. Close handled by the modal's `onClose` after `await onSave` resolves. |
| 2 | `BudgetScreen.jsx:36` `saveBudget` | No try/catch. Supabase JS doesn't throw on DB errors — it returns `{ error }` — and the current code never checked for it. Two layers of silent failure. | Destructure `{ error }`, throw on it, wrap in try/catch that logs + rethrows so the modal stays open on failure. |
| 3 | `HomeScreen.jsx:71` `handleEditSave` | Same fire-and-forget pattern, plus `setShowEdit(false); setEditTx(null)` ran BEFORE the save fired — modal closed as if the save succeeded regardless of outcome. | Made `async`, reordered to close-after-save, wrapped the call in try/catch. |
| 4 | `HomeScreen.jsx:76` `dbSaveMemory` | `.catch(() => {})` — a fully silent error swallow on a background memory save. | Replaced with `.catch(e => console.error("dbSaveMemory error:", e))`. No toast (background, not user-facing). This catch will be picked up by Sentry in Sprint E. |
| 5 | `GoalsScreen.jsx:47` `updateGoal` | No try/catch, no `{ error }` check. On DB error the optimistic setGoals would still run. | Destructured `{ error }`, throw, log + rethrow. |

**Discovery flagged for Priority C:** `App.jsx:244 handleUpdateCategory` had `} catch (e) { console.error(...); }` with **no rethrow**. This meant the new `await` in site #3 was still toothless — even if the DB write failed, the swallowed-and-logged error turned the promise back into a successful resolution. Fixed in Priority C (see below).

### 2. `2e99fad` — feat(session-10): shared toast system for supabase write failures

New shared toast infrastructure:
- **`src/lib/toast.js`** — zero-dependency store using `useSyncExternalStore`. One toast at a time; a new toast replaces the current one. Exposes `showToast(message, type, duration?)`, `dismissToast()`, and `useToast()`.
- **`src/components/Toast.jsx`** — augmented, not replaced. The existing `Toast` export (used by HomeScreen for streak/quick notifications with `{msg, onDone}` API) stays byte-identical. Added a new `ToastContainer` export that reads from the store and renders an internal `StatusToast` card for error/success/info types. The collision with the existing name was avoided by keeping the error card as a file-private function.
- **Mounted once** at `App.jsx:347`, as the last child of the final `<>` fragment. Only renders on the "booted + pin unlocked + has profile" path, where all user-triggered Supabase writes happen.

Design decisions:
- **4-second auto-dismiss** + tappable to dismiss early
- **Respects `env(safe-area-inset-bottom)`** so the toast never sits under the home indicator on iPhone
- **Celadon-family color palette**: `#FFF4F4 / #F5C5C5 / #7A2020` for error, `#F0FDF4 / #BBF7D0 / #166534` for success, `#F7FCF5 / #D1F0D5 / #2D2D3A` for info
- **Warm copy**, never corporate. "Hmm, couldn't save that. Try again?" not "ERROR — write failed"
- **One toast at a time** — rejected "toast queue" as premature for a solo-user app; if it becomes a problem later, the store is 30 lines to rewrite

**i18n keys added** to `src/lib/i18n.js` in all three language dicts (en/lo/th):
- `toastSaveError` — generic save failure (transactions, categories)
- `toastBudgetError` — budget save failure
- `toastGoalError` — goal update failure
- `toastGenericError` — unused in Sprint B, reserved for Sprint C

Lao and Thai translations written by Claude as direct translations. **Flagged for wife review** — tone may feel off to a native speaker, especially the `toastSaveError` Lao wording ("ບໍ່ສາມາດບັນທຶກໄດ້") which is literal. Not blocking ship; fallback via `t()`'s implicit `||i18n.en[key]` chain works for any key missing from a dict.

**Wired into 5 catch blocks:**

| Site | Key | Notes |
|---|---|---|
| `BudgetScreen.jsx:36` saveBudget | `toastBudgetError` | Rethrows after toast so modal stays open |
| `GoalsScreen.jsx:47` updateGoal | `toastGoalError` | Rethrows after toast |
| `App.jsx:212` handleAddTransaction | `toastSaveError` | Does NOT rethrow — optimistic UX, user has already moved on |
| `App.jsx:244` handleUpdateCategory | `toastSaveError` | **Added the missing rethrow** from Priority B follow-up. Now site #3 from Priority B actually works end-to-end. |
| `HomeScreen.jsx:76` dbSaveMemory | **(no toast)** | Background save, not user-facing. Stays `console.error` only. Sentry will pick it up in Sprint E. |

**Catch blocks found but NOT wired this pass** (flagged for Sprint C or later):

| Site | Why deferred |
|---|---|
| `App.jsx:221` handleUpdateProfile | Settings write. Rarely fails; if it does, the optimistic state update is already visible. Low priority. |
| `App.jsx:227` handleUpdateNote | Transaction note edit. Marginal user-facing; failures are rare and the note field is low-stakes. |
| `App.jsx:253` handleDeleteTransaction | Uses `window.confirm()` — Sprint C is replacing native dialogs wholesale, so this path will be touched anyway. Defer to that pass. |
| `StatementScanFlow.jsx:78` delete batch | Niche recovery flow, already user-initiated via explicit button. Low priority. |
| `App.jsx:105/150/173/186` | Boot/init/login/onboarding paths — not user-triggered save errors, toast container isn't mounted on those screens anyway. |
| `App.jsx:198` `catch {}` | Background AI correction update — silent by design (user didn't ask for this save). |

### 3. `05f8f7d` — refactor(session-10): migrate 3 remaining modals to Sheet

Zero raw-div modals now remain in the codebase. The shared `Sheet` component is used by 9 modals total (was 6 after Session 8):

1. ConfirmModal
2. MonthlyWrapModal
3. OcrButton (confirm state)
4. AddSavingsModal (Sprint A)
5. AiAdvisorModal (Sprint A)
6. GoalModal (Sprint A Ext)
7. **EditTransactionModal** (this commit)
8. **SetBudgetModal** (this commit)
9. **StreakModal** (this commit)

Each migration followed the GoalModal pattern from commit `bacdf06`:

- Remove the outer `position:fixed` backdrop div and the inner `background:#fff, borderRadius, transform:translateY(-kbOffset)` wrapper — Sheet provides both
- Remove `useKeyboardOffset` import and hook call — Sheet has its own `useKeyboardOffset` internally and applies the transform at the Sheet level
- Pass save buttons (or Remove+Save button row) to Sheet's `footer` prop
- Preserve `useClickGuard` wiring byte-identical where it exists
- Wrap remaining children in a minimal padding div to replace the old scrollable div's `padding:"20px 20px 8px"`

**EditTransactionModal** — largest migration. 5 form fields (Name, Type, Currency, Amount, Category grid) all preserved byte-identical inside a `display:flex, flexDirection:column, gap:14, paddingTop:22, paddingBottom:8` wrapper. Save button moved to Sheet footer. Click-guard (`busy`, `run`, `save=()=>run(async()=>{await onSave(...); onClose();})`) preserved.

**SetBudgetModal** — two-button footer (Remove + Save). Both passed into Sheet's `footer` prop as a flex row (`Remove flex:1`, `Save flex:2`). Preserved click-guard on both handlers. Preserved `onKeyDown={Enter && save()}` on amount input.

**StreakModal** — simplest migration. No save action, no click-guard, no footer. Just a read-only info modal (level card, earn-XP list, milestones). Wrapper with `paddingTop:24, paddingBottom:24` inside Sheet.

**Cosmetic shifts (acceptable, match GoalModal migration):**
- Horizontal padding 20px → 24px in all 3 modals (Sheet's content zone uses `padding: "0 24px"`). 4px extra inset on left/right.
- Footer separator line (`borderTop:"0.5px solid rgba(45,45,58,0.06)"`) dropped from EditTransactionModal and SetBudgetModal. Sheet's footer has no separator by design — GoalModal migration also dropped this for a cleaner look.
- StreakModal's `zIndex:3000` → Sheet's `zIndex:1000`. StreakModal is triggered from streak toasts, which render above the Home tab content, so at `zIndex:1000` it still stacks correctly. Flagged but not a regression in the current codebase.
- EditTransactionModal and SetBudgetModal now sit ~90px above the bottom of the screen (Sheet's `marginBottom: calc(env(safe-area-inset-bottom) + 90px)`), consistent with the other 6 Sheet-migrated modals.

**Bundle impact:** -1.92 kB (662.78 → 660.86 kB), from the 3 `useKeyboardOffset` import deletions + collapsed wrapper divs.

## Priority RLS cleanup — completed by Speaker

Adversarial verification run by Speaker in Supabase SQL Editor, April 15, 2026. Using the same User B identity (`5e3629a1-aa60-4c25-a013-11bf40b8e6b9`) and same 3-probe pattern from Session 9. Two tables covered: `app_events` and `monthly_reports`. Results:

### app_events

| Probe | Expected | Actual |
|---|---|---|
| Cross-user SELECT | 0 rows | **0 rows** ✓ |
| Cross-user INSERT | ERROR 42501 RLS violation | **ERROR 42501** ✓ |
| Self SELECT | ≥ 0 rows, no error | **4 rows** ✓ |

### monthly_reports

| Probe | Expected | Actual |
|---|---|---|
| Cross-user SELECT | 0 rows | **0 rows** ✓ |
| Cross-user INSERT | ERROR 42501 RLS violation | **ERROR 42501** ✓ (confirmed by Speaker screenshot) |
| Self SELECT | ≥ 0 rows, no error | **0 rows** ✓ |

All 6 probes passed. Cross-user isolation is proven at the database level for both tables. See `docs/session-9/RLS-HARDENING.md` Session 10 addendum for the full record.

**Coverage is now complete.** All 7 user-data tables have adversarially-verified RLS:

| Table | Verified in | Policy shape |
|---|---|---|
| `profiles` | Session 9 | `auth.uid() = id` (FOR ALL) |
| `transactions` | Session 9 | `auth.uid() = user_id` (FOR ALL) |
| `budgets` | Session 9 | `auth.uid() = user_id` (FOR ALL) |
| `ai_memory` | Session 9 | `auth.uid() = user_id` (FOR ALL) — dropped the `USING(true)` leak |
| `goals` | Session 9 | `auth.uid() = user_id` (FOR ALL) — enabled RLS on the table |
| `app_events` | **Session 10** | canonical single-policy, cross-user isolation proven |
| `monthly_reports` | **Session 10** | canonical single-policy, cross-user isolation proven |

## Architectural decisions

### Why `useSyncExternalStore` over context/reducer for toast

React 18+ ships `useSyncExternalStore` specifically for "I have module-scoped state and want components to subscribe to changes." Using it here gave us:

- **Zero dependencies** — no zustand, no jotai, no redux, no custom context boilerplate
- **30 lines of code** in `src/lib/toast.js`
- **Concurrent-mode safe** — unlike naive `useState + listener` patterns, `useSyncExternalStore` handles tearing correctly in strict mode
- **The store can be called from anywhere** — including non-React code like `catch` blocks inside async handlers, because `showToast()` is just a function, not a hook

Trade-off considered: a toast queue (multiple toasts stacking) was rejected as premature. If a background job fires 10 errors in 10 seconds, the user sees only the most recent — which is fine because they're all "retry" prompts and the user only needs one reminder. If a real queue becomes necessary later, the rewrite is an afternoon of work.

### Why augment existing Toast.jsx rather than rename it

The existing `Toast` component at `src/components/Toast.jsx` is imported by HomeScreen at line 23 and used at lines 157 and 190 for streak bonus celebrations and quick messages — a different API (`{msg, onDone}`) with dark-background styling. Renaming it to make room for the new system would have touched HomeScreen imports and risked a regression in the streak celebration path, which is critical-path gamification.

Instead, the new system lives as `ToastContainer` in the same file, with the error card as a file-private `StatusToast` function to avoid re-exporting a clashing name. The old `Toast` export is byte-identical. Zero changes to HomeScreen.

### Why rethrow after toast (where applicable)

Four of the five wired catch blocks rethrow the caught error after logging + showing the toast. The reason is UX coherence: the modal wraps its save handler in `useClickGuard`'s `run()`, which does `await fn()` inside a try/finally. If `fn()` rejects, the modal's `onClose()` is never called (because it's on the line after `await`), so the modal **stays open**. The user sees their form state intact, sees the toast, and can retry. This is correct.

The one exception is `App.jsx:212 handleAddTransaction`, which does NOT rethrow. Reason: `handleAddTransaction` is the optimistic-UX "add a transaction" path from the main HomeScreen input. The user types in the bottom input bar, hits send, and by the time the Supabase insert completes they have already looked away. Throwing here would... do what? There's no modal to keep open. The toast alone is enough; the optimistic add already appears in the list and will disappear naturally on the next refresh if the server never confirmed it.

### Why Sheet's `zIndex:1000` is acceptable for StreakModal (was `zIndex:3000`)

StreakModal is the only Session 10 modal with a non-default z-index in its old raw-div form. It was set to 3000 because StreakModal can be triggered over a streak celebration toast that renders above the main content. At Sheet's default `zIndex:1000`, StreakModal still renders above:
- HomeScreen content (no explicit z-index)
- QuickEditToast (bottom sheet, `zIndex:999`)
- Streak `Toast` component (`zIndex:999`)

There is no UI element in the codebase that renders between `zIndex:1000` and `zIndex:9999` (where the toast container sits), so StreakModal will continue to render above everything it needs to. Flagged in the commit message in case a future modal ever claims `zIndex:2000+` and this becomes a stacking conflict.

## The 4 priorities in time order

| Priority | Approach | Time | Outcome |
|---|---|---|---|
| B — Parent wrappers | Read real code, discover the plan's "template" prose didn't match actual code (GoalsScreen.jsx:253 is terser than described), propose a shape, get approval, apply 5 sites atomically | ~45 min | Shipped as `6b4911f`. Hash flipped to `index-CZZVjtlT.js` on first check. |
| C — Toasts | Build infra, discover existing Toast.jsx collision, augment rather than replace, wire 5 sites | ~90 min | Shipped as `2e99fad`. Hash flipped to `index-CiaE2sAV.js` on first check. |
| A — Sheet migration | Read GoalModal pattern, migrate 3 modals one at a time, preserve click-guard + form field styles byte-identical | ~75 min | Shipped as `05f8f7d`. Hash flipped to `index-CewyGnUw.js` after ~90s (CF Pages slower this build). |
| RLS cleanup | Speaker ran probes in Supabase SQL Editor directly (no Claude Code involvement, no git commits). 6 probes, all passed. | ~10 min (Speaker time) | 7-table RLS coverage complete. Documented in RLS-HARDENING.md addendum. |

**Total elapsed work time:** ~3.5 hours, well under the Sprint B plan's 5–7 hour estimate. The plan's estimates were conservative; the actual work was less than expected because:
- Priority B's "5 fixes" were mostly the same shape (add try/catch, rethrow), so after the first one the pattern was templated
- Priority C's infra was simpler than feared because `useSyncExternalStore` removed the need for context boilerplate
- Priority A's migrations followed the GoalModal template closely and had zero unexpected edge cases
- RLS cleanup was 6 SQL queries running for seconds each

## Lessons learned

1. **Plan prose can lag real code.** The Sprint B plan described the `GoalsScreen.jsx:252-253` "positive template" as `async (patch) => { await updateGoal(goal.id, patch); setEditingGoal(null); }`. The actual code is `onSave={d=>updateGoal(editGoal.id,d)}` — a terser implicit-return pattern that works because `updateGoal` is `async` and the modal does `await onSave()` internally. Both shapes are correct, but the real code is 3x shorter. **Always verify the "template" claim in the plan against the actual file before writing a diff.**

2. **Supabase JS never throws on DB errors.** It resolves to `{ data, error }`. A catch block around `await supabase.from(...).update(...)` catches nothing except network-layer failures. To catch RLS violations, constraint violations, or any Postgres-reported error, you must destructure `{ error }` and explicitly throw. This is not obvious from the call site and is the root cause of every "silent write failure" in the codebase. **Every Supabase write site in the codebase should follow this pattern.**

3. **Rethrowing from a toast handler keeps the modal open, which is the correct UX.** The instinct is to log, show a toast, and "handle" the error silently so the user's save flow feels smooth. But that's wrong — if the save failed, the user needs to know their form state is still intact and they can retry. Rethrowing is what makes the click-guard keep the modal mounted. The toast is just the notification; the rethrow is the UX guarantee.

4. **File-name collisions between existing and new exports are a scope trap.** Priority C's plan said "create `src/components/Toast.jsx`" — but that file already existed, exporting a different component. The safest fix was to augment the file in place, adding the new `ToastContainer` export alongside the byte-identical old `Toast` export, with the error card as a file-private function to avoid shadowing the name. Renaming the old component would have been a smaller edit but larger blast radius. **When a new export collides with an existing one, augment; don't rename.**

5. **Sheet migrations are mostly mechanical after the first one.** The EditTransactionModal migration took the longest because I was still reading the Sheet component's padding/margin contract. By the time SetBudgetModal and StreakModal came up, the migration was a 3-step recipe (swap outer wrapper, remove `useKeyboardOffset`, move footer buttons). The pattern is now stable enough that the remaining new modals in Phajot (none, after this commit) wouldn't need a template.

6. **Priority B's `handleUpdateCategory` toothless-await was caught at the right time.** During Priority B I flagged that `App.jsx:244 handleUpdateCategory` swallows errors without rethrowing, making Priority B site #3's new `await` toothless. I deliberately did NOT fix it in Priority B because it was out of scope for that commit's purpose (5 sites, not 6). Priority C then picked it up naturally when wiring the toast, adding the rethrow + toast together. This is a good example of "noting a discovery without expanding scope" — the fix landed in the priority where it belonged, not in the priority where it was discovered.

7. **CF Pages deploy latency is non-deterministic.** Priority B and Priority C both flipped the production bundle hash on the very first `curl` check, within seconds of `git push` returning. Priority A took ~90 seconds for the same operation. The input didn't change — same CF Pages project, same Node version pin, same build command. Build times vary. **Don't treat "instant hash flip" as the baseline; always allow for up to a few minutes.** The scheduled wakeup pattern is the right tool here.

8. **`useSyncExternalStore` for module-level stores eliminates context boilerplate.** What would have been ~60 lines of React context + reducer + provider + consumer is 30 lines of subscribe/getSnapshot/notify. React 18+ apps should default to this for any "shared state that's not server state and doesn't need time-travel debugging."

## What's NOT in Session 10

- **New features** — LINE bot, recurring transactions, CSV export, bulk actions. Deferred per Session 9 request. Focus stays on stabilization until Tower's prerequisites are done (Sprints B–E).
- **Lao/Thai toast copy review** — Claude wrote direct translations. Flagged for wife review. Fallback via `t()`'s implicit English fallback chain means any missing or off-tone key gracefully degrades.
- **Schema drift capture migration** — `004_capture_current_schema.sql` still needed. Separate from Sprint B priorities. HIGH in RISKS.md.
- **Automated test suite (including RLS regression)** — Session 10's verification was manual (Speaker ran SQL), same as Session 9. No test harness yet. **Owner: Osiris (QA). Sprint: E.** Osiris' charter includes building the first automated test surface for Phajot — RLS regression is the first target because it's the highest-leverage coverage (one bug = data leak), but the harness will extend to parser accuracy, i18n key coverage, and smoke tests on the 5-second rule. Flagged HIGH in RISKS.md.
- **`handleUpdateProfile`, `handleUpdateNote`, `handleDeleteTransaction`, `StatementScanFlow` delete batch** — 4 catch sites flagged but not wired with toasts. Deferred to Sprint C's native-dialog replacement pass or Sprint D.
- **Priority F (wife testing)** — Sprint B plan included this as optional. Not executed in Session 10; can be a standalone check-in with wife at any point, doesn't need its own session.

## Native dialog replacement (bonus)

After Sprint B wrap-up and the schema drift capture migration, a further bonus priority shipped in the same Session 10: replacing every native `window.confirm()` / `alert()` call with a shared `ConfirmSheet` component. This was originally scoped as a Sprint C item. Closing it in Session 10 reduces Sprint C from 2 priorities to 1 (auth only).

Commit: `b6b2598`. Bundle: `index-CiaE2sAV.js` → `index-CewyGnUw.js` → `index-BeOPC5lm.js` (flipped ~90s after push, confirmed stable across two checks).

### Audit

Six sites identified in the frontend. The initial grep from the task prompt was `window\.confirm\|^[^/]*alert(` which correctly caught 5 sites but **missed one**: `StatementScanFlow.jsx:346` uses **bare `confirm()`** without the `window.` prefix, which slipped the pattern. A second grep caught it.

| # | Site | Call | Notes |
|---|---|---|---|
| 1 | `OcrButton.jsx:120` | `alert(...)` | Pro gate, hardcoded lo/th/en ternary: "ຟີເຈີ Pro — ຕິດຕໍ່ເຈົ້າຂອງແອັບ" / "ฟีเจอร์ Pro — ติดต่อผู้ดูแลแอป" / "Pro feature — contact the app admin to enable" |
| 2 | `GoalsScreen.jsx:43` | `alert(...)` | Error path on `createGoal` Supabase failure. Replaced with `showToast` (Priority C consistency rule: errors → toast, decisions → sheet). NOT replaced with ConfirmSheet. |
| 3 | `GoalsScreen.jsx:76` | `window.confirm(...)` | Delete goal confirmation |
| 4 | `App.jsx:257` | `window.confirm(...)` | Delete transaction confirmation |
| 5 | `App.jsx:270` | `window.confirm(...)` | Reset & clear all data confirmation (already had an i18n key for the message body via `reset_confirm`) |
| 6 | `StatementScanFlow.jsx:346` | `confirm(...)` (bare, missed by initial grep) | Delete batch of statement-scanned transactions |

### ConfirmSheet component

New file [src/components/ConfirmSheet.jsx](src/components/ConfirmSheet.jsx), 92 lines. Built on top of the shared `Sheet` wrapper — inherits safe-area-inset, keyboard offset, backdrop click-to-close, slide-up animation byte-identical. Three variants:

- **`variant="confirm"`** — cancel (grey) + confirm (celadon). Used for generic decisions.
- **`variant="confirm"` + `destructive=true`** — cancel (grey) + confirm (coral/red gradient `#E74C3C → #C0392B` with white text). Used for all 4 delete flows.
- **`variant="alert"`** (or any call with `onConfirm` omitted) — ONE full-width button. Not used in Session 10's 6 sites but available for Sprint C+ when one-button info dialogs are needed.
- **`variant="upgrade"`** — cancel (grey) + confirm (celadon with ✨ sparkle suffix on the label). Used for the OCR Pro gate as a warm "See Pro ✨" / "Not now" dialog.

Props API: `{ open, onClose, onConfirm?, title, message?, confirmLabel?, cancelLabel?, destructive?, variant? }`. `message` is optional — when omitted, the title alone is shown with no body text, which works well for simple delete confirms like "Delete this transaction?" that don't need additional explanation.

### i18n keys

Nine keys added to all three language dicts (en/lo/th) in [src/lib/i18n.js](src/lib/i18n.js):

- `confirmDeleteTransaction`, `confirmDeleteGoal`, `confirmDeleteBatchWithCount` (uses `{n}` placeholder, interpolated via `.replace("{n}", batch.tx_count)` at the call site)
- `confirmCancel`, `confirmDelete`
- `proLockTitle`, `proLockMessage`, `proLockUpgrade`, `proLockNotNow`

**`confirmDeleteGoal` was added beyond the original spec** — the task prompt listed 8 keys, but site #3 (GoalsScreen delete goal) needs a title distinct from "Delete this transaction?", so a ninth key was added as a natural extension. Flagged in the commit message.

**Lao/Thai copy review** — same Sprint B flag applies. Notable idiomatic choices:

- **`proLockNotNow` in Lao** → `ເອົາໄວ້ກ່ອນ` (more natural "keep it for later" than the literal "not now"). Lao idiom for gently declining without hard refusal.
- **`proLockNotNow` in Thai** → `ไว้ก่อน` (same "keep it for later" idiom, concise colloquial form).
- **`confirmDeleteBatchWithCount`** uses `{n}` interpolation. The `t()` helper doesn't have a built-in interpolation function, so the call site does manual `.replace("{n}", count)`. This matches the pattern already used by existing keys like `heatmapSummary` and `txCount`.

Claude wrote direct translations. Flagged for wife review before Sprint D's i18n marathon codifies all string coverage.

### Shared confirm state pattern in App.jsx

Two sites in App.jsx (#4 delete transaction, #5 reset app) needed confirm state. Instead of two separate `useState` hooks, they share one:

```js
const [pendingConfirm, setPendingConfirm] = useState(null);
// null | { kind: 'delete-tx', txId } | { kind: 'reset' }
```

Two `<ConfirmSheet>` instances render in the JSX, each with its own `open={pendingConfirm?.kind === "delete-tx"}` / `open={pendingConfirm?.kind === "reset"}` check. The `onClose` callback (`setPendingConfirm(null)`) is shared. Handlers split into two functions each:

- `handleDeleteTransaction(txId)` → `setPendingConfirm({kind:'delete-tx', txId})` (just triggers the sheet)
- `performDeleteTransaction()` → runs the actual Supabase delete, called from `onConfirm`
- Same split for `handleReset` / `performReset`

Cleaner than two separate state hooks, and scalable if future sessions add more confirm variants at the App root. GoalsScreen, StatementScanFlow, and OcrButton each kept local state because their confirm sites are isolated to that component and don't benefit from sharing.

### Z-index design choice

**Toast z-index `10001` > ConfirmSheet z-index `1000` is intentional.** If a Supabase write fails while the user has a ConfirmSheet open (e.g., delete transaction → confirm → DB write errors), the toast slides up above the open sheet rather than hiding behind it. Errors are always louder than decisions — the user sees the failure immediately, even mid-flow.

Conversely, a ConfirmSheet opening doesn't cover existing toasts (it slides up and renders below). The toast stays visible and either auto-dismisses or the user can tap it away.

### Closes audit P1 finding

Row 8 of the 8-finding audit table in `docs/tower/RISKS-FROM-AUDITS.md` ("Native `alert()` / `window.confirm()` for OCR Pro lock + delete") is now closed. Additionally, two other P1 findings in the same table were also already closed by earlier Session 10 work but hadn't been flipped yet:

- **Row 4 — Centralized modal / gate patterns** — closed by Priority A (commit `05f8f7d`, Sheet migration to 9 modals + zero raw-divs) combined with today's ConfirmSheet Pro gate (`b6b2598`).
- **Row 5 — Error handling for optimistic writes** — closed by Priority C (commit `2e99fad`, toast system wired into 5 catch blocks).

All three P1 findings are flipped to Resolved in this docs commit. After this commit, the audit findings table shows **3 of 8 closed, 5 of 8 still open** (down from 6 still open at start of day).

## Post-state

- **Local `main`**: `b6b2598` (will become `<docs commit>` after this file is committed)
- **`origin/main`**: `b6b2598`
- **Production `app.phajot.com`**: serving `index-BeOPC5lm.js` (native dialog replacement, deployed via CF Pages under Node 24.13.1)
- **Supabase RLS**: all 7 user-data tables adversarially verified. Canonical single-policy-per-table shape across profiles, transactions, budgets, ai_memory, goals, app_events, monthly_reports.
- **Worker**: `api.phajot.com` at v4.4.0, unchanged in Session 10
- **Sheet coverage**: 9 modals total, zero raw-div modals remaining
- **ConfirmSheet coverage**: 6 sites, zero native `alert()` / `window.confirm()` / bare `confirm()` calls remaining in the frontend
- **Toast system**: live, wired into 6 catch blocks (5 from Priority C + 1 from GoalsScreen createGoal error path in this bonus)
- **Schema drift**: captured in `supabase/migrations/004_capture_current_schema.sql` (289 lines), replay-safe
- **Working tree**: clean except `.claude/` untracked
