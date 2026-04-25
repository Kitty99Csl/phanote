# Phajot — Resources & Skills Reference

> **Status:** Reference document for Phajot development. Curated UI/UX resources, Anthropic Skills evaluation, and Claude use-case patterns filtered for Phajot's specific stack and constraints.
>
> **Created:** 2026-04-25 (Session 24.1)  
> **Author:** CTO (chat Claude) evaluation
>
> **Purpose:** Pre-Sprint-N preparation. When evaluating UI tools, design patterns, or new Claude features, check this doc first to see what fits Phajot's actual constraints.

---

## Phajot's reality check (the filter)

Most generic "10 best UI sites" advice doesn't apply to Phajot. Here's what Phajot actually IS:

| Constraint | Reality | Implication |
|---|---|---|
| Stack | React 19 + Vite 8, NO shadcn, NO Radix, NO Headless UI | Most "copy-paste shadcn" libraries need translation |
| Styling | INLINE STYLES (Sheet.jsx is all `style={{}}`), Tailwind v4 *available* but mixed | Tailwind-first libraries are partial fit |
| Aesthetic | Celadon green (#ACE1AF), kawaii animals at 4-6% opacity, glassmorphism, no-line rule | Trendy "dark mode + neon" libraries don't fit |
| Audience | Lao + Thai + English users, primarily women (Kitty's wife as primary tester) | Mobbin's "real app patterns" matter more than "premium effects" |
| Devices | Mobile-first PWA, iPhone SE (375×667) is the floor | Tablet/desktop-only libraries are out |
| Bundle | Main app bundle hash flips per sprint, Tower at 884KB near 1MB cap | Heavy animation libs (Framer Motion 34kb) need cost/benefit weighing |
| Dev model | Solo founder, AI pair-programming via CC | Resources should be FAST to consume, not deep tutorials |

**The honest filter:** Phajot needs **pattern references and small targeted components**, NOT a full design system replacement.

---

## Tier 1 — ACTIVELY USE for Phajot

### 1. Mobbin (mobbin.com) — Pattern reference, mobile-first

400,000+ screenshots from real production mobile apps, organized by flow.

**Phajot use cases:**
- Sprint N — reference real-world keyboard/modal handling (search "Wallet & Balance" flows)
- Sprint M.2 — see how production apps handle "imported N of M" partial-success UX
- Sprint K — paywall/upgrade flow references for ProUpgradeScreen wiring

**How to use:** Search by screen pattern name. URL pattern: `mobbin.com/explore/mobile/screens/<pattern>`

### 2. shadcn/ui (ui.shadcn.com) — Code patterns, NOT direct copy

Production-quality React components with Radix UI primitives + Tailwind.

**Phajot use cases:**
- Sprint N — read `<Sheet>` source for keyboard/touch handling logic, translate to inline styles
- Sprint N — reference `<Drawer>` (uses vaul) for bottom-sheet physics on mobile

**How to use:** READ source code for patterns. DO NOT install package. Translate styling from Tailwind to inline `style={{}}`.

### 3. Aceternity UI (ui.aceternity.com) — Inspiration only

200+ animated components built with Framer Motion + Tailwind.

**DO NOT install Framer Motion** for Phajot — it's 34KB and the project doesn't need it. Aceternity's micro-interaction PATTERNS are good visual references for what "feels alive."

**Phajot use cases:**
- Translate button-press feel to CSS-only equivalents
- Sprint K — IF Phajot builds separate marketing landing page (separate bundle, can afford animation lib)

### 4. Magic UI (magicui.design) — Same caveats as Aceternity

50+ animated components for landing pages and SaaS. Inspiration only, don't install Framer Motion. "Number Ticker" pattern could inspire balance-update animations.

### 5. Anthropic Skills (built-in to environment)

Pre-configured "skill" modules at `/mnt/skills/public/`. See "Skills Evaluation" below for full breakdown.

---

## Tier 2 — REFERENCE OCCASIONALLY

| Site | When to use |
|---|---|
| Figma Community | If/when adopting Figma workflow — search "iOS UI Kit 2026", "Mobile Banking UI Kit" |
| Mantine (mantine.dev) | Future Tower v2 only (desktop-admin library, wrong for Phajot main app) |
| Lapa Ninja | Sprint K landing page design only |
| Codrops | Specific CSS animation tutorials when implementing custom effects |

---

## Tier 3 — SKIP for Phajot

Not because they're bad — wrong tool for project.

| Site | Why skip |
|---|---|
| Uiverse.io | Mostly button/checkbox demos, not product-level patterns |
| Awwwards | Award-winning agency websites, irrelevant for personal finance app |
| Dribbble | Pure visual inspiration, mostly fictional/non-functional |
| Flowbase | Webflow-specific, wrong stack |
| Pttrns | Mostly redirects to Pinterest. Mobbin is strictly better |
| CoreUI | Bootstrap admin templates, wrong stack |

---

## Anthropic Skills — Evaluation

Skills available at `/mnt/skills/public/`:

### USE for Phajot

**`frontend-design`** ⭐ MOST RELEVANT  
Path: `/mnt/skills/public/frontend-design/SKILL.md`  
Activates "production-grade frontend with distinctive aesthetic" guidance. Reference at start of Sprint N Phase A — let it shape design questions.

**`pdf`** — IF needed  
Possibly relevant for Sprint L (OCR pipeline hardening) — PDF statement uploads from BCEL. Defer until Sprint O/L.

### MAYBE useful

**`xlsx`** — Sometimes export user data or analyze translation tables. Tower translation editor could export to xlsx for offline editing by wife.

**`docx`** — Formal docs (investor deck, ToS, privacy policy). Sprint K territory at earliest.

**`pptx`** — Pitch decks. Sprint K commercial launch prep.

### SKIP for Phajot

`mcp-builder`, `slack-gif-creator`, `algorithmic-art`, `canvas-design`, `theme-factory`, `internal-comms`, `web-artifacts-builder`, `brand-guidelines`, `doc-coauthoring`, `product-self-knowledge`, `pdf-reading`, `file-reading` — all not project-relevant or covered by other workflows.

`skill-creator` — useful IF creating Phajot-specific custom skills (see below).

---

## Custom Phajot Skills — Future Investment

The `skill-creator` skill lets you bake project-specific knowledge into custom skills that auto-activate. Three high-leverage candidates:

### Custom skill candidate 1: `phajot-design-system`

**Contents:**
- Celadon palette tokens (#ACE1AF, #F7FCF5, #2D4A3E, #5A7A6C, etc.)
- Glassmorphism CSS pattern
- No-line rule
- Logo size conventions (140 splash / 120 error / etc.)
- Lao/Thai font stack (Noto Sans Lao Looped, Sarabun)
- iPhone SE floor constraints
- Capybora mascot (Pha) usage rules

**ROI:** Sprint N + K every session. Effort: ~1 hour.

### Custom skill candidate 2: `phajot-write-pattern`

**Contents:**
- Session 10 / Sprint M pattern for Supabase writes (revert + toast)
- Handler contract rule (modal throw / event no-throw — OT-M-8)
- `dbInsertTransaction` template
- `loadUserData` retry pattern
- When to throw, revert, console.warn (background telemetry)

**ROI:** Every future write-handling sprint (M.2, P, etc.). Effort: ~30 min.

### Custom skill candidate 3: `phajot-i18n-conventions`

**Contents:**
- Hybrid i18n model (static + DB override via Migration 012-013)
- Translation key naming convention
- Lao/Thai/English content guidelines
- "Diew" particle for Lao tone

**ROI:** Any i18n work (wife's translation sessions). Effort: ~30 min.

---

## Claude use-case patterns relevant to Phajot

From claude.com/resources/use-cases, filtered for Phajot:

### Directly applicable

**Custom visuals (Artifacts feature)** ⭐  
Use FOR planning visual mockups, data analysis, design exploration. NOT for production app code.

**Code review + paste-back** ⭐  
Already core to Phajot workflow (Rule 13). Continue.

**Decision documentation**  
Already core (DECISIONS.md per session). Continue.

### Maybe applicable

**Research synthesis (Web Search)** — Use sparingly for library comparisons, market research.

**Report generation (Markdown/docx)** — Sprint K stakeholder docs.

### Skip for Phajot

Claude in Excel/PowerPoint/Slack/Chrome, Cowork, Gmail/Calendar/Drive Connectors — not project-relevant for solo founder coding context.

---

## Recommended action plan

### Immediate (no time cost)
- Bookmark Mobbin, shadcn/ui, Aceternity UI

### Before Sprint N starts (~30 min)
- Browse Mobbin's Wallet/Balance flows (Wise, Cash App, Revolut)
- Read shadcn/ui Sheet + Drawer source for keyboard/touch patterns

### Optional (~2 hours)
- Create `phajot-design-system` custom skill (Sprint N benefit)
- Create `phajot-write-pattern` custom skill (Sprint M.2 benefit)

---

## Honest CTO summary

1. **Mobbin is the highest-ROI new resource** — directly fits Sprint N + M.2 needs
2. **shadcn/ui is reference material, NOT a dependency** — translate patterns, don't install
3. **Aceternity/Magic UI are visual inspiration only** — don't install Framer Motion
4. **`frontend-design` is the most relevant Skill** for Sprint N
5. **Custom Phajot-specific skills are the highest-leverage future investment**

---

*Reference document. Updated when new resources surface or evaluations change.*
