import { supabase } from './supabase';

const CACHE_KEY = 'translations_v1';
const TTL_MS = 7 * 24 * 3600 * 1000; // 7 days

let dbMap = null; // module-level { code: { en, lo, th } }

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (!ts || !data) return null;
    if (Date.now() - ts > TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
}

function writeCache(map) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: map }));
  } catch {
    // localStorage can throw in private mode / quota — non-fatal
  }
}

async function fetchFromDB() {
  const { data, error } = await supabase
    .from('translations')
    .select('code, en, lo, th');
  if (error) {
    console.warn('[translations] fetch failed:', error.message);
    return null;
  }
  if (!data || data.length === 0) {
    console.warn('[translations] empty result set');
    return null;
  }
  const map = {};
  for (const row of data) {
    map[row.code] = { en: row.en, lo: row.lo, th: row.th };
  }
  return map;
}

// Call once after auth settles (profile loaded). Non-blocking.
// 1. Warm dbMap from cache immediately (instant)
// 2. Fetch fresh from DB in background, update cache on success
export async function initTranslations() {
  const cached = readCache();
  if (cached) {
    dbMap = cached;
  }

  const fresh = await fetchFromDB();
  if (fresh) {
    dbMap = fresh;
    writeCache(fresh);
  }
  // Silent fallback: if fetch fails, dbMap stays as cache or null.
  // t() falls through to code-level i18n.js.
}

// Synchronous lookup used by t(). Returns null if not yet loaded.
export function getDBMap() {
  return dbMap;
}
