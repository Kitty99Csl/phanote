import { useEffect } from 'react'

export default function AICalls() {
  useEffect(() => {
    document.title = 'Tower · AI Calls'
  }, [])

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-3xl font-bold text-ink-900 mb-2 font-display">
        Recent AI Calls
      </h1>
      <p className="text-ink-700 mb-8">
        Live view of AI activity across all worker endpoints.
      </p>

      <PlaceholderCard
        emoji="💬"
        title="Coming Session 16 Item 5"
        body="Will render a live view of ai_call_log rows — endpoint, provider, model, status, duration, tokens, cost, with filters by endpoint and status. Shows last 100 calls by default."
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
