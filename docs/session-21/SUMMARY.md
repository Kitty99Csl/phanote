# Session 21 SUMMARY

**Date:** 2026-04-20
**Duration:** ~10+ hours (single continuous session)
**Speaker energy:** structured + adversarial-minded (caught M014 RLS recursion bug via deliberate probes; caught PostgREST embed failure at smoke test; caught PIN persistence bug at manual verification)
**Sprint:** I Part 1 — Admin-Approved Recovery System (scope lock)
**Shipped:** 2 migrations + 8 worker endpoints + main-app Forgot PIN flow

## Session metrics

| Metric | Count |
|---|---|
| Commits | 3 (plus wrap commit) |
| Migrations applied | 2 (014 + 015) |
| Worker endpoints added | 8 |
| Smoke-test probes passed | 9/9 (Commit 2 adversarial curl sequence a–i) |
| i18n keys added | 17 × 3 languages |
| New files | `workers/lib/support-console.js`, `src/lib/recovery.js`, `src/screens/SetNewPin.jsx`, `supabase/migrations/014_admin_support_console.sql`, `supabase/migrations/015_admin_policy_recursion_fix.sql` |
| Hotfix migrations shipped same session | 1 (M015 fixed M014 recursion bug discovered during postflight adversarial tests) |
| Deploy cycles | 2 (worker v4.8.0 → v4.8.1 for Fallback A) |
| Deferred items | R21-13 PIN persistence bug (→ Session 21.5), R21-10 worker split (→ Session 22), R21-11 PostgREST embed investigation (→ Session 22), R21-12 app_events.level column audit (→ Session 22 schema pass) |

## Phases completed

| Phase | Commit hash | Summary |
|---|---|---|
| Pre-work reality check | — | 5 checks reported + paste-back; CRITICAL auth-gap surfaced (requireAuth chicken-and-egg for forgot-password) |
| Scope pivot: B+placeholder | — | PIN recovery fully wired; password recovery schema-only, user-side deferred Session 22/23 |
| Commit 1 — Migrations 014+015 | `22c5e86` | Schema (user_recovery_state, tower_admin_actions, additive admin-read policies) + SECURITY DEFINER `is_admin()` helper to break RLS recursion |
| Commit 2 — Worker v4.8.1 | `e4393b0` | 8 endpoints (3 user-facing recovery + 2 admin approval + 3 admin summary). Fallback A pattern for embed failures |
| Commit 3 — Main app Forgot PIN | `a9eda3c` | i18n (17×3) + `src/lib/recovery.js` + `<SetNewPin>` + PinLock Forgot button + App.jsx handleLogin recovery hook |
| Wrap | `<this commit>` | Docs atomic update per Rule 20 |

## Partial failures + recovery patterns

### M014 RLS recursion (42P17)

**Trigger:** Adversarial probe (b) + (c) during Migration 014 postflight.

**Root cause:** Migration 014 placed an admin-read policy ON `profiles` itself with an inline `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)` subquery. PostgreSQL re-applied the policy when evaluating the subquery, producing infinite recursion.

**Transitive impact:** All 4 M014 admin-read policies (`profiles`, `transactions`, `app_events`, `user_recovery_state`) were broken — any EXISTS subquery on `profiles` triggered the recursion. M009 §1 `ai_call_log` admin policy was also transitively broken during the window.

**Fix:** Migration 015 — `public.is_admin()` SECURITY DEFINER function. Policies reference the boolean return value instead of subquerying profiles. Applied same session per Rule 19 (which permits same-session backfill for emergency fixes).

**Adversarial re-run post-M015:** all probes (b)+(c)+(d)+(e)+(f) passed. Regression guard (§6) passes.

### M015 postflight confusion

First apply attempt ran the commented postflight block as DDL (skipped the actual CREATE FUNCTION + CREATE POLICY statements). Second attempt ran Section 1 + Section 2 DDL directly and succeeded. No state corruption. Documented as D21-Q2-adjacent operator-experience insight → future migrations should better delimit executable DDL from verification comments.

### PostgREST embedded resources (500 even after NOTIFY pgrst)

**Trigger:** Step (f) `/admin/users/search` smoke test returned 500.

**Diagnosis:** The initial Group D design used `transactions(count)` + `user_recovery_state(...)` PostgREST resource embedding. `NOTIFY pgrst, 'reload schema'` did not fix it. Re-probe still 500'd.

**Fallback A:** Drop all embeds. Fetch profiles first (no embeds), then parallel per-row `countViaHead` for transaction count + per-row `fetchRecoveryForUser` for recovery state. 50 profiles × 2 subrequests = 100, well under CF paid-plan 1000 subrequest cap.

**Outcome:** Worker v4.8.1 redeploy → step (f) retry passed. `total_transactions` returns NUMBER (179 for Speaker, 104/0/7/6 for other matches). Step (g) summary also re-verified with parallel recovery fetch.

