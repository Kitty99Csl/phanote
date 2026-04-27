// Supabase client init. Extracted from App.jsx in Session 7.
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } }
);

export async function getAuthHeaders(profile) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    throw new Error("Not authenticated — please sign in again.");
  }
  return {
    "Authorization": `Bearer ${token}`,
    "X-Plan-Tier": profile?.isPro ? "pro" : "free",
  };
}
