# Session 20 — Risk Log

**Session:** 20 · **Date:** 2026-04-19–20 · **Sprint:** H (Tower UX redesign — closes Sprint H)

This file tracks risks opened, resolved, or changed severity during Session 20.
For the master risk register, see `docs/RISKS.md`.

---

## Resolved this session

### [LOW] Language Strings font sizing too small for sustained editing — RESOLVED

**Master entry:** `docs/RISKS.md` — opened Session 19, 2026-04-20
**Original severity:** LOW
**Original status:** Open

Phase 3 redesign abandoned the tactical HUD typography for Language Strings. New rules:
- ENGLISH column: 15px IBM Plex Sans (was 11px mono)
- LAO column: 15px Noto Sans Lao (proper script rendering, was 11px mono)
- THAI column: 15px Noto Sans Thai (proper script rendering, was 11px mono)
- Row padding `py-3.5` for comfortable sustained reading
- KEY column kept mono 13px (operator reference, not editing surface)

The wife can now edit translations comfortably for 10-30 minute sessions without eye strain.

**Master entry:** marked resolved Session 20.

---

### [LOW] One-size density hurts editing rooms — RESOLVED

**Original severity:** LOW (implicit; surfaced in Session 19 polish pass discussion)

Tower's tactical HUD density (mono 11px / 9px) suits at-a-glance monitoring dashboards (Engine Room, AI Calls, Daily Stats). For sustained editing surfaces (Language Strings), the density caused friction. Phase 3 redesign decoupled editing-surface typography from monitoring-surface typography. Monitoring rooms unchanged; Language Strings adopted sans-serif body + 15px minimum + generous padding.

**Resolution:** Phase 3 — `tower/src/routes/LanguageStrings.jsx` editor-first redesign.

---

### [MEDIUM] Inconsistent header hierarchy across rooms — RESOLVED

**Original severity:** MEDIUM (implicit; visible in screenshot review pre-Phase-1)

Each room had hand-rolled page header markup with subtle differences:
- Some had `Room 04` in kicker, others `Room 02`, others `Operations · Room 04`
- Title sizes inconsistent (`text-2xl` vs `text-3xl`)
- Some had description paragraphs, others didn't
- Refresh button styling differed across rooms

Phase 2 introduced the `<PageTitle>` primitive used by all 6 rooms, with consistent kicker / title / description / actions slots. New room codes (D20-Q3) reset all 6 rooms to the A-00 / A-01 / A-02 / B-01 / B-02 / C-01 scheme.

**Resolution:** Phase 1 (PageTitle primitive) + Phase 2 (5 rooms ported) + Phase 3 (Language Strings ported).

---

### [LOW] Mono font overuse for reading content — RESOLVED in editing rooms

**Original severity:** LOW (implicit)

Tower's tactical HUD used `font-mono` for nearly everything including translation cells (where Lao/Thai script is awkward in monospace). Phase 3 selectively returned to sans-serif for the editing surface; monitoring rooms retain mono where appropriate (data tables, latency numbers, codes).

**Resolution:** Phase 3 typography shift in Language Strings only. Monitoring rooms untouched.

---

## New risks opened this session

### [LOW] min-w-0 required on flex children with tables inside new Shell

**Opened:** Session 20 hotfix (commit `dec20c0`)
**Status:** Documented; lesson for future room development
**Severity:** LOW

The new `Shell.jsx` correctly sets `min-w-0` on `<main>` to allow proper flex shrinking. However, downstream room containers and table wrappers must ALSO set `min-w-0` or auto-width table columns will collapse to zero when the viewport narrows. The old `ShellLayout` had `overflow-auto` on multiple levels which absorbed this overflow, masking the latent bug.

**Manifestation:** Phase 1 deployed, Language Strings table rendered with only the TH column visible. CODE / EN / LO collapsed to zero width.

**Mitigation:** Hotfix `dec20c0` added `min-w-0` to LanguageStrings outer container + table wrapper. Future rooms with internal tables must add `min-w-0` to the room's outermost container and any flex-child wrapping the table.

