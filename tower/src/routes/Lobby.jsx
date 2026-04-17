import { useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function Lobby() {
  useEffect(() => {
    document.title = 'Tower · Lobby'
  }, [])

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-3xl font-bold text-ink-900 mb-2 font-display">
        Welcome, Speaker
      </h1>
      <p className="text-ink-700 mb-8">
        Phajot watches your money. Tower watches Phajot.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <LobbyCard
          emoji="❤️"
          title="System Health"
          hint="Check worker + Supabase + AI dependencies"
          to="/health"
        />
        <LobbyCard
          emoji="💬"
          title="Recent AI Calls"
          hint="See parse / OCR / advise activity"
          to="/ai-calls"
        />
        <LobbyCard
          emoji="📊"
          title="Daily Stats"
          hint="Cost, volume, error rates per day"
          to="/daily-stats"
        />
      </div>

      <div className="bg-white rounded-xl border border-celadon-200 p-6">
        <h2 className="text-sm font-semibold text-ink-700 mb-3 uppercase tracking-wide">
          Session status
        </h2>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-celadon-500"></span>
            <span className="text-ink-700">Sprint F in progress · Session 15</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-celadon-500"></span>
            <span className="text-ink-700">Admin gate: Cloudflare Access (Session 16 adds is_admin flag)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-celadon-300"></span>
            <span className="text-ink-700">Rooms 2 &amp; 3 populated in Session 16</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function LobbyCard({ emoji, title, hint, to }) {
  return (
    <Link
      to={to}
      className="block bg-white rounded-xl border border-celadon-200 p-5 hover:border-celadon-400 transition-colors"
    >
      <div className="text-3xl mb-2">{emoji}</div>
      <h3 className="font-semibold text-ink-900 mb-1">{title}</h3>
      <p className="text-sm text-ink-500">{hint}</p>
    </Link>
  )
}
