# 🗼 TOWER — CHARTER

### The Watchtower Above Phajot · Version 1.0

> **Rule:** This is the founding document for Tower. Before making changes to Tower's structure, team, or mission, review this document. Before closing any major Tower phase, update this document.

---

## 0. THE NORTH STAR

> *"Phajot watches your money. Tower watches Phajot."*

Tower is Phajot's operator surface. It is the single place where Kitty (the Speaker) oversees the health, progress, and growth of Phajot — chats with the AI Sentinels who help run the company, sees live system health, investigates users for support, reviews decisions, and plans what comes next.

Tower is not a general-purpose dashboard. It is purpose-built for one solo founder running one product with a team of AI departments.

**One-line pitch:** Tower is the warm, celadon-green watchtower where the Speaker and the Sentinels meet to protect Phajot together.

---

## 1. IDENTITY

| Field | Value |
| --- | --- |
| **Product Name** | Tower |
| **Primary Domain** | `tower.phajot.com` |
| **Relationship to Phajot** | Sister product. Lives in the same repo, shares Supabase + Cloudflare Worker, deployed as a second Cloudflare Pages project. |
| **Access Scope (v1)** | Solo — Speaker only |
| **Visual Identity** | Same celadon green palette as Phajot, with a dark-mode variant for night use. No dedicated mascot in v1; Tower uses a simple celadon tower icon. |
| **Status** | 🟡 Planning complete, build starts Sprint F (Session 14) |
| **Charter Version** | v1.0 (April 14, 2026) |

---

## 2. THE MYTHOLOGY

Tower's naming is rooted in Destiny lore, mapped to the Phajot world:

- **The Traveler** → Phajot itself (the ancient, watchful presence that protects humanity by revealing where their money goes)
- **The Speaker** → Kitty (the human voice of Phajot to the team)
- **The Tower** → this product (where the Speaker and the Sentinels meet)
- **The Sentinels** → the AI departments that protect Phajot
- **Lightbearers** → a reserved term for future Pro subscribers (not a role inside Tower)

The mythology is internal, not marketing. Tower's public face doesn't mention Destiny, Bungie, or any of the lore. The references are a private frame that keeps the team's character consistent.

---

## 3. THE TEAM

Tower is staffed by **eight roles** — one Speaker (human) and seven Sentinels (AI departments).

### 3.1 The Speaker — Kitty

The only human in Tower. The Speaker decides what ships, approves what the Sentinels propose, and speaks for Phajot to the world. The Sentinels report to the Speaker. The Speaker is not a Sentinel.

### 3.2 The Sentinels (canonical table)

| Code Name | Role | What They Do | Lore Origin |
|---|---|---|---|
| **Sentinel** | Health & Protection | Uptime monitoring, error tracking, security audits, RLS verification, "is anything on fire right now" | Destiny Titan subclass — wields a shield, defensive protector |
| **Vanguard** | Product & Sprint Leadership | Sprint planning, backlog grooming, prioritization, changelog, "what are we building next" | Destiny Vanguard leadership — Zavala, Cayde, Ikora, who decide the missions |
| **Osiris** | QA — Finds What Others Miss | Parser accuracy tracking, regression tests, edge-case hunting, bug investigations, real-device verification | Exiled Warlock who studies what others avoid, obsessive truth-seeker |
| **Banshee** | DevOps & Infrastructure | Deploy pipeline health, Cloudflare/Supabase status, cost tracking, schema migrations, secrets | Banshee-44, the Tower's gunsmith who keeps the Guardians' tools working |
| **Hawthorne** | Support — Voice of Users | User feedback intake, bug reports, multilingual replies, FAQ, "how are users feeling" | Suraya Hawthorne, the civilian liaison between Guardians and the humans of the Last City |
| **Iron Wolf** | Growth — Scouts New Territory | Content drafts, social posts, landing page copy, competitor watching, launch planning | The Iron Lords, who went into the wilderness to find survivors after the Collapse |
| **Ikora** | Archivist — Keeper of Records | Legal and compliance (Privacy Policy, ToS, PDPA), decision log, session history, long-term memory | Ikora Rey, the Warlock Vanguard — scholar, researcher, keeper of precedent |

### 3.3 Reporting Structure

- All 7 Sentinels report to the Speaker
- Sentinels do **not** report to each other
- The Speaker is the only one who coordinates cross-Sentinel work
- Sentinels can reference each other's outputs but cannot assign each other work

This keeps the org flat. When Phajot grows and a second human joins the team, we will revisit the structure.

---

## 4. WHAT TOWER DOES

Tower is organized into **six rooms**. Each room is a distinct surface. They can be built independently and in any order, but Room 1 (The Lobby) is always the first thing a user sees.