**R21-11 tracking:** Investigation for Session 22 — may require explicit FK-name syntax (`user_recovery_state!user_recovery_state_user_id_fkey(*)`) or a grant that Migration 014 didn't emit.

### PIN persistence bug (R21-13 HIGH)

**Discovered:** Speaker manual testing during Commit 3 smoke verification. Settings PIN change updates `localStorage` but does NOT persist to `profiles.pin_config`. Root cause in `savePinConfig` (App.jsx:57-67) — the DB update is fire-and-forget inside an IIFE that doesn't await and may silently fail; behavior needs re-audit.

**Impact:** If user clears localStorage or logs in from a new device, their last set PIN is NOT restored from DB — `pin_config` there may be stale. Also blocks a clean test of Scenario D (recovery completion persistence).

**Deferred to Session 21.5** — dedicated hotfix session opening immediately after Session 21 close. Scope limited to: audit `savePinConfig`, verify DB write succeeds synchronously, add test harness for PIN persistence across sessions.

## Commit 2 smoke test results (9/9 PASS)

Adversarial curl sequence against `api.phajot.com` v4.8.1 with Speaker admin JWT (UUID `ae179274-861e-4cba-adba-4ebe687a64f1`):

| # | Endpoint | Outcome |
|---|---|---|
| a | `POST /recovery/request-pin-reset` | 200 `{status: "requested"}` |
| b | `GET /recovery/status` | 200, `pin_reset_requested_at` populated |
| c | `POST /admin/users/:id/approve-pin-reset` | 200 `{status: "approved"}`, +30min expires_at |
| d | `GET /recovery/status` (post-approval) | 200, `pin_reset_required=true`, `approved_by` + metadata correct |
| e | `POST /recovery/complete-pin-reset` | 200 `{status: "completed"}` (no warning → both steps C+D succeeded) |
| f | `POST /admin/users/search` | After Fallback A: 6 results, `total_transactions` NUMBER ✓ |
| g | `GET /admin/users/:id/summary` | Full bundle: profile + 3 txn counts (179/24/179) + top 3 categories (Food/Other/Coffee) + recovery_state cleared |
| h | `POST /admin/users/:id/view-transactions` | 20 rows, no `note` field (privacy default) ✓ |
| i | `POST /admin/users/:id/approve-password-reset` | 200, `password_reset_*` fields set, `pin_reset_*` untouched (merge-duplicates working) |

## Post-wrap production state

- **Worker:** v4.8.1 live at `api.phajot.com` (deployed_at `2026-04-20T10:57:56Z`)
- **Main app bundle (Speaker-built local):** `index-InDWwRPz.js`
- **Main app bundle (CF Pages production):** `index-xMpsmdvy.js` — **differs from local by design** per Session 9 learning (CF Pages builds in its own Node/npm env, different chunk hash). Production hash ≠ pre-Session-21 baseline `index-RVdx7aXp.js` → Rule 11 verified, Commit 3 is live.
- **Tower bundle:** `index-DJwN4vkN.js` (unchanged — no Tower work this session)
- **Migrations:** 15 applied (001–015)

## Browser smoke test status

**Deferred to Session 21.5 opening ritual** — Scenarios B/D/E (Forgot PIN UI, recovery completion, expired recovery) not walked in browser. Rationale: Speaker end-of-session fatigue after PIN-persistence debug sidetrack. Deferral risk assessed LOW (build was clean, paste-back review was thorough, worst-case "button doesn't render" is a trivial tomorrow-fix). Will be verified alongside R21-13 fix in Session 21.5.

## Sentinel re-sync

Pending — triggered at session close per Speaker's plan.
- Vanguard re-sync: **TO TRIGGER** (Speaker runs out-of-band)
- Osiris re-sync: **TO TRIGGER** (Speaker runs out-of-band)
- (No Hawthorne — doesn't exist in Speaker's team setup; CLAUDE.md clarified accordingly)

## Learnings — see CLAUDE.md Session 21 block

Promoted to CLAUDE.md recent-key-learnings:

1. RLS self-reference antipattern + `is_admin()` SECURITY DEFINER helper pattern
2. INSERT RLS eval fires before SELECT planning (explains why M014 probe (a) passed while (b)/(c) exploded)
3. PostgREST embedded resources can fail 500 even after NOTIFY pgrst; Fallback A is safe
4. Sequential-write + self-healing fail-closed > atomic RPC when partial-failure modes don't leave dangerous intermediate state (R21-8 rationale)
5. Trust-summary paste-back on auth-path code caught M015 misapply + R21-5 mental-model issues before they shipped

## Open threads for Session 21.5

- R21-13 HIGH: `savePinConfig` DB persistence audit + fix
- Browser smoke Scenarios B/D/E walked end-to-end with R21-13 fix
- Rule 11 production hash verified post-21.5 commit
