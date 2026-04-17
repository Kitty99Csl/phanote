import { useEffect } from 'react'

export default function Health() {
  useEffect(() => {
    document.title = 'Tower · Health'
  }, [])

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-3xl font-bold text-ink-900 mb-2 font-display">
        System Health
      </h1>
      <p className="text-ink-700 mb-8">
        Live status of worker dependencies, AI providers, and
        request volume.
      </p>

      <PlaceholderCard
        emoji="❤️"
        title="Coming Session 16 Item 4"
        body="Will render worker /health JSON live: status, Supabase connectivity, Gemini/Anthropic recent activity, AI call volume (last hour), feature flags."
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
