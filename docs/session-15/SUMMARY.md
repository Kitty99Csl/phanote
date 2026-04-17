# Session 15 — Sprint F Foundation (partial)

**Date:** 2026-04-18 (evening, continuing from Session 14 close)
**Scope:** Sprint F Items 1 + 3 only (4-hour block)
**Deferred to Session 16:** Item 2 (admin gate + Migration 007),
  Items 4-6 (Room implementations)

## Pre-session decisions (locked via Vanguard consultation)

- **plan_tier threading:** deferred to Sprint G. Matview uses
  'free' placeholder. Tower Lobby is display-only in Sprint F,
  real tier data not required.
- **Rule 20 added:** session-opening commit. Speaker-refined
  wording: "A sprint is not considered closed until both are
  updated." Vanguard-originated finding from Session 14 close.
- **Scope trim:** Item 2 (admin gate) intentionally deferred —
  security-critical schema + RLS work deserves a fresh-mind
  session.

## Reality check confirmed at session open

- Latest commit: 2cd5690 (Sprint E close)
- Production bundle: index-BJCgj50K.js
- Worker version: 4.7.0

## Items shipped this session

4 atomic commits + 1 design spec doc.

| Commit | What | Notes |
|---|---|---|
| 19bee35 | Rule 20 added + Sprint F opened | Session opener per Vanguard consultation |
| 428ad78 | Sprint F Item 1 — tower/ Vite app scaffold | Vite 8 + Tailwind 4 (matches main app) |
| 8df2959 | Sprint F Item 3 — Lobby + nav shell | Router, sidebar, 4 room placeholders |
| ce39de5 | Cosmodrome theme — Destiny-inspired redesign | Major visual pivot — celadon light → dark slate + ember |
| 51e2192 | Cosmodrome Pass 1 — atmosphere polish | Radial gradients + noise + vignette + status pulses |
| 2f5faa7 | Pass 2 — Tower design spec v1 + tactical density | docs/tower/design-system.md (NEW, 295 lines) + HeaderStrip + StatusChip + TacticalPlaceholder + module codes |

Infrastructure shipped (outside git):

- CF Pages project `tower-phajot` created, deploys from repo
- `tower.phajot.com` custom domain active (DNS auto-CNAMEd by CF)
- Cloudflare Access application "Phajot Tower" active
  - Policy ID: `782108c8-7169-438e-9088-77ffb3c49080`
  - Policy: "Speaker only" (Include Emails: kitokvk@gmail.com)
  - Team domain: `demokitty.cloudflareaccess.com`
  - Session duration: 24h
- Email PIN auth verified end-to-end (incognito test confirmed)

Design system established:

- `docs/tower/design-system.md` — approved v1 Tower design system
- Design vocabulary codified (color tokens, typography rhythm,
  chrome language, motion rules, writing voice tiered 1/2,
  chart rules)
- Overriding rule: "If tactical styling conflicts with clarity,
  clarity wins"

## Open threads for Session 16

### Sprint F items remaining
| Item | Status | Notes |
|---|---|---|
| 2 | ⏸ Admin gate + Migration 007 | Security-critical — fresh-mind work |
| 4 | ⏸ Room 1 live /health display | First real data room |
| 5 | ⏸ Room 2 ai_call_log recent rows | |
| 6 | ⏸ Room 3 ai_daily_stats summary cards | |

### Key learnings from Session 15

**Learning 1 — `.pages.dev` URLs are geo-blocked in Laos.**
Default CF Pages URLs cannot be used for Speaker-reachable
staging/preview. All future CF Pages projects must use a
custom subdomain via the phajot.com zone. Applies to future
tooling environments (staging.phajot.com, preview.phajot.com,
etc.) — never rely on `.pages.dev` as a working URL.

**Learning 2 — Cloudflare Access is the right gate for Tower
staging.** Zero Trust Free plan (up to 50 users) + custom
subdomain + email PIN gate = production-grade auth without
writing any backend code. Session 16's `is_admin` Supabase
flag will be defense-in-depth ON TOP of CF Access, not a
replacement.

**Learning 3 — Visual-first design decisions work.** 3 mockup
directions shown in chat (D1 Cosmodrome / D2 Traveler /
D3 Vanguard Command) before any code. Speaker picked D1.
Saved at least 2 iteration cycles of "build it, see it,
dislike it." Pattern worth repeating when Tower hits new
major UI surfaces (Session 16 room designs, Session 18
admin panel).

**Learning 4 — Chat-rendered mockups overstate production
feel.** D1 mockup looked ~80% Destiny-feeling in chat. Real
1920px browser render looked ~40-50% because of empty-space
proportions. Calibration mental model for future mockup rounds:
"mockup in chat viewport × 0.6 = actual production feel."

**Learning 5 — Design evaluator (Vanguard-style feedback)
improved the spec significantly.** 5 concrete improvements
added to Tower design system v1 that wouldn't have surfaced
from Chat Claude + Speaker alone. Sentinel-level review of
design work is worth its budget.

### Session 16 opening ritual

1. Sentinel re-sync (Vanguard + Osiris)
2. Reality check via CC (git log, bundle hash, worker version) —
   per Speaker's Session 15 ask to delegate reality checks to CC
3. Narrow scope-check with Vanguard: "Session 16 scope — Items 2,
   4, 5, 6 in what order? Item 2 first (auth) or parallel?"
4. Decide order (suggestion: Item 2 first while fresh, then
   Items 4 → 5 → 6 which are similar pattern)
5. Begin work

### Deferred backlog items (still outstanding from Sprint E-ext)

Tracked separately in Sprint E-ext backlog, not Session 16:
- VITE_COMMIT_SHA injection for auto build-hash display
- DEPLOYED_AT automation via GH Action
- AI pricing verification against Anthropic + Google billing
- Real user_id threading into ai_call_log
- Migration 007 phantom table backfill (partially handled by
  Item 2's schema migration)
