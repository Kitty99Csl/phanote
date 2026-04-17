# Tower Design System

**Status:** Active · Session 15 (2026-04-18) · Owner: Speaker
**Last updated:** Session 15 Pass 2 planning

> **Core principle:** Dark tactical UI inspired by sci-fi command systems, with Phajot/Tower identity. Not a Destiny reskin — a distinct surface that reads as Phajot's operator cockpit. Timeless, not derivative.
>
> **Overriding rule:** If tactical styling conflicts with clarity, clarity wins. Decoration never obscures data.

---

## 1. Identity

Tower is a **command interface**, not a dashboard. Language, typography, and chrome should evoke:

- Internal operations, not public-facing marketing
- Calm authority, not gaming flash
- Tactical density, not empty minimalism
- Living machine, not static page

**Voice:** Plainspoken-tactical. "System nominal" > "Welcome back, Guardian." "Module standby" > "Coming soon." Speaker is the operator — Tower is their cockpit. No mysticism, no lore. One consistent metaphor: Tower watches Phajot, and Speaker commands Tower.

---

## 2. Color palette

### Background ramp (near-black through dark slate)
| Token | Hex | Use |
|---|---|---|
| `slate-950` | `#050709` | Deepest — used in sidebar bottom gradient, card gutters |
| `slate-900` | `#0a0e13` | Primary app background (fallback) |
| `slate-850` | `#0f1419` | Cards, panels, elevated surfaces |
| `slate-800` | `#1a1f2a` | Input fields, pressed states |
| `slate-700` | `#2a3240` | Dividers, card borders |
| `slate-600` | `#3a4556` | Muted borders |

### Ink ramp (text on dark)
| Token | Hex | Use |
|---|---|---|
| `ink-50` | `#fafafa` | Primary headlines, critical readouts |
| `ink-200` | `#c7cbd1` | Body text, standard readouts |
| `ink-400` | `#8b929b` | Secondary text, labels |
| `ink-500` | `#6b7280` | Muted metadata, hints |
| `ink-600` | `#4b5563` | Deep muted — disabled, placeholder |

### Accent: Ember (primary system accent, warm)
| Token | Hex | Use |
|---|---|---|
| `ember-300` | `#fac77a` | Hover glow, highlights |
| `ember-500` | `#f5a623` | **Primary accent** — active states, kickers, focal orange |
| `ember-600` | `#d4881a` | Pressed state, deep accent |

### Accent: Celadon (Phajot DNA — used ONLY for "nominal" / "healthy" states)
| Token | Hex | Use |
|---|---|---|
| `celadon-400` | `#8BD48F` | Success indicators, "nominal" status |
| `celadon-500` | `#5aae5f` | Active healthy pulse |

**Why celadon:** Phajot's brand color gets reserved for "everything is fine." Ties Tower back to Phajot family while carrying semantic meaning. When Tower shows celadon, it means: the watched system is well.

### Semantic status
| Token | Hex | Meaning |
|---|---|---|
| `status-nominal` | Celadon `#8BD48F` | Healthy, operational |
| `status-caution` | Amber `#f5a623` (ember-500) | Warning, needs attention |
| `status-critical` | Red `#ef4444` | Broken, urgent |
| `status-standby` | Slate `#6b7280` | Waiting, not yet active |

**Rule:** Tower uses status colors sparingly. Most of the UI is grayscale + ember. Color only appears where status matters.

---

## 3. Typography

