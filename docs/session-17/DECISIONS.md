# Session 17 decisions

**Locked:** 2026-04-20, Session 17 opening + mid-session.
**Context:** Sprint F closing session. Room 2 + Room 3 data access required pre-work (Migration 009) not anticipated at Session 16 close.

## Scope summary

- Migration 009 (minimal admin read paths) — mid-session addition
- Item 5 — Room 2 ai_call_log filtered table (per DECISIONS-16 Q4)
- Item 6 — Room 3 ai_daily_stats wrapped as admin_daily_stats (per DECISIONS-16 Q5, with view indirection from this session)
- Sprint F closes

## Decision log

### Q1 — Migration 009 scope boundary
**Decision:** Minimal admin read path only. Two surfaces (ai_call_log + ai_daily_stats). No audit tables, no invitation flow, no speculative expansion. File target ~60-80 lines SQL.

**Rationale:** Tower exists for cross-user observability. Options B (Speaker-only rows) and C (mixed) were rejected. "Minimal" boundary prevents creep into Sprint H admin panel territory.

### Q2 — ai_call_log policy shape: additive, not folded
**Decision:** Keep `users see own ai calls` unchanged, add a second permissive policy `admins see all ai calls`. PostgreSQL OR-combines permissive policies for SELECT.

**Rationale:** Minimum-surface change to live security-critical policy. Session 9's lesson was about USING(true) hidden under reasonable names — not about multiple clearly-named policies. Lower rollback-risk than folding.

### Q3 — ai_daily_stats: wrapper view, not matview RLS
**Decision:** `admin_daily_stats` security-definer-style view wraps the matview. Revoke matview SELECT from authenticated + anon. Grant view SELECT to authenticated. Inline is_admin check in view WHERE clause (empty set for non-admins).

**Rationale:** Stock Postgres does not support RLS on matviews. Wrapper view is the cleanest idiom. Also closes a pre-existing leak (matview was readable by all authenticated users before this migration).

### Q4 — Order within session
**Decision:** Probe SQL → Migration 009 file → Speaker applies via SQL Editor → Item 5 → Item 6 → Sprint F close commit.

## Session 17 outcomes (to be recorded at wrap)

(pending)
