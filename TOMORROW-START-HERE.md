# Next Session Start Here

**Last session:** Session 9 — CF Pages deploy pipeline fix + RLS hardening (shipped April 14)
**Planning session:** Tower Charter + 10-week roadmap locked (April 14 evening)
**Next session:** Session 10 — Sprint B (Trust & Safety, Round 1)

## Quick context

**Two things happened on April 14, 2026:**

1. **Session 9 shipped at midday** — 3 commits (2 infra + 1 docs wrap-up). CF Pages had been silently failing every build for 2 days. Fixed by pinning exact Node version + regenerating lockfile. RLS hardened across 5 tables, adversarially verified with User B. See `docs/session-9/SUMMARY.md`, `docs/session-9/RLS-HARDENING.md`, `docs/RISKS.md`.

2. **Tower was planned in the evening** — Phajot's sister product. An internal operator dashboard at `tower.phajot.com` where the Speaker (Kitty) oversees Phajot with a team of 7 AI Sentinels. Full charter, roadmap, auth design, Sprint B plan, and audit cross-check are now in `docs/tower/`. Tower itself builds in Sprints F–J (Sessions 14–18). Before that, Sprints B through E must ship the prerequisites.

## What's in `docs/tower/` (read before starting Session 10)

| File | Purpose |
|---|---|
| `docs/tower/CHARTER.md` | Tower's mission, team, architecture. The founding doc. |
| `docs/tower/ROADMAP.md` | Sprints B → K with estimates, dependencies, and timeline. |
| `docs/tower/SPRINT-B-PLAN.md` | **Step-by-step plan for Session 10.** Start here. |
| `docs/tower/AUTH-DESIGN.md` | Sprint C auth replacement plan. Read before Session 11. |
| `docs/tower/RISKS-FROM-AUDITS.md` | Cross-check between the two external audit PDFs and current state. |

## What's shipping in Sprint B (this session)

Open `docs/tower/SPRINT-B-PLAN.md` for the full step-by-step. Summary:

### Priority B — Parent-wrapper hygiene sweep (~1 hour)
Fix 5 fire-and-forget `onSave` wrappers:
- `BudgetScreen.jsx:159` — fire-and-forget wrapper
- `BudgetScreen.jsx:36` — `saveBudget` no try/catch
- `HomeScreen.jsx:71` — `handleEditSave` same pattern
- `dbSaveMemory` swallowing errors in HomeScreen
- `GoalsScreen.jsx:47` — `updateGoal` no try/catch

Positive template: `GoalsScreen.jsx:252-253`.

### Priority C — Error-surfacing toasts (~2–3 hours)
Build a shared toast system for Supabase write failures. Apply to `dbInsertTransaction`, `dbSaveMemory`, `saveBudget`, `updateGoal`. Multilingual (lo/th/en). Warm, friendly copy following Codex §14 brand voice.

### Priority RLS cleanup (~15 minutes)
Run the 3 adversarial probes from `docs/session-9/RLS-HARDENING.md` against `app_events` and `monthly_reports`. Confirm single-policy coverage.

### Priority A — Sheet migration finish (~2 hours, optional)
Migrate `EditTransactionModal`, `SetBudgetModal`, `StreakModal` to the shared `Sheet` component. Follow the `GoalModal` migration pattern from commit `bacdf06`.

## How to start Session 10

1. Open Codespace (remember: stop when done to save quota)
2. `git pull origin main` — should be at `aa78f9e` + Session 9 docs wrap-up + this morning's Tower planning commit
3. `nvm use 24.13.1` (verify `node --version` matches `.nvmrc`)
4. `npm ci` — verify lockfile is clean
5. `npm run build` — confirm bundle builds
6. `curl -s https://app.phajot.com/ | grep -oE 'index-[A-Za-z0-9_-]+\.js'` — **write down the hash**. You'll verify it changed after merge.
7. Open `docs/tower/SPRINT-B-PLAN.md` and work through it in order
8. At end of session, re-run the curl and confirm the hash is different

## What's deferred

Per Kitty's Session 9 and Tower planning directives:

- **New features** (LINE bot, recurring transactions, CSV export, bulk actions) — deferred until Tower ships. Will be revisited in Sprint K.
- **Tower construction itself** — deferred until prerequisites ship (Sprints B, C, D, E). First Tower code lands in Session 14.
- **Landing page rewrite** — deferred to Sprint K. The homepage audit findings are preserved in `docs/tower/RISKS-FROM-AUDITS.md` for future Iron Wolf to pick up.

## Known things NOT to touch

* `workers/phanote-api-worker.js` (filename preserved post-rename, content renamed)
* `@phanote.app` email domain in auth (breaks existing users — Sprint C adds legacy migration, doesn't change the email domain)
* `Ph4n0te` password prefix (kept available for legacy migration during Sprint C, then deprecated)
* `localStorage phanote-*` keys (preserves user preferences)
* Legacy phanote.com URLs in worker comment line 3 (historical marker)
* `useClickGuard` + `fetchWithTimeout` usage sites — Sprint A Ext infrastructure
* **`.nvmrc` exact pinning** — do not revert to major-only
* **`package.json` `engines` field** — same reason
* **User B test account** (`5e3629a1-aa60-4c25-a013-11bf40b8e6b9`) — permanent RLS regression test identity
* **RLS policies on profiles / transactions / budgets / ai_memory / goals** — canonical single-policy shape from Session 9, don't add overlapping policies

## Tower-specific things NOT to touch yet

These exist as documentation but should not be built in Session 10:

* `tower/` folder — does not exist yet, will be created in Session 14 (Sprint F)
* `tower.phajot.com` subdomain — not configured yet, Session 14 task
* Cloudflare Pages project for Tower — does not exist yet, Session 14 task
* Claude Projects for Sentinels — set up in Session 13 (Sprint E), not before

## Session 10 definition of done

Before marking Sprint B complete:

- [ ] 5 parent-wrapper bugs fixed
- [ ] Toast system catches Supabase write failures with multilingual messages
- [ ] `app_events` and `monthly_reports` RLS adversarially verified
- [ ] Sheet migration finished on 3 modals (optional, slippable to Session 11)
- [ ] Production bundle hash different from session start (Rule 11)
- [ ] Wife's account still works
- [ ] `docs/session-10/SUMMARY.md` created with what shipped
- [ ] `docs/RISKS.md` updated — removed risks this session closed
- [ ] `TOMORROW-START-HERE.md` updated to point at Sprint C

## If Sprint B slips

If Session 10 runs out of time and only Priority B + C ship:
- Move RLS cleanup + Priority A to Session 11
- Sprint C (auth) still starts in Session 11
- The roadmap timeline shifts by about half a session — acceptable

If Session 10 runs out of time and only Priority B ships:
- Move Priority C + RLS + A to Session 11
- Sprint C (auth) shifts to Session 12
- The roadmap timeline shifts by one full session — still acceptable
- Re-evaluate whether Sprint D can be compressed

If Session 10 doesn't even complete Priority B:
- Stop and ask. Something is wrong with the plan, not the execution.

## 💚 Remember

Sprint B is the first brick in the Tower wall. Every room of Tower depends on this sprint. Lay it well. Slow is smooth, smooth is fast.

- Take breaks. Drink water.
- Wife is your best QA — show her the toasts in action.
- One commit per logical unit. Atomic, reversible.
- Rule 11: "merged" ≠ "shipped." Always verify the bundle hash.

🐾
