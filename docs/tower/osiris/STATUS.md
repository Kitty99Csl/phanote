# Osiris — Quality Assurance

> **Role:** Parser accuracy, OCR quality, regression prevention.  
> **Reads:** `ai_call_log` (especially OCR rows), review correction rates, benchmark datasets.  
> **Owns:** OCR Reliability Room (Sprint I), parser accuracy dashboard.

## Current status

- **Role:** QA, bug triage, test gap analysis, risky-change review for Phajot
- **Claude Project:** ✅ Live (created Session 14, Sprint E Item 7)
- **Model:** Sonnet 4.6
- **Knowledge sync:** GitHub `Kitty99Csl/phanote`, paths `CLAUDE.md + docs/**`, manual re-sync on push
- **Owner:** Speaker
- **Last live as of:** 2026-04-17

## Monitoring queues

- `ai_call_log` rows where `endpoint IN ('/parse', '/ocr', '/parse-statement')` — wired Sprint E item 2
- Review correction rate per bank (OCR metadata column) — wired Sprint I
- Parser confidence distribution — wired Sprint E item 2

## Benchmark status

- Benchmark dataset (50 real statements): not created yet (Sprint L item 4)
- Current accuracy baseline per bank: unknown (Sprint L item 5)
- Re-evaluation trigger: <85% accuracy on benchmark (OQ-015)

## Smoke test (Session 14 close)

First smoke test (sync scope too narrow):
- Osiris correctly REFUSED to cite stale ROADMAP-LIVE.md data
- Explicitly said "I won't cite stale hashes"
- Named the gap: "Re-upload the post-close files when ready"
- Posture verified correct: skeptical, demands fresh data

Second smoke test (after sync scope expanded to docs/**):
- Listed 11 accessible files correctly
- Cited all 7 Sprint E commit hashes from SPRINT-CURRENT.md
- CAUGHT a real gap: Item 7 had no verifiable artifact like Items 1-6 (which all have commit hashes). Osiris said: "Worth defining what 'done' looks like for Item 7 — e.g., a test prompt sent and answered in both Vanguard and Osiris?"
- THIS FINDING BECAME `docs/decisions/CLAUDE-PROJECTS-SETUP.md`

Full test responses archived in `docs/decisions/CLAUDE-PROJECTS-SETUP.md`.

Posture verified: demands verifiable proof, refuses to sign off on hand-wavy items, constructive (proposed the fix).

## Changelog

- 2026-04-17 · Item 7 shipped — Claude Project live, smoke-tested, flagged Item 7 "no verifiable artifact" gap which directly produced CLAUDE-PROJECTS-SETUP.md artifact
- 2026-04-17 · Created during Sprint E Item 1 skeleton
