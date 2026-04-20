# Session 21 — Risk Log

**Session:** 21 · **Date:** 2026-04-20 · **Sprint:** I Part 1 (Admin-Approved Recovery System)

All risks opened, resolved, or changed severity during Session 21. Master register: `docs/RISKS.md`.

---

## HIGH

### [HIGH] R21-13 — Settings PIN change doesn't persist to `profiles.pin_config`

**Discovered:** Speaker manual testing during Commit 3 local smoke verification (late session)
**Status:** Open — blocker for Session 21.5

Settings "Change PIN" flow updates `localStorage` (via `savePinConfig` in [App.jsx:57-67](src/App.jsx#L57-L67)) but the DB write is fire-and-forget inside an IIFE that does not await and may silently fail. Symptom: user changes PIN in Settings → works on current device → clears localStorage or logs in from new device → DB `profiles.pin_config` still has old PIN → user locked out of their own app.

Blocks clean test of recovery completion persistence (Scenario D) because the same `savePinConfig` pathway is used post-recovery.

**Mitigation:** Session 21.5 hotfix scope. Audit `savePinConfig` error handling, verify DB write succeeds synchronously before returning, consider adding a test harness for PIN persistence across sessions.

**Priority:** HIGH — blocker for public launch. Also blocks full Scenario D smoke validation for Commit 3.

---

## MEDIUM

### [MEDIUM] R21-6 — No persistent audit trail for unauthorized admin access attempts

**Discovered:** Group A paste-back review (Session 21)
**Status:** Partial mitigation applied (console.warn); full fix deferred to Session 22

In `requireAdmin` (`workers/lib/support-console.js`), a non-admin caller hitting an `/admin/users/*` endpoint gets a 403 but leaves no persistent audit row. Only a `console.warn` with `user=<id>` + `path=<url>` in CF Worker logs (rotates, not queryable).

**Partial mitigation (Session 21):** console.warn added so compromised-token scenarios leave SOME signal.

**Full fix (Session 22):** Migration 016 extends `tower_admin_actions.action_type` CHECK to include `'unauthorized_admin_attempt'`. `requireAdmin` writes an action row on 403 (service-role bypasses RLS, admin_user_id=null or claimed UUID, metadata includes path + IP).

**Priority:** MEDIUM — implement before public launch. Family-beta risk is bounded (2 admins total).

---

## LOW (closed-this-session or documented)

### [LOW] R21-1 — `profiles.total_transactions` column does not exist

**Discovered:** Pre-work reality check #4
**Status:** ✅ Resolved — Fallback A uses `count(*)` via `countViaHead` (which worked) / embedded count (which failed → Fallback A).

Pre-work searched migrations for `total_transactions` column and found no matches. Worker summary + search endpoints compute counts dynamically. No column to add; no trigger to audit.

---

### [LOW] R21-2 — Supabase admin API vs derived-email pattern (Session 11)

**Discovered:** Pre-work reality check #2 consideration
**Status:** ✅ Not-applicable for Session 21 scope (password reset user-side deferred). Re-evaluate in Session 22/23 when `/recovery/complete-password-reset` is implemented.

---

### [LOW] R21-3 — Additive admin-read policies widen RLS surface on `profiles`/`transactions`/`app_events`

**Discovered:** Migration 014 design
**Status:** Accepted by design; same defense-in-depth as existing Tower rooms (ai_call_log has same pattern since Migration 009). Documented in M014 header.

Admin users gain FOR SELECT across these tables. Non-admins unaffected. Combined with Migration 015's `is_admin()` helper, no recursion risk.

---

### [LOW] R21-4 — Worker SUPABASE_SERVICE_ROLE_KEY must be present

**Discovered:** Pre-work reality check #3
**Status:** ✅ Verified present via `npx wrangler secret list`. Alongside ANTHROPIC_API_KEY, GEMINI_API_KEY, SENTRY_DSN.

---

### [LOW] R21-5 — `pin_config` null handling must re-prompt, not bypass

**Discovered:** Pre-work reality check #2 deep dive
**Status:** ✅ Mitigated via render-chain ordering. `<SetNewPin>` early-return BEFORE PinLock gate in `App.jsx` — R21-5-critical comment marks the exact line. Recovery flow never nulls `pin_config`; only flips the `*_reset_required` boolean.

Verified by inspection that no code path can render HomeScreen with `{owner: null, guest: null}` pin_config during an active recovery.

---

### [LOW] R21-7 — Fail-open vs fail-closed on `/recovery/status` error

**Discovered:** Main-app flow design
**Status:** ✅ Locked fail-closed. Any !ok result (401/403/500/timeout/missing_token/thrown exception) falls through to normal `loadUserData`. Single `if(ok)` block in `handleLogin`, no else branch. Structurally prevents any error path from auto-allowing recovery.

Contract documented in `src/lib/recovery.js` + `src/App.jsx` handler comments.

---

### [LOW] R21-8 — `/recovery/complete-pin-reset` uses sequential PATCH (not atomic RPC)

**Discovered:** Group B design review
**Status:** Accepted for Session 21 per D21-Q2. Session 22 should introduce atomic RPC (Migration 016).

Partial-failure modes all self-heal via the normal login flow:
- **Mode 1** (pin_config write fails): bail with 500, no state changed. User retries.
- **Mode 2** (state-clear fails after pin_config write succeeds): PIN is live. Return `warning: 'state_cleanup_pending'`. Next login retries state clear idempotently.

Grep marker `R21-8-MODE2` in console.error for Mode 2 straggler identification pre-Migration-016. Mitigation (Session 22): Migration 016 introduces `public.complete_pin_reset()` RPC with atomic semantics, same migration as R21-6 admin-audit extension (bundle two small changes).

---

### [LOW] R21-9 — PIN reset accepts weak 4-digit patterns

**Discovered:** Group B paste-back review
**Status:** Documented. Consistent with existing PIN creation flow in App.jsx `handlePinKey`. Introducing reset-only hardening would create inconsistent UX.

**Mitigation (Session 22+):** Holistic PIN policy reject weak patterns (0000, 1234, same-digit repeats) across both creation + reset paths, with proper i18n error messaging.

**Priority:** Low for family-beta; Medium pre-public-launch.

---

### [LOW] R21-10 — `workers/lib/support-console.js` at 1300 lines > Rule 7 threshold

**Discovered:** Group D paste-back (file-size review)
**Status:** Deferred to Session 22 per Speaker's Option 2c decision. Main worker also pre-existing violation (1263 lines) — separate backlog.

**Mitigation (Session 22):** Split support-console.js along natural boundaries — helpers / user-recovery / admin-approve / admin-summary (Option 2b). Session 22 adds Tower Room 6 UI which doesn't grow this file, so post-Session-22 is the natural split moment.

---

### [LOW] R21-11 — PostgREST embedded resources returned 500 even after `NOTIFY pgrst, 'reload schema'`

**Discovered:** Commit 2 smoke test step (f) initial 500
**Status:** Worked around via Fallback A in worker v4.8.1. Investigation deferred to Session 22.

Initial Group D design used `transactions(count)` + `user_recovery_state(...)` PostgREST resource embedding. Both failed with 500 at deploy-time smoke. Schema reload did not fix. Fallback A: drop all embeds, use explicit parallel fetches via `supabaseRest`.

**Investigation for Session 22:**
- Try explicit FK-name syntax: `user_recovery_state!user_recovery_state_user_id_fkey(*)`
- Verify schema cache reload actually propagated (Supabase may have been cold — try again with a warm cache)
- Check if RLS policies on user_recovery_state are blocking embed introspection (service role should bypass — worth verifying)

Optimization-only; current Fallback A is correct and performant (100 subrequests per 50-row search well under CF paid-plan 1000 cap).

---

### [LOW] R21-12 — `app_errors_last_7d: null` in summary response (candidate for schema audit)

**Discovered:** Commit 2 smoke test step (g) summary
**Status:** Candidate — requires investigation in Session 22 schema pass.

`/admin/users/:id/summary` returned `issue_counts.app_errors_last_7d: null` while `ai_errors_last_7d: 0` worked. Suggests `app_events.level` column may not exist in production or has different casing. `countViaHead` catches all errors and returns null → graceful degradation worked as designed; no user-facing impact.

**Mitigation:** Session 22 schema audit — verify `app_events` column set matches expectations (level, user_id, created_at). If column absent, either add via migration or change summary query to use different "error event" heuristic.

---

## Risk severity changes (master RISKS.md updates)

- R21-13 added to master as HIGH open blocker for public launch
- Admin-read paths section in master updated (now live in prod; M014+M015 shipped)
- R21-10 worker file size deferral linked to master backlog
