// Tower's Supabase client.
//
// MIRROR of src/lib/supabase.js per Rule 16 (Tower doesn't import from main app).
// Kept in sync manually. If main app's config changes, update this file too.
//
// Session 16 Phase 2 — Tower admin gate foundation.
//
// Auth model:
// - Default localStorage storage (origin-specific to tower.phajot.com)
// - Tower has its own login (standalone, not shared with app.phajot.com)
// - CF Access Zero Trust gates at edge; this gates at app layer.
// - is_admin RLS check at database layer (third gate).

import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Tower: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in tower/.env.local. " +
      "Copy values from the main app's .env.local (same Supabase project)."
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
