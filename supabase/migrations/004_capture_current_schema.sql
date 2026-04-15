-- ============================================================================
-- 004: Capture current schema (Session 10, 2026-04-15)
-- ============================================================================
--
-- Purpose: make the repo an authoritative source of production schema state.
--
-- Migrations 001-003 reflect the Phase 1 original schema (early April 2026).
-- Since then, columns and tables have been added via the Supabase dashboard
-- without corresponding migration files. This file captures the drift.
--
-- Idempotent / replay-safe: uses CREATE TABLE IF NOT EXISTS,
-- ALTER TABLE ADD COLUMN IF NOT EXISTS, CREATE UNIQUE INDEX IF NOT EXISTS,
-- and DROP POLICY IF EXISTS + CREATE POLICY for RLS.
--
-- Running this against live production should be a no-op for every column
-- and policy that already exists. Running it against a fresh Supabase
-- instance (after applying 001-003) should produce a schema that matches
-- live production for the 7 user-data tables Phajot actively uses.
--
-- NOT run against production in its authoring commit. This file exists for
-- disaster recovery + fresh-instance rebuilds. A future session can apply
-- it if needed after reviewing the diff against live state.
--
-- Related docs:
--   - docs/session-9/RLS-HARDENING.md (live SQL fixes this captures as code)
--   - docs/session-10/SUMMARY.md (the session that authored this file)
--   - docs/RISKS.md ("Schema drift" HIGH risk — this file closes it)
-- ============================================================================


-- ============================================================================
-- PROFILES — drift from 001_profiles.sql (9 new columns)
-- ============================================================================
-- All added via Supabase dashboard across Sessions 3-6. Onboarding_complete
-- already exists in 001 (line 16), no drift there.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_country_code text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar text DEFAULT '🦫';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS custom_categories jsonb DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS exp_cats jsonb DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS inc_cats jsonb DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pin_config jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS app_version text;


-- ============================================================================
-- TRANSACTIONS — drift from 003_remaining_tables.sql (8 new columns)
-- ============================================================================
-- category_name + category_emoji supersede the category_id FK from 003.
-- is_deleted + deleted_at support soft-delete for statement-scan undo.
-- batch_id groups statement-scan imports for atomic undo.
-- edited_at tracks the most recent user edit for AI background corrections.
-- raw_input preserves the original parser input string.
-- note is a user-supplied annotation shown in QuickEditToast.

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS category_name text;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS category_emoji text;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS raw_input text;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS note text;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS batch_id uuid;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS edited_at timestamptz;


-- ============================================================================
-- BUDGETS — column rename drift + unique constraint
-- ============================================================================
-- Live production uses budgets.monthly_limit instead of budgets.amount +
-- budgets.period from 003. We ADD monthly_limit here; we do NOT drop
-- amount/period from 003 — they remain vestigial per Session 10 policy
-- (capture, don't drop).
--
-- Live also has a unique constraint on (user_id, category_id, currency)
-- to support the budgets[key] map in BudgetScreen.jsx where
-- key = `${cat.id}_${currency}`. The upsert in saveBudget relies on
-- this constraint via onConflict.

ALTER TABLE budgets ADD COLUMN IF NOT EXISTS monthly_limit decimal(15,2);
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS budgets_user_cat_currency_uk
  ON budgets(user_id, category_id, currency);


-- ============================================================================
-- AI_MEMORY — drift from 003 (2 new columns + unique constraint)
-- ============================================================================
-- category_name (text) replaces category_id (uuid FK) from 003.
-- type (text, expense|income) added in Session 6.
-- UNIQUE(user_id, input_pattern) supports the dedup-or-increment pattern
-- in dbSaveMemory (src/lib/db.js:10-23) where an existing row's usage_count
-- is incremented rather than inserting a duplicate.

ALTER TABLE ai_memory ADD COLUMN IF NOT EXISTS category_name text;
ALTER TABLE ai_memory ADD COLUMN IF NOT EXISTS type text CHECK (type IN ('expense', 'income'));

CREATE UNIQUE INDEX IF NOT EXISTS ai_memory_user_pattern_uk
  ON ai_memory(user_id, input_pattern);


-- ============================================================================
-- GOALS — missing from migrations entirely (added in Session 5)
-- ============================================================================
-- Used by GoalsScreen, SafeToSpend, AiAdvisorModal. deadline is stored as
-- YYYY-MM text (not date) because the UI uses HTML <input type="month"/>.

CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  emoji text NOT NULL DEFAULT '🎯',
  target_amount decimal(15,2) NOT NULL CHECK (target_amount > 0),
  saved_amount decimal(15,2) NOT NULL DEFAULT 0 CHECK (saved_amount >= 0),
  currency text NOT NULL CHECK (currency IN ('LAK', 'THB', 'USD')),
  deadline text,
  is_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);


-- ============================================================================
-- APP_EVENTS — missing from migrations entirely (telemetry log)
-- ============================================================================
-- Append-only event log written by dbTrackEvent in src/lib/db.js.
-- Column is `event_data` (not `payload`) — verified against src/lib/db.js:41.
-- Users never read their own events in-app; minimal data leak surface,
-- but RLS still enforced for defense in depth.

