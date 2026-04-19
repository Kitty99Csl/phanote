# Session 19 — Decision Log

**Session:** 19 · **Date:** 2026-04-19–20 · **Sprint:** H-2 (Language Strings Admin Panel)

All decisions listed below were locked during the session and are not subject to retroactive change.

---

## D19-Q1 — DB wins (authoritative source for translations at runtime)

**Question:** Should translations.js override i18n.js, or vice versa?

**Decision:** DB wins. The translations table is authoritative at runtime. Code-level i18n.js is a permanent fallback, not the primary source.

**Fallback chain:** DB lang → DB EN → code lang → code EN → key string

**Rationale:** The whole point of DB-backed i18n is that admins can update strings without a redeploy. If code-level i18n.js won, the admin panel would be useless.

**Impact:** `src/lib/translations.js` + modified `src/lib/i18n.js` t() function.

---

## D19-Q2 — Additive seed (ON CONFLICT DO NOTHING)

**Question:** Should the seed script overwrite existing DB rows or skip them?

**Decision:** Additive. `ON CONFLICT (code) DO NOTHING` preserves any admin edits already in the DB.

**Rationale:** Re-running the seed (or Sync from code) should be safe. Any strings the admin has already edited must survive.

**Impact:** `supabase/migrations/013_translations_seed.sql` + Tower Sync from code button logic.

---

## D19-Q3 — Direct Supabase writes from Tower (is_admin RLS gate)

**Question:** Should Tower write to the translations table directly, or via an API layer?

**Decision:** Direct Supabase writes. `translations_admin_write` RLS policy gates via `profiles.is_admin = true`.

**Rationale:** Rule 17 says Tower v1 writes require explicit Speaker discussion. The translations table is explicitly the exception — managing translations is Tower's primary function here. RLS provides the gate; no additional API layer needed.

**Impact:** Tower's `saveEdit()` and `syncFromCode()` call `supabase.from('translations')` directly.

---

## D19-Q4 — 7-day cache TTL + `translations_v1` localStorage key

**Question:** How long should the translations cache last? What happens when schema changes?

**Decision:** 7-day TTL. Cache key `translations_v1` — bump to `v2` for breaking schema changes.

**Rationale:** The intro text in the admin panel documents the TTL ("Changes propagate within 7 days or on user hard-refresh"). This is deliberate — boot-fast strategy, not a bug. Most sessions are daily; 7 days means the cache stays warm between normal sessions.

**Impact:** `src/lib/translations.js` `TTL_MS = 7 * 24 * 3600 * 1000` constant.

---

## D19-Q5 — Silent fallback on fetch failure (console.warn only)

**Question:** Should a translations DB fetch failure be visible to users?

**Decision:** Silent fallback. Log `console.warn` only. App falls back to code-level i18n.js silently.

**Rationale:** The user doesn't need to know translations are slightly stale. Showing an error for a non-critical background fetch would be confusing. If the DB is down, the app still works with the code fallback.

**Impact:** `initTranslations()` try/catch swallows fetch errors with warn.

---

## D19-Q6 — Inline cell edit (click → input → save on blur/Enter, Escape cancels)

**Question:** Which edit pattern for the admin table? Modal per row, or inline cell edit?

**Options considered:**
- A: Inline click-to-edit (blur/Enter saves, Escape cancels) — bj88laos.com reference pattern
- B: Edit modal per row (Sheet component)

**Decision:** Option A — inline cell edit.

**Rationale:** Wife's primary workflow is scanning for missing strings and filling them one cell at a time. A modal per row creates unnecessary friction. Inline edit matches the reference implementation and feels natural for tabular data.

**Implementation note:** `renderCell(row, field)` is a render helper (not a component) — closes over `editingCell`/`editValue`/handlers. Avoids component identity/remount issues with autoFocus inputs. Pattern from EngineRoom.jsx.

---

## D19-Q7 — Tower bundles shared/i18n-data.js at build time for Sync button

**Question:** Where does the Sync button get its list of source keys?

**Options considered:**
- A: Tower fetches the Phajot app's i18n.js keys via an API endpoint at sync time
- B: Tower bundles a shared copy of the i18n dictionary at build time

**Decision:** Option B — Tower bundles `shared/i18n-data.js` at build time.

**Rationale:** Option A requires an API endpoint we don't have. Option B is simpler and correct for v1. The dictionary data is not sensitive; bundling it in Tower is acceptable. When the main app adds new i18n keys, a Tower redeploy picks them up (same repo, same CI).

**Rule 16 compliance:** Tower must not import from `src/`. Extraction to `shared/` is the Rule 16-compliant path. `shared/i18n-data.js` is pure data (zero imports, zero side effects).

**Bundle impact:** +110KB raw for the dictionary (net -187KB after removing duplicate Supabase client).

---

## D19-Q8 — Toast notifications for save success/failure

**Question:** What feedback should the admin get after saving a cell?

**Options considered:**
- A: Toast notification (global, top-right, auto-dismiss 2s)
- B: Inline cell flash only (no toast)
- C: Both toast + row flash

**Decision:** Option A (toast) + row flash (Phase 3c addition). Toast as primary feedback; row flash as supplementary per-row feedback.

**Rationale:** Toast provides clear global confirmation ("Saved" / "Save failed: X"). Row flash (`bg-green-500/10` with 500ms transition) gives spatial context for which row was just modified. Together they cover both "did it work?" and "which row did I just edit?"

---

## Mid-session decisions

### Seed strategy: Hybrid D+E

**Question (mid-Phase 1b):** Script-generate the SQL (Option D) vs. runtime-only Sync button (Option E)?

**Decision:** Hybrid D+E. Migration 013 as reproducible bootstrap committed to git. Tower Sync button for ongoing additions (new keys added in future code).

**Rationale:** Having a committed seed file means: (a) fresh Supabase instances can be fully populated from `supabase db push`, (b) the 425 rows are auditable in git history, (c) the Sync button handles the ongoing additions case without needing another migration per code change.

### Bundle fix: Option 1 (shared/ extraction)

**Question (mid-Phase 3b):** How to fix the Tower bundle bloat from the duplicate Supabase client?

**Options considered:**
- Option 1: Extract pure string data to `shared/i18n-data.js` (Rule 16-compliant monorepo pattern)
- Option 2: Lazy-import i18n.js in LanguageStrings.jsx (only loads for Sync button)
- Option 3: Accept the bloat (admin surface, one user)

**Decision:** Option 1 — extract to `shared/`.

**Rationale:** Option 3 accepted 1068KB. Option 2 is a hack (still violates Rule 16's spirit). Option 1 is the architecturally correct path, eliminates Rule 16 ambiguity, and produces the cleanest bundle split. 187KB reclaimed.

### UX polish: targeted pass (Phase 3c)

**Question:** After visual verify of Phase 3, address wife-usability gaps now or defer?

**Decision:** 45-minute targeted pass now (Phase 3c). Highest-impact items: Show missing only filter, cell affordance cues, row density, missing-value highlight.

**Rationale:** The panel is the first thing the wife will use for translation work. Shipping it with poor affordances would result in unused tooling. 45 minutes in-session is the right trade-off vs. a full Session 20 UX item.

---

*Session 19. Decisions locked by Speaker. Not subject to retroactive change.*