**Note:** all 5 monitoring rooms ported in Phase 2 use room-local layouts (`px-10 py-8 max-w-[1400px]`) with no internal tables that have auto-width columns; not affected. The pattern only matters for rooms with wide tables relying on flex auto-sizing.

---

### [LOW] "Recently edited" filter shows all 425 rows initially

**Opened:** Session 20 Phase 3
**Status:** Self-correcting; documented
**Severity:** LOW

Migration 013 seeded all 425 rows with the same `updated_at` timestamp (the seed run time). The "Recently edited" pill filter (D20-Q6, 7-day window) will therefore show all 425 rows initially. As the wife edits real rows in the redesigned admin panel, those rows' `updated_at` will refresh and the filter will start to mean what it says.

**Time to self-correction:** 7 days from Migration 013 apply (well into Session 21+ territory).

**Mitigation:** No code change needed. Documented in user-facing copy if friction surfaces.

---

### [LOW] Tower bundle at 890KB — under 1MB budget but watch next features

**Opened:** Session 20 close (Phase 3 added 4.63KB)
**Status:** Accepted; budget-aware
**Severity:** LOW

Tower bundle progression: Session 18 close 793KB → Session 19 close 884KB → Session 20 close 890KB. The +6KB this session bought:
- 10 shared primitives + Shell + Sidebar (Phase 1 +2KB; subsequent rooms reuse them)
- Language Strings side panel + coverage widget + per-row visual states (Phase 3 +4.63KB)

Still under the 1MB internal soft budget for the admin-only operator surface. Future Tower rooms (Sprint I Admin Panel, Sprint J Workshop + Archive, Sprint I OCR Reliability Room) must reuse existing primitives + Recharts. If bundle approaches 1.2MB raw, evaluate `dynamic import()` per-route code-splitting.

**Mitigation:** Bundle size monitored at every wrap. No active code change.

---

### [MEDIUM] Light mode deferred — wife-usage data needed before committing

**Opened:** Session 20 close
**Status:** Deferred decision
**Severity:** MEDIUM (only if wife reports dark-mode eye strain after sustained use)

Building a light mode toggle is 4-6 hours: token system overhaul, every primitive needs both modes, every room needs verification in both. Without wife-usage data, the priority is unclear.

**If the wife uses the redesigned Language Strings dark mode for a week without complaint:** light mode stays deferred indefinitely.

**If the wife reports eye strain or low-light usability issues:** light mode becomes Sprint priority. Re-evaluate Session 21+ after first sustained editing session.

**Mitigation:** Open question, no active code change. Tracked for Session 21+ planning.

---

## No change

### [HIGH] Silent CF Pages deploy failures

Unchanged from Session 19. Email notifications still not configured. Rule 11 (bundle hash verification after merge) is the active mitigation. This session verified bundle hash rotation after Phase 1 (`index-D0mfT_w2`), Phase 2 (`index-U46bquEx`), Phase 3 (`index-B-SBURXM`), Phase 4 (`index-DJwN4vkN`).

### [HIGH] No automated RLS regression tests

Unchanged. Translations table RLS (`translations_read` + `translations_admin_write` from Migration 012) remains adversarially unverified. Recommend verification before public launch.

### [LOW] `profiles` `handle_new_user` trigger documentation gap

Unchanged. Recommended verification at Session 16 never executed. Still open.

### [LOW] 38 translation keys missing Thai (th) in DB

Unchanged. Wife's ongoing work via the now-redesigned admin panel. New side panel + Noto Sans Thai font should make this work materially less fatiguing.

### [LOW] lucide-react added as Tower dependency

**Worth a follow-up:** Phase 3 removed the only Tower import of `lucide-react` (Pencil icon, replaced by stronger cell-click affordance). Consider deleting the dep from `tower/package.json` in a future session if no other Tower component needs it. Bundle impact would be negligible (~1KB) but reduces dep surface.

---

*Session 20 risk log. See `docs/RISKS.md` for master register.*
