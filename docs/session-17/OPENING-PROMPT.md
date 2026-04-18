# Session 17 — Opening prompt for new chat

Speaker copies everything inside the triple-backtick block below and pastes as the first message in a new Claude chat. New-chat Claude will read this and orient itself to Session 17 context without re-learning from scratch.

Why a written opening prompt: Session 16 grew long (covered Sessions 14 review + 15 + 16 in one chat, ~9 hours spanning two calendar days). Starting Session 17 in a new chat preserves context-window performance and forces fresh reading of current docs (Rule 21 working at the chat level, not just the edit level).

---

## The prompt — copy the block below

```
Session 17 starting. Fresh chat — Session 16 ran in a separate
conversation and closed cleanly with 9 commits (head at d5cea46).

Quick orientation:
- I'm Speaker, solo dev on Phajot (ພາຈົດ) — Lao-first
  multi-currency personal finance PWA. Also building Tower
  (tower.phajot.com), internal operator surface for Phajot.
- Repo: Kitty99Csl/phanote · Codespaces: super-duper-capybara
- You're acting as CTO. Vanguard = checkpoint reviewer
  (not mid-stream). Osiris = docs sentinel. CC (Claude Code) =
  engineer. I'm decision authority.

Session 17 scope (locked in docs/session-16/DECISIONS.md Q6):
- Item 5 — Room 2: ai_call_log filtered table (~2 hours per Q4 design)
- Item 6 — Room 3: ai_daily_stats summary cards + 14-day table,
  NO chart (~90 min per Q5 design)
- Sprint F closes at end of Session 17

Opening ritual per docs/session-ritual.md:
1. ✅ Vanguard re-synced (I do before starting)
2. ✅ Osiris re-synced (I do before starting)
3. ⏳ CC reality check — you give me the prompt, CC runs it, I
     paste results back
4. ⏳ Your narrow-scope review

Please:
1. Read docs/session-16/SUMMARY.md first — last session's full
   context (three-layer defense-in-depth now live, Room 1
   rendering real data)
2. Read docs/session-16/DECISIONS.md — especially Q4 (Room 2
   filtered table design) and Q5 (Room 3 cards + 14-day table
   design). Q2 amendment captures mid-session overrides.
3. Confirm you've understood current state
4. Give me the CC reality-check prompt so we can verify production
   state before starting Item 5 work

Relevant patterns docs if useful:
- docs/patterns.md — development patterns (reality-check,
  mockup calibration, visual-first)
- docs/session-ritual.md — opening/closing ritual
- docs/tower/design-system.md — Cosmodrome visual system v1

Rules most relevant to Session 17:
- Rule 16: Tower doesn't import from main app src/ (mirror files)
- Rule 19: Migration files first, never ad-hoc SQL
- Rule 20: Sprint-close commits update ROADMAP-LIVE +
  SPRINT-CURRENT atomically (Sprint F closes this session —
  THIS WILL APPLY at session wrap)
- Rule 21: Reality-check before targeted edits

Ready when you are.
```

---

## Notes for Speaker

- Re-sync Vanguard and Osiris before opening the new chat so they have latest state (includes Session 16 SUMMARY.md + all commits).
- Re-sync Project files in Claude if you do the GitHub → project sync pattern.
- Reality-check ritual is cheap; don't skip it even if this feels familiar.
- Vanguard consultation at opening is optional if scope is clear — DECISIONS.md Q4 + Q5 already locked the designs. Consult Vanguard before Item 5 code if anything feels ambiguous.

## Expected Session 17 shape

Based on Q4 + Q5 + ~30 min wrap buffer:

| Phase | Time |
|---|---|
| Opening + reality check + scope confirm | 15 min |
| Item 5 — Room 2 filtered table | ~2 hours |
| Break | 15 min |
| Item 6 — Room 3 cards + 14-day table | ~90 min |
| Sprint F wrap (atomic per Rule 20) | 20 min |
| **Total** | ~4.5 hours |

Sprint F closes at end of Session 17. Tower becomes fully operational for AI call inspection + daily stats tracking.

---

*Template created Session 16 close (2026-04-19). Reusable for future multi-chat sessions.*
