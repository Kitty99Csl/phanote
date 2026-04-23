# Session 23 — Decisions Log

**Date:** 2026-04-21 → 2026-04-22
**Theme:** Sprint I Part 3 — Backend hygiene batch

---

## D23-Q1 — File split boundaries (LOCKED Phase A)

**Decision:** 5-file tree under `workers/lib/support-console/`:

```
support-console/
├── index.js              — thin dispatcher + re-exports (131 lines)
├── helpers.js            — auth + REST + audit loggers + utilities (381 lines)
├── user-recovery.js      — Group B: 3 user-facing handlers (323 lines)
├── admin-approve.js      — Group C: 2 admin approvers + factory (167 lines)
└── admin-summary.js      — Group D: 4 admin summary + queue handlers (567 lines)
```

**Rationale:**
- Thin dispatcher pattern: `index.js` is the single entry point imported by `phanote-api-worker.js`. Sub-modules export handlers; index wires them up.
- helpers.js is a pure utility module — no handler logic, zero circular-import risk (all sub-modules only import `./helpers.js`).
- Main worker import changed from `'./lib/support-console.js'` to `'./lib/support-console/index.js'`. Zero other import-site changes.
- Handler bodies transplanted verbatim (Rule: zero behavior changes). Line-count growth (+71 net vs pre-split) is file-header + import-statement overhead.

**Override accepted (D23-C2):** admin-summary.js at 567 lines is 13% over the aspirational 500-line guidance, but well under Rule 7's 800-line hard line. Sub-splitting to hit 500 would have required 6-file tree vs Phase A's 5-file lock. Accept.

---

## D23-Q2 — Migration 016 RPC shape (LOCKED Phase A, column-name fix applied)

**Decision:** `public.complete_pin_reset(p_user_id uuid, p_new_pin_config jsonb) RETURNS jsonb`

