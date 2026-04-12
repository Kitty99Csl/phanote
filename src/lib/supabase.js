// Supabase client + phone auth helper. Extracted from App.jsx in Session 7.
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } }
);

export const signInWithPhone = async (phone, countryCode) => {
  const cleaned = phone.replace(/\D/g, "");
  const fullPhone = countryCode + cleaned;
  const email = `${countryCode.replace("+","")}${cleaned}@phanote.app`;
  const password = `Ph4n0te${cleaned}X`;
  const { data: si } = await supabase.auth.signInWithPassword({ email, password });
  if (si?.user) return { user: si.user, isNew: false, phone: fullPhone, countryCode };
  const { data: su, error } = await supabase.auth.signUp({ email, password });
  if (su?.user) return { user: su.user, isNew: true, phone: fullPhone, countryCode };
  throw new Error(error?.message || "Auth failed");
};
