# Session 27 Opener — Phajot Sprint M.2b3

Use this when starting a fresh Claude session to close Sprint M with StatementScanFlow truthfulness.

## 1. Paste this exact message into the new session

> Phajot Sprint M.2b3 work.
> Please read in order: CLAUDE.md, docs/SPRINT-CURRENT.md, docs/session-26/SUMMARY.md, docs/session-26/DECISIONS.md.
> Then run env pre-flight check. We're closing Sprint M today with StatementScanFlow truthfulness.

## 2. Pre-flight check (Claude runs these)

```bash
node --version       # expect v24.13.1
npm --version        # expect 11.8.0+
git log --oneline -3 # expect HEAD: 100a27e
git status --short   # expect clean
curl -s https://app.phajot.com/ | grep -oE 'index-[A-Za-z0-9_-]+\.js'
# expect index-6cXL-RDb.js
```

## 3. Sprint M.2b3 scope

- StatementScanFlow `handleImport`
- StatementScanFlow `deleteBatch`
- App.jsx `handleAddTransaction` return shape
- 5 design questions are in [docs/SPRINT-CURRENT.md](../SPRINT-CURRENT.md)
