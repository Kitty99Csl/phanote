import { useEffect } from 'react'

export default function DailyStats() {
  useEffect(() => {
    document.title = 'Tower · Daily Stats'
  }, [])

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-3xl font-bold text-ink-900 mb-2 font-display">
        Daily Stats
      </h1>
      <p className="text-ink-700 mb-8">
        Aggregate view of AI activity by day — cost, volume, error
        rates, performance percentiles.
      </p>

      <PlaceholderCard
        emoji="📊"
        title="Coming Session 16 Item 6"
        body="Will render ai_daily_stats matview rows as summary cards: total calls per day, cost, error rate, p95 duration per endpoint/provider. Line chart showing trend over last 30 days."
      />
    </div>
  )
}

function PlaceholderCard({ emoji, title, body }) {
  return (
    <div className="bg-white rounded-xl border border-celadon-200 p-8 text-center">
      <div className="text-5xl mb-4">{emoji}</div>
      <h2 className="text-lg font-semibold text-ink-900 mb-2">{title}</h2>
      <p className="text-sm text-ink-500 max-w-md mx-auto leading-relaxed">
        {body}
      </p>
    </div>
  )
}
