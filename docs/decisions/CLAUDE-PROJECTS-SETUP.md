# Decision: Vanguard + Osiris Claude Projects Setup

**Decision date:** 2026-04-17 (Session 14, Sprint E Item 7)
**Decision owner:** Speaker (Kitty)
**Status:** Shipped

## Context

Sprint E needed observability on multiple fronts: code (AI call
logging, Sentry), infrastructure (UptimeRobot, /health), and
**project intelligence** (specialized assistants that retain
context across sessions). Item 7 was the project-intelligence
layer: two dedicated Claude Projects.

Without them, each session starts with re-explaining context to
generic Claude. With them, we have two specialized Sentinels that
know Phajot's state.

## Decision

Create two Claude Projects in claude.ai:

### Vanguard — Product & Sprint Leadership

- **Role:** sprint planning, backlog prioritization, scope
  discipline, roadmap decisions, scope creep detection
- **Model:** Sonnet 4.6 (tactical reasoning, cost-efficient)
- **System prompt:** see Vanguard project in claude.ai (source of
  truth). Key posture: skeptical, direct, names trade-offs,
  refuses cheerleading, asks ONE sharp question when uncertain.
- **Knowledge sync:** GitHub `Kitty99Csl/phanote` → paths
  `CLAUDE.md + docs/**`. Manual re-sync on push.
