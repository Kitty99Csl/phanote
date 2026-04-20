# Session 21 — Decision Log

**Session:** 21 · **Date:** 2026-04-20 · **Sprint:** I Part 1 (Admin-Approved Recovery System — closes Sprint I Part 1; Part 2 Tower UI Session 22)

All decisions below were locked during the session and are not subject to retroactive change. Referenced throughout session-21/SUMMARY.md and source code comments.

---

## D21-Q1 — Auth-gap resolution: Option B + placeholder

**Question:** The Session 21 plan's forgot-password flow had a chicken-and-egg auth contradiction: `POST /recovery/request-password-reset` was spec'd with `requireAuth`, but a user who forgot their password has no session. How to resolve?

**Decision:** Option B + placeholder.
- PIN recovery fully wired end-to-end this session (user-side + admin-side).
- Password recovery: schema ready (columns present on `user_recovery_state`), admin approval endpoint built, user-side request + complete deferred to Session 22/23.
- LoginScreen "Forgot password?" button shows static copy only (contact support via LINE/WhatsApp).

**Rationale:** PIN reset is the high-frequency case (user forgot PIN but remembers password). Password reset is rarer and can be handled manually via admin action while the proper magic-link or token flow is designed for Session 22/23.

**Impact:** Commit 2 shipped 8 endpoints instead of 10. Commit 3 scope halved (no `<SetNewPassword>` component; static LoginScreen forgot copy with `[LINE: TBD]` / `[WhatsApp: TBD]` placeholders).

---

## D21-Q2 — Interpretation A (sequential writes, no atomic RPC)

**Question:** The plan's `POST /recovery/complete-pin-reset` spec said "CRITICAL: writes new pin_config to profiles in same transaction as clearing pin_reset_* flags". Supabase REST has no native transaction across UPDATE calls. How to interpret?

**Decision:** Interpretation A — sequential two-step PATCH with documented partial-failure self-heal. No Migration 016 RPC this session.

**Rationale:** All 3 partial-failure modes self-heal via the normal login flow:
- Mode 1 (Step C pin_config write fails): bail with 500, no state changed. User retries.
- Mode 2 (Step D state-clear fails after Step C success): PIN is live in profiles. Return `warning: 'state_cleanup_pending'`. Next login re-enters recovery flow (pin_reset_required still true), endpoint retries Step D idempotently.
- Mode 3 (concurrent double-submit): idempotent merge-duplicates upsert.

**TOCTOU considerations:** Not live in Session 21 — no Tower revoke-approval UI exists yet. If Session 22 adds admin revoke, migrate to RPC at that point.

**Impact:** `workers/lib/support-console.js` Step C+D comments explicitly document R21-8 modes + grep marker `R21-8-MODE2` in console.error for Mode 2 straggler identification.

---

## D21-Q3 — Post-request auto-logout (3s)

**Question:** After user taps Forgot PIN + confirms, what's the UX for "request submitted"?

**Decision:** Auto-logout 3 seconds after success toast. Toast copy: "Request sent. You'll be logged out — log in again after support approves."

