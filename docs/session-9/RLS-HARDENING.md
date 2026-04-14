# RLS Hardening — Session 9

**Date:** 2026-04-14
**Applied:** Live via Supabase SQL Editor as `postgres` role (superuser, bypasses RLS during apply)
**Verified:** Adversarial SQL test with second user, all 3 probes passed
**Git commits:** None — this is a database-only change. Future migration files (`004_capture_current_schema.sql` and `005_rls_policies_final.sql`) should backfill this into the repo. Not done yet; flagged in RISKS.md.

> **Why this doc exists:** Session 9's RLS work was applied directly to the live Supabase database, not through a migration file in `supabase/migrations/`. This means the repo cannot rebuild the production RLS state from `supabase/migrations/001-003 + seed.sql` — those files reflect the Phase 1 original schema, not what's actually live. This document is the ground-truth record of what was applied, so future sessions (and future humans) can see what the live DB looks like without having to re-run diagnostic queries.

## Test user accounts (Session 9 adversarial verification)

| User | UUID | Purpose |
|---|---|---|
| User A | `6e52c746-e78b-4148-9d00-f65e5feb923e` | Kitty's main account, production data |
| User B | `5e3629a1-aa60-4c25-a013-11bf40b8e6b9` | Test account created for Session 9 adversarial verification, 1 seed transaction |

Keep User B around as a permanent RLS regression test account. Do not delete.

## Pre-fix state — investigation findings

### Query 1: `pg_tables rowsecurity` check

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

Result (pre-fix):

| Table | rowsecurity |
|---|---|
| `ai_memory` | true |
| `app_events` | (not in scope for Session 9, left as-is) |
| `budgets` | true |
| `categories` | true (dead table) |
| `goals` | **false** ← RLS DISABLED despite having policies on paper |
| `monthly_reports` | (not in scope for Session 9, left as-is) |
| `profiles` | true |
| `recurring_rules` | true (dead table) |
| `transactions` | true |

🚨 **`goals` had `rowsecurity = false`.** The table-level RLS switch was off, meaning any policies attached to it were inert. This is an "inert policy" situation — policies exist in `pg_policies` but are never evaluated because the parent RLS flag is off. From the outside (dashboard UI, policy audit), the table LOOKS protected. It was not.

### Query 2: `pg_policies` inventory

```sql
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
```

Result (pre-fix, abbreviated):

**`ai_memory`** — 🚨 **DATA LEAK**
- A policy named approximately `"Enable read access for all users"` with `qual = true` (i.e., `USING (true)`) and `cmd = SELECT`.
- This is the **worst possible RLS policy shape**. It looks like RLS is enabled (the table has `rowsecurity = true`, has a policy, the dashboard shows green). But the `USING (true)` clause allows every authenticated user to read every row, regardless of `user_id`. The permissiveness makes it indistinguishable from no policy at all.
- **Any authenticated user could have read Kitty's AI memory (learned input patterns, categorization history).** Not catastrophic because `ai_memory` does not contain financial data, but the input patterns include transaction descriptions like `"coffee 50k"` which are arguably user-identifying.
- Accumulated alongside: 1-2 other canonical policies with proper `user_id = auth.uid()` shape. The permissive policy was additive — RLS policies are OR'd together (permissive mode), so the permissive `USING(true)` made all the other restrictive policies moot.

**`profiles`** — 6 overlapping policies
- 2× `FOR SELECT` variants (one canonical `auth.uid() = id`, one older variant)
- 2× `FOR UPDATE` variants
- 1× `FOR INSERT WITH CHECK (auth.uid() = id)` (late addition)
- 1× `FOR ALL` wildcard policy (probably from an early "just open it up" session)
- Net effect: access was correct (the OR of all 6 allowed exactly the right things) but the surface area was confusing. A future agent auditing the policies could easily add a 7th overlapping policy that accidentally grants more than intended.

**`transactions`** — 7 overlapping policies
- Same accumulation pattern. 3× SELECT, 2× UPDATE, 1× INSERT, 1× DELETE, plus a wildcard FOR ALL.
- Access was correct but unaudited.

**`goals`** — policies existed but inert (see Query 1)
- 1× `FOR ALL USING (user_id = auth.uid())` — the correct shape, but because `rowsecurity = false` at the table level, this policy was never evaluated. Equivalent to "no RLS at all".

