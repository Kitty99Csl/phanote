# Session 16 decisions (locked Session 15 close)

**Locked:** 2026-04-18, Session 15 close (Speaker + Chat Claude, hour ~18 of a long day).
**Context:** Speaker had 1 hour remaining Session 15 night, chose to lock Session 16+17 scope decisions rather than start work. Speaker offline entire day 2026-04-19. Decisions must survive a full day gap without re-litigation.

> **Note on tiredness:** These decisions were made at hour 17-18. If any decision feels wrong at Session 16 opening, Speaker has veto power — decisions are pre-work, not pre-commitments. Vanguard consultation at Session 16 opening can override.

## Scope summary

- **Session 16 scope:** Item 2 (admin gate + Migration 007 + phantom table backfill) + Item 4 (Room 1 /health module cards)
- **Session 17 scope:** Item 5 (Room 2 ai_call_log filtered table) + Item 6 (Room 3 ai_daily_stats cards + table)
- **Sprint F closes** at end of Session 17

## Decision log

### Q1 — Item order within Sprint F: Option A
**Decision:** Item 2 first (security-critical while fresh), then rooms 4, 5, 6.

**Rationale:** Item 2 was explicitly deferred from Session 15 to preserve fresh morning mind for security work. Doing it first in Session 16 honors that deferral reason. Rooms are pattern work that benefits from afternoon "groove mode."

### Q2 — Item 2 scope boundary: Option B (gate + phantom table backfill)
**Decision:** Item 2 scope covers:
- Migration 007 adds `is_admin BOOLEAN DEFAULT FALSE` column to `profiles` table
- Manually set `is_admin = true` on Speaker's profile via Supabase SQL editor (post-migration)
- Migration 007 also backfills the 3 phantom tables discovered Session 14: `user_sessions`, `user_feedback`, `admin_logs` — proper migration files + RLS policies added
- Tower routes check Supabase session → read `profiles.is_admin` → deny if false
- Defense-in-depth: this adds to the existing CF Access gate, doesn't replace it

**Estimated time:** 2-3 hours.

**Rationale:** Option A (gate only) leaves Session 14 phantom-table debt unresolved. Option C (full admin infrastructure with audit log + invitation flow) is premature. Option B cleans up the schema drift alongside the admin gate in one disciplined commit.

**Out of scope (stay Session 17+ if needed):**
- Admin audit log (`admin_reads` table) — premature until Tower actually reads sensitive data
- Admin invitation flow — no second admin planned
- Tower-specific RLS policies beyond the phantom tables — we don't yet know Tower's read patterns

---

#### Q2 amendment — Session 16 opening (2026-04-19)

Vanguard consultation at Session 16 opening flagged a coupling risk in the original Q2 decision (combined migration for profiles + phantom tables). Adopted split per Chat Claude / Speaker agreement:

- **Migration 007** = profiles + `is_admin BOOLEAN NOT NULL DEFAULT FALSE` column. Auth-path code, security-critical, small surface area.
- **Migration 008** = phantom table backfill (`user_sessions`, `user_feedback`, `admin_logs`) via `CREATE TABLE IF NOT EXISTS` + RLS policies. Housekeeping, pure cleanup of Session 14 direct-SQL drift.

**Rationale for split:**
1. One purpose per migration = cleaner rollback story.
2. Phantom-table edge cases (they already exist) can't block admin gate deployment.
3. Auth-path code deserves minimal change surface.
4. Time cost negligible — same SQL, two files.

**Sequence this session:** 007 → deploy + verify admin gate works at Tower → 008 → Item 4.

**DECISIONS.md Q2 base decision (combined migration) is superseded by this amendment.** The override is logged here per DECISIONS.md's own "pre-work, not pre-commitment" clause — this is the veto mechanism working.

---

### Q3 — Item 4 (Room 1 /health) design: Option A
**Decision:** Module card grid matching Lobby pattern. 4 cards: Worker (H-01-W), Supabase (H-01-S), Gemini (H-01-G), Anthropic (H-01-A). Fetch `/health` on mount + manual refresh button + optional 30s auto-refresh.

**Rationale:** Consistency with Lobby's ModuleCard pattern. Sparse "operator console" table look (Option B) is a design jump we haven't earned yet. Hybrid (Option C) doubles design work without proof of need.

**Data source:** `GET api.phajot.com/health` (public endpoint, no auth needed). Response is nested JSON with status, dependencies, ai_volume_last_hour.

**Estimated time:** 60-90 min after Item 2 lands.

### Q4 — Item 5 (Room 2 ai_call_log) design: Option B
**Decision:** Table + filter bar. 100 rows newest-first. Filter bar above: Endpoint / Status / Provider dropdowns (client-side filtering). "Load more 100" button at bottom.

**Rationale:** Option A (no filters) too barebones for real debugging. Option C (row expansion for errors) is a second feature on top of a first feature — ship the base, feel the pain, polish later. Option D (scroll feed) looks cool but reads poorly for pattern-spotting.

