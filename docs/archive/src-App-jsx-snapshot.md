# src/App.jsx — Component Snapshot

> ⚠️ **SUPERSEDED — Do not use this document.**
>
> Session 7 refactored `src/App.jsx` from **5,480 lines → 345 lines** across 45 extracted files in `src/lib/`, `src/hooks/`, `src/components/`, `src/modals/`, `src/screens/`. The breakdown below describes the pre-Session-7 monolith and is no longer accurate. Kept for historical reference only.
>
> For the current App.jsx structure: just `cat src/App.jsx` (345 lines, thin root shell).
> For the refactor motivation + commit list: see Session 7 merge commit `0935ddf` and its branch history.
> For Session 8 Sprint A Ext changes on top of the refactor: see `docs/session-8/SUMMARY.md`.

---

**Generated:** 2026-04-12 (post Session 6, PRE Session 7 refactor)
**Total lines:** 5,480 (historical — now 345)
**Commit:** 9311d94
**Prior snapshot:** 3,381 lines (pre Session 6)
**Growth:** +2,099 lines across Session 6

> **Refactor watch:** The project rule is "any file > 800 lines must be split before adding features" — App.jsx was 6.8× over. ~~Session 5 planned a multi-layer refactor that has been deferred through every session.~~ **Shipped in Session 7 (commit `0935ddf`) — 5,480 → 345 lines, -93.8%, zero regressions.**

## Module-level (lines 1 – 1108)

| Line | Section | Lines | Notes |
|---|---|---:|---|
| 1 | Imports + Supabase client | 33 | React hooks, Supabase init with phone auth |
| 34 | AI memory + DB helpers | 141 | dbCheckMemory, dbSaveMemory, dbUpsertProfile, dbInsertTransaction |
| 175 | Theme tokens (T, CURR, fmt) | 17 | Celadon palette, currency formatters |
| 193 | DEFAULT_EXPENSE_CATS | 35 | 25 expense categories with emoji + lo/th/en labels |
| 228 | DEFAULT_INCOME_CATS | 11 | 8 income categories |
| 243 | normalizeCategory map | 103 | Huge alias map (food, coffee, transport, …) across 3 languages |
| 346 | localStorage store wrapper | 5 | get/set/del |
| 356 | useKeyboardOffset hook | 17 | iOS keyboard height tracking |
| 373 | **LOCAL PARSER v4** | **447** | ⚠️ **Refactor candidate**. Regex rules, CAT_RULES, fuzzy match, confidence tiers. The single biggest non-component block. Session 4 added confidence thresholds, Session 6 added `\b` fix for short currency codes. |
| 821 | i18n blocks (en / lo / th) | 227 | 3 language dictionaries; Session 6 added 12 new keys (heatmap, txCount, showingDate, etc) |
| 1050 | TOASTS + small helpers | 29 | TOASTS dict, AnimalBg, Toast, Flag, S style tokens |
| 1085 | Logo component | 23 | Responsive logo with 6 size tiers |

## Components (lines 1109 – 5480)