- **Does NOT do:** write production code (CC's domain), debug
  code (Osiris's domain), architectural choices unilaterally.

### Osiris — QA & Quality

- **Role:** bug investigation, test coverage analysis, regression
  patterns, risky-change review, edge case identification, AI
  parser quality, production health reading
- **Model:** Sonnet 4.6
- **System prompt:** see Osiris project in claude.ai. Key posture:
  "how do we know this works?", reproducible bug framing, honest
  about coverage gaps, suggests tests before fixes.
- **Knowledge sync:** same as Vanguard.
- **Does NOT do:** write production code, sprint planning
  (Vanguard's domain), unilaterally approve risky changes.

## Verification (smoke tests)

Both projects were smoke-tested during Session 14 close.
Full responses below as proof of proper posture.

### Vanguard smoke test — question

> "What's the current Sprint E status? Reference specific commit
> hashes from the latest SPRINT-CURRENT.md and ROADMAP-LIVE.md
> files."

### Vanguard smoke test — response (excerpt)

Sprint E Status — Fresh Read. Files are updated. Here's the real
state.

Items shipped (7/8):
- Item 1: Tower Sentinel skeleton — 0ce4820 ✅
- Item 2: Migration 006 + Rule 19 + wrangler route — caa4b1a ✅
- Item 3: AI call instrumentation — e21d7d2 ✅
- Item 4: /health enrichment — 67e8859 ✅
- Item 5a: Frontend ErrorBoundary — cbc8620 ✅
- Item 5b: Sentry wiring — 4ba9788 ✅
- Item 6: UptimeRobot + Banshee STATUS — 6fdd24e ✅
- Item 7: Vanguard + Osiris Claude Projects — pending 🔜

Production state: bundle index-BJCgj50K.js (4ba9788), worker v4.7.0.
Sprint progression: 4 bundle hashes, 4 worker version bumps, 12
commits, 0 rollbacks.

**Finding flagged by Vanguard:** "docs/ROADMAP-LIVE.md is still
on Sprint D close state. Last updated: commit 14409d6 (Sprint D
wrap, before any Sprint E work). Recommend: ROADMAP-LIVE.md gets
its Sprint E table + state refresh as part of the Item 7 close
commit, not deferred. Otherwise Session 15 starts with a roadmap
that claims Sprint E hasn't begun."

Vanguard self-resolved earlier scope-triage question:
"The 4 schema expansions I flagged in my first read all shipped
in Migration 006. The matview hasn't populated yet but the
infrastructure is live. My earlier 'is this Sprint G work pulled
forward?' concern is resolved: it's Sprint F fuel. Tower Lobby
needs ai_daily_stats to render, so building it now was the right
call. I'd score the expansion as justified, not creep."

### Osiris smoke test — question

> "List every file you have access to. Then summarize Sprint E
> Session 14's shipped commits from SPRINT-CURRENT.md."

### Osiris smoke test — response (excerpt)

Files I have access to (11 files):
1. CLAUDE.md
2. docs/session-12/SUMMARY.md
3. docs/session-12/TOMORROW-BRIEFING.md
4. docs/session-13/SUMMARY.md
5. docs/session-14/SUMMARY.md
6. docs/decisions/I18N-PROVISIONAL-KEYS.md
7. docs/tower/osiris/STATUS.md
8. docs/tower/vanguard/SPRINT-CURRENT.md
9. docs/tower/banshee/STATUS.md
10. docs/tower/sentinel/STATUS.md
11. docs/ROADMAP-LIVE.md

Sprint E — Session 14 Shipped Commits:
- Item 1: Tower Sentinel skeleton (7 STATUS.md files) — 0ce4820 ✅
- Item 2: Migration 006 + Rule 19 + wrangler route — caa4b1a ✅
- Item 3: AI call instrumentation (5 endpoints) — e21d7d2 ✅
- Item 4: /health endpoint enrichment — 67e8859 ✅
- Item 5a: Frontend ErrorBoundary — cbc8620 ✅
- Item 5b: Sentry wiring (frontend + worker) — 4ba9788 ✅
- Item 6: UptimeRobot + Banshee STATUS — 6fdd24e ✅
- Item 7: Vanguard + Osiris Claude Projects — 🔜 pending

**Finding flagged by Osiris:** "Item 7 is the only item with no
commit hash and no verifiable artifact in the repo. From a QA
standpoint, 'Claude Projects set up' is hard to confirm without
a checklist. Worth defining what 'done' looks like for Item 7 —
e.g., a test prompt sent and answered in both Vanguard and
Osiris projects?"

**This document is Osiris's proposed artifact.**

## Trade-offs

- **Why Sonnet 4.6, not Opus 4.7?** Tactical reasoning fits
  Sonnet's strengths. Opus reserved for orchestration chat
  (Session 14 coordinator) and Claude Code (production code).
  Sonnet eats fewer message-window tokens than Opus (~5× cheaper),
  so both Sentinels can be called freely without burning daily
  limits.

- **Why GitHub sync, not manual upload?** Accidentally discovered
  during Item 7 setup. Worth a Rule-worthy learning: docs commits
  → manual re-sync click → Sentinels see fresh reality. No more
  file-by-file upload per session. ~10 minutes saved per session
  onward.

- **Why separate projects, not one?** Role separation prevents
  "I'm a product manager AND a QA" identity blur. Vanguard
  refuses to triage bugs (redirects to Osiris). Osiris refuses
  to plan sprints (redirects to Vanguard). Clean domain ownership.

## How to maintain

1. After every git push affecting docs (SPRINT-CURRENT, ROADMAP-LIVE,
   session SUMMARY, STATUS files, CLAUDE.md): click **Re-sync**
   in both Vanguard and Osiris claude.ai project settings.
2. Start a **new chat** (not existing) for fresh file context.
3. If either Sentinel cites stale hashes or wrong status →
   re-sync didn't land, retry.
4. If either Sentinel doesn't know about a file → sync scope
   filter is too narrow, widen to `CLAUDE.md + docs/**`.

## Related

- `docs/tower/vanguard/STATUS.md` — Vanguard Sentinel status
- `docs/tower/osiris/STATUS.md` — Osiris Sentinel status
- `docs/tower/vanguard/SPRINT-CURRENT.md` — Sprint state Vanguard reads
- CLAUDE.md Rule 19 — migration discipline (Vanguard + Osiris both enforce during reviews)

## Changelog

- 2026-04-17 · Created (Session 14, Sprint E Item 7 close)
