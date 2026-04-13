// Streak and XP leveling system. Extracted from App.jsx in Session 7.
import { supabase } from "./supabase";

const XP_PER_TX = 10;
const STREAK_BONUS = { 7:30, 14:60, 30:150, 100:500 };
const LEVELS = [
  {min:0,    label:"Seedling", emoji:"🌱"},
  {min:100,  label:"Sprout",   emoji:"🌿"},
  {min:300,  label:"Grower",   emoji:"🌳"},
  {min:600,  label:"Guardian", emoji:"💚"},
  {min:1000, label:"Star",     emoji:"⭐"},
  {min:1500, label:"Legend",   emoji:"🌟"},
  {min:2100, label:"Master",   emoji:"👑"},
  {min:2800, label:"Elite",    emoji:"🔥"},
  {min:3600, label:"Diamond",  emoji:"💎"},
  {min:4500, label:"Champion", emoji:"🏆"},
];

export const getLevel = (xp=0) => {
  for (let i = LEVELS.length-1; i >= 0; i--) {
    if (xp >= LEVELS[i].min) return {...LEVELS[i], index: i+1};
  }
  return {...LEVELS[0], index:1};
};
export const getNextLevel = (xp=0) => {
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp < LEVELS[i].min) return LEVELS[i];
  }
  return null;
};
export const getLevelProgress = (xp=0) => {
  const cur = getLevel(xp);
  const next = getNextLevel(xp);
  if (!next) return 100;
  return Math.round(((xp - cur.min) / (next.min - cur.min)) * 100);
};

export const updateStreak = async (userId, currentProfile, setProfile) => {
  try {
    const todayStr = new Date().toISOString().split("T")[0];
    const lastStr  = currentProfile.streakLastDate || "";
    const yestStr  = new Date(Date.now()-86400000).toISOString().split("T")[0];
    let streakCount = currentProfile.streakCount || 0;
    let xp          = currentProfile.xp || 0;
    let bonusToast  = null;

    if (lastStr === todayStr) {
      xp += XP_PER_TX; // already logged today, just XP
    } else if (lastStr === yestStr) {
      streakCount += 1;
      xp += XP_PER_TX;
      const bonus = STREAK_BONUS[streakCount];
      if (bonus) { xp += bonus; bonusToast = `🔥 ${streakCount}-day streak! +${bonus} bonus XP 🎉`; }
    } else {
      streakCount = 1; // reset
      xp += XP_PER_TX;
    }

    const updated = {...currentProfile, streakCount, streakLastDate: todayStr, xp};
    setProfile(updated);
    await supabase.from("profiles").update({
      streak_count: streakCount, streak_last_date: todayStr, xp,
    }).eq("id", userId);
    return bonusToast;
  } catch(e) { console.error("Streak error:", e); return null; }
};
