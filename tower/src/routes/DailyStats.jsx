import { useEffect } from 'react'
import TacticalPlaceholder from '../components/TacticalPlaceholder'

export default function DailyStats() {
  useEffect(() => {
    document.title = 'Tower · Daily Stats'
  }, [])

  return (
    <div className="p-8 md:p-10 max-w-4xl">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-1 h-5 bg-ember-500"></div>
        <div className="text-[10px] tracking-[0.35em] text-ember-500 uppercase font-bold">Reports</div>
      </div>
      <h1 className="text-2xl md:text-3xl font-bold text-slate-50 mb-2 uppercase tracking-tight">
        Daily Stats
      </h1>
      <p className="text-[13px] text-slate-400 mb-8 tracking-wide">
        Daily aggregates of AI cost, call volume, error rates, and p95 durations.
      </p>

      <TacticalPlaceholder
        code="D-03"
        title="Coming Session 16 · Item 6"
        description="Will render ai_daily_stats matview rows as summary cards: total calls per day, cost, error rate, p95 duration per endpoint/provider. Trend chart over last 30 days."
        source="ai_daily_stats (matview)"
        state="awaiting room wiring"
      />
    </div>
  )
}
