// Static data constants. Pure arrays and helpers. Extracted from App.jsx in Session 7.
import { fmt } from "./theme";

export const txDedupKey=(tx)=>`${tx.date}|${tx.amount}|${(tx.description||"").toLowerCase().trim()}`;
export const AVATARS=["🦫","🐱","🦝","🦦","🦊","🔮","🐨","🦔","🐸","🐼"];
export const EMOJI_PICKS=["🍜","🍺","☕","🛵","🚗","✈️","🏠","💡","🛍️","👗","💊","🏋️","🎉","🎤","🎮","📚","💇","🎁","💼","💰","📈","💵","🏧","📦","🌟","🎯","🏌️","🎵","🏖️","🐾"];
export const GOAL_EMOJIS=["🎯","✈️","🏖️","🏠","🚗","💍","📱","💻","🎓","💊","🌏","🏋️","🎵","🎮","👶","🐾","🌟","💎","🏌️","🛵"];

export const TOASTS={
  expense:[(d,a,c)=>`${d} — ${fmt(a,c)} logged. Every kip tracked! 🐾`,(d,a,c)=>`${fmt(a,c)} out for ${d}. You're on it. ✨`,(d)=>`${d} done. Noted with care. 🌿`],
  income:[(d,a,c)=>`${fmt(a,c)} in! ${d} — let's track it well together. 💚`,(d,a,c)=>`${d} — +${fmt(a,c)} added. Money in! 🎉`],
};
