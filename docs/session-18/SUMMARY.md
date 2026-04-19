# Session 18 SUMMARY

**Date:** 2026-04-19 (Sunday)
**Duration:** ~4.5 hours
**Speaker energy:** focused, iterative (3-iteration Section 1 convergence)
**Sprint:** G (Engine Room + drift audit) — CLOSED this session
**Items shipped:** Item 1 (Engine Room Room 4) + Item 2 (Migration 011 drift reconciliation)
**Unplanned:** Migration 011 drift audit (surfaced by Session 17 SUMMARY open thread; became Item 2)

## Scope result

| Item | Locked in DECISIONS.md | Shipped |
|---|---|---|
| Item 1 — Room 4 Engine Room (Sprint G) | D18-Q1 through D18-Q6 | ✅ |
| Item 2 — Migration 011 drift reconciliation | D18-Q8 (trust-summary mode) + Rule 19 | ✅ |
| Trailing hash fix (e76ff61) | n/a — housekeeping | ✅ |
| LINE roadmap removal (374c820) | D18-Q7 | ✅ |

## Commits (this session)

- `e76ff61` — chore(docs): fill pending hash placeholders in ROADMAP-LIVE.md + RISKS.md
- `374c820` — chore(roadmap): remove LINE, promote native app publishing to Phase 6 final
- `274ee14` — feat(tower): Room 4 Engine Room — UptimeRobot embed + hourly AI traffic chart (Sprint G Item 1)
- `fa1f216` — fix(tower): Engine Room uptime — iframe → external-link card (UptimeRobot X-Frame-Options: deny)
- `65a2086` — feat(tower): Engine Room Section 1 — native System Integrity HUD (D3 tactical)
- `857a2ca` — fix(tower): Engine Room endpoint aggregation — DB stores endpoints with leading slash
- `82f7221` — feat(supabase): Migration 011 drift reconciliation (Session 18 Item 2)

**Total: 7 commits, zero rollbacks.**

## Item 1 — Room 4 Engine Room

Sprint G scoped to: UptimeRobot status / hourly AI traffic chart / parser accuracy (deferred per A/A/defer decision). Built dedicated `/engine-room` route with 2 sections.

**Section 1** went through 3 iterations before final form:

a) **UptimeRobot iframe embed** — initial implementation. Failed in production with "refused to connect" due to UptimeRobot setting `X-Frame-Options: deny`. Committed as 274ee14, fallback committed as fa1f216.

b) **External-link card fallback** — functional but minimal; just an anchor to the UptimeRobot status page. Speaker-approved as temporary placeholder.

c) **Native D3 Tactical HUD** — Speaker-approved final form (65a2086). Derives "observed uptime" from ai_call_log signal traffic over a 7-day window. Matches Tower's existing Destiny-inspired design language (corner L-brackets, stat cards, telemetry rows).

**HUD structure (D3 design, per design-system.md §4):**
- 4 corner L-bracket registration marks (ember-500/50)
- 4 stat cards: Integrity (% + pulsing green dot when nominal), Signals (total 7d), Anomalies (errors+timeouts), Active (N/4 endpoints)
- 4 endpoint telemetry rows: /parse / /ocr / /advise / /monthly-report with success/total, uptime%, progress bar, status badge (◉ OK / ▲ WARN / ◌ IDLE)
- Footer: "Observed · not pinged" honest labeling + "External ping ↗" secondary UptimeRobot link

**Status thresholds:** ≥99.5% nominal · ≥95% caution · <95% critical · 0 calls standby

**Section 2** (Recharts line chart) shipped with 274ee14, unchanged in subsequent iterations.
- 24 hourly buckets, UTC-aligned
- 2 grayscale provider lines: gemini / anthropic
- Single 7-day Supabase query serves both sections (chart naturally skips rows >24h old)

**Endpoint aggregation bug** (857a2ca): DB stores endpoint values with leading slash (`/parse`, `/ocr`). Client `KNOWN_ENDPOINTS` array had them without slash. All filter() matches returned 0 → all endpoints showed IDLE → Active card showed 0/4 despite valid data. One-line KNOWN_ENDPOINTS fix + removed template-level `/` prefix. Caught via Speaker visual verification.

**Bundle progression:**
- Pre-session: index-2zR7DkDi.js (439KB raw / 126KB gz)
- Post Recharts: index-C26VOd0d.js (788KB / 228KB) — +~350KB Recharts
- Post uptime fallback: index-Bz0clCZ1.js (788.46KB / 228.42KB) — no new deps
- Post HUD: index-MLdjSdAs.js (793.25KB / 229.64KB) — +5KB HUD logic only
- Post endpoint fix: index-Bn-XNeS-.js (793.25KB / 229.64KB) — same, 2-line fix

