# Session 18 — Risks (session-scoped)

> **Scope:** This file records only risks surfaced, resolved, or changed during Session 18.
> For the full active risk register, see `docs/RISKS.md`.

---

## Resolved this session

### ~~[MEDIUM] admin_user_summary view with wide-open grants~~
**Discovered:** Session 18 drift audit (2026-04-19)
**Resolved:** Migration 011 Item 1 — `DROP VIEW IF EXISTS public.admin_user_summary CASCADE` (commit `82f7221`)

Pre-Session-14 drift view. Never referenced in Phajot codebase (grep confirmed: zero matches outside docs/archive/Phanote-session-2.md). Held GRANT SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER to both anon and authenticated roles. RLS on underlying tables (profiles, transactions) provided practical mitigation — the view inherits the querying user's auth context and RLS applies. But defense-in-depth gap existed: any authenticated user could have constructed a query through the view.

Same pattern as Session 17's admin_daily_stats drift view (wide-open grants, undocumented, pre-Session-14 origin). Both surfaced by the same pg_catalog probe technique.

---

### ~~[LOW] ai_memory stale policies (Migration 004 canonical policy never landed)~~
**Discovered:** Session 18 drift audit (2026-04-19)
**Resolved:** Migration 011 Item 2 (commit `82f7221`)

Production ai_memory table carried 3 stale policies predating Migration 004:
- `'Users update own memory'`
- `'Users write own memory'`
- `'users own ai_memory'`

Migration 004 specified a single canonical policy `ai_memory_user_access` (FOR ALL, auth.uid() = user_id) but it never applied to production. All 3 stale policies dropped; canonical created. Semantics preserved — each stale policy covered a subset of what the canonical covers.

Note: Session 9 fixed a separate ai_memory issue (`USING(true)` permissive SELECT policy). That fix created the stale policies we see here — the manually-applied Session 9 SQL used different names than Migration 004 specified. This closes the naming/multiplicity debt from that original fix.

---

### ~~[LOW] profiles_policy naming drift~~
**Discovered:** Session 16 (2026-04-19) — originally recorded in docs/RISKS.md
**Resolved:** Migration 011 Item 3 (commit `82f7221`)

Production `profiles_policy` → `profiles_user_access` (canonical per Migration 004). Semantic preflight guard verified correct shape (FOR ALL, cmd=ALL) before renaming. Idempotent skip if canonical already present.

Cross-reference: `docs/RISKS.md` LOW entry "profiles RLS policy name mismatch" marked resolved.

---

### ~~[LOW] transactions_policy naming drift~~
**Discovered:** Session 18 drift audit (2026-04-19)
**Resolved:** Migration 011 Item 4 (commit `82f7221`)

Production `transactions_policy` → `transactions_user_access` (canonical per Migration 004). Same pattern as profiles. Was not previously recorded as a formal risk (discovered alongside profiles drift in same audit pass).

---

## New risks logged this session

### [LOW] Tower bundle past Vite 500KB warning threshold
**Discovered:** Session 18 (2026-04-19)
**Status:** Accepted, documented

Tower bundle reached 793.25KB raw / 229.64KB gzip after Recharts install (commit `274ee14`, +~350KB raw). Vite emits a size warning at 500KB. Previous Tower bundle was 439KB (index-2zR7DkDi.js, Rooms 1–3).

**Why accepted:** Tower is an internal admin-only surface. Speaker is the only user; bundle size has no user-facing impact. Recharts is proven and restylable (D18-Q3).

**Constraint for future sessions:** Rooms 5–J should reuse existing Recharts (already bundled) instead of adding new chart libraries. Any new chart/viz dependency requires explicit Speaker approval and bundle size accounting before install.

**Mitigation tracking:** If Tower bundle approaches 1.2MB gzip, evaluate dynamic import() to code-split Recharts out of the main chunk.

---

## No-change entries this session

- All HIGH risks (CF Pages silent failures, no automated RLS tests) — unchanged, still open
- Session 17 resolved items (admin_daily_stats, ai_daily_stats matview leak) — still resolved
- Session 9 resolved items — still resolved

---

*Session 18 · 2026-04-19 · 4 resolved · 1 new (accepted)*
