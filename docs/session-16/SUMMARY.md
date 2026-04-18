# Session 16 SUMMARY

**Date:** 2026-04-19
**Duration:** ~5 hours (budget: 4+ hours, shipped within budget)
**Speaker energy:** fresh → full engagement after a day offline
**Sprint:** F (Tower Lobby) — continues into Session 17
**Items shipped:** 2 (admin gate) + 4 (Room 1 /health) per DECISIONS.md Q6

## Scope result

| Item | Locked in DECISIONS.md | Shipped |
|---|---|---|
| Item 2 — admin gate + Migration 007 + phantom backfill | Q1-Q2 | ✅ |
| Item 4 — Room 1 /health module cards | Q3 | ✅ |
| Item 5 — Room 2 ai_call_log | deferred to Session 17 per Q6 | — |
| Item 6 — Room 3 ai_daily_stats | deferred to Session 17 per Q6 | — |

## Commits (this session)

- `cd78bc2` — Drift cleanup: ROADMAP-LIVE + SPRINT-CURRENT aligned to DECISIONS.md Q6
- `f2494c0` — Q2 amendment: split Migration 007 from 008 (Vanguard consultation adopted)
- `c3e7307` — Migration 007 written (profiles.is_admin column + preflight guards)
- `186a819` — Migration 007 preflight fix (Path B: semantic policy check, not name-exact)
- `fc9c6d6` — Tower Supabase SDK install + lib/supabase.js mirror (Phase 2 Part 1)
- `ae587a9` — Tower admin gate: hook + login + denied + App.jsx wiring (Phase 2 Part 2)
- `d4c58e5` — Migration 008 (phantom backfill: admin_logs, user_feedback, user_sessions)
- `ca85d44` — Room 1 /health module cards (Sprint F Item 4)
- `[this-wrap-commit]` — Session 16 wrap (SUMMARY + SPRINT-CURRENT + ROADMAP-LIVE + DECISIONS outcomes)

**Total: 9 commits, zero rollbacks.**

## Decisions locked during session (overrides/refinements)

1. **Q2 amendment (split 007/008)** — Vanguard flagged coupling risk on combined migration. Adopted split. DECISIONS.md Q2 amended with reasoning.
2. **Migration 007 Path B (semantic policy check)** — First 007 run aborted on policy name mismatch. Production policy `profiles_policy` vs migration file's `profiles_user_access`. Fixed by checking policy SEMANTIC invariant (FOR ALL + `auth.uid() = id`), not exact name. Naming drift logged in RISKS.md as LOW reconciliation debt.
3. **Tower auth = Option Z** — Phone+country+password form, mirror only `buildEmail()` per Rule 16, no legacy fallback.
4. **Auth domain `@phanote.app`** — Legacy auth preservation, NOT drift from Phajot rename. CLAUDE.md brand-identity rule enforces this.
5. **Room 1 manual refresh only** — Revised from DECISIONS.md Q3's "optional 30s auto-refresh" to manual only for v1. Auto-refresh deferred to Session 17+.

## Three-layer defense-in-depth (now live)

```
tower.phajot.com
     ↓
[1] Cloudflare Access Zero Trust (edge) ← Session 15
     ↓
[2] Tower Supabase login (app layer) ← THIS SESSION
     ↓
[3] profiles.is_admin RLS check (database) ← THIS SESSION
     ↓
Lobby renders + Room 1 /health shows live data
```

## Learnings (for docs/patterns.md consideration)

1. **`wc -l` ≠ number of lines.** Counts newline characters. A 2-variable file with no trailing newline reports `wc -l = 1`. Don't use this as a completeness check; use `grep -c "^VITE_"` or similar semantic check instead.
2. **Migration preflights should assert SEMANTIC invariants, not exact names.** When Migration 007's first run aborted on policy-name mismatch, the underlying security state was correct — just renamed. Preflight asserting `cmd = 'ALL' AND qual = '(auth.uid() = id)'` is more robust than `policyname = 'profiles_user_access'`. Pattern: names drift, semantics don't.
3. **Env vars must be provisioned in production separately from local.** Tower Supabase SDK worked locally (reads tower/.env.local), but CF Pages build saw empty env. Remember to set env vars in Pages project Settings for Production environment before expecting deploys to work.
4. **CF Access session + Supabase session are independent.** Even authenticated to CF Access, a user still needs Tower Supabase login. This is defense-in-depth working as designed, not a bug.
5. **Rule 21 saved multiple hours this session.** Reality-checked current file state before every major edit. Caught:
   - Schema file staleness (profiles_policy vs profiles_user_access)
   - Tower ShellLayout path (./layouts/ not ./components/)
   - 4 nested routes existing (spec template only showed 1)
   - Missing SQL Editor psql commands (`\d` unsupported)
   - wc -l semantic confusion (above)

## Open threads for Session 17

**Session 17 locked scope (per DECISIONS.md Q6):**
- Item 5 — Room 2 ai_call_log filtered table (~2 hours)
- Item 6 — Room 3 ai_daily_stats summary cards + 14-day table, no chart (~90 min)
- Session 17 wrap

**Post-Sprint-F polish ideas (Session 18+, not locked):**
- HeaderStrip "System Nominal" chip is hardcoded — wire to same /health fetch once Room 1 stable
- Room 1 auto-refresh (deferred from Item 4 spec)
- `profiles_policy` → `profiles_user_access` rename reconciliation (RISKS.md LOW debt)
- Admin audit log (`admin_reads` table) — if/when Tower starts reading more sensitive data

## Sentinel re-sync post-session

After push:
1. Vanguard re-sync — will see full Session 16 commit history
2. Osiris re-sync — will pick up SUMMARY.md for docs indexing

Re-syncs prepare Sentinels for Session 17 opening ritual.

---

*Closed 2026-04-19. 9 commits, 3 security gates live, Sprint F 50% complete. Session 17 picks up Room 2 + Room 3.*
