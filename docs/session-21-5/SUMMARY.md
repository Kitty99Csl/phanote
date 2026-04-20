# Session 21.5 SUMMARY

**Date:** 2026-04-20 (same-day hotfix following Session 21 close)
**Duration:** ~75 minutes
**Speaker energy:** focused, single-scope hotfix intent
**Sprint:** I.5 — R21-13 PIN persistence hotfix
**Shipped:** 1 fix commit closing R21-13 HIGH

## Session metrics

| Metric | Count |
|---|---|
| Commits | 1 fix + 1 wrap |
| Files changed | 3 (App.jsx, SettingsScreen.jsx, shared/i18n-data.js) |
| Lines changed | +74 / −9 |
| i18n keys added | 1 × 3 languages (`pinSaveFailed`) |
| Smoke-test scenarios passed | 3/3 (Tests 1/2/3 + implicit Session 21 Scenario B coverage) |
| Risks closed | 1 (R21-13) |
| Risks opened | 2 (R21-14 password change, R21-15 disable owner PIN) |
| Decisions locked | 1 (D21.5-Q1 savePinConfig single-function) |

## Phase log

| Phase | Elapsed | Outcome |
|---|---|---|
| Ritual | 2 min | No drift. HEAD `84646a1`, prod `xMpsmdvy.js`, worker v4.8.1, 15 migrations |
| A — Diagnosis (read-only) | ~15 min | Confirmed 3 defects in `savePinConfig`: fire-and-forget IIFE + catch {} + no `{error}` shape check. 3 actual call sites mapped (handleSetupKey / handlePinRecoveryComplete / SettingsScreen Guest Remove) |
| B — Fix (5 edits) | ~25 min | B1 core refactor + B2 handleSetupKey try/catch/revert/toast + B3 handlePinRecoveryComplete `.catch()` warn-only + B4 SettingsScreen Remove handler + B5 i18n `pinSaveFailed` × 3 langs |
| C — Smoke (Speaker) | ~20 min | Initial "Settings disappeared" confusion traced to guest-PIN-entered-not-owner (actually proved fix works). Clean re-test: 3/3 PASS |
| D — Commit + wrap | ~13 min | Commit `98f758d` + Rule 11 verify + wrap docs |

## Root cause recap

`savePinConfig` pre-21.5:
```js
const savePinConfig = (cfg) => {
  if (userId) store.set(`phanote_pins_${userId}`, cfg);
  store.set("phanote_pins", cfg);
  setPinConfig(cfg);
  if (userId) {
    (async () => {
      try { await supabase.from("profiles").update({ pin_config: cfg }).eq("id", userId); }
      catch {}
    })();
  }
};
```

**Triple defect stack:**
1. Fire-and-forget IIFE — outer function returns synchronously, caller has no way to know DB write succeeded.
2. `catch {}` silently swallows thrown errors (timeout, AbortError, network drop).
3. **No `{ error }` shape check** — Supabase JS does NOT throw on RLS denials, constraint violations, or permission errors. Those land in the returned object's `error` field. The `try/catch` was dead code for the common-case data-layer failures. Silent success was the actual behavior.

Symptom chain: user changes PIN in Settings → localStorage updates ✓ → DB write fails silently → user logs out → `loadUserData` fetches pin_config from DB (source of truth) → stale PIN returned → user locked out with their previous PIN.

## Fix summary

**Core (`savePinConfig`):**
- Now async
- Inspects `{ error }` return shape explicitly
- Throws `Error(error.message)` on failure
- Caller responsible for revert + user-facing error

**Call sites:**

| Site | Pattern |
|---|---|
| handleSetupKey (Settings PIN setup/change) | `await` + `try/catch` + `showToast(pinSaveFailed)` + best-effort revert via `savePinConfig(previousCfg).catch(()=>{})` |
| handlePinRecoveryComplete (Session 21 recovery) | `.catch(e => console.warn(...))` — NO toast. Worker already wrote DB authoritatively; surfacing error would be misleading. Preserves sync-first ordering from Phase 3C. |
| SettingsScreen Guest PIN Remove | Same pattern as handleSetupKey (await + try/catch + revert + toast) |

**Fire-and-forget writes in App.jsx flagged as backlog (not R21-13 scope):**
- `last_seen_at` heartbeat (line 171)
- `dbTrackEvent("app_open")` (line 172)