- `LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`
- Returns structured jsonb: `{ ok: true }` on success, `{ ok: false, error: '<slug>' }` on gate failure
- **Not** `RAISE EXCEPTION` — PostgREST surfaces clean 200 JSON, worker HTTP-code-maps on slug
- Atomic UPDATE: profiles first, then user_recovery_state (both inside PostgREST's implicit transaction)
- Defensive re-verification of all 3 gates inside RPC (belt-and-braces with worker's first-line gates)
- Uses stored `pin_reset_expires_at` for Gate 2 (worker is authoritative on window duration)
- `approved_by` + `last_action_metadata` intentionally preserved across resets (audit trail of most recent approval)
- `REVOKE EXECUTE FROM public; GRANT EXECUTE TO service_role`

**Error-slug → HTTP code mapping (worker-side):**
| Slug | HTTP |
|------|------|
| `not_requested` | 403 |
| `not_approved` | 403 |
| `expired` | 410 |
| `already_completed` | 409 (idempotency — new in Session 23) |
| PostgREST 5xx | 500 `db_error` |

### Column-name bug catch (Phase A review)

CC's Phase A draft referenced `v_state.approved_at` and `v_state.requested_at`. Actual Migration 014 columns are `pin_reset_approved_at` and `pin_reset_requested_at`. `%ROWTYPE` would have let it compile cleanly but runtime NULL reads on non-existent fields would have cascaded every call to `{ ok: false, error: 'not_approved' }`. Speaker caught via schema lookup during Phase A paste-back review. Fix applied to all 3 gate checks + the SELECT statement + the UPDATE targets before disk write.

---

## D23-Q3 — I-11 PostgREST FK-hint investigation (LOCKED Phase A → Option C: won't-fix)

**Original decision:** Attempt Path A — `profiles?select=*,user_recovery_state!user_recovery_state_user_id_fkey(*)` against warm production schema with strict 30-min timeout. On success: migrate Fallback A back to embed. On failure at timeout: close R21-11 as won't-fix.

**Escalated decision (D23-C1):** Speaker selected Option C post-Batch-6 — skip Batch 7 entirely, close R21-11 won't-fix without attempting.

**Rationale for won't-fix:**
- Fallback A (parallel `fetchRecoveryForUser` + `countViaHead`) is production-stable
- `/admin/users/search` uses 50 profiles × 2 subrequests = 100 CF subrequests per call, well under 1000 paid-plan limit
- Marginal performance gain (saving round-trips) at family-beta scale is not correctness
- Investigation time not justified given must-ship items all complete
- Session 24+ may revisit if admin search volume grows significantly

R21-11 formally WON'T-FIX. Documented in master `docs/RISKS.md`.

---

## D23-Q4 — I-14 `/admin/pending-requests` response shape (LOCKED Phase A)

**Decision:** Rich response — embed `_classification` + `_profile` server-side, include BOTH PIN and password flow fields for future-proofing.

Response shape:
```json
{
  "rows": [
    {
      "user_id": "uuid",
      "pin_reset_requested_at": "...",
      "pin_reset_approved_at": "...",
      "pin_reset_required": false,
      "pin_reset_expires_at": "...",
      "password_reset_requested_at": null,
      "password_reset_approved_at": null,
      "password_reset_required": false,
      "password_reset_expires_at": null,
      "approved_by": "uuid | null",
      "updated_at": "...",
      "_classification": { "flow": "pin", "stage": "awaiting_admin", "requested_at": "..." },
      "_profile": { "id": "uuid", "display_name": "...", "phone": "...", "avatar": null }
    }
  ]
}
```

**Design notes:**
- `_classification.stage` values match client's existing `classify()` logic: `"awaiting_admin"` and `"approved"`. Allowed zero consumer-side field-name changes in Batch 5.
- `last_action_metadata` intentionally omitted (admin can see it in `/admin/users/:id/summary`)
- `_profile` may be null if profiles row deleted but recovery row not cascaded yet — client defensive-renders
- Empty-list response: `{ "rows": [] }`, never null, never error
- In-memory filter via `classifyPendingRequest()` (not server-side OR-clause) — family-beta scale makes partial-index optimization negligible
- Single `.in()` call for profile enrichment, not N+1

---

## D23-Q5 — Priority discipline (LOCKED Phase A with CC override accepted)

**Original Phase A scope (from opening brief):**
- Must-ship: I-12, I-13, I-14
- Stretch: I-10, I-11

**CC override accepted:**
- Must-ship: I-10, I-12, I-13, I-14
- Stretch: I-11 only

**Rationale:** I-10 file split is a pure refactor with zero auth/behavior changes. Low risk, high hygiene value, cleanly bundled with the v4.8.2 worker deploy. I-11 is genuinely speculative and the acceptable stretch drop.

Outcome: all 4 must-ship items shipped. I-11 closed won't-fix per Option C.

---

## D23-C1 — Option C (won't-fix R21-11) post-Batch-6

Speaker decision post-Batch-6: skip Batch 7 entirely, close R21-11 won't-fix with the Fallback-A-is-stable rationale from Q3.

Rationale confirmed:
- Session context pragmatism — 30-min investigation on marginal-gain feature not worth the cache-TTL burn + attention cost vs. cleanly finishing Phase C+D
- All must-ship items shipped
- Batch 7 "won't-fix" outcome was an acceptable close; Option C converts that to the outcome without the investigation cost

---

## D23-C2 — admin-summary.js 567 lines accepted as-is (Option A)

Post-Batch-6 decision: 567 lines is 13% over the aspirational 500-line guidance but well under Rule 7 hard line (800). Sub-splitting to hit 500 would require a 6-file tree vs. Phase A's 5-file lock. Accept.

Rationale:
- Rule 7 phrase: "any file > 800 lines must be split before adding features"
- 567 < 800 by 29% margin
- Speaker's "each file under 500" in Batch 6 scope was aspirational, not hard
- Option B (6-file tree) would deviate from Phase A-locked spec for 67 lines of reduction
- Natural trigger for future split: 5th handler added to admin-summary.js

---

## Post-Phase-A discovery: latent Session 21 dispatcher bug

Surfaced during Phase C Step 2 unauth curl. Decision made real-time:

**Bug:** Session 21's original dispatcher used `return handlerX(request, env, ctx)` without `await`. Async function returns a rejecting promise but the synchronous try/catch only intercepts synchronous throws. `AuthError` from `requireAuth` escaped the try/catch → main worker's `await handleSupportConsoleRoute(...)` threw → no outer try/catch → CF 1101.

**Fix:** Change all 8 dispatcher handler calls to `return await handlerX(...)`. Added 6-line NOTE comment documenting the trap. Redeployed v4.8.2.

**Invisibility explanation:** Session 21/22 smoke paths were all authenticated (no AuthError thrown). Session 23 Phase C Step 2 unauth probe was the first call that exercised the AuthError path.

**Framing correction:** Batch 6's paste-back claimed "zero behavior changes" during the split. Technically correct — both pre- and post-split had the same bug. The `return await` fix is a **genuine correctness improvement** beyond Batch 6's refactor framing. Documented in SUMMARY.md learnings.

---

## Concurrency acceptance note

The upsert merge-duplicates pattern used by `handleApprove*` handlers is accepted as correct for family-beta scale. Two admins approving simultaneously would last-write-wins on approved_by + last_action_metadata; the expiry timestamps would be the later admin's, which is correct UX. No serializable-isolation ceremony needed.

---

## External review shaping

Session 22's closing included pre-Session-23 external review:
- **GPT-5:** confirmed Session 21 decisions sound — no changes needed. Signal: continue as planned.
- **Gemini 2.5 Pro:** caught (1) I-9 implicit dep on I-4 (must ship together) — adopted, shipped Session 22; (2) cognitive-mode split recommendation between Session 22 UI and Session 23 backend — adopted, sessions themed accordingly.
- **Gemini's rejected proposal:** client-direct-RPC for `complete_pin_reset`. Speaker correctly identified that authorization requires multi-party state (user JWT + admin approval record) checked together at the worker — worker is the enforcement point, not a privileged middleman. External review is a signal, not an authority; the Speaker is the decider.
