# Development patterns

> **Status:** Working set of patterns — strong defaults, not rules. Violating a pattern doesn't break the project; it just means more iteration cycles or missed signals. Rules (see CLAUDE.md §Non-negotiable rules) are hard guardrails; patterns are soft guidance. When in doubt about a pattern, the project still works — it just works less efficiently.

Patterns here grow over time as we learn. Each entry states: what the pattern is, why it matters, and where the evidence came from.

## Pattern: Reality-check before edits

**The rule is Rule 21 in CLAUDE.md.** This entry expands on it.

**Origin:** Session 15 (2026-04-18), twice in one night:
1. Codex's CLAUDE.md audit claimed `session-4` branch references, missing Rules 12/19/20, and a "Session 4 refactor" section. CC's file read found most claims were already fixed. Audit was based on stale memory.
2. Tower README rewrite linked to `docs/tower/SPRINT-C-PLAN.md` — that file doesn't exist. Written from memory of "there should be a Sprint C plan doc."

**How to apply:**
- Before editing a file based on external description (an audit, a spec from another Claude, a handoff note), read the file first. `cat`, `head`, `grep`, or `wc -l`.
- Takes ~30 seconds per file. Saves 10+ minutes of wrong edits.
- Applies equally to: audit-driven edits, rule additions, doc cleanups, "I think this file says X" situations.

**Anti-pattern:** Writing edit specs from memory, then having CC apply them without verification. Looks productive. Creates invisible errors.

## Pattern: Mockup in chat widget ≠ production feel

**Origin:** Session 15 Destiny redesign. Chat-widget-rendered mockup of "Cosmodrome" theme felt ~80% Destiny-immersive in-chat. Same design rendered at real 1920px browser width felt ~40-50% — about 30-35% less dense and cinematic than the mockup suggested.

**Cause:** Chat widgets are narrow (typically 680px), tightly composed, surrounded by conversational context. Real apps live in wide viewports with empty space that dilutes density.

**Calibration heuristic:** Expected production feel ≈ mockup feel × 0.6.

**How to apply:**
- When previewing designs in chat, adjust for the widget-to-production gap before committing to direction.
- If you absolutely love a chat-rendered mockup, the real version may feel merely "good." That's still fine — just calibrate expectations.
- Consider rendering mockup + at least one "fuller viewport" variant before locking direction.

## Pattern: Visual-first before major UI changes

**Origin:** Session 15 Destiny redesign. 3 mockup directions (D1 Cosmodrome / D2 Traveler / D3 Vanguard Command) rendered in-chat before any code. Speaker picked D1. Saved at least 2 iteration cycles of "build it, see it, dislike it, redo."

**How to apply:**
- Before major UI changes (new visual direction, full page redesigns, new layout paradigms), render mockup options first.
- 2-3 distinct directions is usually right. More than 3 = indecisive. One = no real choice presented.
- Each mockup should represent a genuine direction, not tweaks of the same thing.
- Speaker picks. Then CC executes against the chosen direction with a clear spec.

**Not for:** small tweaks, bug fixes, content changes, refactors. Overhead costs more than iteration would.

## How this doc grows

- Each session that produces a durable pattern adds an entry here.
- Patterns that prove themselves over 2-3 sessions can be promoted to rules in CLAUDE.md.
- Patterns that don't stick get archived (strike through + note, don't delete — the pattern trial is also useful data).
- Cross-link to session summaries where patterns first surfaced for evidence trail.

---

*Last updated: 2026-04-18 (Session 15 close). See docs/ROADMAP-LIVE.md for current state.*
