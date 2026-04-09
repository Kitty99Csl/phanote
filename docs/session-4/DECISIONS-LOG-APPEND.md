# PHANOTE — Decisions Log Entries (April 9, 2026)
### Append these to PHANOTE-DECISIONS-LOG.md

---

### [2026-04-09] — Parse confidence threshold lowered: 0.88 → 0.60

**Context:** Before today, localParse would save instantly at any confidence >= 0.88. This meant low-confidence parses (like typos) saved as "other" before AI could correct them. Result: Kitty's wife complained "everything is Other."

**Decision:** Lower threshold to 0.60 ("balanced"). Below 0.60, wait up to 3 seconds for AI. Above 0.60, save instantly (fast path unchanged).

**Alternatives considered:**
- 0.80 (strict) — more picker prompts needed, user friction
- 0.40 (loose) — too many wrong saves, no AI waiting benefit

**Reversible?** Yes — one constant at line 1522 of src/App.jsx.

---

### [2026-04-09] — Fuzzy matching only for Latin words, by length class

**Context:** Added Levenshtein fuzzy matching to catch typos like "coffe" → "coffee". Needed to decide thresholds safely.

**Decision:** 
- Words ≤2 chars: skip
- Words 3-5 chars: exact match only (no fuzzy)
- Words 6+ chars: edit distance 1

**Rationale:** Short words have too many near-neighbors (bear/beer, cake/coke, shoe/show, mail/meal). Typos on longer words are more common and distance 1 is enough to catch them.

**Reversible?** Yes — logic is contained in `detectCategory()`.

---

### [2026-04-09] — AI confidence now written to DB on background correction

**Context:** Before, when AI corrected a category in background via `_update`, only `category_name`/`category_emoji` were saved. `ai_confidence` stayed at whatever localParse returned (usually 0.47). This made the DB confidence misleading.

**Decision:** Pass `ai.confidence` through the `_update` call AND write it to DB in `handleAddTransaction`. Only overwrite if AI is MORE confident than local (prevents visible category flips on already-correct fast-path saves).

**Reversible?** Yes, 2-line revert.

---

### [2026-04-09] — AI wait timeout capped at 3 seconds

**Context:** When local parse returns low confidence (<0.60), we wait for AI to get a better result before saving. Needed to decide maximum wait time.

**Decision:** 3 seconds via `Promise.race([aiPromise, setTimeout(3000)])`.

**Rationale:** Preserves 5-second rule. 3s AI wait + ~500ms save + buffer = still under 5s worst case. If AI is slower than 3s or fails, fall back to local result gracefully.

**Reversible?** Yes — one magic number in QuickAddBar.submit().

---

### [2026-04-09] — Supabase .single() replaced with .maybeSingle() in dbSaveMemory

**Context:** Three 406 Not Acceptable errors appearing in browser console on every parse. Root cause: `dbSaveMemory` used `.single()` which PostgREST throws 406 on when 0 rows returned. The `ai_memory` table is empty for new users, so every first-time lookup threw.

**Decision:** Change `.single()` → `.maybeSingle()`. Single word change, zero risk, eliminates all 406 errors, unblocks the memory cache feature.

**Rule going forward:** Use `.maybeSingle()` whenever 0 rows is a valid outcome. Reserve `.single()` only when you're certain exactly 1 row exists (e.g., primary key lookup).

**Reversible?** Yes, trivially.

---

### [2026-04-09] — Historical ai_confidence = 0.47 reset to NULL

**Context:** 25 transactions in the database had `ai_confidence = 0.47` exactly, a mathematical artifact from the pre-Tier1 pipeline bug (0.42 base + 0.05 amount bonus + 0 category bonus when "other"). These misleading values would confuse future analytics and debugging.

**Decision:** One-time SQL cleanup: `UPDATE transactions SET ai_confidence = NULL WHERE ai_confidence = 0.47 AND (is_deleted = false OR is_deleted IS NULL)`. Reset to NULL rather than trying to recompute (categories were already corrected by AI background updates — we just can't know the original AI confidence retrospectively).

**Scope:** 25 rows affected (not all 116 because many had been corrected by background AI updates to different values).

**Reversible?** Partially — can set back to 0.47 if needed, but we'd lose the NULL signal. Not planned.

---

### [2026-04-09] — Lottery mapped to entertainment (deferred dedicated category)

**Context:** Added keyword rule for lottery (`lottery|ຊື້ເລກ|ຫວຍ|หวย|ลอตเตอรี่`). Needed to decide which category to route to since "lottery" isn't one of the 24 existing categories.

**Decision:** Route to `entertainment` for now. Culturally in Laos, lottery is a very common expense and arguably deserves its own category, but adding a 25th category would require updating the default category list, icons, i18n keys, and onboarding flow.

**Alternatives considered:**
- New "lottery"/"gambling" category (accurate but 30+ min of scope)
- "other_expense" (at least honest about not fitting)

**Reversible?** Yes — logged as OQ-007 in PHANOTE-OPEN-QUESTIONS.md for future revisit.