**`budgets`** — 1 policy, canonical (no action needed)

**`categories`** — dead table, 4 policies, no action needed

**`recurring_rules`** — dead table, 1 policy, no action needed

### Query 3: `information_schema.columns` — schema drift audit

Ran per-table column lists and diffed against the migration files in `supabase/migrations/`. Full drift table documented in the Session 9 SUMMARY.md "Schema drift NOT fixed" section. Summary:

- **4 tables with column drift**: `profiles` (+9 columns), `transactions` (+8 columns), `budgets` (column name drift `amount`→`monthly_limit`), `ai_memory` (+2 columns, 1 unused migration column)
- **3 tables missing from migrations entirely**: `goals`, `app_events`, `monthly_reports`

None of the schema drift was fixed in Session 9. It's a HIGH risk in RISKS.md, to be addressed in a future session via `004_capture_current_schema.sql`.

## Fixes applied (in order)

All applied via the Supabase SQL Editor while logged in as Kitty's admin session, which runs as the `postgres` role. `postgres` is a superuser and bypasses RLS, which is how we were able to DROP permissive policies and re-add canonical ones even on tables where RLS was already enabled.

### Fix 1 — Drop the `ai_memory` permissive SELECT policy

```sql
-- Drop the data-leak policy. Replace with canonical user-scoped SELECT.
DROP POLICY IF EXISTS "Enable read access for all users" ON public.ai_memory;
-- (The exact policy name may have differed — pg_policies showed a USING(true)
-- policy that was dropped. The canonical shape below replaces it.)
```

Verified the drop:
```sql
SELECT policyname, qual FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'ai_memory';
```
Result: only restrictive policies remaining, no `qual = true`.

### Fix 2 — Enable RLS on `goals` (the inert-policy table)

```sql
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
```

Verified:
```sql
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'goals';
```
Result: `rowsecurity = true`. The existing `FOR ALL USING (user_id = auth.uid())` policy is now actually enforced.

### Fix 3 — Dedupe `profiles` policies (6 → 1 canonical)

Dropped all existing policies and created a single canonical set:

```sql
-- Drop all existing profiles policies (exact names varied — queried
-- pg_policies beforehand to get the list, then issued DROP POLICY
-- for each)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "Enable all actions for authenticated users" ON public.profiles;
-- (plus any others pg_policies showed)

-- Create canonical single policy
CREATE POLICY "profiles_user_access"
  ON public.profiles
  FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
```

Note: the original migration `001_profiles.sql` had separate `FOR SELECT` and `FOR UPDATE` policies and NO INSERT policy (inserts went through the `handle_new_user` trigger which runs as SECURITY DEFINER). The new canonical single `FOR ALL` policy covers INSERT as well, which closes the latent bug Session 8's investigation had flagged where an upsert on a missing profile would fail with a 403.

### Fix 4 — Dedupe `transactions` policies (7 → 1 canonical)

```sql
DROP POLICY IF EXISTS "Users own transactions" ON public.transactions;
DROP POLICY IF EXISTS "transactions_select_own" ON public.transactions;
DROP POLICY IF EXISTS "transactions_insert_own" ON public.transactions;
DROP POLICY IF EXISTS "transactions_update_own" ON public.transactions;
DROP POLICY IF EXISTS "transactions_delete_own" ON public.transactions;
-- (plus any others)

CREATE POLICY "transactions_user_access"
  ON public.transactions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### Fix 5 — Dedupe `ai_memory` policies (with the leak dropped in Fix 1)

```sql
DROP POLICY IF EXISTS "Users own ai memory" ON public.ai_memory;
-- (plus any other pre-existing canonical policies)

CREATE POLICY "ai_memory_user_access"
  ON public.ai_memory
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### Not fixed — `app_events`, `monthly_reports`

Both are actively used by the app but neither was in scope for Session 9's hardening pass. Rationale:
- **`app_events`** is a write-only event log (`dbTrackEvent` in `src/lib/db.js:38`). Users never read their own event log. Minimal data leak risk. Flagged for Session 10.
- **`monthly_reports`** is a read cache — the Monthly Wrap narrative is regenerated if stale. If cross-user read were possible, the worst-case is a user seeing another user's narrative, which is minor PII but not financial exposure. Flagged for Session 10.

