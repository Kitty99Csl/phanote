# Session 20 — Decision Log

**Session:** 20 · **Date:** 2026-04-19–20 · **Sprint:** H (Tower UX redesign — closes Sprint H)

All decisions listed below were locked during the session and are not subject to retroactive change.

---

## D20-Q1 — Primitives in single shared.jsx (not per-component files)

**Question:** Should the design primitives live as one `shared.jsx` file or per-component files (`Module.jsx`, `Stat.jsx`, etc.)?

**Decision:** Option A — single `tower/src/components/shared.jsx`.

**Rationale:** 10 small primitives, all related to the same design system. Per-component files would force 10 separate import lines per room. Single file keeps the design system surface visible at one glance and matches the design reference structure.

**Impact:** `tower/src/components/shared.jsx` (203 lines) holds all 10 primitives. Rooms import what they need from a single source.

---

## D20-Q2 — Google Fonts CDN (not self-hosted)

**Question:** Self-host fonts in Tower bundle, or load from Google Fonts CDN?

**Decision:** Option A — Google Fonts CDN.

**Rationale:** Tower is admin-only operator UI, not user-facing. CDN trade-off (requires public CDN availability) is fine for this surface. Adds 0 bundle cost. Self-hosting Noto Sans Lao + Noto Sans Thai + IBM Plex Sans + IBM Plex Mono would add ~200KB to the bundle for a 1-user surface — wrong trade.

**Impact:** `tower/index.html` has `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?...">`. Bundle stayed at 884→890KB (+6KB total for the entire redesign, vs +200KB if fonts had been bundled).

---

## D20-Q3 — Room codes A-00 through C-01 (semantic reset)

**Question:** Keep existing module codes (E-04 / A-05 / D-03 / etc.) or reset to a clean A/B/C scheme?

**Decision:** Option A — semantic reset.

**Mapping:**
- A-00 Lobby (Director · Operations entry)
- A-01 Health (Systems)
- A-02 Engine Room (Traffic)
- B-01 AI Calls (Activity)
- B-02 Daily Stats (Rollups)
- C-01 Language Strings (Translations · Admin)

**Rationale:** Old codes (E-04, A-05, D-03) accreted across Sessions 16-19 with no consistent scheme. Sidebar groups (OPERATIONS / REPORTS / ADMIN) deserve matching code prefixes (A / B / C). Sequential numbering within group (00, 01, 02). Future rooms slot in cleanly: A-03 next monitoring room, B-03 next report, C-02 next admin tool.

**Impact:** Sidebar NAV array uses new codes; all 6 rooms display new codes in PageTitle kicker + Module headers.

---

## D20-Q4 — Side panel closed by default (opens on KEY click)

**Question:** Should the Language Strings side panel be open by default, closed by default, or persist last state?

**Decision:** Option A — closed by default, opens on KEY cell click.

**Rationale:** Inline cell edit is the primary workflow (the 80% case). Side panel is for the longer-string / context-needed 20% case. Defaulting closed gives the table maximum width for scanning rows. Defaulting open consumes 380px before the user has signaled they need it. Persistence adds state management complexity for marginal value.

**Implementation:** Click KEY cell → opens panel for that row. Click EN/LO/TH cells → inline textarea edit (mutually exclusive with panel-open trigger). Click × in panel header → closes.

**Impact:** `LanguageStrings.jsx` `selectedId` state defaults to `null`. Panel renders only if `selectedRow` is non-null.

---

## D20-Q5 — Hide history section (no fake data)

**Question:** Reference design's side panel had a history section ("11:32 today · th edited · kitty's wife"). Include or omit?

**Decision:** Option C — omit entirely.

**Rationale:** No real audit trail exists in v1. The `translations` table has `updated_at` and `updated_by` columns (Migration 012), but no append-only edit log. Faking history with mock data would mislead the wife about what's actually tracked. Rule of thumb: showing "no history yet" is more honest than fabricating one. Future Sprint could add `translation_edits` audit table; until then, hide the section.

