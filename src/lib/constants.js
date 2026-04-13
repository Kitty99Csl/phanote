// Static data constants. Pure arrays and helpers. Extracted from App.jsx in Session 7.

export const txDedupKey=(tx)=>`${tx.date}|${tx.amount}|${(tx.description||"").toLowerCase().trim()}`;
export const AVATARS=["🦫","🐱","🦝","🦦","🦊","🔮","🐨","🦔","🐸","🐼"];
export const EMOJI_PICKS=["🍜","🍺","☕","🛵","🚗","✈️","🏠","💡","🛍️","👗","💊","🏋️","🎉","🎤","🎮","📚","💇","🎁","💼","💰","📈","💵","🏧","📦","🌟","🎯","🏌️","🎵","🏖️","🐾"];
export const GOAL_EMOJIS=["🎯","✈️","🏖️","🏠","🚗","💍","📱","💻","🎓","💊","🌏","🏋️","🎵","🎮","👶","🐾","🌟","💎","🏌️","🛵"];
