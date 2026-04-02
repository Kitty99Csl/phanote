-- 003: Create transactions table
CREATE TABLE transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount decimal(15,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL CHECK (currency IN ('LAK', 'THB', 'USD')),
  type text NOT NULL CHECK (type IN ('expense', 'income')),
  category_id uuid REFERENCES categories(id),
  description text,
  date date NOT NULL DEFAULT CURRENT_DATE,
  receipt_url text,
  voice_url text,
  source text NOT NULL DEFAULT 'web' CHECK (source IN ('web', 'line', 'manual')),
  ai_confidence decimal(3,2),
  is_recurring boolean NOT NULL DEFAULT false,
  recurring_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX idx_transactions_user_currency ON transactions(user_id, currency);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own transactions" ON transactions FOR ALL USING (auth.uid() = user_id);

-- 004: Create budgets table
CREATE TABLE budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id),
  currency text NOT NULL CHECK (currency IN ('LAK', 'THB', 'USD')),
  amount decimal(15,2) NOT NULL CHECK (amount > 0),
  period text NOT NULL DEFAULT 'monthly' CHECK (period IN ('daily', 'monthly')),
  alert_at_percent int NOT NULL DEFAULT 80,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own budgets" ON budgets FOR ALL USING (auth.uid() = user_id);

-- 005: Create recurring_rules table (Pro feature)
CREATE TABLE recurring_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount decimal(15,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL CHECK (currency IN ('LAK', 'THB', 'USD')),
  type text NOT NULL CHECK (type IN ('expense', 'income')),
  category_id uuid REFERENCES categories(id),
  description text,
  frequency text NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  day_of_month int CHECK (day_of_month BETWEEN 1 AND 28),
  day_of_week int CHECK (day_of_week BETWEEN 0 AND 6),
  start_date date NOT NULL,
  end_date date,
  next_run_date date NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE recurring_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own recurring rules" ON recurring_rules FOR ALL USING (auth.uid() = user_id);

-- Add FK to transactions
ALTER TABLE transactions ADD CONSTRAINT fk_recurring
  FOREIGN KEY (recurring_id) REFERENCES recurring_rules(id) ON DELETE SET NULL;

-- 006: Create ai_memory table (Pro feature)
CREATE TABLE ai_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  input_pattern text NOT NULL,
  category_id uuid REFERENCES categories(id),
  currency text CHECK (currency IN ('LAK', 'THB', 'USD')),
  confidence decimal(3,2) NOT NULL DEFAULT 0.5,
  usage_count int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_memory_user ON ai_memory(user_id);

ALTER TABLE ai_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own ai memory" ON ai_memory FOR ALL USING (auth.uid() = user_id);
