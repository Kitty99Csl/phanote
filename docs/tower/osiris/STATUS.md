# Osiris — Quality Assurance

> **Role:** Parser accuracy, OCR quality, regression prevention.  
> **Reads:** `ai_call_log` (especially OCR rows), review correction rates, benchmark datasets.  
> **Owns:** OCR Reliability Room (Sprint I), parser accuracy dashboard.

## Current status

- **Last updated:** 2026-04-17 (Session 14)
- **Parser accuracy baseline:** Not measured yet (scheduled Sprint L item 5)
- **OCR accuracy baseline:** Not measured yet (scheduled Sprint L item 5)
- **Active regressions:** None tracked yet
- **OCR provider:** Gemini 2.5 Flash Vision (stay-put decision, OQ-015 resolved 2026-04-16)

## Monitoring queues

- `ai_call_log` rows where `endpoint IN ('/parse', '/ocr', '/parse-statement')` — wired Sprint E item 2
- Review correction rate per bank (OCR metadata column) — wired Sprint I
- Parser confidence distribution — wired Sprint E item 2

## Benchmark status

- Benchmark dataset (50 real statements): not created yet (Sprint L item 4)
- Current accuracy baseline per bank: unknown (Sprint L item 5)
- Re-evaluation trigger: <85% accuracy on benchmark (OQ-015)

## Changelog

- 2026-04-17 · Created during Sprint E setup