## Item 2 — Migration 011 drift reconciliation

Drift audit per Session 17 SUMMARY open thread. Ran 5 pg_catalog probes against production; diffed against migrations 001–010 expected state.

**Findings:**
| Object type | Count in production | Status |
|---|---|---|
| Tables | 14 | ✅ All accounted for |
| Views | 3 | ❌ admin_user_summary was drift (no migration backing) |
| Matviews | 1 | ✅ ai_daily_stats present |
| Functions | 1 | ✅ handle_new_user present |
| Policies | audited 3 tables | ❌ 3 drift items (see below) |

**Drift items resolved by Migration 011:**
1. `admin_user_summary` view — pre-Session-14 drift, wide-open grants (SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER) to anon + authenticated. RLS on underlying tables provided practical mitigation; defense-in-depth gap. grep verified zero code references outside docs/archive/. MEDIUM severity. Dropped with CASCADE.
2. ai_memory stale policies × 3 — `'Users update own memory'`, `'Users write own memory'`, `'users own ai_memory'` predated Migration 004's intended canonical `ai_memory_user_access` policy. All 3 dropped; canonical created.
3. profiles_policy naming drift — `profiles_policy` → `profiles_user_access` (canonical per Migration 004). LOW debt from Session 16 audit.
4. transactions_policy naming drift — `transactions_policy` → `transactions_user_access`. Same pattern.

**Migration 011 postflight:** 5-query sweep confirmed all 4 items applied cleanly.

**Migration 011 doubling scare:** CC pasted the SQL twice in chat output during the verbatim code fence. File on disk was clean (190 lines, 1 header). Verified via `wc -l` + `grep -c` before concluding. Lesson: doubled chat output ≠ doubled file.

## Trust-summary mode (D18-Q8)

Speaker pushed back mid-session on excessive paste-back requests for React components — correct call. Trust-summary mode adopted for non-security file edits going forward. Paste-back stays mandatory for: migrations, auth, worker code, RLS policies. React components, docs, configs → summary is sufficient unless Speaker requests verbatim.

## Learnings (for CLAUDE.md)

1. **Trust-summary mode reduces friction without sacrificing security.** Paste-back is mandatory for migrations, auth, worker, RLS. For everything else (React components, docs, configs), summary is sufficient. Session 18 Speaker feedback confirmed this explicitly.

2. **CC paste output can duplicate content while file on disk is correct.** Before declaring a file broken based on visual output, verify via `wc -l` + `grep -c`. Migration 011 appeared doubled in chat; file was clean.

3. **Don't pre-fill commit hashes in wrap docs.** Use `[pending]` placeholders, fill after commit runs. This session opened with a fix (e76ff61) for the exact bug this prevents.

4. **Third-party iframes fail via X-Frame-Options without any browser warning in dev.** For every external embed, have a fallback plan before first production deploy. UptimeRobot lesson cost ~15 min.

5. **When aggregation returns zero, check the join key first.** DB stored `/parse`; client had `parse`. One-character mismatch zeroed out all endpoint rows. Pattern: verify string equality assumptions at system boundaries before debugging logic.

6. **Native observability derived from existing data beats external integration.** "Observed uptime" from ai_call_log is more honest than synthetic pings — shows whether service worked for real users, not just whether a ping succeeded.

## Decisions reference

See `docs/session-18/DECISIONS.md` for full D18-Q1 through D18-Q8 log.

## Risks reference

See `docs/session-18/RISKS.md` for session-scoped risk entries. See `docs/RISKS.md` master for all resolved items marked.

## Open threads for Session 19

**Session 19 backlog (Sprint H):**
- Sprint H — Room 5: Admin Panel (user investigation, read-only v1)
- Language Strings Admin Panel (translations table + Tower inline edit UI)
- Real-device Engine Room verification (test against live tower.phajot.com/engine-room with real ai_call_log data)
- Health.jsx kicker normalization to match AICalls/DailyStats tactical shape (minor visual consistency, deferred from Session 17)
- RLS enablement for public launch (adversarial re-verify after public users can sign up)
- Header strip build-hash dynamic injection (Sprint E-ext backlog)

## Sentinel re-sync post-session

After push:
1. Vanguard re-sync — will see Sprint G closed + Session 18 SUMMARY.md for docs indexing.
2. Osiris re-sync — will pick up Session 18 commits + Migration 011 provenance.

Re-syncs prepare Sentinels for Session 19 opening ritual per `docs/session-ritual.md`.

---

*Closed 2026-04-19. 7 commits. Sprint G 2/2 complete (Engine Room + drift audit). Tower now has 4 live rooms: Lobby, Health, AI Calls, Daily Stats, Engine Room.*
