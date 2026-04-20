# Session 21.5 — Decision Log

**Session:** 21.5 · **Date:** 2026-04-20 · **Sprint:** I.5 (R21-13 PIN persistence hotfix)

Same-day hotfix session following Session 21 close. Single-scope bug fix. All decisions locked during the session.

---

## D21.5-Q1 — `savePinConfig` NOT split into local/full variants

**Question:** `savePinConfig` now does both local state write (localStorage + setPinConfig) AND remote DB write (supabase.update). Should it be split into two functions — `savePinConfigLocal` (sync) + `savePinConfig` (async, includes DB write) — to give callers cleaner separation, particularly for the revert pattern in call sites #1 and #3?

**Decision:** Keep single async function. Callers use `savePinConfig(previousCfg).catch(() => {})` for best-effort revert.

**Rationale:**
- 3 call sites total. Splitting creates two similar-named functions across the codebase with "which one do I want?" cognitive overhead every call site.
- Best-effort revert semantics are acceptable — if the revert DB write also fails (same underlying outage), `loadUserData` reconciles on next login from DB's actual state.
- Session 21's `handlePinRecoveryComplete` already treats the DB echo as redundant (worker wrote authoritatively); a split would formalize this but doesn't change the observable behavior.

**Impact:** Single `savePinConfig` function in App.jsx. All 3 call sites use the same async + throw pattern with best-effort revert on error.

---

## Session 21.6 — R21-14 + R21-15 bundled scope

**Question:** R21-14 (no password change flow in Settings) and R21-15 (no disable-owner-PIN option) surfaced during Phase C smoke as related "account security settings gap" items. Bundle them in Session 21.6 as a small focused follow-up, or defer to Session 22 Tower UI work?

**Decision:** Bundle as Session 21.6. Target ~45-60 min.

**Rationale:**
- Both are "Settings → account security" UX gaps, discovered together
- Shared patterns (destructive-change confirmation dialog, current-credential re-entry)
- Keeps Session 22 focused on Tower Room 6 UI (the real headline for Sprint I Part 2)
- Deferring to Session 22 risks scope creep on that session

**Design questions to lock at Session 21.6 opener (no pre-locking here):**
- Disable PIN: require current PIN entry before disable? (probably yes)
- Disable PIN: force-remove guest PIN too, or keep independent? (probably remove — guest without owner is semantically weird)
- Password change: prompt current password + new password + confirm? (probably yes — standard pattern)
- Password change: reuse MigrationScreen UI? (evaluate at 21.6 Phase A)
- Shared: confirmation dialog pattern for destructive account changes

**Impact:** Session 21.6 opens after 21.5 close with these 5 design questions on the table for Phase A scope lock.

---

## Session close decisions

- **Phase B order:** B5 (i18n) → B1 (core) → B2 (handleSetupKey) → B3 (recovery handler) → B4 (Guest Remove). Chosen to have i18n keys available before call sites reference them; core before its callers.
- **Sentinel re-sync** deferred to single combined 21 + 21.5 re-sync at 21.5 close (per Session 21.5 opener decision).
- **D21.5-Q2 reserved** for UX backlog (Settings Owner vs Guest PIN visual parity). Not a Session 21.5 code item; surface in Session 22+ Settings visual pass. Contributed to Speaker's Phase C false-alarm (confused guest PIN entry with owner PIN change).

---

## Pattern learnings (promoted to CLAUDE.md)

- **Supabase JS `{ error }` shape** — not try/catch exceptions. RLS denials, constraint violations, and permission errors DO NOT throw; they land in `error` on the returned object. Code that relies solely on try/catch for DB error detection has a latent silent-failure bug. Always destructure `{ error }` from Supabase responses.
- **Triple-defect stack** — fire-and-forget IIFE + empty catch + missing response shape check compound into completely invisible failures. Any single defect in isolation is minor; together they create a silent state-corruption bug class.