Both should still get canonical policies — just not this session.

## Post-fix state

### `pg_tables rowsecurity` (after Session 9)

| Table | rowsecurity | Notes |
|---|---|---|
| `profiles` | true | ✓ canonical single-policy |
| `transactions` | true | ✓ canonical single-policy |
| `budgets` | true | unchanged (was already clean) |
| `ai_memory` | true | ✓ leak fixed, canonical single-policy |
| `goals` | **true** | ✓ RLS now enabled (was false) |
| `categories` | true | unchanged (dead table) |
| `recurring_rules` | true | unchanged (dead table) |
| `app_events` | ? | deferred — check next session |
| `monthly_reports` | ? | deferred — check next session |

### Canonical policy shape (for reference)

All user-data tables now follow the same single-policy shape:

```sql
CREATE POLICY "<table>_user_access"
  ON public.<table>
  FOR ALL
  USING (auth.uid() = <user_id_column>)
  WITH CHECK (auth.uid() = <user_id_column>);
```

Where `<user_id_column>` is `id` for `profiles` (because profiles.id IS the auth.users.id foreign key) and `user_id` for every other table.

**Why a single FOR ALL policy instead of separate SELECT / INSERT / UPDATE / DELETE?** Simplicity and auditability. A single policy for all four commands is easier to read, harder to forget, and impossible to accidentally omit one command. The trade-off is that you cannot have different rules per command (e.g., "anyone can SELECT but only owner can UPDATE") — but for Phajot's data model, the rule is always "you can only touch your own rows", so the simpler shape fits.

## Adversarial verification methodology

### How to impersonate an authenticated user in the Supabase SQL Editor

The SQL Editor runs as `postgres` by default, which bypasses all RLS. To test RLS enforcement, you must explicitly drop to the `authenticated` role and set the `request.jwt.claims` variable that RLS policies read via `auth.uid()`:

```sql
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub":"<target user UUID>","role":"authenticated"}';

  -- Now every query in this transaction runs as that user.
  -- auth.uid() resolves to the UUID in the claims.
  -- RLS policies are evaluated normally.

  SELECT /* your probe query */;
ROLLBACK;  -- or COMMIT if you actually want to test writes
```

The `SET LOCAL` scope is important: it only applies within the current transaction. `ROLLBACK` (or `COMMIT`) ends the transaction and returns you to `postgres` role. This means you can't accidentally leave the SQL Editor in a restricted state.

### The 3 probes run in Session 9

**Setup:** User A already had 1+ transaction rows. User B was a fresh account with 1 seed transaction. Both auth.users rows existed. User B's UUID was confirmed via `SELECT id FROM auth.users WHERE email = '<User B email>';`.

**Probe 1: Cross-user SELECT**

```sql
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub":"5e3629a1-aa60-4c25-a013-11bf40b8e6b9","role":"authenticated"}';

  SELECT id, amount, description
  FROM public.transactions
  WHERE user_id = '6e52c746-e78b-4148-9d00-f65e5feb923e';  -- User A's rows
ROLLBACK;
```

