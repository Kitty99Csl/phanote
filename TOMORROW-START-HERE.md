# Next Session Start Here

**Last session:** Session 10 — Sprint B shipped (Trust & Safety Round 1) · April 15, 2026
**Next session:** Session 11 — Sprint C (Real auth + schema drift + native-dialog replacement)
**Plan:** `docs/tower/AUTH-DESIGN.md`

## Quick context

**Sprint B is complete.** Four priorities shipped in Session 10, all on `main`, all Rule-11 verified:

| Priority | Commit | What landed |
|---|---|---|
| B — Parent wrappers | `6b4911f` | 5 fire-and-forget `onSave` sites fixed using `GoalsScreen.jsx:253` as template |
| C — Toast system | `2e99fad` | Shared `useSyncExternalStore` toast store + `ToastContainer`, wired into 5 catch blocks, 4 i18n keys lo/th/en |
| A — Sheet migration | `05f8f7d` | 3 remaining raw-div modals (Edit Transaction, Set Budget, Streak) migrated to `Sheet`. Zero raw-div modals remain. |
| RLS cleanup | (Supabase SQL, no commit) | Speaker ran 6 adversarial probes against `app_events` + `monthly_reports`. All passed. 7 user-data tables now RLS-verified. |

**Production bundle hash progression:** `CWOl1l1h` → `CZZVjtlT` → `CiaE2sAV` → `CewyGnUw`. All 3 commits flipped the hash cleanly. See `docs/session-10/SUMMARY.md` for the full session wrap-up.

**Sprint B definition of done — all boxes checked:**
- [x] 5 parent-wrapper bugs fixed
- [x] Toast system catches Supabase write failures with multilingual messages
- [x] `app_events` + `monthly_reports` RLS adversarially verified
- [x] Sheet migration finished on 3 modals
- [x] Production bundle hash different from session start (Rule 11)
- [x] `docs/session-10/SUMMARY.md` created
- [x] `docs/RISKS.md` updated (4 MEDIUM risks moved to Resolved)
- [x] `TOMORROW-START-HERE.md` updated (this file)

## What's in `docs/tower/` (read before starting Session 11)

| File | Purpose |
|---|---|
| `docs/tower/CHARTER.md` | Tower's mission, team, architecture. The founding doc. |
| `docs/tower/ROADMAP.md` | Sprints B → K with estimates, dependencies, and timeline. |
| `docs/tower/AUTH-DESIGN.md` | **Step-by-step plan for Session 11 Sprint C.** Start here. |
| `docs/tower/SPRINT-B-PLAN.md` | Reference — Sprint B is now shipped, but the plan doc remains as a pattern for future sprints. |
| `docs/tower/RISKS-FROM-AUDITS.md` | Cross-check between the two external audit PDFs and current state. |

## What's shipping in Sprint C (Session 11)

Open `docs/tower/AUTH-DESIGN.md` for the full step-by-step. Summary:

### Priority 1 — Real auth replacement
Replace the phone-to-email auth trick (`{countryCode}{phone}@phanote.app` + `Ph4n0te{phone}X` password) with proper phone OTP via Supabase's native phone auth provider or LINE LIFF login. The current scheme is intentionally preserved in CLAUDE.md's "don't touch" list because existing users depend on it — Sprint C's job is to build the new auth path alongside the old, provide a legacy migration flow, and eventually retire the `@phanote.app` email trick without breaking existing accounts.

### Priority 2 — Schema drift capture
Write `supabase/migrations/004_capture_current_schema.sql`. This is a mechanical transcription of the live Supabase schema into a repeatable migration file:

**4 tables with column drift** (migration missing columns the live DB has):
- `profiles` — 9 missing columns
- `transactions` — 8 missing columns
- `budgets` — column name drift (`amount`+`period` → `monthly_limit`)
- `ai_memory` — 2 missing columns + 1 unused column

**3 tables entirely missing from migrations** (created via Supabase dashboard only):
- `goals`
- `app_events`
- `monthly_reports`

Then `005_rls_policies_final.sql` to capture the Session 9 + Session 10 RLS state as code. After this, the repo can rebuild production state from migrations alone. Closes the "schema drift" HIGH risk from RISKS.md.

### Priority 3 — Native-dialog replacement
Replace all `window.confirm()` and `alert()` calls with the shared toast system (for alerts) and a new `ConfirmDialog` component (for confirmations). Scope includes:
- `App.jsx:248` `handleDeleteTransaction` — uses `window.confirm("Delete this transaction?")`
- Any other `window.confirm` / `alert` calls found in a grep sweep
- Wire the 4 catch sites deferred from Sprint B (`handleUpdateProfile`, `handleUpdateNote`, `handleDeleteTransaction`, `StatementScanFlow` delete batch) into the toast system as part of this pass

## How to start Session 11

1. Open Codespace (remember: stop when done to save quota)
2. `git pull origin main` — should be at the Session 10 docs wrap-up commit or newer
3. `nvm use 24.13.1` (verify `node --version` matches `.nvmrc`)
4. `npm ci` — verify lockfile is clean
5. `npm run build` — confirm bundle builds
6. `curl -s https://app.phajot.com/ | grep -oE 'index-[A-Za-z0-9_-]+\.js'` — **should return `index-CewyGnUw.js` or newer. Write down the hash.** You'll verify it changed after Sprint C merges.
7. Read `docs/session-10/SUMMARY.md` for full Session 10 context
8. Read `docs/tower/AUTH-DESIGN.md` for the Sprint C plan
9. Read `docs/RISKS.md` for the current prioritized risk list
10. Tell Claude "start Sprint C priority [1/2/3]" OR describe a different priority order

