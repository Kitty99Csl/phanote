// Supabase database helpers. Thin wrappers around client calls. Extracted from App.jsx in Session 7.
import { supabase } from "./supabase";

export const dbSaveMemory = async (userId, pattern, categoryName, type, confidence) => {
  const key = pattern.toLowerCase()
    .replace(/[\d,]+(?:\.\d+)?(k|m)?/gi, "")
    .replace(/lak|thb|usd|baht|บาท|กีบ|kip/gi, "")
    .replace(/\s+/g, " ").trim().slice(0, 50);
  if (!key || key.length < 2) return;
  const { data: existing } = await supabase.from("ai_memory")
    .select("id, usage_count")
    .eq("user_id", userId)
    .eq("input_pattern", key)
    .maybeSingle();
  if (existing) {
    await supabase.from("ai_memory")
      .update({ usage_count: existing.usage_count + 1, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    await supabase.from("ai_memory").insert({
      user_id: userId, input_pattern: key, category_name: categoryName,
      type, confidence, usage_count: 1,
    });
  }
};

export const dbUpsertProfile = async (userId, p) => {
  await supabase.from("profiles").upsert({
    id: userId, display_name: p.name, language: p.lang || "lo",
    base_currency: p.baseCurrency || "LAK", onboarding_complete: true,
    phone: p.phone || null, phone_country_code: p.countryCode || null,
    avatar: p.avatar || "🦫", custom_categories: p.customCategories || [],
    exp_cats: p.expCats || [], inc_cats: p.incCats || [],
    last_seen_at: new Date().toISOString(), app_version: "1.0.0",
  }, { onConflict: "id" });
};

export const dbTrackEvent = async (userId, eventType, eventData = {}) => {
  try {
    await supabase.from("app_events").insert({
      user_id: userId, event_type: eventType, event_data: eventData,
      app_version: "1.0.0", platform: "web",
    });
  } catch {}
};

export const dbInsertTransaction = async (userId, tx) => {
  const { data, error } = await supabase.from("transactions").insert({
    user_id: userId, amount: tx.amount, currency: tx.currency, type: tx.type,
    description: tx.description, date: tx.date, source: "web",
    ai_confidence: tx.confidence || null, note: tx.note || null,
    category_name: tx.categoryName || null, category_emoji: tx.categoryEmoji || null,
    raw_input: tx.rawInput || null, is_deleted: false,
    ...(tx.batchId ? { batch_id: tx.batchId } : {}),
  }).select().single();
  if (error) throw error;
  return data;
};

export const dbUpdateTransaction = async (txId, updates) => {
  await supabase.from("transactions").update(updates).eq("id", txId);
};
