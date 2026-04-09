# PHANOTE — Session 4 Day 2 Summary
### April 9, 2026 — The Wife Feedback Sprint

---

## 🎯 Day Theme

Real user feedback from Kitty's wife revealed two product pain points. This day focused on **listening, investigating with data, and shipping structural fixes** rather than patches.

---

## 👂 Wife's Feedback (morning)

1. **"Most transactions default to Other"** — despite having 24 categories
2. **"AI Advisor can't answer simple things like 'how much did we pay in food today'"**

---

## 🔬 Investigation Phase

Ran SQL diagnostic queries against real data (116 transactions). Key findings:

| Finding | Details |
|---|---|
| `category_id` is 100% NULL | Dead legacy column from abandoned design |
| `ai_confidence` is exactly 0.47 | On 100% of transactions (suspicious pattern) |
| The 0.47 math | `0.42 base + 0.05 amount bonus + 0 category bonus when "other"` — mathematical certainty |
| 3 structural bugs found | In the parse pipeline (QuickAddBar.submit + handleAddTransaction) |

**The real data beat code guessing.** Would have taken hours to find by reading code.

---

## 🔧 Tier 1 — Parse Pipeline Fix (commit `cb38554`)

Three structural fixes to `src/App.jsx` `QuickAddBar.submit()`:

### 1. Wait for AI on low confidence parses
- Threshold changed `0.88 → 0.60` (user decision: "balanced")
- Low confidence: `await Promise.race([aiPromise, 3s timeout])`
- Use AI result if higher confidence than local
- Preserves 5-second rule for confident parses (fast path unchanged)

### 2. Save AI confidence to database
- Fix `handleAddTransaction _update` path to write `ai_confidence`
- Thread `ai.confidence` through the `_update` call
- No more misleading 0.47 on corrected transactions

### 3. AI confidence gate on fast-path correction
- Only overwrite category in background if AI is **more** confident
- Prevents visible category flips 1-2s after user sees save

**Key constraint preserved:** 5-second rule. Fast path stays fast for confident parses. Only low-confidence inputs wait for AI.

**Net change:** -1 line (18 added, 19 removed). Elegant fix.

---

## 🧠 Tier 3 — Fuzzy Matching + Keyword Expansion (commit `f73c0dd`)

### Levenshtein fuzzy matching engine
- Added space-optimized 1D DP `levenshtein` function (~12 lines)
- Added `FUZZY_WORDS` dictionary (~55 high-value English keywords)
- Fuzzy fallback inserted **before** "other" return in `detectCategory`

**Rules:**
- Words ≤2 chars: skip
- Words 3-5 chars: exact match only in FUZZY_WORDS (no fuzzy)
- Words 6+ chars: edit distance 1 (not 2 — strict)
- Length pre-filter skips O(n*m) Levenshtein when lengths differ > maxDist
- Confidence 0.65 on fuzzy hit (above 0.60 threshold → fast path)