### Fontstack
\`\`\`css
--font-sans: 'Inter', 'Helvetica Neue', 'Sarabun', 'Noto Sans Lao', system-ui, sans-serif;
--font-display: 'Inter', 'Helvetica Neue', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', 'SF Mono', Menlo, monospace;
\`\`\`

### Scale (tactical, not magazine)

| Role | Size | Weight | Tracking | Case | Use |
|---|---|---|---|---|---|
| Display | 28-32px | 600 | -0.5px | Sentence or ALL CAPS | Page headlines |
| Heading | 18px | 600 | 0 | Sentence | Section titles |
| Body | 14px | 400 | 0 | Sentence | Paragraphs, descriptions |
| Body-small | 13px | 400 | 0 | Sentence | Secondary text |
| Label | 10-11px | 600 | **0.25em** | **UPPERCASE** | Kickers, section markers, chips |
| Metadata | 10px | 400 | 0.05em | Sentence | Timestamps, IDs, codes |
| Mono | 10-11px | 500 | 0.1em | UPPERCASE or code | Build hashes, module codes, system IDs |

**Typography rhythm rule:** Every major block has 3 type sizes working together:
1. Tiny all-caps label (kicker)
2. Large primary readout
3. Small metadata row below

Never just a headline floating alone. This is what gives Tower density without clutter.

---

## 4. Chrome language

### Accent bar (the Tower "pulse")
A 1-4px vertical orange bar next to kickers. Appears at every major section heading. This is the single most Tower-specific mark.

\`\`\`
▮ KICKER · Section Label
  Page Title Here
\`\`\`

### Corner cuts (angular card frames)
Cards have a 12px triangle cut from the **top-right corner**, filled with ember-500 at 60% opacity. This is the secondary Tower signature. Not every card — only "module" cards (placeholders, at-a-glance cards).

### Registration marks (optional corner brackets)
Small L-shaped brackets at major panel corners. Use sparingly — only on the highest-level zones (header strip, main content frame). Too many registration marks = gaming cosplay. One or two max per screen.

### Divider lines
Thin (0.5px) horizontal lines between sections. Color: \`slate-700\`. Single, clean. No dashed lines, no double lines.

---

## 5. Layout components

### Top header strip
Runs across the top of every page. Three zones:

\`\`\`
[ TOWER // REPORTS // DAILY STATS ]    [ green dot · NOMINAL ]    [ UTC 20:17 · BUILD 8DF ]
\`\`\`

- **Left:** breadcrumb trail in mono, separator \`//\`
- **Center:** global system status (nominal/caution/critical) with pulse dot
- **Right:** UTC clock + current build hash in mono

Height: 36px. Background: \`slate-950\`. Border-bottom: 0.5px \`slate-700\`. Font: 10px mono, uppercase, letter-spacing 0.1em.

### Sidebar
**240px fixed width** (v1). If content density increases in Session 17+ with more rooms + group labels + build metadata, widening to 256px is pre-approved — just update the width token. Three zones top to bottom:

1. **Brand block** (80px) — hexagonal mark + "TOWER // PHAJOT OPERATOR"
2. **Nav block** (flex) — grouped by section with mini section headers when 4+ items (e.g., "OPERATIONS" / "REPORTS")
3. **Speaker footer** (64px) — "GUARDIAN" label + name + build hash

Background: \`linear-gradient(180deg, #0a0a0f 0%, #06090d 50%, #030507 100%)\`.

### Module cards (at-a-glance cards in Lobby, placeholder cards in rooms)
Every card follows this structure:

\`\`\`
┌─────────────────────────────────▲─┐
│ ▮ LABEL              MODULE H-01   │  ← top row: kicker + module code
│                                    │
│ NOMINAL                            │  ← primary readout (large)
│                                    │
│ All dependencies green             │  ← body metadata (small)
│ ──────────                         │  ← divider 0.5px
│ last sync · 2m ago                 │  ← bottom metadata row
└────────────────────────────────────┘
\`\`\`

Corner cut (▲) in top-right. Border: 0.5px \`slate-700\` (hover: \`ember-500\` 50% opacity). Background: \`slate-850\`.

**Module codes** are stable references (H-01, A-02, D-03 etc.) — same code appears in the at-a-glance card AND in the corresponding room page. Never random; always consistent.

**Single-color rule:** Each module card carries ONE primary status color at a time. Don't mix nominal green + caution ember + ember-accent decoration on the same card. If a card's status is "nominal," that's the only status color — the ember accent bar can still be there (it's structural, not status). If the status shifts to "caution," the whole card's color shifts to ember — don't keep a celadon readout with ember chrome.

### Status chips
Small pill-shaped indicators. Used in header strip, card top rows, nav items.

\`\`\`
[ NOMINAL ]     [ STANDBY ]     [ CAUTION ]
\`\`\`

Height: 20px. Padding: 3px 8px. Font: 9px, 600, 0.2em tracking, UPPERCASE. Background: color-tinted 15% opacity. Text: full color.

---

## 6. Motion rules

### Permitted
- Route fade + 4px translate-up on page change (already in Pass 1)
- Status dot pulse (nominal = celadon pulse, caution = ember pulse)
- Nav item hover: 150ms ease, border-glow intensifies
- Card hover: border transitions to ember, 200ms
- Micro-drift on mouse hover over hero elements (max 2px, 400ms ease)

### Forbidden
- Bounce effects, elastic springs, overshoot
- Parallax on scroll (only on hover)
- Continuous looping animations (other than status pulses)
- Fade-in on every element — only page-level
- Hover effects that change dimensions (no grow/shrink on hover)

### Reduce motion
Every animation respects \`@media (prefers-reduced-motion: reduce)\` and disables.

---

## 7. Writing voice

### UI copy patterns

| Situation | Pattern | Example |
|---|---|---|
| Status | \`[state-noun]\` | NOMINAL, STANDBY, CAUTION |
| Empty state | \`[module] · standby\` | MODULE D-06 · STANDBY |
| Placeholder | Full tactical context | "SOURCE: ai_daily_stats · STATE: awaiting room wiring · LAST STRUCTURE UPDATE: Session 15" |
| Action hint | Tactical command verbs | "Review field report" not "Click to see details" |
| Timestamps | UTC, 24h, relative when < 1h | "UTC 20:17" or "2m ago" |

### Words to use — tiered

**Tier 1 — Primary vocabulary (use freely):**
- System, module, status, report, nominal, standby, watch, structure

**Tier 2 — Flavor vocabulary (use sparingly, no more than one per screen):**
- Uplink, pulse, relay, sortie, console

Tier 2 words add tactical color but can tire if repeated. Treat them like salt, not rice.

### Words to avoid
- Guardian (too on-the-nose Destiny), lore terms, mystical words, flowery adjectives, "coming soon" (use "standby" instead)

---

## 8. Session 16+ implications

### When building rooms (Items 4, 5, 6):
Every room page follows the same skeleton:
1. Header strip at top (global)
2. Kicker + accent bar + page title
3. Intro sentence
4. Content zone — cards, tables, charts as needed, styled per this spec
5. Optional bottom metadata row (module code + last update)

### When adding new features:
- Always include a kicker
- Always use status colors semantically (not decoratively)
- Never use emoji in UI chrome (rooms can use emoji in data labels)
- Always include at least one metadata element per module (makes it feel live)

### When in doubt:
Ask: "does this feel like a machine panel, or a web app?" Aim for machine panel. **But:** if tactical styling conflicts with data clarity, clarity wins.

---

## 9. Chart + data visualization (forward-looking)

Once Sessions 16+ bring real data into rooms, chart styling follows:

- **Default palette is grayscale.** Axes, gridlines, bars, lines — all muted ink tones.
- **Status color appears only at the point of meaning.** A "current value" dot in ember. A threshold line in status color. Not every bar colored.
- **No rainbow dashboards.** If a chart has more than 3 categorical colors, reconsider the chart type before reaching for more colors.
- **Chart chrome matches Tower chrome.** Thin gridlines (0.5px \`slate-700\`). No drop shadows. No 3D. No gradients in fill.
- **Label typography** follows the spec — 10px mono for axis labels, 11px sans for titles.

Chart library choice deferred to when first real data lands.

---

## 10. Pass 2 scope (implementation of this spec)

Pass 2 adds to the existing codebase:

| Element | Where | Effort |
|---|---|---|
| Top header strip component | New \`tower/src/components/HeaderStrip.jsx\` | M |
| Update ShellLayout to include header strip | \`tower/src/layouts/ShellLayout.jsx\` | S |
| Module codes + metadata rows in placeholder cards | 3 room files | M |
| Status chip component | New \`tower/src/components/StatusChip.jsx\` | S |
| Lobby at-a-glance cards with full metadata | \`tower/src/routes/Lobby.jsx\` | M |
| Add celadon tokens to @theme for nominal status | \`tower/src/index.css\` | XS |
| Registration mark decorations (optional) | \`tower/src/routes/Lobby.jsx\` hero zone | S |
| "OPERATIONS" / "REPORTS" nav grouping labels | \`tower/src/layouts/ShellLayout.jsx\` | S |

Estimated total: ~45-60 min of CC work.

---

## 11. Out of scope (explicit)

The following are intentionally not in this spec and not in Pass 2:

- Dark mode toggle (Tower is always dark)
- Mobile responsive sidebar (desktop-first; mobile is Sprint G+ if needed)
- Animated scanlines / CRT effects (reserved for Pass 3 if ever)
- Faction emblems / lore terms (would drift back toward Destiny cosplay)
- Charting library choices (decided per-room when data lands)
- Icon system beyond what's currently in use

---

*End of spec. Updates append via new sections. Major revisions create v2.*
