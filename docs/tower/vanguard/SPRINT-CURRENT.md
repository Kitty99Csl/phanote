# Current Sprint — G (TBD)

> **Status:** Standby · Sprint F closed 2026-04-20 (Session 17) · Sprint G scope to be defined Session 18 opening
> **Started:** —
> **Target close:** —

## Sprint G — (Session 18+ — scope TBD. Candidates per Session 17 SUMMARY open threads.)

**Goal:** TBD. Candidates from Session 17 backlog:
- Drift audit for other pre-Session-14 direct-SQL objects (views, functions, policies).
- Normalize Health.jsx kicker visual to match AICalls.jsx + DailyStats.jsx.
- Header strip build-hash dynamic injection (Sprint E-ext backlog).
- Room 1 optional auto-refresh (deferred from Session 16 Item 4).
- Matview refresh scheduling audit (pg_cron verification).

---

## Sprint F — Tower Lobby (Sessions 15-17) — CLOSED

**Goal:** First operator surface live at tower.phajot.com — admin-gated, Lobby with 3 rooms rendering real observability data from Sprint E's floor.

**Items:**

- ✅ 1. Create `tower/` Vite app + CF Pages project — shipped Session 15 (428ad78)
- ✅ 2. Admin gate via `is_admin` flag + RLS (Migration 007 + Migration 008 phantom backfill) — shipped Session 16 (c3e7307, 186a819, fc9c6d6, ae587a9, d4c58e5)
- ✅ 3. Tower Lobby layout + nav shell — shipped Session 15 (8df2959)
- ✅ 4. Room 1: live /health display (module card grid per DECISIONS-16 Q3) — shipped Session 16 (ca85d44)
- ✅ 5. Room 2: live ai_call_log filtered table (per DECISIONS-16 Q4) — shipped Session 17 (021e7a1)
- ✅ 6. Room 3: ai_daily_stats summary cards + 14-day table, no chart (per DECISIONS-16 Q5) — shipped Session 17 (267c37e)

### Bonus work shipped (Cosmodrome visual direction — Session 15)

- ✅ Destiny-inspired theme redesign (ce39de5)
- ✅ Pass 1 atmosphere polish (51e2192)
- ✅ Pass 2 design spec v1 + tactical density (2f5faa7)
- ✅ Tower Design System v1 (docs/tower/design-system.md)

### Mid-sprint migrations (Session 17)

- ✅ Migration 009 — minimal admin read paths (a791872)
- ✅ Migration 010 — drift view correction completing 009 §3 (b963774)

## Definition of done (Sprint F complete — all satisfied)

- [x] tower.phajot.com resolves and serves a page
- [x] Admin-only access via is_admin flag (Session 16)
- [x] Lobby nav shell matches Phajot design system
- [x] 3 rooms render real data from observability floor
- [x] Post-sync Sentinel smoke test passes (Osiris ritual)

## Session pre-sprint decisions (historical)

- plan_tier placeholder acceptable through Sprint F
- Item 2 deferred to Session 16 morning for security focus
- Rule 20 added atomically with session open (2026-04-18)

## Changelog

- 2026-04-20 · Sprint F CLOSED (Session 17). Items 5 + 6 shipped; Migrations 009 + 010 completed admin read paths. Tower fully operational for admin-gated observability. 6 Session-17 commits, zero rollbacks.
- 2026-04-19 · Session 16 shipped — Items 2 (admin gate + migrations 007+008) + 4 (Room 1). Three-layer defense-in-depth operational. 9 commits.
- 2026-04-19 · Session 16 opening — drift cleanup: ROADMAP-LIVE refreshed to be2dc0b, SPRINT-CURRENT aligned to DECISIONS.md Q6 (Sprint F closes Session 17, not 16)
- 2026-04-18 · Session 15 wrap: Items 1 + 3 shipped + Cosmodrome visual direction established (design system v1 approved)
- 2026-04-18 · Sprint F opened, Session 15 partial scope locked
- 2026-04-17 · Sprint E closed 8/8 (Session 14)
