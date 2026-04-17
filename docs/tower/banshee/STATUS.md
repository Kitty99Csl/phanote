# Banshee — DevOps & Infrastructure

> **Role:** Deploy pipeline health, external monitors, infrastructure posture.  
> **Reads:** CF Pages build logs, UptimeRobot status, wrangler deploys.  
> **Owns:** Deploy verification rituals (Rule 11), uptime monitoring, cron schedules.

## Current status

- **Last updated:** 2026-04-17 (Session 14)
- **Production bundle:** `index-BJCgj50K.js` (`4ba9788`)
- **Last deploy:** 2026-04-17 ~15:00 UTC, Rule 11 verified
- **UptimeRobot status:** ✅ Live (Sprint E item 6, 2026-04-17)
- **Public status page:** https://stats.uptimerobot.com/FbQp9qBnJr

## Infrastructure inventory

- **Frontend:** Cloudflare Pages → `app.phajot.com`
- **Worker:** Cloudflare Workers (`phanote-parser`) → `api.phajot.com` + `api.phanote.com` (both live, pre-rename route still reachable)
- **Database:** Supabase (Singapore region)
- **Landing:** Cloudflare Pages → `phajot.com`
- **Legacy redirect:** `phanote.com` → `phajot.com` (301)
- **Node pin:** 24.13.1 (three-layer: `.nvmrc` + `package.json` `engines` + lockfile)

## UptimeRobot monitors (free tier)

| Monitor | URL | Type | Interval |
|---|---|---|---|
| Phajot Frontend | https://app.phajot.com | HTTP(S) | 5 min |
| Phajot API Health | https://api.phajot.com/health | HTTP(S) | 5 min |

**Public status page:** https://stats.uptimerobot.com/FbQp9qBnJr

**Alert channels:** Email (kitokvk@gmail.com)

**Free tier limitations** (relevant for Banshee planning):

- 5-minute interval (1-min requires paid)
- Basic HTTP check only — no keyword check (e.g. cannot alert
  on `"status":"degraded"` in /health JSON, only on HTTP 4xx/5xx
  or unreachable)
- Single-region monitoring (multi-region requires paid)
- Email + push (mobile app) for free; SMS, voice, webhook need
  paid

**Future considerations:**

- If false-positive rate becomes annoying: install UptimeRobot
  mobile app, switch from email to push notifications
- If keyword check becomes essential (worker silently degraded
  while returning HTTP 200): consider Better Stack free tier
  (offers webhooks + Telegram/Discord alerts on free)

## Cron jobs

- Nightly `ai_call_log` retention (90-day purge) — scheduled Sprint E item 2
- Nightly `ai_daily_stats` materialized view refresh — scheduled Sprint E item 2

## Recent infrastructure events

- 2026-04-14 (Session 9): Deploy pipeline fix — Node version drift resolved, 8 stuck commits unblocked

## Changelog

- 2026-04-17 · Sprint E item 6: UptimeRobot wired, 2 monitors live, status page at stats.uptimerobot.com/FbQp9qBnJr
- 2026-04-17 · Created during Sprint E setup