## Session 10 learnings to carry forward

(full list in `docs/session-10/SUMMARY.md`)

1. **Plan prose can lag real code.** The Sprint B plan's "positive template" description for `GoalsScreen.jsx:253` didn't match the actual (terser, implicit-return) code. Always verify the claim before writing a diff.
2. **Supabase JS never throws on DB errors** — it resolves to `{ data, error }`. Every Supabase write site must destructure `{ error }` and explicitly throw. This is the root cause of every "silent write failure" in the codebase.
3. **Rethrowing from a toast handler keeps the modal open** — which is correct UX. The instinct to "handle" the error silently is wrong: the user needs to see their form state intact and retry.
4. **File-name collisions → augment, don't rename.** Sprint C will face this again when the new `ConfirmDialog` potentially collides with anything existing. Extend the existing file in place.
5. **CF Pages deploy latency is non-deterministic** — can be instant or up to ~90s. Use the scheduled wakeup pattern when waiting for a hash flip.

## What's deferred

Per Speaker directives across Sessions 9 and 10:

- **New features** (LINE bot, recurring transactions, CSV export, bulk actions) — deferred until Tower ships. Will be revisited in Sprint K.
- **Tower construction itself** — deferred until prerequisites ship (Sprints B, **C**, D, E). First Tower code lands in Session 14 (Sprint F).
- **Landing page rewrite** — deferred to Sprint K. The homepage audit findings are preserved in `docs/tower/RISKS-FROM-AUDITS.md` for future Iron Wolf to pick up.
- **Lao/Thai toast copy wife review** — non-blocking. Can happen any time between sessions; doesn't need its own session.

## Known things NOT to touch

* `workers/phanote-api-worker.js` (filename preserved post-rename, content renamed)
* `@phanote.app` email domain in auth **(Sprint C is building the replacement — but the old trick stays available for legacy account migration until Sprint C's cut-over step)**
* `Ph4n0te` password prefix **(same — legacy migration target, don't delete until Sprint C's cut-over step)**
* `localStorage phanote-*` keys (preserves user preferences)
* Legacy phanote.com URLs in worker comment line 3 (historical marker)
* `useClickGuard` + `fetchWithTimeout` + **`Sheet` + `toast` + `ToastContainer`** usage sites — Session 10 infrastructure, don't bypass
* **`.nvmrc` exact pinning** — do not revert to major-only
* **`package.json` `engines` field** — same reason
* **User B test account** (`5e3629a1-aa60-4c25-a013-11bf40b8e6b9`) — permanent RLS regression test identity
* **RLS policies on all 7 user-data tables** — canonical single-policy shape from Session 9 + 10, don't add overlapping policies
* **Existing `Toast` export in `src/components/Toast.jsx`** — legacy streak/quick notification component, byte-identical, used by HomeScreen. The new `ToastContainer` lives alongside it.

## Tower-specific things NOT to touch yet

These exist as documentation but should not be built in Session 11:

* `tower/` folder — does not exist yet, will be created in Session 14 (Sprint F)
* `tower.phajot.com` subdomain — not configured yet, Session 14 task
* Cloudflare Pages project for Tower — does not exist yet, Session 14 task
* Claude Projects for Sentinels — set up in Session 13 (Sprint E), not before

## Session 11 definition of done

Before marking Sprint C complete:

- [ ] New phone auth path works end-to-end (signup, login, session restore)
- [ ] Legacy `@phanote.app` trick still works for existing users (no forced migration yet)
- [ ] `supabase/migrations/004_capture_current_schema.sql` created and applied
- [ ] `supabase/migrations/005_rls_policies_final.sql` created (optional if drift capture proves complex)
- [ ] All `window.confirm()` / `alert()` calls replaced with toast or `ConfirmDialog`
- [ ] 4 remaining catch sites from Sprint B wired into toast system
- [ ] Production bundle hash different from session start (Rule 11)
- [ ] Wife's account still works after deploy
- [ ] `docs/session-11/SUMMARY.md` created
- [ ] `docs/RISKS.md` updated — schema drift HIGH risk closed or downgraded
- [ ] `TOMORROW-START-HERE.md` updated to point at Sprint D (i18n marathon)

## If Sprint C slips

If Session 11 only completes auth replacement:
- Move schema drift + native-dialog replacement to Session 12
- Sprint D (i18n marathon) shifts to Session 13, compressing Sprint E or slipping Tower launch by one session

If Session 11 only completes schema drift + native-dialog replacement:
- Auth replacement moves to Session 12
- Sprint D stays in Session 13
- Tower launch timeline unchanged

If Session 11 runs out of time entirely:
- Stop and ask. The plan is probably wrong somewhere.

## 💚 Remember

Sprint C is brick 2 of the Tower wall. Auth is the riskiest part of the 4 prerequisite sprints — it touches existing users, it requires a migration path, it has to coexist with the old system until the cut-over. Go slow on the migration flow, go fast on the new-user path.

- Take breaks. Drink water.
- Wife is your best QA — test the legacy login path with her account before touching anything.
- One commit per logical unit. Atomic, reversible.
- Rule 11: "merged" ≠ "shipped." Always verify the bundle hash.
- **Every Supabase write site: destructure `{ error }`, throw, catch, toast, rethrow.** The Sprint B pattern is now the house style.

🐾
