// Inline streak pill shown in the home header. Tappable to open StreakModal. Extracted from App.jsx in Session 7.

import { T } from "../lib/theme";
import { t } from "../lib/i18n";
import { getLevel, getLevelProgress } from "../lib/streak";

export function StreakBadge({ profile, onPress }) {
  const { streakCount = 0, xp = 0, lang = "lo" } = profile;
  const level = getLevel(xp);
  const pct   = getLevelProgress(xp);
  return (
    <button onClick={onPress} style={{
      display:"flex", alignItems:"center", gap:5, padding:"4px 10px 4px 8px",
      borderRadius:20, border:"1px solid rgba(45,45,58,0.08)", cursor:"pointer",
      background:"rgba(172,225,175,0.12)",
    }}>
      <span style={{fontSize:13}}>{streakCount >= 7 ? "🔥" : "📅"}</span>
      <span style={{fontSize:12, fontWeight:700, color:T.dark, fontFamily:"'Noto Sans',sans-serif"}}>
        {streakCount}{t(lang,"streakDayAbbrev")}
      </span>
      <span style={{fontSize:10, color:T.muted}}>·</span>
      <span style={{fontSize:11}}>{level.emoji}</span>
      <span style={{fontSize:10, fontWeight:600, color:T.muted}}>{t(lang,"level")}{level.index}</span>
    </button>
  );
}
