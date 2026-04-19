# Session 19 — Risk Log

**Session:** 19 · **Date:** 2026-04-19–20 · **Sprint:** H-2

This file tracks risks opened, resolved, or changed severity during Session 19.
For the master risk register, see `docs/RISKS.md`.

---

## Resolved this session

### [LOW] Tower bundle past Vite 500KB warning — PARTIALLY RESOLVED

**Master entry:** `docs/RISKS.md` — "[LOW] Tower bundle past Vite 500KB warning threshold"
**Original severity:** LOW (accepted, Session 18 entry)
**Original size:** 793KB raw / 230KB gzip (Engine Room baseline)

**Session 19 trajectory:**
- Post-Phase 3 (before fix): 1068KB raw / 300KB gzip (+275KB from duplicate Supabase client)
- Post-Phase 3b (shared/ extraction): 881KB raw / 252KB gzip (−187KB reclaimed)
- Post-Phase 3c (lucide-react + polish): 884KB raw / 253KB gzip (+3KB)

**Outcome:** Still past the 500KB Vite warning (admin-only surface, intentional). Bundle is now **honest** — 884KB reflects actual required content: i18n dictionary (~110KB, needed for Sync button) + Recharts + Supabase + app code. The prior 1068KB included a duplicate Supabase client; that was unreviewed bloat. Current size is reviewed and accepted.

**Master entry update:** Updated to reflect reduction + new accepted baseline.

---

## New risks opened this session

### [LOW] Language Strings font sizing too small for sustained editing

**Opened:** Session 19 (visual verify of Phase 3c)
**Status:** Open
**Severity:** LOW

The admin table uses `text-[11px]` for all body text and `text-[9px]` for labels, consistent with Tower's tactical HUD design. For monitoring dashboards (Engine Room, AI Calls) this density is appropriate — the Speaker reads data at a glance. For the Language Strings panel, the wife will be typing into cells, reading Lao and Thai script, and spending 10–30 minutes per session. The small font size may cause eye strain.

**Observed:** Column content truncates at narrow widths; Lao/Thai script at 11px is legible but not comfortable for sustained editing.

**Mitigation:** Phase 3d or Session 20 polish. Options: increase table body to `text-[12px]`, or add a density toggle (compact / comfortable). Low priority — panel is functional; discomfort is not blocking.

---

### [LOW] lucide-react added as Tower dependency (new dep surface)

**Opened:** Session 19 Phase 3c
**Status:** Accepted
**Severity:** LOW

`lucide-react@1.8.0` added to `tower/package.json` for the Pencil cell-edit affordance icon. Tower previously had zero icon library dependencies (icons were inline SVG in NavItem or CSS-only).

**Concern:** If additional icons are needed in future Tower rooms, each new icon from lucide-react adds ~1–2KB to the bundle. If we end up importing 20+ icons, it may be worth evaluating whether to inline SVGs for Tower's limited icon surface.

**Mitigation:** Monitor. Inline SVG is always an option for Tower's few icon sites. At 1 icon today, the bundle impact is negligible. Revisit if icon count exceeds ~5.

---

### [LOW] 38 translation keys missing Thai (th) in DB

**Opened:** Session 19 (seed result)
**Status:** Open — wife's work via admin panel
**Severity:** LOW

`supabase/migrations/013_translations_seed.sql` seeds 38 rows with `th = NULL`. These were pre-existing gaps from `src/lib/i18n.js` — 38 keys have `lo` translations but no `th` equivalent. Thai users fall back to English for these keys via the t() fallback chain.

**Affected keys:** Primarily goal, statement, and guide-screen strings. The gaps are visible in the Language Strings panel: rows with `◌` prefix and ember warning highlight.

**Mitigation:** Wife fills via Language Strings admin panel at `tower.phajot.com/admin/language-strings`. Use "Show missing only" filter to find all 38. Not a blocking issue for current user base (family + Kitty). Low priority before Thai-language public marketing begins.

---

## No change

### [HIGH] Silent CF Pages deploy failures

Unchanged from Session 18. CF Pages email notifications still not configured. Rule 11 (bundle hash verification after merge) is the active mitigation.

### [HIGH] No automated RLS regression tests

Unchanged. Translations table RLS (`translations_read` + `translations_admin_write`) added this session but not adversarially verified. Recommend verification before public launch when new users can register.

### [LOW] profiles handle_new_user trigger documentation gap

Unchanged. Recommended verification at Session 16 never executed. Still open.

---

*Session 19 risk log. See `docs/RISKS.md` for master register.*
