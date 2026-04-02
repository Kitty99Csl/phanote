-- 002: Create categories table
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  name_lo text NOT NULL,
  name_th text NOT NULL,
  name_en text NOT NULL,
  emoji text NOT NULL,
  type text NOT NULL CHECK (type IN ('expense', 'income')),
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own + default categories"
  ON categories FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can insert own categories"
  ON categories FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own categories"
  ON categories FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own non-default categories"
  ON categories FOR DELETE
  USING (user_id = auth.uid() AND is_default = false);