| Line | Component | Lines | Session 6 | Notes |
|---|---|---:|:---:|---|
| 1109 | `OnboardingScreen` | 87 | | Language → currency → categories flow |
| 1197 | `WalletCards` | 73 | | BCEL-style 3-currency wallet card |
| 1271 | `EditTransactionModal` | 78 | ✏️ | **Modified**: Session 6 added currency toggle, type flip (expense↔income), amount/description inline. Fixed stale closure bug on type flip. |
| 1350 | `ConfirmModal` | 45 | | Low-confidence parse review ("Did you mean?") |
| 1396 | `QuickEditToast` | 42 | | Category fix toast after optimistic add |
| 1439 | `OcrButton` | **249** | | ⚠️ 249 lines. Receipt photo OCR (Pro feature, separate from statement scan). Refactor candidate. |
| 1689 | `QuickAddBar` | 102 | | Bottom input bar with AI parse + OCR button |
| 1792 | `TransactionList` | 147 | | Date-grouped list, swipe-to-delete, note edit, category change |
| 1940 | `CategoryManager` | 49 | | Add/remove custom categories |
| 1990 | `SettingsScreen` | 163 | | Profile, language, Pro upgrade gate, statement scan entry |
| 2154 | `GoalModal` | 121 | | Create/edit savings goal |
| 2276 | `AddSavingsModal` | 43 | | Add progress to a goal |
| 2320 | `GoalsScreen` | 239 | | Goals list + progress + timeline |
| 2559 | `SetBudgetModal` | 90 | | Per-category monthly limit |
| 2650 | `BudgetScreen` | 150 | | Budget tracking by currency |
| **2801** | **`AnalyticsScreen`** | **515** | 🆕🔥 | ⚠️⚠️ **Largest component in file**. Session 6 added: heatmap calendar, summary line, above-avg dots, day popover, top 5 biggest days list, clickable donut slices, onOpenTransactions drill-down. **Primary refactor candidate** — split into AnalyticsHeatmap + AnalyticsDonut + AnalyticsTopDays. |
| 3316 | `getMonthName` + helpers | 28 | | Helpers for MonthlyWrapModal |
| 3345 | `MonthlyWrapModal` | 177 | | AI-generated monthly story (Pro) |
| 3523 | `StreakBadge` | 21 | | Home header streak pill |
| 3545 | `StreakModal` | 102 | | Full streak card with XP + levels |
| 3648 | `AiAdvisorModal` | 213 | | Claude Haiku advisor (Pro) |
| 3862 | `SafeToSpend` | 56 | | "You can still spend X/day" card on home |
| 3919 | `BottomNav` | 12 | | 5-tab nav |
| 3932 | `HomeScreen` | 143 | ✏️ | **Modified**: Session 6 added sortedTxs helper, TODAY/(N) header, txScreenFilters drill-down wiring, showTransactions state |
| **4076** | **`TransactionsScreen`** | **98** | 🆕 | **New in Session 6**. Full-screen overlay with search + 3-axis filter (period × currency × type) + pagination. Accepts initialFilters for drill-down from Analytics. Clean size. |
| **4177** | **`StatementScanFlow`** | **536** | 🆕🔥 | **New in Session 6**. Largest new component. 6-step flow: currency → upload → loading → review → saving → done. Inline editable review rows, batch history, cross-session dedup, currency mismatch handling. **Refactor candidate** — split into StatementUpload + StatementReview + StatementHistory. |
| 4714 | `ProUpgradeScreen` | 99 | | Pro plan upsell |
| 4814 | `GuideScreen` | 240 | | In-app help |
| 5055 | `PinLock` | 38 | | Owner/guest PIN entry |
| 5094 | `LoginScreen` | 64 | | Phone auth |
| **5159** | **`App` (root)** | **321** | ✏️ | Root orchestrator. Holds profile, transactions, handlers. Session 6 added batch_id propagation and delete-batch handling. Natural split point — the handler logic should become custom hooks. |

## Session 6 additions summary

### New components (2)
- `TransactionsScreen` (98 lines) — dedicated search/filter/paginate overlay
- `StatementScanFlow` (536 lines) — OCR bank statement import pipeline

### Heavily modified (4)
- `AnalyticsScreen` — heatmap + drill-down + popover + top days (+~240 lines)
- `HomeScreen` — sort fix, TODAY header, filter wiring
- `EditTransactionModal` — currency + type toggle, stale closure fix
- `App` (root) — batch_id, delete-batch, txScreenFilters state

### Lightly touched
- `OcrButton` — error handling polish
- `QuickEditToast` — date flow cleanup

## Refactor candidates (>300 lines)

| Component | Lines | Priority | Suggested split |
|---|---:|:---:|---|
| **LOCAL PARSER block** | 447 | HIGH | Extract to `src/lib/parser.js` (already has `src/lib/`) |
| **`StatementScanFlow`** | 536 | HIGH | StatementUpload + StatementReview + StatementHistory + useStatementScan hook |
| **`AnalyticsScreen`** | 515 | HIGH | AnalyticsHeatmap + AnalyticsDonut + AnalyticsTopDays + AnalyticsOverview |
| **`App` (root)** | 321 | MEDIUM | Custom hooks for tx CRUD, profile, streak toast |

## Dependencies with existing split-out files

- `src/components/Sheet.jsx` — keyboard-aware bottom sheet (already split out in Session 4)
- `src/lib/supabase.js` — client (still duplicated in App.jsx top-of-file, should converge)
- `src/lib/gemini.js` — exists but App.jsx uses fetch() directly to worker
- `src/store/authStore.js` — Zustand auth store (exists, partially used)

## Navigation tips for chat Claude

- Line counts above sum to ~5,480 (the full file)
- Section markers in code: `// ═══ COMPONENT NAME ═══` lines starting with `// ═` are section headers
- The file is structurally one big module: helpers → constants → parser → i18n → components → root App
- No default exports except `App` at line 5,159
- All state lives in the root `App` component; child components receive via props