CREATE TABLE IF NOT EXISTS app_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb,
  app_version text,
  platform text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_events_user_created ON app_events(user_id, created_at DESC);


-- ============================================================================
-- MONTHLY_REPORTS — missing from migrations entirely (Session 5 Day 1)
-- ============================================================================
-- Narrative cache for MonthlyWrapModal. The worker /monthly-report endpoint
-- is a pure AI proxy and does NOT touch this table — the frontend is
-- responsible for upserting into this cache after a successful generation.
-- Stores narratives in all 3 supported languages (lo/th/en) even though
-- a single generation targets one language; future re-reads in a different
-- language trigger a fresh generation and upsert the additional column.

CREATE TABLE IF NOT EXISTS monthly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  month text NOT NULL,
  narrative_lo text,
  narrative_th text,
  narrative_en text,
  stats jsonb,
  generation_model text,
  generated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS monthly_reports_user_month_uk
  ON monthly_reports(user_id, month);


-- ============================================================================
-- RLS — canonical single-policy shape (Session 9 hardening)
-- ============================================================================
-- Each user-data table gets ONE canonical policy named <table>_user_access
-- with FOR ALL (USING + WITH CHECK). This replaces the 6 overlapping
-- policies on profiles, 7 on transactions, and the USING(true) data leak
-- on ai_memory that Session 9 found. Adversarially verified with User B
-- (5e3629a1-aa60-4c25-a013-11bf40b8e6b9) in Session 9 (5 tables) and
-- Session 10 (app_events + monthly_reports). See
-- docs/session-9/RLS-HARDENING.md + its Session 10 addendum.
--
-- DROP POLICY IF EXISTS enumerates every legacy policy name we've seen
-- across migrations 001-003 plus the canonical name itself so the file
-- is fully replay-safe.

-- profiles (uses auth.uid() = id, not user_id)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_user_access" ON profiles;
CREATE POLICY "profiles_user_access" ON profiles FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON transactions;
DROP POLICY IF EXISTS "transactions_user_access" ON transactions;
CREATE POLICY "transactions_user_access" ON transactions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- budgets
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users own budgets" ON budgets;
DROP POLICY IF EXISTS "budgets_user_access" ON budgets;
CREATE POLICY "budgets_user_access" ON budgets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ai_memory
ALTER TABLE ai_memory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users own ai memory" ON ai_memory;
DROP POLICY IF EXISTS "Allow all ai_memory reads" ON ai_memory;
DROP POLICY IF EXISTS "ai_memory_user_access" ON ai_memory;
CREATE POLICY "ai_memory_user_access" ON ai_memory FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- goals
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users own goals" ON goals;
DROP POLICY IF EXISTS "goals_user_access" ON goals;
CREATE POLICY "goals_user_access" ON goals FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- app_events
ALTER TABLE app_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users own app events" ON app_events;
DROP POLICY IF EXISTS "app_events_user_access" ON app_events;
CREATE POLICY "app_events_user_access" ON app_events FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- monthly_reports
ALTER TABLE monthly_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users own monthly reports" ON monthly_reports;
DROP POLICY IF EXISTS "monthly_reports_user_access" ON monthly_reports;
CREATE POLICY "monthly_reports_user_access" ON monthly_reports FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================================
-- VESTIGIAL — declared in 001-003 but NOT touched by live code
-- ============================================================================
-- Left in place per Session 10 policy: capture, don't drop. A future
-- migration can drop these when the recurring-transactions feature is
-- either implemented or formally cancelled. Listing them here so a
-- future reader knows what's dead and why.
--
--   categories table (002_categories.sql)
--     Replaced by hardcoded DEFAULT_EXPENSE_CATS / DEFAULT_INCOME_CATS in
--     src/lib/categories.js (Session 6 refactor) plus per-user JSONB on
--     profiles.custom_categories / exp_cats / inc_cats. Zero code refs.
--
--   recurring_rules table (003_remaining_tables.sql)
--     Planned Phase 5 feature (recurring transactions), never built.
--     Zero code references. Migration still exists.
--
--   transactions.category_id (uuid FK to categories) (003)
--     Superseded by category_name + category_emoji text columns.
--     May still physically exist in prod as a deprecated nullable column.
--
--   transactions.recurring_id + fk_recurring constraint (003)
--     FK to recurring_rules. Never written by live code.
--
--   transactions.is_recurring boolean (003)
--     Never written by live code.
--
--   budgets.amount decimal + budgets.period text (003)
--     Superseded by budgets.monthly_limit (this file). Live production may
--     have dropped these via dashboard operation; the repo leaves them for
--     fresh-rebuild parity with 003.
--
--   ai_memory.category_id (uuid FK to categories) (003)
--     Superseded by ai_memory.category_name text (this file).
--
--   ai_memory.currency text (003)
--     Never written by live code.
-- ============================================================================
