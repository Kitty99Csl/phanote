# Sprint N — UX Hardening (Mobile) — PREVIEW

**Status:** SHAPE ONLY — full scope locked after Phase A live device audit
**Starts:** After Sprint M closes
**Theme:** Mobile modals stop lying. Buttons stay reachable. Input fields stay visible. Keyboard doesn't cover controls.

---

## Why Sprint N matters most

Speaker + wife testimony (2026-04-24):
> "wife and me still have hard time on button confirm button input text or value keep go off the screen or being block or not see it clear since it got cover by menu text bar"

Two daily users. One of them is the primary tester. The other is the primary developer. **Both report friction.** That's the loudest UX signal possible.

The review's P1 finding about Sheet.jsx geometry + modal headers + keyboard behavior is not theoretical — it's lived experience.

---

## Estimated shape

- **Sessions:** 2-3 (Phase A + Phase B/C/D, or Phase A+B and Phase C+D if big)
- **Time:** ~6-8 hrs total
- **Blast radius:** Many files (every modal, Sheet.jsx, QuickAddBar, possibly BottomNav)
- **Risk:** Medium — shared-component changes affect many screens simultaneously

---

## Phase A — Live device audit (~45 min, Speaker + wife)

**Must happen before any code.** Without data, we're guessing.

### What Speaker + wife do together

1. Open Phajot on actual phone (Speaker's iPhone, wife's device)
2. Go through EVERY modal-opening action:
   - Tap Edit on a transaction → Edit modal
   - Tap + to add transaction → QuickAddBar inline edit
   - Tap Goal → Add Savings modal
   - Tap Set Budget → SetBudget modal
   - Tap Forgot PIN → ConfirmSheet
   - Tap Streak Badge → StreakModal
   - Tap AI Advisor → AiAdvisorModal
   - Tap Statement Scan → StatementScanFlow
   - Tap Monthly Wrap → MonthlyWrapModal
   - Login/Register → LoginScreen
3. For each, check on both portrait and landscape
4. Check with keyboard open AND closed
5. **Document findings:**
   - Screenshot of the broken state
   - Device + OS (iPhone 12 iOS 17, Samsung Galaxy whatever, etc.)
   - Exact action (what button, what input)
   - Expected vs actual behavior

### Output: docs/review/2026-04-24/SPRINT-N-AUDIT.md

A table like:

| Modal | Device | Problem | Severity |
|-------|--------|---------|----------|
| EditTransactionModal | iPhone 13 iOS 17 | Save button hidden behind keyboard | P1 |
| QuickAddBar | Wife's Android | Input field shrinks to unreadable when category picker open | P1 |
| ConfirmSheet | iPhone SE | Cancel button below safe area, unreachable | P1 |
| ... | | | |

---

## Phase B — Shared foundation fix (~2-3 hrs)

### Fix the shared Sheet geometry

**Current problems (from code + user testimony):**

1. marginBottom hardcoded "calc(env(safe-area-inset-bottom, 0px) + 90px)" — hardcoded 90px assumes BottomNav always present, always 90px tall. Wrong when:
   - Modal opens on screens WITHOUT BottomNav (Onboarding, Login)
   - BottomNav rerenders with different height

2. maxHeight "calc(88dvh - 90px)" — 88% of dynamic viewport height minus the same 90px. Combined with iOS keyboard, sometimes results in NO vertical room for footer → Save button invisible.

3. transform translateY by kbOffset — visualViewport is flaky on iOS Safari. Sometimes kbOffset is too large, sometimes too small.

### Proposed redesign

Sheet.jsx new contract:
- Parent decides vertical positioning via prop `bottomOffset` (defaults to accommodating BottomNav IF on a screen with it)
- Content maxHeight = min(content-natural-height, available-space) where available-space is computed at runtime considering keyboard
- Footer z-index boosted so it CANNOT be covered by keyboard
- iOS Safari keyboard handling gets explicit branch with tested workarounds

### Files touched in Phase B

- src/components/Sheet.jsx — geometry rework
- src/hooks/useKeyboardOffset.js — verify + potentially add iOS-specific branch
- src/components/ConfirmSheet.jsx — verify inherits new geometry correctly
- Reference modal (pick one — likely EditTransactionModal) to validate pattern

---

## Phase C — Apply pattern to all modals (~1-2 hrs)

Once Phase B delivers hardened Sheet, apply to all modals:

- EditTransactionModal.jsx
- GoalModal.jsx
- SetBudgetModal.jsx
- AddSavingsModal.jsx
- StreakModal.jsx
- MonthlyWrapModal.jsx
- AiAdvisorModal.jsx
- ChangePasswordModal.jsx
- QuickEditToast.jsx (verify bottom offset still works)

Plus check HomeScreen.jsx for any one-off overlays (review noted non-Sheet overlay for non-Pro Advisor fallback).

---

## Phase D — Input path density (~1 hr)

- QuickAddBar.jsx — narrow-phone text field squeeze
- LoginScreen.jsx — short-screen centered card with keyboard open
- OnboardingScreen.jsx — add Thai to language picker (5-min squeeze)
- AnalyticsScreen.jsx — gap month navigation edge case
- HomeScreen.jsx — import-done tab reset inconsistency

---

## Minimum viable device policy

Decision needed at Phase A: what's the smallest device Phajot must support?

**Recommendation:** iPhone SE (2020) — 375x667 CSS pixels. This is the smallest common iPhone in active use and also represents the floor for Asian markets (many users have older/smaller phones).

**Implication:** Every modal, every screen, every control must work at 375x667 with keyboard open. If it doesn't work at that floor, it's a bug.

---

## Sprint N definition of done (preliminary)

Must meet ALL:
- [ ] Phase A live audit complete, all findings documented in SPRINT-N-AUDIT.md
- [ ] Sheet.jsx geometry decoupled from 90px BottomNav assumption
- [ ] iOS Safari keyboard handling explicit branch tested
- [ ] All modals use shared Sheet (no one-off overlays remaining)
- [ ] QuickAddBar input remains usable at 375px width
- [ ] LoginScreen card scrolls/shifts gracefully when keyboard open
- [ ] Onboarding language picker includes Thai
- [ ] Zero "button off-screen" / "input hidden" bugs on iPhone SE
- [ ] Speaker + wife retest all modals, confirm friction eliminated

---

## Why Phase A MUST happen first

Without live device audit:
- We're building fixes to theoretical problems
- We might miss device-specific bugs that only Speaker or wife has seen
- We might over-engineer shared components based on wrong assumptions
- We can't prove "fixed" without before-data

Phase A takes ~45 min. It multiplies the effectiveness of 6+ hours of Phase B/C/D work. Non-negotiable prerequisite.

---

## Preview only — final scope locks after Phase A

This doc will be superseded by a full SPRINT-N-SCOPE.md (mirroring SPRINT-M-SCOPE.md structure) once Phase A data is in.

Until then, treat this as directional.

---

## Risks

- **R-N-1 [MEDIUM]** — Sheet.jsx rework breaks other consumers unintentionally. Mitigation: comprehensive test of every modal in Phase C before Sprint N closes.
- **R-N-2 [MEDIUM]** — iOS Safari visualViewport behavior may not have a clean fix (known issue across mobile web). Mitigation: accept "good enough" if we can't reach "perfect"; document known-flaky edge cases.
- **R-N-3 [LOW]** — Device audit might reveal even MORE problems than review caught. Mitigation: if audit expands scope significantly, stop and re-plan Sprint N as 3+ sessions vs 2.
