# Current Sprint — E (Observability Floor)

> **Status:** 7/8 complete · Item 7 in progress (Claude Projects setup by Speaker)
> **Started:** 2026-04-17
> **Est. completion:** 2026-04-17 (same session, once Item 7 ships)

## Sprint E — Observability Substrate (Session 14)

**Status:** 7/8 complete. Item 7 in progress (Claude Projects
setup by Speaker).

**Items:**

- ✅ 1. Tower Sentinel skeleton (0ce4820)
- ✅ 2. Migration 006 + Rule 19 + wrangler route (caa4b1a)
- ✅ 3. AI call instrumentation (e21d7d2)
- ✅ 4. /health endpoint enrichment (67e8859)
- ✅ 5a. Frontend ErrorBoundary (cbc8620)
- ✅ 5b. Sentry wiring (4ba9788)
- ✅ 6. UptimeRobot + Banshee STATUS (6fdd24e)
- 🔜 7. Vanguard + Osiris Claude Projects (Speaker UI work,
  pending)

**Sprint closes when Item 7 ships.** Next sprint: F (Tower Lobby).

## Definition of done

Per ROADMAP.md Sprint E:

- [x] Sentry catching real errors from both frontend and worker
- [x] `ai_call_log` has real rows from production AI calls
- [x] `/health` returns enriched JSON
- [x] `docs/tower/` skeleton exists in repo
- [ ] Vanguard and Osiris Claude Projects set up and testing
- [x] UptimeRobot pinging and alerting

## Notes

- Recon surfaced 4 findings (stale wrangler route, no callClaude wrapper, no ErrorBoundary, 3 phantom tables). Items 3 and 5a address the first three.
- Schema design adds 4 upgrades beyond original roadmap spec: `plan_tier` snapshot column, `ai_daily_stats` materialized view, 90-day retention cron, `tower_admin_reads` bundled into migration 006.

## Changelog

- 2026-04-17 · Items 1-6 shipped, Item 7 in progress (Session 14)
- 2026-04-17 · Created during Sprint E Item 1 (Session 14)
