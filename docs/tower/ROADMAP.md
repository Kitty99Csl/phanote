# 🗺️ TOWER — ROADMAP

> **Status:** Supporting reference (Tower sprint plan)

### The Phased Path from Sprint B to Public Launch · Version 1.0

> This roadmap is the agreed order of work from April 14, 2026 forward. It is subject to revision at the end of each sprint based on what was learned. Changes to the order or scope must be recorded in the CHANGELOG section at the bottom.

---

## THE BUILDING METAPHOR

```
┌──────────────────────────────────────────────────────────┐
│  FLOOR 6 — Public Launch (Sprint K+)                     │
│  Landing rewrite · LINE bot · Payments · PDPA · App Store│
└──────────────────────────────────────────────────────────┘
                          ▲
┌──────────────────────────────────────────────────────────┐
│  FLOOR 5 — OCR Hardening (Sprint L)                      │
│  Preprocessing · Validators · Benchmark · Provider gate  │
└──────────────────────────────────────────────────────────┘
                          ▲
┌──────────────────────────────────────────────────────────┐
│  FLOOR 4 — Tower v1 (Sprints F–J)                        │
│  Lobby → Engine Room → Admin → Chat+OCR Room → Workshop  │
└──────────────────────────────────────────────────────────┘
                          ▲
┌──────────────────────────────────────────────────────────┐
│  FLOOR 3 — Observability (Sprint E)  ⭐ UNLOCKS TOWER    │
│  Sentry · AI cost log · /health · audit log · docs/tower │
└──────────────────────────────────────────────────────────┘
                          ▲
┌──────────────────────────────────────────────────────────┐
│  FLOOR 2 — Trust & Safety (Sprints B, C, D)              │
│  Wrappers · Toasts · Auth · Schema · alert() · i18n · UX │
└──────────────────────────────────────────────────────────┘
                          ▲
┌──────────────────────────────────────────────────────────┐
│  FLOOR 1 — Structural Steel ✅ DONE (Sessions 7, 8, 9)   │
│  Sheet · useClickGuard · fetchWithTimeout · RLS · Deploy │
└──────────────────────────────────────────────────────────┘
                          ▲
┌──────────────────────────────────────────────────────────┐
│  FLOOR 0 — Bedrock ✅ DONE                               │
│  React+Vite+CF+Supabase · Phajot brand · Codex           │
└──────────────────────────────────────────────────────────┘
```

---

## SPRINT B — Trust & Safety, Round 1

**Session:** 10 · **Start:** April 15, 2026 (tomorrow morning) · **Estimate:** 5–7 hours

**Goal:** Finish what Session 8 started. Stop silent failures. Make busy states visible.

### Priorities (execute in this order)

1. **Priority B — Parent-wrapper hygiene sweep** (~1 hour)
   Fix 5 fire-and-forget `onSave` wrappers flagged in `docs/session-8/SPRINT-A-EXT-BACKLOG.md`:
   - `BudgetScreen.jsx:159` — fire-and-forget `onSave` wrapper
   - `BudgetScreen.jsx:36` — `saveBudget` no try/catch
   - `HomeScreen.jsx:71` — `handleEditSave` same pattern
   - `dbSaveMemory` `.catch(()=>{})` in HomeScreen
   - `GoalsScreen.jsx:47` — `updateGoal` no try/catch
   Use `GoalsScreen.jsx:252-253` as the positive template.

2. **Priority C — Error-surfacing toasts** (~2–3 hours)
   Build a shared toast system for Supabase write failures. Apply to `dbInsertTransaction`, `dbSaveMemory`, `saveBudget`, `updateGoal`. No more silent swallowed errors. Add i18n keys for all toast messages (lo/th/en).

3. **Priority RLS cleanup** (~15 min)
   Run the 3 adversarial probes from `docs/session-9/RLS-HARDENING.md` against `app_events` and `monthly_reports`. Confirm canonical single-policy coverage.

4. **Priority A — Sheet migration finish** (~2 hours if time permits)
   Migrate `EditTransactionModal`, `SetBudgetModal`, `StreakModal` to the shared `Sheet` component. Follow the `GoalModal` migration pattern from commit `bacdf06`.

