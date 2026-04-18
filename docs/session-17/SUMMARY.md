# Session 17 SUMMARY

**Date:** 2026-04-20
**Duration:** ~2 hours (16:16 UTC → 18:13 UTC per commit timestamps, plus wrap)
**Speaker energy:** fresh → late-session discovery/recovery (Migration 009/010 saga)
**Sprint:** F (Tower Lobby) — CLOSED this session
**Items shipped:** 5 (Room 2) + 6 (Room 3) per DECISIONS.md Q6
**Unplanned:** Migration 009 admin read paths + Migration 010 completion fix

## Scope result

| Item | Locked in DECISIONS.md | Shipped |
|---|---|---|
| Item 5 — Room 2 ai_call_log filtered table | DECISIONS-16 Q4 | ✅ |
| Item 6 — Room 3 ai_daily_stats cards + 14-day table | DECISIONS-16 Q5 | ✅ |
| Migration 009 (admin read paths) | DECISIONS-17 Q1-Q3 | ✅ (partial apply; completed by 010) |
| Migration 010 (drift view correction) | DECISIONS-17 Q5 (mid-session) | ✅ |

## Commits (this session)

- `a791872` — Migration 009 + DECISIONS-17 Q1-Q4 + RISKS entry
- `021e7a1` — Item 5: Room 2 ai_call_log filtered table
- `bd5109c` — chore: gitignore .claude/ (local tooling preferences)
- `267c37e` — Item 6: Room 3 daily stats summary + 14-day table
- `b963774` — Migration 010: drift view drop + wrapper view correction
- `[this-wrap-commit]` — Session 17 wrap (SUMMARY + SPRINT-CURRENT + ROADMAP-LIVE + DECISIONS outcomes + RISKS + CLAUDE.md learnings + TacticalPlaceholder delete)

**Total: 6 commits, zero rollbacks.**

## Decisions locked during session (overrides/refinements)

1. **Q5 addition (Migration 010 correcting 009 §3).** Migration 009 §3 silently failed during apply because a pre-existing unreferenced view named `admin_daily_stats` existed in production (drift from direct SQL Editor changes pre-Session 14; aggregated `app_events`; zero references in Phajot codebase per grep). CREATE OR REPLACE VIEW requires matching column signatures; the drift view's (`date/active_users/total_events/...`) differed from Migration 009's intended (`day/endpoint/provider/...`), so §3 errored and the error was swallowed by SQL Editor partial execution. §1 (admin policy on ai_call_log) and §2 (REVOKE matview grants) applied cleanly because they are independent statements. Migration 010 does drop-and-recreate (CASCADE on DROP; CREATE VIEW — not CREATE OR REPLACE — to avoid re-triggering the trap). Full rationale in DECISIONS-17 Q5.

2. **Postflight upgrade: semantic identity over privilege existence.** Migration 009's postflight checked `has_table_privilege('authenticated', 'admin_daily_stats', 'SELECT')` which returned `true` — technically correct but didn't distinguish "our view was created" from "something called admin_daily_stats was already grantable." Migration 010's postflight checks `pg_views.definition` + column signature to confirm the object IS what the migration intended. Same family as Session 16's `profiles_policy` vs `profiles_user_access` naming-drift lesson. Both belong in `docs/patterns.md`.

3. **SQL Editor Select-All before Run is mandatory.** Twice this session, partial execution silently cost us time — first on Migration 009 §1+§2 re-apply, again on Migration 009 §3 never running due to swallowed error. Always Select-All, then Run. Non-negotiable for Supabase SQL Editor.

4. **Paste-back-with-file-write instruction pattern.** When CC writes a file that needs review before apply (migrations, security-critical code), the write-file instruction must bundle an immediate paste-back instruction. CC's natural mode is to summarize what it wrote; reviewers need the verbatim text. Applied successfully Session 17 for Migrations 009 + 010 and for DailyStats.jsx.

## Three-layer defense-in-depth (extended)

```
tower.phajot.com
     ↓
[1] Cloudflare Access Zero Trust (edge) ← Session 15
     ↓
[2] Tower Supabase login (app layer) ← Session 16
     ↓
[3] profiles.is_admin RLS check (database) ← Session 16
     ↓
Lobby + Room 1 /health + Room 2 ai_call_log + Room 3 admin_daily_stats ← Session 17
```

Room 2 + Room 3 read cross-user observability data via the new admin read paths:
- **Room 2:** additive `admins see all ai calls` policy on `ai_call_log` (OR-combined with existing user-own policy; Migration 009 §1).
- **Room 3:** `admin_daily_stats` wrapper view over `ai_daily_stats` matview with inline `is_admin` gate (Migration 009 §3 + Migration 010 completion).

Both gated by the same database-layer `is_admin` check that controls Tower route access — a coherent single point of admin truth.

## Learnings (for docs/patterns.md consideration)

1. **Postflight must check semantic identity, not just privilege existence.** Session 17's Migration 009 postflight confirmed `has_table_privilege('authenticated', 'admin_daily_stats', 'SELECT') = true` — which was technically correct but didn't distinguish between "our view was created" and "something called admin_daily_stats was already grantable." Upgrade: postflight should inspect `pg_views.definition` + column signature to confirm the object IS what the migration intended, not just that it is privilege-accessible. Session 16 had the analogous pattern with `profiles_policy` vs `profiles_user_access` (name drift vs semantic drift) — same family, both belong in `docs/patterns.md`.

2. **SQL Editor Select-All before Run is mandatory.** Twice this session, partial execution silently cost us time — first on Migration 009 §1+§2 re-apply, again on Migration 009 §3 never running due to swallowed error. Always Select-All, then Run. Non-negotiable for Supabase SQL Editor.

3. **Paste-back-with-file-write instruction pattern.** When CC writes a file that needs review before apply (migrations, security-critical code), the write-file instruction must bundle an immediate paste-back instruction. CC's natural mode is to summarize what it wrote; reviewers need the text. Applies to all future sessions.

4. **Pre-Session-14 direct-SQL drift was broader than phantom tables.** Session 14 found 3 phantom tables; Session 17 found an unreferenced view with wide-open grants. Drift audit in Session 18 would be worth an hour.

## Open threads for Session 18

**Session 18 backlog (candidates, scope TBD):**
- Drift audit for other pre-Session-14 direct-SQL objects (views, functions, policies). Session 14 caught 3 tables; Session 17 caught 1 view. What else is there?
- Normalize Health.jsx kicker to match AICalls.jsx / DailyStats.jsx (accent bar + fuller tactical shape). Minor visual consistency.
- Header strip build-hash dynamic injection (Sprint E-ext backlog).
- Room 1 optional auto-refresh (deferred from Session 16 / Item 4).

**Sprint G or H candidates:**
- Matview refresh scheduling audit (verify pg_cron job runs and catches failures).
- Admin audit log (`admin_reads` table) — defer until Tower starts reading sensitive data beyond observability aggregates.

## Sentinel re-sync post-session

After push:
1. Vanguard re-sync — will see Sprint F closed + Session 17 SUMMARY.md for docs indexing.
2. Osiris re-sync — will pick up Session 17 commits + Migration 010 provenance.

Re-syncs prepare Sentinels for Session 18 opening ritual per `docs/session-ritual.md`.

---

*Closed 2026-04-20. 6 commits. Sprint F 6/6 complete. Tower fully operational for admin-gated observability across /health, ai_call_log, and ai_daily_stats.*