**Rationale:** User cannot do anything on PinLock until support approves the reset. Auto-logout tells them the next step. Manual logout button would be redundant. 3-second delay ensures user reads the toast on the authenticated render tree (ToastContainer isn't rendered on LoginScreen per App.jsx structure).

**Impact:** `performForgotPinRequest` in App.jsx uses `setTimeout(3000)` tracked via `forgotPinLogoutTimeoutRef` with defensive useEffect cleanup.

---

## D21-Q4 — User-side request actions NOT logged to tower_admin_actions

**Question:** Should user-side `/recovery/request-pin-reset` calls write an audit row to `tower_admin_actions`?

**Decision:** No. `tower_admin_actions` is admin-scope only (action_type CHECK excludes user-request actions). The `pin_reset_requested_at` / `password_reset_requested_at` timestamp columns on `user_recovery_state` ARE the user-side audit.

**Rationale:** Single-log symmetry — user actions write to `user_recovery_state` timestamps; admin actions write to `tower_admin_actions` rows. Adding user-request entries to `tower_admin_actions` would loosen the CHECK constraint and serve no audit purpose that the timestamp columns don't already fulfill.

---

## D21-Q5 — Password recovery schema ships dormant alongside PIN

**Question:** Ship password-reset columns in Migration 014 or defer to Migration 016 when user-side flow is built?

**Decision:** Ship all 8 `password_reset_*` columns in Migration 014 alongside the `pin_reset_*` columns. Admin approval endpoint `/admin/users/:id/approve-password-reset` ships dormant in Commit 2.

**Rationale:** Saves a second migration in Session 22/23. When user-side flow is implemented, no DB change required — only new worker endpoints + main-app UI.

**Impact:** `user_recovery_state` has 4 pairs of pin_reset_* + password_reset_* columns. Admin approval endpoint is feature-complete for both flows; only user-side request/complete deferred.

---

## D21-Q6 — `last_action_metadata` is "most recent write's metadata" (not historical)

**Question:** `last_action_metadata` semantics — overwrite on each write, or accumulate history?

**Decision:** Overwrite semantic is intentional. `last_action_metadata` reflects the most recent write's context. Canonical action audit (historical) lives in `tower_admin_actions` (admin writes) + timestamp columns on `user_recovery_state` (user writes).

**Rationale:** Accumulating history in a single JSONB column would grow unboundedly + break concurrent-write semantics. Separation of concerns: `user_recovery_state` = current workflow state; `tower_admin_actions` = historical audit.

**Observed behavior:** `/recovery/complete-pin-reset` doesn't overwrite `last_action_metadata` during state clear — preserves the most useful "why was this state the way it was" context (the approval metadata). If Session 22 UI wants a "completed" metadata record, add explicit write inside complete handler.

---

## D21-Q7 — `approved_by` admin UUID exposure in summary response

**Question:** `GET /admin/users/:id/summary` returns `recovery_state.approved_by` as raw admin UUID. Privacy concern?

**Decision:** Intentional for family-beta (2 admins total — Speaker + spouse). Pre-public-launch: resolve UUID → `display_name` at response time to avoid raw UUID exposure in admin-facing JSON.

**Rationale:** Operators need to know who approved a prior action (for "did my co-admin already handle this?" context). UUID is fine when there are 2 admins; becomes noise/risk at scale.

**Impact:** No code change this session. Noted in RISKS.md as pre-public-launch remediation.

---

## D21-Q8 — `has_pending_request:false` conflates "no row" with "fetch failed"

**Question:** `/admin/users/search` response includes `has_pending_request: boolean`. Fallback A uses `fetchRecoveryForUser` which returns null on any failure (absent row OR fetch error). Both paths produce `has_pending_request: false`. Is this acceptable?

**Decision:** Acceptable for v1. Both paths degrade the same way in the Tower UI (no action button shown). Session 22 Tower UI can add a richer indicator (`pending_check_failed: boolean` per result) if needed.

**Rationale:** Admin operator's next action is the same in either case (initiate new search or refresh). Distinguishing the two paths adds UI complexity without clear operator value for family-beta scale.

---

## Session close decisions

- **Defer browser smoke test** (Scenarios B/D/E) to Session 21.5 opening. Speaker fatigue + sidetrack after PIN persistence bug discovery. Build was clean + paste-back thorough → deferral risk assessed LOW.
- **Open Session 21.5** as dedicated hotfix session immediately after Session 21 close. Single scope: R21-13 PIN persistence bug fix + browser smoke verification of Commit 3.
- **Hawthorne removed** from Speaker's Sentinel team in CLAUDE.md recent-learnings section — Session 20 SUMMARY had a phantom reference. Actual team: Vanguard + Osiris (2 Sentinels).