Both low-stakes telemetry; silent failure reduces analytics accuracy but no user-visible state corruption.

## Smoke test results (Phase C)

Speaker drove `npm run dev` locally against production Supabase.

| # | Scenario | Result |
|---|---|---|
| 1 | Owner PIN change 1234 → 7777, logout/login, SQL verify | ✅ PASS — `pin_config.owner = "7777"` persisted |
| 2 | Guest PIN set → Remove, logout/login, SQL verify | ✅ PASS — `pin_config.guest = null` persisted |
| 3 | Forgot PIN button visible on PinLock | ✅ PASS (also covers Session 21 Scenario B deferred) |

Session 21 Scenario D (end-to-end recovery) implicit coverage via Test 1 — the recovery flow's `handlePinRecoveryComplete` exercises the same `savePinConfig` pathway.

### False alarm during initial smoke

Speaker's first Phase C attempt reported "Settings disappeared" after setting PIN. Diagnosis: Speaker set `9612` via the **Guest** PIN button (not Owner), not a bug. On next login, entering `9612` correctly entered guest mode — which by design hides Settings from BottomNav. **This actually proved the R21-13 fix works** — guest PIN `9612` persisted to DB.

Silver lining: surfaced R21-15 (no disable-owner-PIN option) and motivated R21-14 (no password change from Settings) during the same testing pass. Organic product discovery.

## Unexpected discoveries (logged for Session 21.6)

- **R21-14 [MEDIUM]** — No password change flow in Settings. User can only change password via Migration flow (post-legacy-auth upgrade, one-time) or admin intervention.
- **R21-15 [MEDIUM]** — No "Disable PIN" / "Turn off PIN" option for owner PIN once set. Guest PIN has explicit Remove; Owner does not. User who sets PIN on a shared phone, later gets private device, cannot go back to no-PIN without SQL or Forgot PIN flow + admin approval.

**Session 21.6 bundled scope:** R21-14 + R21-15 as "account security settings gap" cluster, ~45-60 min targeted follow-up. Design questions to lock at 21.6 opener: PIN-confirmation-before-disable, guest-cascade-on-disable, password-confirm pattern, MigrationScreen UI reuse, shared destructive-change confirmation.

## Decisions

- **D21.5-Q1:** `savePinConfig` does NOT get split into local-only + async-with-DB variants. Single shared function with best-effort-revert-on-throw semantics. Reasoning: 3 call sites total; splitting creates naming/mental-model overhead larger than the simplicity gain.
- **Session 21.6 bundling approved:** R21-14 + R21-15 together rather than deferred to Session 22 (which is focused on Tower Room 6 UI).

## Deferred / noted for backlog

- **D21.5-Q2 [UX]** — Settings Owner vs Guest PIN cards share visual treatment; only icon + label distinguish. Easy to conflate during testing (caused Speaker's Phase C false-alarm). Session 22+ Settings visual pass should add stronger hierarchy.
- Owner PIN "Remove" button (→ Session 21.6 R21-15)
- Password change flow (→ Session 21.6 R21-14)
- Fire-and-forget telemetry writes (`last_seen_at`, `dbTrackEvent`) — low-risk, future hardening

## Production state post-21.5

- **Worker:** v4.8.1 (unchanged)
- **Main app bundle:** will flip from `index-xMpsmdvy.js` (Session 21 close) to new CF-Pages-built hash (tracked in ROADMAP-LIVE)
- **Migrations:** 15 (unchanged)
- **HEAD:** `98f758d` (fix) + `<wrap commit>` (this wrap)

## Sentinel re-sync

**Combined single re-sync covering both Session 21 + 21.5** — Speaker triggers at 21.5 close (per Speaker decision at 21.5 opener, carried from Session 21 deferral).

- Vanguard re-sync: **TO TRIGGER** (Speaker runs out-of-band)
- Osiris re-sync: **TO TRIGGER** (Speaker runs out-of-band)

## Open threads for Session 21.6

- R21-14 + R21-15 as bundled scope (~45-60 min)
- Reuse MigrationScreen UI for password change if evaluation at 21.6 Phase A finds it viable
- Shared destructive-confirmation pattern (disable PIN + password change both need it)