### Definition of done
- All 5 parent-wrapper bugs fixed and verified on iPhone SE
- Toast system handles at least 4 Supabase write failure paths with multilingual messages
- `app_events` and `monthly_reports` RLS adversarially verified
- Production bundle hash confirmed changed after merge (Rule 11)

---

## SPRINT C — Trust & Safety, Round 2

**Session:** 11 · **Start:** ~April 21, 2026 · **Estimate:** 6–8 hours

**Goal:** Close the audit's P0 (auth), capture schema drift, replace native dialogs.

### Priorities

1. **Real auth — user-set passwords** (~3 hours)
   See `docs/tower/AUTH-DESIGN.md` for the full plan.
   - Registration: phone + user-chosen password + onboarding (no OTP v1)
   - Login: phone + password + In
   - Migration screen for existing accounts on first login after deploy
   - Deprecate the derived-password pattern without breaking the two existing accounts

2. **Schema drift capture** (~2 hours)
   Write `supabase/migrations/004_capture_current_schema.sql` to make the repo an authoritative source of current production state. Covers the 4 tables with column drift and 3 tables missing from migrations. Marked HIGH in RISKS.md.

3. **Replace `alert()` and `window.confirm()`** (~1–2 hours)
   Audit the codebase for native dialogs. Replace with branded Sheet-based modals. Audit P1 finding.

### Definition of done
- Both existing accounts migrated successfully (you + wife)
- New users can register with their own password
- Production schema exactly matches `004_capture_current_schema.sql`
- Zero `alert()` or `window.confirm()` calls in frontend
- All user-facing strings still pass 3-language test

---

## SPRINT D — i18n Marathon + Settings Reorganization

**Session:** 12 · **Start:** ~April 28, 2026 · **Estimate:** 5 hours

**Goal:** Finish the Lao/Thai/English experience. Make Settings feel calm.

### Priorities

1. **i18n finish** (~3 hours)
   Sweep the codebase for hardcoded strings. Cover: login, onboarding, settings, wallet cards, edit modal, home guest states, Pro flows, the 4 `statementError*` Thai keys.

2. **Settings reorganization** (~2 hours)
   Restructure into 5 clear sections per the audit:
   - **Account** — phone, display name, language, currency
   - **Preferences** — categories, default filters, notifications
   - **Security** — password, PIN, guest mode
   - **Tools** — statement import, data export, category manager
   - **Support** — guide, feedback, contact

3. **Add Rule 15 to CLAUDE.md** — "No hardcoded user-facing strings. All text must go through `i18n.js`."

### Definition of done
- Zero hardcoded user-facing strings in Phajot
- Settings has 5 clear sections
- Thai statement error messages exist

---

## SPRINT E — Observability Floor ⭐ UNLOCKS TOWER

**Session:** 13 · **Start:** ~May 5, 2026 · **Estimate:** 4–5 hours

**Goal:** Build the data sources Tower will display. This is the most important sprint in the roadmap because it makes Tower possible.

### Priorities

1. **Sentry wired up** (~30 min)
   Both frontend and worker. Free tier. DSN in env vars, never committed.

2. **AI cost tracking** (~1 hour)
   New Supabase table `ai_call_log` with columns: `id`, `endpoint`, `model`, `input_tokens`, `output_tokens`, `cost_usd`, `user_id`, `created_at`. Every call from the worker logs one row. Simple helper function in the worker.

3. **Worker `/health` enrichment** (~30 min)
   Return JSON with: version, uptime, last successful AI call timestamp, last error (if any), Supabase connectivity status.

4. **Audit log table** (~15 min)
   New Supabase table `tower_admin_reads` for Room 5 read access logging (even though writes are deferred to v2). Must exist now so it's ready when Tower ships.

5. **`docs/tower/` folder skeleton** (~30 min)
   Create the markdown structure the Sentinels will own:
   ```
   docs/tower/
   ├── CHARTER.md (this plan)
   ├── ROADMAP.md (this file)
   ├── sentinel/STATUS.md
   ├── vanguard/STATUS.md
   ├── osiris/STATUS.md
   ├── banshee/STATUS.md
   ├── hawthorne/STATUS.md
   ├── iron-wolf/STATUS.md
   └── ikora/STATUS.md
   ```

