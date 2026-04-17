# Current Sprint — F (Tower Lobby)

> **Status:** In progress · Session 15 partial (Items 1 + 3 only)
> **Started:** 2026-04-18 (Session 15 evening)
> **Target close:** Session 16

## Sprint F — Tower Lobby (Session 15-16)

**Goal:** First operator surface live at tower.phajot.com —
admin-gated, Lobby with 3 rooms rendering real observability data
from Sprint E's floor.

**Items:**

- 🔜 1. Create `tower/` Vite app + CF Pages project (Session 15)
- ⏸ 2. Admin gate via `is_admin` flag + RLS (Migration 007) —
  Session 16
- 🔜 3. Tower Lobby layout + nav shell (Session 15)
- ⏸ 4. Room 1: live /health display (Session 16)
- ⏸ 5. Room 2: live ai_call_log recent rows (Session 16)
- ⏸ 6. Room 3: ai_daily_stats summary cards (Session 16)

**Session 15 partial scope:** Items 1 + 3. Skeleton + nav shell,
no auth yet, no rooms rendering real data yet. Ends with "Tower
exists and deploys" milestone.

**Session 16 completion scope:** Items 2 + 4 + 5 + 6. Admin auth,
three rooms live.

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

- 2026-04-18 · Sprint F opened, Session 15 partial scope locked
- 2026-04-17 · Sprint E closed 8/8 (Session 14)
