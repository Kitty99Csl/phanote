# Session ritual

Opening and closing rituals for work sessions on Phajot + Tower. The rituals exist so Speaker doesn't run reality-check commands manually — CC does them, Speaker consumes the results.

## Opening ritual

### Speaker's tasks
1. Open Vanguard Claude Project → click Re-sync. Wait for completion.
2. Open Osiris Claude Project → click Re-sync. Wait for completion.
3. In Vanguard, new chat: paste the narrow scope prompt (see below).
4. Review Vanguard's response. Approve scope or push back.

### CC's tasks (paste this prompt to CC at session start)

```
SESSION {N} START — Reality check + context sync

Run these commands and report output:

1. Latest commit + message:
   git log -1 --oneline

2. Production main-app bundle hash:
   curl -s https://app.phajot.com/ | grep -oE 'index-[A-Za-z0-9_-]+\.js'

3. Worker version + health:
   curl -s https://api.phajot.com/health | head -40

4. Tower bundle (if Tower is in active use):
   curl -s https://tower.phajot.com/ 2>/dev/null | grep -oE 'index-[A-Za-z0-9_-]+\.js' || echo "(Tower requires CF Access auth — skip if curl can't auth)"

5. Latest docs state:
   ls -lt docs/session-*/SUMMARY.md | head -3
   head -5 docs/ROADMAP-LIVE.md
   head -5 docs/tower/vanguard/SPRINT-CURRENT.md

6. Working tree clean?:
   git status --short

Report all results. STOP and wait for Speaker's next instruction.
Do not start any work.
```

### Narrow scope prompt for Vanguard

```
Session {N} starting. Scope locked to {describe scope}.
Item {N} deferred to Session {N+1}.

Please:
1. Confirm the latest closed state from current docs
2. List any blockers for the scope
3. Flag any scope-creep risk
4. Ask at most one sharp question if something is unclear
```

## Closing ritual

### Before closing a session

1. All work committed + pushed.
2. `docs/session-{N}/SUMMARY.md` filled in (items shipped, decisions locked, open threads, learnings).
3. `docs/tower/vanguard/SPRINT-CURRENT.md` updated to reflect sprint progress.
4. `docs/ROADMAP-LIVE.md` state banner refreshed (per Rule 20 if sprint closed).
5. `CLAUDE.md` "Recent key learnings" block updated if new patterns surfaced.

### Final commit

Session-wrap commit updates ALL the files above atomically. See commit `28af464` (Session 15 wrap) as reference pattern.

### After push

1. Re-sync Vanguard + Osiris (so Session N+1 starts fresh).
2. Note next session opening task in session-{N} SUMMARY.md "Open threads for Session N+1" section.

## Why this ritual exists

- **CC runs the reality checks, not Speaker.** Manual curl commands at session start waste Speaker time and energy that could go to decisions.
- **Vanguard consultation before work starts** catches scope problems early. 5 minutes of Vanguard review saves 30 minutes of wrong-direction work.
- **Closing ritual enforces Rule 20 atomicity.** A sprint isn't closed until SPRINT-CURRENT.md and ROADMAP-LIVE.md agree.

---

*Last updated: 2026-04-18 (Session 15 close). Formalized after recognizing reality-check commands were being run by Speaker instead of CC.*