6. **First 2 Claude Projects** (~1 hour)
   Set up Vanguard and Osiris as Claude Projects. System prompts that reference `docs/tower/vanguard/` and `docs/tower/osiris/` respectively. The other 5 can come later.

7. **External uptime monitor** (~15 min)
   UptimeRobot or Better Stack free tier. Ping `app.phajot.com` and `api.phajot.com` every 5 minutes. Public status page URL saved to `docs/tower/banshee/STATUS.md`.

### Definition of done
- Sentry is catching real errors from both frontend and worker
- `ai_call_log` has real rows from production AI calls
- `/health` returns enriched JSON
- `docs/tower/` skeleton exists in repo
- Vanguard and Osiris Claude Projects are set up and testing
- Uptime monitor is pinging and alerting

---

## SPRINT F — Tower Skeleton + Lobby

**Session:** 14 · **Start:** ~May 12, 2026 · **Estimate:** 5–7 hours

**Goal:** Stand up `tower.phajot.com` and ship Room 1.

### Priorities

1. **Create `tower/` Vite app** (~1 hour)
   Sibling folder to `src/` and `landing/`. Minimal Vite config, React 19, Tailwind. Copy celadon design tokens from Phajot.

2. **Cloudflare Pages project for Tower** (~30 min)
   Separate project in CF dashboard. Build output directory: `tower/dist`. Custom domain: `tower.phajot.com`. DNS record.

3. **Hard-gate to Speaker's Supabase user ID** (~30 min)
   Check auth on load. If user ID doesn't match hardcoded Speaker ID, show a simple "Tower is operator-only" page. No login form. Auth inherited from Phajot.

