# Session 24 — DECISIONS

**Date:** 2026-04-24  
**Sprint:** M.1 (Truthfulness Hardening Part 1)  
**Author:** CTO (chat Claude) + CC collaborative review

---

## Design questions locked at Phase A

### D-M1-Q1: dbUpdateTransaction signature change

**Question:** Should dbUpdateTransaction change its signature (breaking) or keep it the same while adding throw behavior (additive)?

**Decision:** KEEP SIGNATURE. Add throw on `{ error }`. No return value change.

**Rationale:** 
- Matches `dbInsertTransaction` template exactly
- Callers already wrap in try/catch defensively (grep-verified)
- Zero new import/migration cost
- Batch 2 caller audit confirms all sites have try/catch coverage

**Alternative considered:** Return `{ ok, error }` structure. REJECTED — inconsistent with existing dbInsertTransaction pattern.

---

### D-M1-Q2: dbSaveMemory + dbUpsertProfile treatment

**Question:** Same signature treatment as dbUpdateTransaction?

**Decision:** Yes, identical pattern.

**Special case for dbSaveMemory:** Has TWO write paths (update-existing and insert-new). BOTH paths destructure `{ error }`, BOTH throw. Not just one.

**Rationale:** Symmetry with dbUpdateTransaction prevents "partial fix" bugs where one path throws and another silently succeeds.

---

### D-M1-Q3: dbTrackEvent error handling

**Question:** dbTrackEvent is telemetry (fire-and-forget). Should it throw like the others, or stay silent?

**Decision:** STAY SILENT (user impact: zero). Change empty catch `try{}catch{}` to `try{}catch(e){console.warn("dbTrackEvent failed:", e)}`.

**Rationale:**
- Telemetry failures shouldn't break user flows
- Empty catch loses all debugging signal — console.warn preserves developer visibility
- Matches intentional "best-effort background" design

**Open thread:** OT-M-6 — consider adding `{ error }` check inside try for consistency. Not Sprint M scope.

---

### D-M1-Q4: loadUserData failure UX

**Question:** How should loadUserData handle profile fetch failures — auto-retry, toast, retry button, or something else?

**Options considered:**
- **A)** Auto-retry with exponential backoff — REJECTED (hides outages, could spin forever)
- **B)** Toast + keep loading splash — REJECTED (ambiguous: "is it loading or broken?")
- **C)** Full-screen error state with explicit Retry button — **LOCKED**

**Decision:** Option C.

**UX spec:**
- Logo (size 120)
- Title: "Can't load your data" (i18n'd)
- Body: "Check your connection and try again" (i18n'd)
- Retry button (celadon, 160px min-width, 44px min-height for iPhone SE floor)
- Background: celadon gradient matching loading splash aesthetic

**Language fallback:** Default `"en"` when profile is null. Future enhancement can cache last-known lang.

**Retry behavior:** In-process `loadUserData(userId)` re-entry. NOT window.location.reload (preserves auth state).

---

### D-M1-Q5: Commit boundary

**Question:** One feat commit for all of M.1, or split by batch?

**Decision:** ONE feat commit covering Batches 1+2+3. Plus one wrap-docs commit per Rule 20. Same pattern as Session 23.

**Rationale:**
- All batches tightly coupled (Batch 2 depends on Batch 1's thrown errors)
- Smoke test verifies whole thing together
- Rollback unit = whole Sprint M.1
- Follows Session 23's proven rhythm

---

## In-session decisions

### Discovery-M1-1: Bonus scope inclusion

**Context:** During Batch 2 Phase 0 inventory, CC identified 2 silent-write sites NOT in the original SPRINT-M-SCOPE.md list:
- `handleOnboarding` (L434-441) — silent `dbUpsertProfile` + `dbTrackEvent` failure
- `handleUpdateProfile` (L477-484) — silent `dbUpsertProfile` failure

**Decision:** INCLUDE both in Batch 2 scope.

**Rationale:**
- Same bug class as locked scope items
- Adjacent code in same file — cognitive coherence
- Leaving them out means Sprint M ships with known silent failures in the same file (incomplete)
- User-visible impact: handleOnboarding silent failure = user re-sees onboarding next session (awful UX)

**Counter-argument considered:** Scope creep risk (50% batch expansion).

**Why scope creep was acceptable:** Not new features — same class as scoped items. The "50% expansion" is numerically true but semantically trivial.

---

### D-Batch2-Q1: AI correction failure mode (L452)

**Context:** `handleAddTransaction._update` branch at L452 is a BACKGROUND AI re-classification, not user action. What should happen on DB save failure?

**Options considered:**
- **A)** Revert optimistic category update — REJECTED (confusing — user never saw pre-correction state)
- **B)** Keep correction + toast failure — REJECTED (user didn't initiate, toast would confuse)
- **C)** console.warn only, no toast, no revert — LOCKED

**Rationale:**
- User didn't initiate this update (AI did)
- Toast "couldn't save" would imply user error
- Local state reconciles naturally on next `loadUserData`
- Matches `dbTrackEvent` telemetry pattern

**Pattern:** Background telemetry-style writes get `console.warn`, not toast.

---

### D-Batch2-Q2: handleOnboarding / handleUpdateProfile rethrow decision

**Context:** Should handleOnboarding and handleUpdateProfile throw to signal failure to callers?

**Caller audit findings (CC):**
- 7 fire-and-forget call sites across OnboardingScreen + SettingsScreen
- None wrap in try/catch
- `throw e` would produce unhandled rejections at all 7 sites

**Options considered:**
- **A)** No rethrow, revert + toast is complete user signal — LOCKED
- **B)** Add try/catch at all 7 caller sites — REJECTED (breaks App.jsx-only scope, noisy, duplicates toast)
- **C)** Return success flag — REJECTED (overengineering, no existing consumers)

