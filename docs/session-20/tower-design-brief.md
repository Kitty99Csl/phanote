# Tower — UX Design Brief

> **Purpose:** External review by designers or AI assistants.
> No prior context about Phajot assumed.

---

## 1. What is Tower

Tower is an internal operator dashboard for **Phajot**, a personal finance app built for users in Laos (supports LAK, THB, and USD).

- **URL:** tower.phajot.com
- **Access control:** Cloudflare Access (Google SSO, email allowlist) — only approved users can reach the login page
- **Codebase:** Separate React + Vite app living in the `tower/` directory of the same monorepo as the main Phajot app. They do not share components. They share a Supabase database.
- **Deployment:** Cloudflare Pages (separate project from the main app)
- **Currently live:** 6 rooms

Tower is not a public-facing product. It is an operator surface — think of it as a mission control panel for one person running a small app.

---

## 2. Who Uses It

| Person | Role | Primary tasks |
|---|---|---|
| Kitty (solo dev, primary) | Full access | Monitor health, review AI call logs, manage translations, oversee daily metrics |
| Kitty's wife | Language Strings only | Edit Lao/Thai/English translations — daily translation work, filling missing strings |
| 1–2 future admins (possible) | TBD | Likely read-only views of user activity |

**Critical insight:** The wife's workflow is the most demanding UX challenge. She uses Language Strings to fill translation gaps, which means sustained reading and typing in Lao and Thai script. This is a very different use case from Kitty's monitoring tasks.

---

## 3. What Each Room Does

| Room | Path | What it does |
|---|---|---|
| Lobby | `/` | Director overview — navigation hub, high-level status at a glance |
| Health | `/health` | Systems monitor — live pings to the `/health` API endpoint, shows worker/DB/AI status |
| Engine Room | `/engine-room` | Uptime + hourly AI traffic — 4-stat HUD derived from `ai_call_log` table + Recharts line chart |
| AI Calls | `/ai-calls` | Activity log — every AI call logged, filterable by endpoint / status / provider |
| Daily Stats | `/daily-stats` | Aggregated daily metrics — summary cards + 14-day table |
| Language Strings | `/admin/language-strings` | Edit app translations — inline CRUD over 425 rows across English, Lao, and Thai |

---

## 4. Tech Stack

| Layer | What's used |
|---|---|
| Framework | React 19 + Vite 8 |
| Styling | Tailwind CSS v4 — utility classes only, no component library |
| Charts | Recharts |
| Icons | lucide-react (recently added — currently only Pencil icon used) |
| Data | Supabase JS client (direct table queries) |
| Design system | None — no shadcn, no Radix, no Headless UI |
| Fonts | System monospace (SF Mono / Menlo) for data; no explicit heading font loaded |

All layout and visual design is hand-rolled Tailwind. There is no shared component design system beyond a few utility components (`NavItem`, `HeaderStrip`, `CornerBrackets`).

---

## 5. Current Aesthetic

Tower's visual language was designed to evoke a tactical HUD — inspired by operator interfaces in games like Destiny. Here is what that means concretely:

**Color palette:**
- Background: `slate-900` (#0f172a)
- Card surfaces: `slate-800` (#1e293b)
- Borders: `slate-700` (#334155)
- Accent (primary): ember — approximately `#f97316` (orange-500 family), used for active states, borders, emphasis, and warning indicators
- Text primary: `slate-100`
- Text secondary / muted: `slate-400`, `slate-500`, `slate-600`
- Success: `green-500` family
- Error: `red-500` family

**Typography:**
- All labels: 9–11px, monospace, uppercase, high letter-spacing (`tracking-[0.2em]` to `tracking-[0.3em]`)
- Data values: 11px monospace
- Page titles: 24px, semibold, `slate-100`
- No sans-serif body font loaded — everything is either mono or system sans

**Patterns:**
- Corner L-brackets (4 corner spans) on module cards — a purely decorative HUD framing device
- Status symbols: `◉` (OK / nominal), `▲` (warning / caution), `◌` (idle / missing / unknown)
- Module code labels: `A-01`, `A-02`, etc. in the footer of each room card
- Kicker lines above page titles: `OPERATIONS · ADMIN · ROOM 05` — 9px, ember, uppercase

**Density:** Very dense. Multiple panels per page. Tables use `text-[11px]`. Rooms are designed to be read at a glance rather than edited.

---

## 6. What Feels Wrong (Kitty's Words)

These are direct quotes or close paraphrases from the operator:

- **"Font too small"** — specifically for Language Strings. Sustained reading and typing in Lao/Thai at 11px causes eye strain.
- **"UI/UX not fit with real usage"** — the tactical aesthetic was designed for monitoring, not editing. The Language Strings room in particular needs to be lived in, not glanced at.
- **"Screen not in a good shape"** — visual hierarchy is inconsistent across rooms. Some rooms feel polished (Engine Room), others feel rough (Lobby, Health).
- The overall aesthetic may be prioritizing tactical look over day-to-day usability.

---

## 7. Constraints (Non-Negotiable)

1. **Tailwind utility classes only** — no custom CSS frameworks, no CSS modules, no styled-components
2. **Desktop browser only** — mobile is not required or expected for Tower
3. **Stay within existing rooms** — no new features, no new data sources; visual redesign only
4. **No new design system dependencies** — no shadcn, no Radix, no Headless UI; bundle is already 884KB
5. **Bundle size budget: under 1MB raw** (current: 884KB; headroom is tight)
6. **React + Vite** — no framework migration
7. **Existing room structure stays** — sidebar nav, shell layout, and routing are fixed

---

## 8. Open Questions for External Review

These are the design decisions that need outside perspective:

**1. Aesthetic direction**
Keep the tactical/HUD style, or pivot toward a cleaner minimal dark admin (like Linear, Vercel, or Planetscale's dashboards)? The current aesthetic is distinctive but may create friction for non-developer users (e.g., the wife doing translation work).

**2. Typography scale**
Is 9–11px mono appropriate for any part of this UI? What minimum size is acceptable for sustained editing vs. glanceable monitoring? Should editing surfaces (Language Strings) use a different scale than monitoring surfaces (Engine Room, AI Calls)?

**3. Density**
Tactical = dense. But editing surfaces need breathing room. Is a single density level appropriate for all 6 rooms, or should monitoring rooms and editing rooms have different density profiles?

**4. Cross-room consistency**
The 6 rooms were built across multiple sessions by an LLM (Claude Code) following style guidelines, not a design spec. As a result, visual hierarchy differs between rooms — header sizes, card patterns, and spacing are not consistent. How should consistency be enforced without a formal design system?

**5. Light mode**
Should Tower support light mode, or stay dark-only? The main Phajot app is light. Tower is always dark. Is that appropriate for an app used during daylight hours for editing work?

**6. Language Strings specifically**
This room is used for extended editing sessions in non-Latin scripts (Lao, Thai). What UX patterns work best for multilingual table editing? Is the current inline-click-to-edit pattern right, or would a side panel / drawer be better?

---

## 9. Reference Points

*(To be filled by Kitty — paste links or descriptions of admin interfaces that feel right)*

Examples to consider:
- Linear (issue tracker — clean dark minimal)
- Vercel dashboard (monitoring surface — clear hierarchy)
- Planetscale (DB admin — dense but readable)
- Notion (editing surfaces — good for sustained work)
- Retool (admin panels — functional over decorative)

---

## 10. Prompt Template for External AI / Designer

Copy and paste this when submitting Tower screenshots to ChatGPT, Claude, or a designer for feedback:

---

> I'm building **Tower**, an internal admin surface for a personal finance app called Phajot. Tower is deployed at tower.phajot.com and used by 1–2 people (me as the developer, and my wife for translation editing).
>
> Attached are screenshots of all 6 current rooms. Here is what I know is wrong:
> - Font sizes (9–11px monospace) are too small for my wife's daily translation editing work in Lao and Thai script
> - The UI feels "too tactical" — it was inspired by Destiny's HUD aesthetic, which works for monitoring dashboards but creates friction for editing tasks
> - Visual hierarchy is inconsistent across rooms — they were built by an AI assistant following style guidelines, not a design spec
>
> **What I'm asking:** Give me the top 5 specific visual design improvements I should make. Focus on changes that will most improve usability for daily use without requiring me to add new dependencies or rewrite the data layer.
>
> **Constraints:** React + Tailwind CSS, desktop-only, no external component libraries, bundle size under 1MB. Keep the 6-room structure and dark theme. Change typography, spacing, color use, and component patterns only.
>
> **Format your response as:** 5 numbered recommendations, each with (a) the specific problem, (b) the specific fix, and (c) which rooms it affects.

---

*Brief last updated: 2026-04-20 (Session 19 close). For Tower codebase context see `tower/` directory. For sprint state see `docs/SPRINT-CURRENT.md`.*