**Impact:** `StringSidePanel` shows context + 3 language fields + a small "last updated N ago" footer (using real `updated_at`). No history list.

---

## D20-Q6 — "Recently edited" = updated_at >= now() − 7 days

**Question:** What window defines "recently edited" for the pill filter?

**Decision:** 7 days.

**Rationale:** Matches the main app's translation cache TTL (D19-Q4 = 7-day localStorage cache). Translations the wife edits today will propagate to users within 7 days. Showing edits from the past 7 days creates a natural "what's pending propagation?" view. Shorter (24h) would miss most of an editing session's work; longer (30d) would lose signal as the entire table accumulates edits.

**Implementation:** `RECENT_WINDOW_MS = 7 * 24 * 3600 * 1000`. Filter compares `new Date(row.updated_at).getTime() >= Date.now() - RECENT_WINDOW_MS`.

**Caveat:** Migration 013 seeded all 425 rows with the same `updated_at` timestamp. The "Recently edited" filter will show all 425 rows initially and self-correct as real edits accumulate. Documented in RISKS.md.

---

## D20-Q7 — No '+ Add string' button (preserve code-authoritative model)

**Question:** Reference design had a `+ Add string` button. Include?

**Decision:** Option B — omit.

**Rationale:** Phajot's i18n model is code-authoritative: all keys must exist in `src/lib/i18n.js` first, then `Sync from code` upserts new keys to DB. This prevents orphan keys (DB row with no code reference) which would never reach users. A `+ Add string` button in Tower would let admins create DB rows that the main app can never use. `Sync from code` is the correct affordance.

**Impact:** Toolbar shows `↻ refresh` + `⟳ sync from code`. No `+ Add string`.

---

## Mid-session decisions

### Hotfix between Phase 1 and Phase 2 — min-w-0 column collapse

**Question:** Phase 1 visual verify on production showed Language Strings with collapsed columns (only TH visible, CODE/EN/LO missing). Should we proceed with Phase 2 and fix later, or hotfix between phases?

**Decision:** Hotfix between phases. Stash Phase 2 work tree, commit min-w-0 fix on top of Phase 1 (commit `dec20c0`), restore Phase 2 work tree, then commit Phase 2 (`a7816be`).

**Rationale:** Production was rendering broken. CF Pages was serving Phase 1 (no Phase 2 deployed yet). Letting the bug sit through Phase 2 + Phase 3 would have been ~6 hours of broken admin UI. Clean separation kept the hotfix a 2-line diff against Phase 1; Phase 2 commit didn't grow.

**Process win:** stash + isolated fix + restore demonstrated phase isolation works for emergency intervention without disrupting in-progress work.

---

### Phase 3 scope — full redesign, not polish

**Question:** Scope of Phase 3 — incremental polish on existing Language Strings (font bumps, density toggle), or full editor-first redesign matching design reference?

**Decision:** Full redesign.

**Rationale:** Wife is the primary user of this room. Session 19's polish pass (Phase 3c, ~45 min) was incremental and visible. The reference design package included a complete `room_langstrings.jsx` mockup that introduced fundamentally different patterns (side panel, pill filter, coverage widget, sans-serif body, native-script placeholders). Half-porting would have left a confused middle state. Full redesign is ~3 hours and yields a coherent surface.

**Risk accepted:** larger blast radius than incremental polish. Mitigated by visual verification on dev server before commit + all data logic preserved verbatim.

---

### Light mode deferred

**Question:** Original Session 19 Q3 reserved a slot for light mode toggle in Tower. Build now or defer?

**Decision:** Defer.

**Rationale:** Light mode is a 4-6 hour build (token system overhaul, every primitive needs both modes, every room needs verification in both modes). The wife hasn't used the dark redesign yet — building light mode without usage data risks building the wrong thing. If wife reports eye strain on dark mode after a week of editing, light mode becomes Sprint priority. If she's fine with dark, light mode stays deferred indefinitely.

**Impact:** No light mode work this session. Re-evaluate after Session 21+ wife-usage data.

---

*Session 20. Decisions locked by Speaker. Not subject to retroactive change.*
