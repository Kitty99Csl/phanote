# OCR Bank Statement Feature — Decisions Locked

**Date:** April 11, 2026 (Session 5 Day 1 late night wrap)
**Status:** Decisions locked, implementation starts Session 6 Day 2

## Banks supported (all 3)
- LDB (card-style list, red/green amounts, ▲▼ indicators)
- JDB (dark theme, minus sign for OUT)
- BCEL One (colored badges ONP/TRI/TRO/ACC/FEE, red/green amounts)

## User flow (locked)

1. User picks currency BEFORE upload (Q2: A-auto detect from header fallback)
2. User uploads multiple screenshots at once (Q1: B)
3. Backend auto-detects account from account number in header (Q3: B)
4. Backend parses all screenshots via Gemini Vision
5. Backend dedupes using datetime+amount+description hash (Q6: B)
6. Backend auto-categorizes via existing local parser + Gemini fallback (Q5: A)
7. Frontend shows editable review list — user fixes wrong ones, bulk saves (Q4: C)

## Scope split (Q7: tonight sleep, tomorrow continue)

**Session 6 Day 2 — Backend first**
- Worker endpoint: POST /parse-statement
- Gemini Vision prompt (handles LDB/JDB/BCEL formats)
- Currency from header extraction
- Transaction list extraction (date, time, amount, sign, description, ref)
- Dedup logic
- Auto-categorization via existing parser
- Returns parsed array for frontend review
- Test with curl + real screenshots
- Estimated: 2-3 hours

**Session 7 — Frontend upload + review UI**
- Upload screen (multi-select images)
- Review list with editable rows
- Bulk import button
- Integration with existing transaction system
- Estimated: 2-3 hours

## Rules (across all banks)

- Red amount or minus sign → expense (OUT)
- Green amount or no sign → income (IN)
- Currency from account header (not line-item)
- Reference number optional (use for dedup when present)

## Open considerations for implementation

- Merchant names may be in Lao script → Gemini handles natively
- Fee + main transaction may appear as separate rows (e.g., BCEL ONP + FEE pair)
- Partial row at bottom of screenshot (user scrolled mid-row) → skip or flag
- Interest and fees from bank itself → probably skip or categorize as "bank"

---

See screenshots reference in chat history for format examples.