**Columns:** Time · Endpoint · Provider · Model · Status · Duration · Tokens · Cost

**Estimated time:** ~2 hours Session 17.

### Q5 — Item 6 (Room 3 ai_daily_stats) design: Option A
**Decision:** Summary cards for "today" (3-4 cards: Total calls / Total cost / Error rate / Avg p95) + 14-day table below. NO chart.

**Rationale:** Chart library + chart design is guesswork before operating Tower for a week. design-system.md already says "Chart library choice deferred to when first real data lands." Option A respects this — ship usable stats now, add trend chart in Session 18+ once Speaker knows which metric's trend matters.

**Data source:** `ai_daily_stats` materialized view (already created Session 14, refreshed daily via pg_cron).

**Estimated time:** ~90 min Session 17.

### Q6 — Session 16/17 split: Option B
**Decision:**
- Session 16 = Item 2 + Item 4 (~4.5 hours)
- Session 17 = Item 5 + Item 6 (~3.5 hours)

**Rationale:** Speaker preferred visible progress in Session 16. Item 2 in morning fresh, Item 4 in afternoon groove. Session 17 = two similar rooms shipped together, Sprint F closes.

**Alternative that was rejected:** Option A (Item 2 alone Session 16, all rooms Session 17) was Chat Claude's lean. Speaker chose Option B for the visible-progress benefit.

## Session 16 opening ritual (from docs/session-ritual.md)

Speaker's tasks at Session 16 opening:
1. Open Vanguard Claude Project → Re-sync. Wait for completion.
2. Open Osiris Claude Project → Re-sync. Wait for completion.
3. Read this file (DECISIONS.md) for scope context.
4. New Vanguard chat: paste narrow scope prompt (see below).
5. Review Vanguard's response. If Vanguard flags issues with decisions in this doc, address before starting work.

### Narrow scope prompt for Session 16 Vanguard

```
Session 16 starting. Scope locked per docs/session-16/DECISIONS.md:
Item 2 first (admin gate + Migration 007 + phantom table backfill),
then Item 4 (Room 1 /health module cards). Session 17 ships rooms
5+6. Sprint F closes Session 17.

Please:
1. Confirm latest closed state from current docs
2. List any blockers for Item 2 or Item 4
3. Flag any scope-creep risk
4. Check: are the 3 phantom tables (user_sessions, user_feedback,
   admin_logs) still unaccounted for? Does Migration 007 need
   them + Item 2's profiles change?
5. Ask at most one sharp question if something is unclear
```

### CC reality-check at Session 16 opening

Paste the reality-check prompt from `docs/session-ritual.md` to
CC. Speaker should NOT run the curl commands manually — CC does
it.

## Pre-Session-16 checklist for Speaker's first hour

1. ☐ Sentinels re-synced (Vanguard + Osiris)
2. ☐ CC reality check run and reported
3. ☐ Vanguard narrow-scope review completed
4. ☐ DECISIONS.md reviewed — any decisions to override based on fresh mind?
5. ☐ Workspace opened, clean git status verified
6. ☐ Decide: execute this plan or consult Vanguard on revision?

## Risks acknowledged

- **Migration 007 touching profiles AND 3 phantom tables in one migration is bigger than usual.** If it gets complex, split into 007 (profiles + is_admin) and 008 (phantom backfill) — both can ship Session 16 but as two commits.
- **Session 16 at 4.5 hours is aggressive.** If Item 2 overruns (likely if RLS testing uncovers edge cases), Item 4 defers to Session 17 alongside 5+6.
- **Sprint F extending to Session 17 means tower.phajot.com has placeholder rooms longer.** Acceptable — Tower is internal only, no users affected.

## Decisions not made tonight (deferred to Vanguard at opening)

- Exact wording of Migration 007 SQL — needs Session 16 morning design work.
- Exact filter controls UI (checkbox vs dropdown vs pill buttons) — room-level design decision, not scope.
- Refresh interval for Room 1 (30s was proposal, may change).
- Whether to thread real `user_id` into `ai_call_log` during Item 2's schema work (Sprint E-ext backlog item — may pair naturally with Item 2).

## References

- `docs/session-15/SUMMARY.md` — Session 15 full context
- `docs/tower/vanguard/SPRINT-CURRENT.md` — Sprint F status
- `docs/tower/design-system.md` — v1 design system (applies to Items 4, 5, 6)
- `docs/patterns.md` — development patterns
- `docs/session-ritual.md` — opening/closing rituals

---

*Locked 2026-04-18 Session 15 close. Review and optionally override at Session 16 opening.*

---

## Session 16 outcomes (recorded 2026-04-19)

All 6 decisions executed. Q2 amended mid-session (split 007/008 per Vanguard consultation). Q3 revised (manual refresh only, not 30s auto). Q6 executed as locked. Items 2 + 4 shipped; 5 + 6 confirmed for Session 17. See docs/session-16/SUMMARY.md for full session record.
