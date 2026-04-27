# Current sprint — Sprint N (UX Hardening — Mobile)

> **Status:** Not started. Sprint M FORMALLY CLOSED 2026-04-27.
> **Last updated:** 2026-04-27
> **Sprint M:** CLOSED Session 27 (commit 8edec33 + this wrap)

---

## Sprint M close summary

**Sprint M (Truthfulness Hardening) closed across Sessions 24-27 in 5 
sub-sprints:**

| Sub-sprint | Session | Commit | Bundle |
|------------|---------|--------|--------|
| M.1 | 24 | 3d0eba7 | CJY85dLV → DhdWacHa |
| M.2a | 25 | c5bd19d | DhdWacHa → DekFTcxm |
| M.2b1 | 26 | b539310 | DekFTcxm → C3dtQtFg |
| M.2b2 | 26 | f663579 | C3dtQtFg → 6cXL-RDb |
| M.2b3 (FINAL) | 27 | 8edec33 | 6cXL-RDb → D8N37nO9 |

**Wife scenario:** ✅ CLOSED. Wife can scan a statement on bad WiFi 
and trust whatever the screen says.

**Full context:** docs/session-27/SUMMARY.md

---

## Sprint N — UX Hardening (Mobile)

**Theme:** Modal audit, keyboard-offset fixes, Sheet.jsx geometry rework

**Sessions:** 2-3 (~6-8 hrs)

**Driver:** Speaker + wife confirm active daily friction. External 
review (2026-04-24) flagged Sheet.jsx + modal keyboard geometry as P1.

---

### Sprint N definition of done

Must meet ALL:
- [ ] Live device audit (Phase A) — Speaker + wife test every modal 
  on real phone, 30-45 min, document friction points
- [ ] Sheet.jsx geometry fixes (keyboard-aware sticky button, safe-area 
  insets, button-always-visible)
- [ ] Modal-by-modal keyboard offset audit and fixes
- [ ] OT-M-7 — handleUpdateCategory caller try/catch audit 
  (EditTransactionModal, QuickEditToast)
- [ ] OT-M.2-6 — updateGoal Session 10 legacy throw audit
- [ ] OT-M.2b3-extra-2 — HomeScreen onDeleteBatch prop wiring (if 
  surfaces in audit)
- [ ] Per-modal smoke on real phone (not just DevTools)
- [ ] Atomic feat + wrap commits per Rule 20

---

### Sprint N phase structure

**Phase A (~30-45 min):** NON-NEGOTIABLE live device audit
- Speaker + wife on real iPhone
- Test every modal: open, type, scroll, tap action button
- Document every friction point
- Each issue gets a P0 / P1 / P2 tag

**Phase B (~3-4 hrs across multiple sessions):** Apply fixes batch-by-batch

**Phase C (~30 min):** Re-test on real phone (not DevTools)

**Phase D (~15 min):** Atomic wrap

---

## Open threads from Sprint M (carried)

- OT-M-5: dbSaveMemory SELECT error handling (Sprint P)
- OT-M-6: dbTrackEvent internal { error } check (Sprint P)
- OT-M-7: handleUpdateCategory caller try/catch audit (Sprint N)
- OT-M.2-6: updateGoal Session 10 legacy throw audit (Sprint N)
- OT-M.2b3-extra-1: Retry batchId duplication (Sprint N or later)
- OT-M.2b3-extra-2: HomeScreen onDeleteBatch prop gap (Sprint N)
- OT-M.2b3-extra-3: Tower log scraping for warn-level (Sprint P)

---

## Full context

- docs/session-27/SUMMARY.md — Sprint M.2b3 + Sprint M close recap
- docs/session-27/DECISIONS.md — 9 design decisions locked
- docs/review/2026-04-24/SPRINT-N-PREVIEW.md — original Sprint N shape 
  (pending Phase A live device data)
- docs/ROADMAP-LIVE.md — post-Sprint-M current state
