# Next Session Start Here

**Last session:** Phajot rename + full DNS migration (April 10, 2026)
**Status:** Migration complete, all 8 steps shipped, verified.

## Quick context

- Brand is now Phajot (ພາຈົດ) — renamed from Phanote due to trademark conflict
- All live domains: phajot.com, app.phajot.com, api.phajot.com
- Legacy phanote.com still serves as fallback (redirect + dual-route)
- OCR backend shipped at POST /parse-statement, frontend not built yet

## What's ready to ship next

### Priority: OCR bank statement frontend (Session 6 continuation)

Backend status:
- POST /parse-statement — LIVE at api.phajot.com
- Accepts up to 10 base64 images
- Returns parsed transactions with bank/currency/category detection
- Dedupe via hashTx (date|time|amount|description)
- Tested with curl, response shape documented in commit f0241cf

Frontend to build:
- Upload screen: multi-select max 10 images
- Currency picker (user selects before upload)
- Loading state during Gemini Vision processing
- Review screen: editable list of parsed transactions
- Bulk save to Supabase transactions table
- Error handling for parse failures, rate limits, partial results

Estimated: 2-3 hours focused work.

Sample screenshots in the chat history from April 10 showing LDB, JDB,
BCEL One formats to test against.

## Other things on the backlog

- Session 7: Could also do sync-to-other-devices feature
- Delete the old phanote.com domain someday (not urgent, it redirects fine)
- Rename worker file phanote-api-worker.js to phajot-api-worker.js (risky, skip)
- Category expansion if needed based on real usage

## How to start next session

1. Open Codespace
2. git pull origin main
3. npm run dev (app) + cd landing && python3 -m http.server 8080 (landing)
4. Verify both still work on new domains
5. Tell Claude: "continue OCR frontend"