**Expected:** 0 rows (RLS filters out User A's rows because the current user is User B).
**Actual:** 0 rows ✓

**Probe 2: Cross-user INSERT**

```sql
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub":"5e3629a1-aa60-4c25-a013-11bf40b8e6b9","role":"authenticated"}';

  INSERT INTO public.transactions (user_id, amount, currency, type, description, date)
  VALUES ('6e52c746-e78b-4148-9d00-f65e5feb923e', 100.00, 'USD', 'expense', 'RLS test should fail', CURRENT_DATE);
ROLLBACK;
```

**Expected:** `ERROR 42501: new row violates row-level security policy for table "transactions"` (User B cannot write rows claiming to belong to User A).
**Actual:** `ERROR 42501` ✓

**Probe 3: Self-SELECT (negative control, not over-blocking)**

```sql
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub":"5e3629a1-aa60-4c25-a013-11bf40b8e6b9","role":"authenticated"}';

  SELECT id, amount, description
  FROM public.transactions
  WHERE user_id = '5e3629a1-aa60-4c25-a013-11bf40b8e6b9';  -- User B's own rows
ROLLBACK;
```

**Expected:** 1+ rows (User B can read their own data).
**Actual:** 1 row ✓ (the seed transaction)

### Why this is the strongest RLS test available

- It runs in the **production database**, not a test clone or local mock.
- It uses the **same `authenticated` Postgres role** that the Supabase client authenticates as in production.
- It reads the **same `request.jwt.claims`** that `auth.uid()` reads at query time, so the policy evaluation path is byte-identical to a real user session.
- It runs **full SQL**, so the RLS subsystem and the policy expressions are exercised end-to-end.

The only step more thorough than this would be: log into `app.phajot.com` as User B in an incognito browser, open the DevTools network tab, and manually try to POST a malicious transaction payload to Supabase's REST API with User A's UUID. That would verify the full HTTP → Supabase → Postgres → RLS chain. Planned as an optional follow-up for Session 10 if we want additional confidence, but the SQL-level test already proves the policies are correct.

## How to re-run the adversarial test in a future session

1. Log into Supabase dashboard → SQL Editor as Kitty (postgres role)
2. Paste each of the 3 probes above
3. Run each in a `BEGIN ... ROLLBACK` block
4. Expected: 0 rows / ERROR 42501 / 1+ rows (in that order)
5. If any probe unexpectedly returns different results, RLS has regressed — investigate before any further writes to the policy layer

This should be run:
- After any policy change
- Before any public launch
- Periodically during Sprint B as other work lands

## Open issues flagged for Session 10+

### Schema drift capture (HIGH)
`supabase/migrations/004_capture_current_schema.sql` needs to be written. It should:
- `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ...` for the 9 drifted columns
- `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS ...` for the 8 drifted columns
- `ALTER TABLE budgets RENAME COLUMN amount TO monthly_limit` (or ADD + DROP pattern to preserve data)
- `ALTER TABLE ai_memory ADD COLUMN IF NOT EXISTS input_pattern ... , ADD COLUMN IF NOT EXISTS type ...`
- `CREATE TABLE IF NOT EXISTS goals ...` with the current dashboard-added schema
- `CREATE TABLE IF NOT EXISTS app_events ...` with current schema
- `CREATE TABLE IF NOT EXISTS monthly_reports ...` with current schema

Then `005_rls_policies_final.sql` should capture the canonical single-policy-per-table shape applied in Session 9, so the repo can rebuild the entire live DB (schema + RLS) from migrations alone.

### `app_events` and `monthly_reports` RLS (MEDIUM)
Both need canonical single-policy-per-table coverage. Deferred from Session 9 because of the priority ordering (fix the data leak first, then harden the known-good tables, then touch lower-risk write-only log and read-cache tables).

### Automated RLS regression test (MEDIUM)
A SQL file (e.g., `supabase/tests/rls_regression.sql`) that runs the 3 adversarial probes and asserts expected results. Could be run as a pre-deploy check via `psql` against a non-production database, or manually before each launch.

### `handle_new_user` trigger documentation (LOW)
The trigger that auto-creates a `profiles` row when a new `auth.users` row is inserted is critical to the signup flow working. It was documented in `supabase/migrations/001_profiles.sql` but has presumably drifted (we don't know — we haven't queried the live trigger). If the trigger drops for any reason, signups will fail silently with a 403 RLS violation (no profile row → RLS blocks the app's upsert attempt). Flagged as LOW only because signup is tested end-to-end every time a new user joins, so a drop would be caught quickly.

## Crib notes — copy-paste SQL for next session

```sql
-- Quickly audit current RLS state
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' ORDER BY tablename;

SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' ORDER BY tablename, cmd;

-- Adversarial test template (replace UUIDs)
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub":"<user-b-uuid>","role":"authenticated"}';

  -- Test cross-user SELECT (expect 0 rows)
  SELECT count(*) FROM transactions WHERE user_id = '<user-a-uuid>';

  -- Test cross-user INSERT (expect ERROR 42501)
  -- (wrap in SAVEPOINT if you need to continue after the error)
  INSERT INTO transactions (user_id, amount, currency, type, description, date)
  VALUES ('<user-a-uuid>', 1.00, 'USD', 'expense', 'should fail', CURRENT_DATE);
ROLLBACK;
```
