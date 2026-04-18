# Current Sprint — F (Tower Lobby)

> **Status:** In progress · Session 15 shipped Items 1 + 3 + Cosmodrome · Session 16 shipped Items 2 + 4 · Session 17 ships Items 5 + 6 (Sprint F closes)
> **Started:** 2026-04-18 (Session 15 evening)
> **Target close:** Session 17 (per docs/session-16/DECISIONS.md Q6 — Session 16 ships items 2+4, Session 17 ships items 5+6)

## Sprint F — Tower Lobby (Sessions 15-17)

**Goal:** First operator surface live at tower.phajot.com —
admin-gated, Lobby with 3 rooms rendering real observability data
from Sprint E's floor.

**Items:**

- ✅ 1. Create `tower/` Vite app + CF Pages project — shipped Session 15 (428ad78)
- ✅ 2. Admin gate via `is_admin` flag + RLS (Migration 007 + Migration 008 phantom backfill) — shipped Session 16 (c3e7307, 186a819, fc9c6d6, ae587a9, d4c58e5)
- ✅ 3. Tower Lobby layout + nav shell — shipped Session 15 (8df2959)
- ✅ 4. Room 1: live /health display (module card grid per DECISIONS.md Q3) — shipped Session 16 (ca85d44)
- ⏸ 5. Room 2: live ai_call_log filtered table — Session 17
- ⏸ 6. Room 3: ai_daily_stats summary cards + 14-day table (no chart per DECISIONS.md Q5) — Session 17

### Bonus work shipped (Cosmodrome visual direction)

- ✅ Destiny-inspired theme redesign (ce39de5)
- ✅ Pass 1 atmosphere polish (51e2192)
- ✅ Pass 2 design spec v1 + tactical density (2f5faa7)
- ✅ Tower Design System v1 (docs/tower/design-system.md)

**Session 15 partial scope:** Items 1 + 3. Skeleton + nav shell,
no auth yet, no rooms rendering real data yet. Ends with "Tower
exists and deploys" milestone.

**Session 16 scope:** Items 2 + 4. **Session 17 scope:** Items 5 + 6. Sprint F closes Session 17. See docs/session-16/DECISIONS.md Q6 for rationale.

## Definition of done (Sprint F complete criteria)

- [ ] tower.phajot.com resolves and serves a page
- [ ] Admin-only access via is_admin flag (Session 16)
- [ ] Lobby nav shell matches Phajot design system
- [ ] 3 rooms render real data from observability floor
- [ ] Post-sync Sentinel smoke test passes (Osiris ritual)

## Session 15 pre-sprint decisions

- plan_tier placeholder acceptable through Sprint F
- Item 2 deferred to Session 16 morning for security focus
- Rule 20 added atomically with session open (2026-04-18)

## Changelog

- 2026-04-19 · Session 16 shipped — Items 2 (admin gate + migrations 007+008) + 4 (Room 1). Three-layer defense-in-depth operational. 9 commits.
- 2026-04-19 · Session 16 opening — drift cleanup: ROADMAP-LIVE refreshed to be2dc0b, SPRINT-CURRENT aligned to DECISIONS.md Q6 (Sprint F closes Session 17, not 16)
- 2026-04-18 · Session 15 wrap: Items 1 + 3 shipped + Cosmodrome visual direction established (design system v1 approved)
- 2026-04-18 · Sprint F opened, Session 15 partial scope locked
- 2026-04-17 · Sprint E closed 8/8 (Session 14)