4. **Room 1 — The Lobby** (~3 hours)
   Live data from real sources:
   - Current sprint name from `docs/tower/vanguard/SPRINT-CURRENT.md`
   - Top blockers from `docs/tower/sentinel/STATUS.md`
   - Uptime from external monitor API (if available) or `/health`
   - Errors from Sentry API (count of today's unresolved errors)
   - Today's AI cost from `ai_call_log` sum query
   - 7 Sentinel status lights from each department's `STATUS.md` header
   - Last 10 activity items: mix of git commits + Sentry events + `app_events`

5. **Dark mode toggle** (~30 min)
   Default to dark after 6 PM, light during the day. Persist preference in localStorage.

### Definition of done
- `tower.phajot.com` responds with a real page
- Only the Speaker can see it
- Room 1 shows real data pulled from real systems
- Dark mode works
- Tower is added to CLAUDE.md so Claude Code understands it

---

## SPRINTS G–J — Tower Rooms 2 through 6

One room per session, in this order. Each sprint is estimated at 4–6 hours.

### Sprint G — Room 4: The Engine Room (Session 15)
The technical health dashboard. Uptime graphs, error feed, AI cost tracker, traffic, worker health, parser accuracy. Read-only. Most data-dense room; builds directly on Sprint E observability work.

### Sprint H — Room 5: The Admin Panel (Session 16)
User investigation. **Read-only in v1.** Search users, view profile/transactions/errors. Every read logs to `tower_admin_reads`. PDPA-compliant access controls.

#### Language Strings Admin Panel

Purpose: Replace code-level i18n editing with a data-driven admin panel. Admins edit translations without redeploying. Wife and other Lao/Thai reviewers can adjust strings directly.

Reference implementation: office.bj88laos.com/setting/language-strings — inline table with Code/English/Lao/Thai/Used In columns, search, filter, inline edit, create button.

Architecture:
- Supabase `translations` table: `id`, `code` (unique), `en`, `lo`, `th`, `used_in`, `notes`, `created_at`, `updated_at`, `updated_by`
- Runtime: app fetches translations on mount, caches in localStorage with 7-day TTL
- Fallback chain: DB translation → code-level `i18n.js` → English → key name. App works offline, works if Supabase down.
- Migration: seed script copies current ~154 keys from `src/lib/i18n.js` into DB on first deploy
- Code-level `i18n.js` stays as permanent fallback (not deleted)

Admin UI (Tower Room 5, `tower.phajot.com/admin/language-strings`):
- Search by code or string content (in any language)
- Filter by `used_in` (Settings, Home, Onboarding, etc.)
- Inline edit: code | en | lo | th | used_in
- Create new key button (+CREATE)
- Soft-delete with audit log (`updated_by` tracks who changed what)
- Export JSON (for backup and emergency sync)
- Import JSON (for bulk updates from external translators)

Estimated time: ~2 days within Sprint H's total budget.

Benefits:
- Wife/admins can fix bad translations without waiting for Kitty
- New languages (Vietnamese, Khmer, etc.) become admin tasks, not code changes
- Audit trail via `updated_by`/`updated_at`
- Decouples translation work from deploy cycles

Prerequisites from earlier sprints:
- Sprint C auth (done) — needed for admin login
- Sprint D code-level i18n complete (in progress) — provides migration seed data
- Sprint E Sentry (planned) — monitors admin panel errors

### Sprint I — Command Center + OCR Reliability Room (Session 18)

Original scope: Chat with Sentinels via Claude Projects iframes. **v1: iframes** of each Claude Project, left sidebar for navigation. Real Claude API chat deferred to v2.

Added 2026-04-16 per external advisor recommendation:

#### OCR Reliability Room

Dedicated Tower room monitoring real OCR quality (not just uptime).

Tracks:
- OCR attempts / failures / success rates
- Average review corrections per statement
- Bank-specific error rates (BCEL vs LDB vs JDB)
- Confidence distribution chart
- Cost per 100 scans
- Most common row errors (merchant missing, amount ambiguous, date format mismatch)
- Fallback rate (if we ever add fallback)

Data source: `ai_call_log` table (seeded in Sprint E with OCR-specific columns: `provider`, `bank_detected`, `confidence`, `review_corrections_count`, `errors`).

Purpose: make Sprint L (OCR Pipeline Hardening) data-driven. Without this room, OCR improvements are vibes-based. With it, every fix targets a measurable error class.

Owner Sentinel: **Osiris** (QA). Adds OCR quality to Osiris's monitoring scope alongside parser accuracy and regression.

### Sprint J — Rooms 3 & 6: Workshop + Archive (Session 18)
Combined sprint because both are markdown-backed. Workshop reads `docs/tower/vanguard/` for sprint state. Archive reads `PHANOTE-DECISIONS-LOG.md`, `docs/session-*/`, and FAQ from Hawthorne. Full-text search across all of it.

---

## SPRINT L — OCR Pipeline Hardening

**Sessions:** 20–21 · **Start:** ~June 16, 2026 · **Estimate:** 8–12 hours across 2 sessions

**Goal:** Harden the Gemini-based OCR pipeline using real data from Tower's OCR Reliability Room. Treat Lao OCR as a pipeline problem, not a model problem. Added 2026-04-16 based on external advisor review.

### Priorities

1. **Image preprocessing** (~2 hours)
   Browser-side: contrast normalization, deskew detection, resolution scaling, thermal-print binarization. Run before sending to Gemini.

2. **Strengthen /parse-statement prompt** (~1 hour)
   Add strict JSON schema, structural validation expectations, explicit field constraints, row-count verification.

3. **Bank-specific validators** (~2 hours)
   BCEL and LDB first (most used). JDB later. Validate parsed rows against known bank statement patterns.

4. **Benchmark dataset** (~2 hours)
   Collect ~50 labeled real statements from production usage, anonymized family samples. Store in `tests/ocr-benchmark/`.

5. **Accuracy baseline** (~1 hour)
   Run current Gemini pipeline against benchmark. Measure field-level accuracy per bank, bank-by-bank error rates.

6. **Provider evaluation gate** (~2 hours, conditional)
   ONLY IF baseline accuracy <85%: evaluate Google Document OCR and Azure Document Intelligence. Compare cost, accuracy, and latency. Document decision in `docs/decisions/DECISIONS-LOG.md`.

### Benefits before public launch
- Real accuracy numbers per bank
- Data-driven decision on provider switch
- Bank validators catch structural errors OCR misses

### Rejected alternatives
- Ensemble OCR (premature for family-stage, doubles cost)
- Self-hosted/fine-tuned OCR (needs 1000+ labeled Lao statements we don't have, GPU $200-500/mo)
- OpenAI advisor in Tower (contradicts Rule 17 'Tower is a viewer not writer', splits AI attention)

### Definition of done
- Preprocessing pipeline running in browser before OCR submission
- Bank validators catching >50% of current misparses
- Benchmark dataset exists with ≥50 labeled statements
- Accuracy baseline documented
- Provider decision documented (switch or stay)

---

## SPRINT K+ — Public Launch Readiness

**Session:** 22+ · **Start:** ~June 30, 2026 or later · **Estimate:** Multi-session block

**Goal:** Floor 5. Now Tower monitors a launching product. Now we invite strangers.

### Priorities

- **Landing page rewrite** based on the Phajot Homepage Improvement Report (hero pain-led, screenshots, founder note, simplified CTA, FAQ, proof strip)
- **AI Advisor Pro gating** — close the OQ-009 / audit gap
- **Privacy Policy + ToS** via Termly or iubenda, translated to Lao + Thai
- **PDPA review** — one human lawyer consult (Lao + Thai), budget $200–500
- **LINE OTP at registration** — close the signup loop for strangers
- **Payment system** — PromptPay first, BCEL QR second, Stripe last
- **LINE bot integration** — the deferred feature finally builds on the stable foundation

---

## TIMELINE

| Sprint | Session | Earliest Date | What Ships |
|---|---|---|---|
| B | 10 | Apr 15, 2026 | Trust & safety round 1 |
| C | 11 | Apr 21 | Real auth, schema captured |
| D | 12 | Apr 28 | i18n complete, Settings reorg |
| E | 13 | May 5 | Observability — Tower data sources |
| F | 14 | May 12 | Tower Lobby live |
| G | 15 | May 19 | Engine Room |
| H | 16 | May 26 | Admin Panel + Language Strings |
| I | 17 | Jun 2 | Command Center + OCR Reliability Room |
| J | 18 | Jun 9 | Workshop + Archive |
| L | 20–21 | Jun 16 | OCR Pipeline Hardening |
| K | 22+ | Jun 30+ | Public launch prep |

Approximately **11–12 weeks** from this plan to a public-launch-ready Phajot monitored by Tower.

---

## RISK REGISTER (Roadmap-specific)

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Sprint E observability slips → Tower can't be built | Medium | High | Sprint E is small in code. If it slips, don't skip it — delay Sprint F and keep stabilization going. |
| Scope creep inside a sprint (wanting to add features) | High | Medium | Hold the line on deferred features (LINE bot, recurring, CSV). The codex rule 8 "phase discipline" applies here too. |
| Wife stops testing | Low | High | She validated the slogan would make her pay yearly. Keep her involved in Sprint D i18n review. |
| Tower v1 becomes v2 mid-sprint | Medium | Medium | Every deferred Tower feature goes to an explicit "Tower v2" section in CHARTER.md. No mid-sprint scope changes. |
| Sentinels overlap or conflict | Low | Low | Each Sentinel owns one folder in `docs/tower/`. No cross-writes. Conflicts are resolved by the Speaker. |

---

## CHANGELOG

| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-04-14 | Initial roadmap. Sprints B through K defined. Timeline estimated. Dependencies chained. |
| v1.1 | 2026-04-16 | Language Strings Admin Panel locked into Sprint H. Speaker confirmed Option A after reviewing bj88laos reference. |
| v1.2 | 2026-04-16 | Sprint L (OCR Pipeline Hardening) inserted between J and K. OCR Reliability Room added to Sprint I. External advisor decision: treat OCR as pipeline problem, not model problem. Closes OQ-015. |

---

*"Structure to support the house, not house first."* — Kitty, April 14, 2026
