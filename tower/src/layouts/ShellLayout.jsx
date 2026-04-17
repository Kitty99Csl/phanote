import { Outlet } from 'react-router-dom'
import NavItem from '../components/NavItem'

const NAV_ITEMS = [
  { path: '/', emoji: '🏛', label: 'Lobby' },
  { path: '/health', emoji: '❤️', label: 'Health' },
  { path: '/ai-calls', emoji: '💬', label: 'AI Calls' },
  { path: '/daily-stats', emoji: '📊', label: 'Daily Stats' },
]

export default function ShellLayout() {
  return (
    <div className="min-h-screen bg-celadon-50 flex">
      <aside className="w-60 bg-white border-r border-celadon-200 flex flex-col">
        <div className="p-6 border-b border-celadon-200">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌿</span>
            <span className="text-lg font-bold text-ink-900 font-display">
              Tower
            </span>
          </div>
          <p className="text-xs text-ink-500 mt-1">
            Phajot operator surface
          </p>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1">
          {NAV_ITEMS.map(item => (
            <NavItem
              key={item.path}
              path={item.path}
              emoji={item.emoji}
              label={item.label}
            />
          ))}
        </nav>

        <div className="p-4 border-t border-celadon-200">
          <div className="text-xs text-ink-500">
            <div>Signed in as</div>
            <div className="font-mono text-ink-700 truncate">
              Speaker
            </div>
          </div>
          <div className="mt-2 text-[10px] text-ink-500 font-mono">
            build: v0.2.0
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
