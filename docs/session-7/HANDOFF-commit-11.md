# Session 7 Refactor — Handoff at commit 11

**Written:** 2026-04-12, mid-session, before Claude Code context compact
**Branch:** session-7-refactor
**Tip after this handoff commit:** (will be the commit after commit 11)
**Previous tip:** commit 11 shipped — extract UI primitives

## Where we are

Session 7 is the **monolith refactor** of `src/App.jsx` from 5,480 lines
down to target ~200 lines, with all code moved into `src/lib/`,
`src/hooks/`, `src/components/`, `src/modals/`, `src/screens/`, and
`src/features/`. Plan is ~30 commits total. We're at commit 11.

**Oracle status:** Checkpoint #1 PASSED on real device. All 13 steps
green (10 core + 3 optional Lao/Thai parse + iOS keyboard). Preview
deployed via Cloudflare Pages. `main` branch untouched throughout.

## Commits shipped (1-11)

1. refactor(session-7): extract lib/theme.js
2. refactor(session-7): extract lib/constants.js
3. refactor(session-7): extract lib/store.js
4. refactor(session-7): extract lib/supabase.js
5. refactor(session-7): extract lib/db.js
6. refactor(session-7): extract lib/streak.js
7. refactor(session-7): extract lib/categories.js
7b. chore(session-7): remove 3 duplicate keys in normalizeCategory
8. refactor(session-7): extract lib/parser.js
9. refactor(session-7): extract lib/i18n.js
10. refactor(session-7): consolidate useKeyboardOffset hook
11. refactor(session-7): extract UI primitives (AnimalBg, Toast, Flag, Logo)

## Running totals

- App.jsx: 5,480 → 4,419 lines (−1,061, −19.4%)
- Bundle: 657.05 → 656.60 kB (−450 bytes from useKeyboardOffset dedup)
- `src/lib/`: 9 files
- `src/hooks/`: 1 file (useKeyboardOffset)
- `src/components/`: 5 files (Sheet pre-existing + 4 new)
- Zero regressions across 11 commits + 1 cleanup hotfix

## What commit 12 does

Extract Sheet-based modals (batch 1): ConfirmModal, QuickEditToast,
StreakBadge. ~100 lines total. All three use the shared Sheet
component and should be straightforward pure moves. Details will
come from chat Claude (Partner Claude) in the next session.

## Rules we've been following (DO NOT DEVIATE)

1. **Pure move.** No logic changes, no renames, no "improvements."
   If you notice a bug, write it down in a cleanup backlog; do NOT
   fix it in the same commit.

2. **Unicode byte-slice extraction.** For any block containing Lao
   (ພາສາລາວ), Thai (ภาษาไทย), or emoji characters: use
   `fs.readFileSync().split('\n').slice()` to capture exact bytes.
   NEVER retype Unicode characters by hand. Lesson learned commit 5
   when typing `ກີບ` instead of `กีບ` burned an Edit cycle.

3. **Pre-extraction audit for large object literals.** Before
   extracting any `const` with >30 keys, run a duplicate-key audit
   against App.jsx first. Lesson learned commit 7 — found 3
   pre-existing dupes in normalizeCategory that would have
   silently mis-categorized if missed.

4. **Post-extraction audit + behavioral sanity check.** After
   creating the new file, re-run the same audit and run a
   functional test via `npx vite-node` (raw Node ESM can't resolve
   sibling imports without .js extensions; vite-node handles it).
   Baseline counts must match exactly.

5. **Per-commit approval from chat Claude.** Every commit awaits
   approval before pushing. Report back with:
   - Pre-audit results (if applicable)
   - Post-audit results
   - Behavioral test output
   - Build tail
   - Grep sanity checks
   - Proposed diff summary
   - Line count delta

6. **Section headers left as orphans.** The `// ─── UI PRIMITIVES ───`
   style comments are left in place after their bodies are removed,
   accumulating for a final cleanup pass at the end of the refactor.

## Target file structure (from plan)

## Cleanup backlog (do NOT fix during extraction — end-of-session sweep)

- Remove TOASTS from lib/constants.js (dead code since before Session 7)
- Remove unused imports from App.jsx (XP_PER_TX, STREAK_BONUS, LEVELS,
  parseWithAI — preserved during extracts, flag for pruning)
- Remove orphan section headers (// ─── UI PRIMITIVES ───, etc)
- Delete dead auth files (src/pages/Login.jsx, src/store/authStore.js)
- Remove zustand from package.json if no consumers remain
- Investigate parseWithAI: it has 0 call sites — is the AI memory path
  broken or is it legitimately dead code?
- Audit store.get usage — dead writes to `phanote_extra_${userId}`?
- Consider adding getMonth(lang, mo) helper to lib/i18n.js
- Reconcile Sheet.jsx default export vs all other components' named exports

## Next actions when resuming

1. Read this file
2. Read src-App-jsx-snapshot.md
3. Read CLAUDE.md
4. Tell Kitty: "Handoff loaded. Ready for commit 12 instructions."
5. Wait for commit 12 prompt from Partner Claude (chat session).

## How to check everything is still in place

```bash
git log --oneline -12
wc -l src/App.jsx src/lib/*.js src/hooks/*.js src/components/*.jsx
npm run build
```

Expected:
- 12 commits visible (11 refactor + 1 hotfix + this handoff)
- App.jsx 4,419 lines
- Bundle builds clean, 71+ modules
