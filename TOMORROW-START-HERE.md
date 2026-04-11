# Next Session Start Here

**Last session:** Session 6 — Phajot migration + OCR + home refactor
**Status:** Complete, all features verified on real device
**Next session:** Session 7 — open to new priorities

## Quick context
- Phajot is live at phajot.com, app.phajot.com, api.phajot.com
- Legacy phanote.com domains redirect cleanly
- OCR bank statement scan fully shipped (LDB/JDB/BCEL)
- Dedicated TransactionsScreen with search + filters
- Heatmap + clickable donut drill-down in Analytics
- Home shows all today's transactions (sort fix shipped)

## What's ready for Session 7 (pick one)

### Priority A: LINE bot integration
Wife uses LINE daily. A LINE bot that accepts "coffee 50thb" and
saves directly to Phajot would be a killer feature. Uses existing
/parse endpoint. Estimated 2-3 hours.

### Priority B: Recurring transactions
Users have salary, rent, subscriptions. Defining rules + auto-creating
transactions on schedule. Medium scope, needs schema migration.

### Priority C: CSV export
One-button export filtered TransactionsScreen view to CSV.
Small scope, ~1 hour.

### Priority D: Wife testing + feedback capture
Walk wife through new features, capture reactions like Session 5 did.
Generates Session 8+ priorities from real user signal.

### Priority E: Bulk actions
Multi-select + bulk delete / bulk categorize in TransactionsScreen.
Moderate scope, ~1.5 hours.

## How to start Session 7

1. Open Codespace (remember: stop when done to save quota)
2. git pull origin main
3. npm run dev
4. Read docs/session-6/SUMMARY.md for full context
5. Tell Claude "continue with priority [A-E]" OR describe new priority

## Known things NOT to touch
- workers/phanote-api-worker.js (filename preserved, content renamed)
- @phanote.app email domain in auth (breaks existing users)
- Ph4n0te password prefix (same reason)
- localStorage phanote-* keys (preserves user preferences)
- Legacy phanote.com URLs in worker comment line 3 (historical marker)