**Lao/Thai scripts:** exact regex only, no fuzzy (Levenshtein doesn't work well on non-Latin).

### 5 new CAT_RULES added

| Category | Pattern |
|---|---|
| subscriptions | `openai\|chatgpt\|anthropic\|claude\|midjourney` |
| fees | `bank statement\|bcel fee\|annual fee\|monthly fee` |
| entertainment | `lottery\|ຊື້ເລກ\|ຫວຍ\|หวย\|ลอตเตอรี่` |
| shopping | `delivery\|shipping\|ຄ່າເຄື່ອງ\|lalamove\|grab express` |
| utilities | `trash\|garbage\|rubbish\|ຂີ້ເຫຍື້ອ\|ค่าขยะ` |

### 5 in-place keyword expansions

| Category | Added keywords |
|---|---|
| phone_internet | top up phone, เติมเงิน |
| utilities | water supply, ລັດວິສາຫະກິດນ້ຳປະປາ |
| transport | road tax, vehicle tax, ພາສີລົດ |
| food | wark, ແຊບ (Lao restaurant chain) |
| education | ໜັງສື (Lao for book) |

### 5 audit fixes for unbounded regex bugs

Claude Code audited CAT_RULES for similar substring bugs after discovering the `tur` pattern issue. Found and fixed 5:

| Bug | Fix | Was matching |
|---|---|---|
| `tur` → `\btur\b` | travel rule | "resturant", "nature", "future" |
| `mall` → `\bmall\b` | shopping rule | "small amount" |
| `bag` → `\bbag\b` | shopping rule | "garbage" → wrong category |
| `jam` → `\bjam\b` | food rule | "pajama" → wrong category |
| `wage` → `\bwage\b` | salary rule | "sewage" |
| `bcel` transfer rule | negative lookahead | "bcel fee" → wrong category |

**Tested in preview on iPhone SE viewport — 8/8 verification tests passed.**

---

## 💅 Polish Sprint (commit `16408e1`)

### Fix 1 — ai_memory 406 Not Acceptable errors
- **Root cause:** `dbSaveMemory` used `.single()` which throws 406 when 0 rows found (PostgREST behavior)
- **Fix:** Changed `.single()` → `.maybeSingle()` (1 word change)
- **Result:** Console errors gone, memory cache actually works

### Fix 2 — Friendly OCR error messages
- **Before:** Raw JSON like `{"code":503,"message":"UNAVAILABLE"}`
- **After:** Warm multilingual messages (en/lo/th):

| Error type | Message |
|---|---|
| 503/unavailable | "Gemini is a bit sleepy right now 😴" |
| 429 rate limit | "You've used OCR a lot today! Take a short break 🌿" |
| Generic | "Couldn't read this receipt 😕 Try a clearer photo?" |
| Connection error | Also i18n'd to lo/th/en |

### SQL cleanup
Ran: `UPDATE transactions SET ai_confidence = NULL WHERE ai_confidence = 0.47`

- **25 historical rows reset** (not 116 as expected — many had been corrected by AI background updates already)
- Confidence scores now honest across the database

---

## 📦 Day 2 Commits (in order)

| Commit | Description |
|---|---|
| `cb38554` | fix: parse pipeline — wait for AI, save confidence to DB |
| `f73c0dd` | feat: smart parser — fuzzy + keywords + audit fixes |
| `16408e1` | fix: ai_memory 406 + friendly OCR errors |

---

## ⏳ Still Pending from Wife Feedback

**AI Advisor scope fix — NOT STARTED**
- Root cause identified: `/advise` only receives monthly summary, not individual transactions
- Plan: Send last 7 days of transactions alongside summary
- Update system prompt so Advisor knows it can answer date/category questions
- **Estimated 60-90 min, scheduled for next session**

---

## 📋 Still Pending from Session 4 Playbook

| Priority | Item | Notes |
|---|---|---|
| 🔴 | **RLS on Supabase** (profiles + transactions) | BLOCKING public launch |
| 🟡 | **Tier 2 category picker modal** | When both local + AI < 0.60 |
| 🟡 | **Usage limits system** (Part 2) | Free/Trial/Pro tiers + quotas |
| 🟡 | **Monthly Wrap feature** (Part 4) | End-of-month AI narrative |
| 🟡 | **Observability / Sentry** (Part 3) | Error tracking + admin views |

---

## 🔒 Decisions Locked Today

| Decision | Value | Rationale |
|---|---|---|
| Parse confidence threshold | 0.60 | "balanced" — 0.88 too strict, 0.40 too loose |
| AI wait timeout | 3 seconds | Keep 5-second rule intact (3s + save + buffer) |
| Fuzzy matching: short words | Exact match only (3-5 chars) | False positives (bear/beer, cake/coke) |
| Fuzzy matching: long words | Edit distance 1 (6+ chars) | Catches typos (coffe, grocry, pharmcy) |
| 0.47 historical data | Reset to NULL | Don't confuse future analytics |
| Lottery category | entertainment (for now) | Defer dedicated lottery category to later |

---

## 🎓 Key Learnings

### 1. SQL diagnostics beat code guessing
Running a query against real data revealed the 0.47 pattern immediately. Would have taken hours to find by reading code.

### 2. Audit existing code when adding new code
Finding the `tur` bug led Claude Code to audit for similar bugs — found 4 more. Finding one often means finding ten.

### 3. Short-word fuzzy matching is dangerous
Too many near-neighbors across categories (bear/beer, cake/coke, shoe/show, mail/meal). Exact match for short words is the right call.

### 4. Rule order in CAT_RULES matters
First match wins. Use negative lookahead to refine without reordering.

### 5. Wife as QA is more valuable than any test suite
Her real-world inputs caught what synthetic tests never would.

### 6. `.single()` vs `.maybeSingle()` is a real Supabase footgun
Remember this forever. Use `.maybeSingle()` when 0 rows is a valid outcome.

---

## 📊 Combined Impact (Day 1 + Day 2)

### Before today
- Type `coffe 50k` → saves as "Other" 📦
- Type `bookthailao` → saves as "Other" 📦
- Type `bank statement` → saves as "Other" 📦
- Type `OPENAI SUBSCR` → saves as "Other" 📦
- Type `ຊື້ເລກ` → saves as "Other" 📦
- Type `ຄ່າເຄື່ອງ` → saves as "Other" 📦
- AI confidence always showed 0.47 (misleading)
- No typo tolerance
- `resturant` would go to Travel (weird bug)
- `garbage` would go to Shopping (weird bug)
- `pajama` would go to Food (weird bug)
- OCR errors showed raw JSON blobs
- ai_memory cache was throwing 406 errors

### After today
- Type `coffe 50k` → **Coffee ☕ instantly** (fuzzy match)
- Type `bookthailao` → **Shopping/Education** via AI (~1.5s)
- Type `bank statement` → **Fees & Charges 🏦 instantly**
- Type `OPENAI SUBSCR` → **Subscriptions 💳 instantly**
- Type `ຊື້ເລກ` → **Entertainment 🎭 instantly**
- Type `ຄ່າເຄື່ອງ` → **Shopping 📦 instantly**
- AI confidence accurately reflects match quality
- Typos within 1 edit of known words caught
- Audit bugs eliminated — substring matches can't sneak in
- 5-second rule preserved for confident parses
- OCR errors show friendly multilingual messages
- ai_memory cache works properly

---

*Session 4 Day 2 complete. Real user feedback, real fixes, real progress.*

*"Phanote · ພາໂນດ · พาโนด — Lead your notes. Know your money."* 🐾🌿