**Decision:** Option A.

**Contract rule (NEW — OT-M-8):**
- Handlers called from modals THROW (caller needs to branch UX based on success/failure)
- Handlers called from fire-and-forget event handlers DO NOT throw (revert + toast is sufficient user signal)

**Existing handlers matching this rule:**
- `handleUpdateCategory` throws (called from EditTransactionModal) ✓
- `handleOnboarding` no throw (called from OnboardingScreen event handlers) ✓
- `handleUpdateProfile` no throw (called from SettingsScreen event handlers) ✓

**Consistency verdict:** Intentional asymmetry. Not a bug.

---

### D-Batch3-Q1: i18n storage model for new keys

**Context:** Phajot uses hybrid i18n (static `shared/i18n-data.js` + DB override via Migration 012-013 translations table).

**Question:** Where to add 3 new retry UI keys?

**Options considered:**
- **A)** Static file only — LOCKED
- **B)** Static + DB override — REJECTED (adds migration cost, DB is optional override)
- **C)** DB only — REJECTED (requires worker refresh, coupling unnecessary)

**Decision:** Option A. Direct edit to `shared/i18n-data.js`. DB entries can be added later for fine-tuning.

**Rationale:** 
- t() function checks DB first, falls back to static — static entries work immediately
- New keys don't have strong translation-tuning requirements (simple error strings)
- Avoids Sprint M scope expansion into Supabase migration territory

---

### D-Batch3-Q2: loadError UI lang fallback

**Context:** Error UI renders when profile is null. Which language?

**Options:**
- **A)** `navigator.language` — REJECTED (unreliable on mobile)
- **B)** Cached localStorage last-known lang — REJECTED (Sprint M scope creep into state caching)
- **C)** Hardcoded `"en"` — LOCKED

**Decision:** Option C for Sprint M.1. Future enhancement (Sprint N polish) can cache.

**Rationale:**
- English readable to most Phajot users
- Sprint M is truthfulness, not i18n polish
- 3 of 3 translation keys land in static file — if user sets Lao later, retry UI will show Lao after first login

---

### D-Phase-C: Runtime smoke test deferral

**Context:** Local Windows Node version mismatch (20.11 vs required 24.13) blocked `npm run build` verification. Full smoke test via DevTools offline simulation would require Node 24 install + `.env.local` setup + Vite dev server startup.

**Options considered:**
- **A)** Install Node 24 + create .env.local + full smoke (40+ min overhead)
- **B)** Switch to Codespaces + smoke there (environment restart overhead)
- **C)** Build-only verification — REJECTED (Node error prevented build from running)
- **D)** Skip smoke, rely on paste-back review + production observation — LOCKED
- **E)** Stop session, resume tomorrow — CONSIDERED but rejected (momentum tradeoff)

**Decision:** Option D.

**Rationale:**
- Sprint M.1 is defensive pattern propagation, not invention
- All three batches copied from production-tested templates
- Paste-back reviewed twice per site (CC self-audit + CTO line-by-line)
- Rollback trivial (single revert commit + 60s CF deploy)
- Wife is primary tester; real bugs surface within 24-48h
- Worst-case failure mode: "silent revert of revert logic" = pre-Sprint-M.1 behavior (which has been in production for 24+ sessions without complaint)

**Trade-off documented in commit message** `3d0eba7` for future sprint learning.

---

## Rule 20 atomic wrap discipline

Session 24 follows Sprint I / Session 23.5 pattern:
- **Commit 1:** `3d0eba7` — feat (code changes)
- **Commit 2:** `<wrap>` — docs (this commit)

Both required for Sprint M.1 atomicity. If either is missing, Sprint M.1 is incomplete.

---

## Open threads captured

See RISKS.md for full list. Summary:
- **OT-M-5:** dbSaveMemory SELECT error handling (Sprint P candidate)
- **OT-M-6:** dbTrackEvent internal `{ error }` check (Sprint P candidate)
- **OT-M-7:** handleUpdateCategory caller try/catch audit — EditTransactionModal, QuickEditToast (Sprint N)
- **OT-M-8:** Handler contract rule — modal-called throw, event-called don't throw (documented above)

---

*Sprint M.2 scope remains as pre-locked in `docs/review/2026-04-24/SPRINT-M-SCOPE.md`.*
