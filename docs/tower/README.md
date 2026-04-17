# Tower docs — index

This folder holds the documentation, planning, and Sentinel state for **Tower**, Phajot's internal operator surface. Tower lives at `tower.phajot.com` and is built under `tower/` at the repo root. This folder is docs only.

## What's here

### Core reference

- [`CHARTER.md`](./CHARTER.md) — Tower's mission and scope.
- [`ROADMAP.md`](./ROADMAP.md) — long-range sprint plan (Sprint F through K).
- [`design-system.md`](./design-system.md) — **v1 Tower Design System**, approved Session 15. Dark tactical UI with Phajot identity. Required reading before any Tower UI work.

### Active sprint

- [`vanguard/SPRINT-CURRENT.md`](./vanguard/SPRINT-CURRENT.md) — **authoritative state of the active sprint**. What's shipped, what's pending, who's blocking what. Check here first.

### Historical sprint plans

- [`SPRINT-B-PLAN.md`](./SPRINT-B-PLAN.md) — Sprint B plan (Session 10). Historical. Sprint B shipped.
- [`SPRINT-C-PLAN.md`](./SPRINT-C-PLAN.md) — Sprint C plan (Session 11). Historical. Sprint C shipped.
- [`AUTH-DESIGN.md`](./AUTH-DESIGN.md) — Sprint C auth design (Session 11). Historical.
- Sprint D + E + F — planning lived in `SPRINT-CURRENT.md` during each sprint; no separate plan docs.

### Risks and audits

- [`../RISKS.md`](../RISKS.md) — cross-project risk register (repo-wide, not Tower-specific).
- [`RISKS-FROM-AUDITS.md`](./RISKS-FROM-AUDITS.md) — findings from periodic product/UX audits.

### Sentinel state files

One folder per named Sentinel. Each has a `STATUS.md` tracking what that Sentinel is currently watching.

- `vanguard/` — active sprint + planning Sentinel (in use)
- `osiris/` — docs sync Sentinel (in use)
- `sentinel/` — reserved
- `banshee/` — reserved (uptime alerts)
- `hawthorne/` — reserved
- `iron-wolf/` — reserved
- `ikora/` — reserved

Sentinel folders were scaffolded Session 14 (Sprint E Item 1, commit 0ce4820). Vanguard and Osiris are live as Claude Projects with GitHub sync.

## What's NOT in this folder

- **Tower's code** — lives in `tower/` at the repo root.
- **Current execution truth** — lives in `docs/ROADMAP-LIVE.md` at the docs root. ROADMAP-LIVE is the live commit/bundle/sprint tracker; this folder is Tower-scoped docs only.
- **Session summaries** — live in `docs/session-{N}/SUMMARY.md`.

## Required reading order

When picking up Tower work cold:

1. [`../ROADMAP-LIVE.md`](../ROADMAP-LIVE.md) — what state is the project in right now?
2. [`vanguard/SPRINT-CURRENT.md`](./vanguard/SPRINT-CURRENT.md) — what's the active sprint doing?
3. [`CHARTER.md`](./CHARTER.md) — what is Tower for?
4. [`design-system.md`](./design-system.md) — how does Tower look?
5. Latest `docs/session-{N}/SUMMARY.md` — what just happened?

## Quick reference

| Question | File |
|---|---|
| What's Tower for? | [`CHARTER.md`](./CHARTER.md) |
| What's shipping right now? | [`vanguard/SPRINT-CURRENT.md`](./vanguard/SPRINT-CURRENT.md) |
| What's the long-range plan? | [`ROADMAP.md`](./ROADMAP.md) |
| How should Tower UI look? | [`design-system.md`](./design-system.md) |
| What are the known risks? | [`../RISKS.md`](../RISKS.md), [`RISKS-FROM-AUDITS.md`](./RISKS-FROM-AUDITS.md) |
| Is there a live app? | Yes — `tower.phajot.com`, gated by Cloudflare Access. |

---

*Last updated: 2026-04-18 (post Session 15 close). Tower live at tower.phajot.com as of Session 15 Item 1 (commit 428ad78). Visual direction: Cosmodrome (Session 15, commits ce39de5 → 2f5faa7). Design system v1: Session 15, `design-system.md`.*