### Room 1 — The Lobby (Overview)
The first screen when Tower opens. Answers *"what's happening right now?"* in 5 seconds.
- Current sprint name + progress
- Top blockers (if any)
- Health summary (uptime, errors, today's AI cost)
- Sentinel status lights (🟢🟡🔴) — one per department
- Last 10 activity items (commits, bugs, feedback, decisions)

### Room 2 — The Command Center (Chat)
Where the Speaker talks to the Sentinels.
- **v1:** iframe embeds of each Claude Project (one per Sentinel)
- **v2:** Native chat UI reading/writing Supabase, with search across rooms and @-mentions

### Room 3 — The Workshop (Work Board)
Where current and upcoming work lives.
- Sprint view with task status
- Backlog
- Session log linking to GitHub commits

### Room 4 — The Engine Room (Technical Health)
Live system status.
- Uptime graphs (app.phajot.com, api.phajot.com)
- Sentry error feed (frontend + worker)
- AI cost tracker (Gemini + Claude, today/month/projected)
- Cloudflare traffic metrics
- Worker `/health` endpoint status
- Parser accuracy weekly trend

### Room 5 — The Admin Panel (User Investigation)
User support and debugging. **Read-only in v1.** Write privileges deferred to v2.
- Search users by phone/email/ID
- View profile, plan, recent transactions, recent errors
- Audit log (every admin action logged here — v2)
- PDPA-compliant access controls

### Room 6 — The Archive (Memory)
Searchable long-term memory.
- Decision log (`PHANOTE-DECISIONS-LOG.md`)
- Session history (`docs/session-*/`)
- FAQ (Hawthorne's output)
- Full-text search across everything

---

## 5. ARCHITECTURE OVERVIEW

### 5.1 Deployment

```
tower.phajot.com
    ↓
Cloudflare Pages (separate project from app.phajot.com)
    ↓
Vite + React app in /tower/ folder of the phanote repo
    ↓
Reads from:
  - Supabase (shared with Phajot, RLS-gated to Speaker only)
  - Cloudflare Worker (api.phajot.com)
  - GitHub API (for commits, PRs, file reads)
  - Sentry API (for errors)
  - docs/tower/*.md (the Sentinels' markdown state)
```

### 5.2 State Model — Hybrid

Tower stores state in two places, each optimized for its use case:

| Type | Storage | Why |
|---|---|---|
| Slow-changing documents (READMEs, sprint plans, decisions, FAQs, session notes) | Markdown files in `docs/tower/` | Git gives us version control, diffs, and durability. Claude Projects can read and write them. |
| Fast-changing state (tasks, activity feed, metrics, user actions, blockers) | Supabase tables (`tower_*`) | Real-time queries, fast updates, live dashboards |

When a piece of state could reasonably live in either place, the default is markdown. Supabase is only for state that genuinely needs to be queried or updated frequently.

### 5.3 Access Control

- **Tower is hard-gated to the Speaker's Supabase user ID.**
- No sign-in screen in v1 — auth is inherited from Phajot, and anyone who isn't the Speaker gets a "Tower is operator-only" page.
- Every read of user data in Room 5 is logged to a `tower_admin_reads` table (even though writes are deferred).
- Multi-user access deferred to Tower v3.

---

## 6. WHAT TOWER IS NOT

This list exists to prevent scope creep.

- **Not a public product.** Tower is internal. It will never be marketed to Phajot users.
- **Not a replacement for Linear/Jira/Notion.** Tower is small and focused. When Phajot has 10+ humans, we'll revisit.
- **Not a general-purpose Claude Projects UI.** Tower is specific to Phajot's 7 Sentinels. It does not try to be a framework.
- **Not a place to build new Phajot features.** Feature work happens in Phajot's main app. Tower observes, plans, and decides — it does not contain product logic.
- **Not always-on.** Tower is checked a few times a week at most. It does not need real-time push updates in v1.

---

## 7. DEPENDENCIES

Tower cannot be built until these are in place. This is the "structural steel" Kitty insisted on before the "house."

| Dependency | Status | Ships In |
|---|---|---|
| Sprint B — parent-wrapper hygiene + error toasts | 🔜 | Session 10 |
| Sprint C — real auth (user-set password) + schema drift captured + `alert()` replaced | 🔜 | Session 11 |
| Sprint D — i18n complete + Settings reorganized | 🔜 | Session 12 |
| **Sprint E — Observability floor (Sentry, AI cost log, `/health` enrichment, audit log table, `docs/tower/` skeleton)** | 🔜 | Session 13 |
| Sprint F — Tower Lobby (Room 1) live | 🔜 | Session 14 |

Tower rooms 2–6 then ship one per session through Sessions 15–18.

---

## 8. THE CODE CONTRACT FOR TOWER

These rules exist specifically for Tower and are additive to Phajot's `project_codex.md` §16 rules.

1. **Tower is a viewer, not a writer.** In v1, Tower can read everything and write almost nothing. Every write privilege must be explicitly added to v2 after real-world use confirms the need.
2. **Tower never bypasses RLS.** Even though the Speaker is the only user, Tower still goes through RLS-protected queries. No service-role keys in the Tower frontend.
3. **Tower is mobile-first.** Same 390px-width rule as Phajot. The Speaker checks Tower on their phone in the evening.
4. **Tower has a dark mode by default for evening use.** Celadon green stays; surfaces go dark.
5. **Tower never leaks user data to external services.** No Sentry error messages with transaction details. No commit messages with user IDs. No exports.
6. **Tower lives in the same repo as Phajot.** The `tower/` folder is a sibling to `src/` and `landing/`. One git history, one deploy pipeline, one set of secrets.
7. **Tower's URL is never shared.** `tower.phajot.com` is not linked from anywhere public. It is not indexed. It is not in sitemap.xml. It returns a 404-like page to non-Speaker visitors.

---

## 9. CHANGELOG

| Version | Date | Summary |
|---|---|---|
| v1.0 | 2026-04-14 | Initial charter. Naming locked: Tower + Speaker + 7 Sentinels (Sentinel, Vanguard, Osiris, Banshee, Hawthorne, Iron Wolf, Ikora). Deployment plan locked. Build starts Sprint F (Session 14). |

---

*"Phajot watches your money. Tower watches Phajot."* 🗼
