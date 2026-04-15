# 🗼 docs/tower/ — What's in this folder

This folder is the documentation home for **Tower**, Phajot's internal operator dashboard. Everything here describes Tower's mission, roadmap, team, and execution plans.

If you're new to Tower, read in this order:

1. **`CHARTER.md`** — Start here. What Tower is, why it exists, the 7 Sentinels, the architecture, the rules.
2. **`ROADMAP.md`** — The 6-sprint path from today to a launched Phajot monitored by Tower. Timeline, dependencies, risks.
3. **`RISKS-FROM-AUDITS.md`** — Cross-check between external audit findings and current state. Maps each finding to a specific sprint.
4. **`SPRINT-B-PLAN.md`** — Step-by-step plan for the next session (Session 10). Open this on the morning of Sprint B.
5. **`AUTH-DESIGN.md`** — Replacement for Phajot's pseudo-phone-auth. The Sprint C plan.

## What's NOT in this folder (yet)

These will be added in future sprints:

- `sentinel/STATUS.md` through `ikora/STATUS.md` — one file per Sentinel, created in Sprint E (Session 13)
- `SPRINT-C-PLAN.md` — created at the end of Session 10
- Tower's own code — lives in `tower/` at the repo root, not here (this folder is docs only)
- Tower's design mocks — added during Sprint F planning

## Rules for editing this folder

- **Markdown only.** No binary files, no images in v1 (add images only when they genuinely help understanding).
- **Every file has a changelog at the bottom.** When you change a doc, add a line to its changelog.
- **Sentinels own their own folders.** `docs/tower/vanguard/` is written by the Vanguard Claude Project, not by humans directly. The Speaker reviews and approves.
- **`CHARTER.md` and `ROADMAP.md` are Speaker-owned.** Only Kitty edits these. Sentinels can propose changes via their STATUS files.

## Quick reference

| I need to... | Open this file |
|---|---|
| Understand what Tower is | `CHARTER.md` |
| Know what's being built next | `ROADMAP.md` |
| Start Session 10 tomorrow | `SPRINT-B-PLAN.md` |
| Plan Session 11 auth work | `AUTH-DESIGN.md` |
| See what the audits said | `RISKS-FROM-AUDITS.md` |
| Remember who the Sentinels are | `CHARTER.md` §3.2 |
| Find the deferred work | `ROADMAP.md` Sprint K section |

---

*"Phajot watches your money. Tower watches Phajot."* 🗼
