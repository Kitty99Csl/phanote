-- Migration 012: translations table
-- Purpose: DB-backed i18n — admin can edit strings in Tower without code redeploys
-- Session: 19, Phase 1 of Language Strings Admin Panel (Sprint H item H-2)
-- Decisions:
--   D19-Q1: DB wins — translations table is authoritative over i18n.js at runtime
--   D19-Q2: Additive seed — ON CONFLICT DO NOTHING preserves admin edits
--             Seeding deferred to runtime per Session 19 decision E:
--             Tower admin "Sync from code" button populates from src/lib/i18n.js (Phase 3)
-- Note: Table is empty on first run. No seed in this migration.
-- Safety: idempotent — IF NOT EXISTS / DROP IF EXISTS + CREATE throughout

-- ── Table ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.translations (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text        UNIQUE NOT NULL,
  en          text        NOT NULL,
  lo          text,
  th          text,
  used_in     text,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid        REFERENCES public.profiles(id)
);
-- lo/th are nullable: 28 i18n.js keys lack Thai; future keys may land
-- English-only before translation. App t() fallback chain handles nulls.

-- ── updated_at trigger ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_translations_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_translations_updated_at ON public.translations;
CREATE TRIGGER trg_translations_updated_at
  BEFORE UPDATE ON public.translations
  FOR EACH ROW EXECUTE FUNCTION public.set_translations_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS translations_read ON public.translations;
CREATE POLICY translations_read ON public.translations
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS translations_admin_write ON public.translations;
CREATE POLICY translations_admin_write ON public.translations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
  );

-- ── Index ─────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_translations_code ON public.translations (code);

/* POSTFLIGHT VERIFICATION
   Run after applying in Supabase SQL Editor:

   -- 1. Row count (expect 0 on first apply)
   SELECT count(*) FROM public.translations;

   -- 2. RLS policies (expect: translations_read, translations_admin_write)
   SELECT policyname FROM pg_policies WHERE tablename = 'translations';

   -- 3. Trigger (expect: trg_translations_updated_at)
   SELECT trigger_name FROM information_schema.triggers
   WHERE event_object_table = 'translations';
*/
