# Current Sprint — E (Observability Floor)

> **Status:** In progress · Session 14 afternoon  
> **Started:** 2026-04-17  
> **Est. completion:** 2026-04-17 (same session)

## Items

| # | Item | Status | Commit |
|---|---|---|---|
| 1 | `docs/tower/` skeleton | In progress | — |
| 2 | `ai_call_log` + `tower_admin_reads` migration 006 | Not started | — |
| 3 | `callClaude()` wrapper + instrument both AI wrappers | Not started | — |
| 4 | Worker `/health` enrichment | Not started | — |
| 5a | Frontend ErrorBoundary | Not started | — |
| 5b | Sentry (frontend + worker) | Not started | — |
| 6 | UptimeRobot external monitor | Not started | — |
| 7 | Vanguard + Osiris Claude Projects | Not started | — |

## Definition of done

Per ROADMAP.md Sprint E:

- [ ] Sentry catching real errors from both frontend and worker
- [ ] `ai_call_log` has real rows from production AI calls
- [ ] `/health` returns enriched JSON
- [ ] `docs/tower/` skeleton exists in repo
- [ ] Vanguard and Osiris Claude Projects set up and testing
- [ ] UptimeRobot pinging and alerting

## Notes

- Recon surfaced 4 findings (stale wrangler route, no callClaude wrapper, no ErrorBoundary, 3 phantom tables). Items 3 and 5a address the first three.
- Schema design adds 4 upgrades beyond original roadmap spec: `plan_tier` snapshot column, `ai_daily_stats` materialized view, 90-day retention cron, `tower_admin_reads` bundled into migration 006.
