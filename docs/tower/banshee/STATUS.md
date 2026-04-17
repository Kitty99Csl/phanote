# Banshee — DevOps & Infrastructure

> **Role:** Deploy pipeline health, external monitors, infrastructure posture.  
> **Reads:** CF Pages build logs, UptimeRobot status, wrangler deploys.  
> **Owns:** Deploy verification rituals (Rule 11), uptime monitoring, cron schedules.

## Current status

- **Last updated:** 2026-04-17 (Session 14)
- **Production bundle:** `index-B3mY1iQw.js` (`ef724e5`)
- **Last deploy:** 2026-04-17, Rule 11 verified
- **UptimeRobot status:** Not wired yet (Sprint E item 6)
- **Uptime status page URL:** TBD (added when monitor ships)

## Infrastructure inventory

- **Frontend:** Cloudflare Pages → `app.phajot.com`
- **Worker:** Cloudflare Workers (`phanote-parser`) → `api.phajot.com` + `api.phanote.com` (both live, pre-rename route still reachable)
- **Database:** Supabase (Singapore region)
- **Landing:** Cloudflare Pages → `phajot.com`
- **Legacy redirect:** `phanote.com` → `phajot.com` (301)
- **Node pin:** 24.13.1 (three-layer: `.nvmrc` + `package.json` `engines` + lockfile)

## Cron jobs

- Nightly `ai_call_log` retention (90-day purge) — scheduled Sprint E item 2
- Nightly `ai_daily_stats` materialized view refresh — scheduled Sprint E item 2

## Recent infrastructure events

- 2026-04-14 (Session 9): Deploy pipeline fix — Node version drift resolved, 8 stuck commits unblocked

## Changelog

- 2026-04-17 · Created during Sprint E setup
