import { Outlet } from 'react-router-dom'
import NavItem from '../components/NavItem'
import HeaderStrip from '../components/HeaderStrip'

const NAV_GROUPS = [
  {
    label: 'Operations',
    items: [
      { path: '/', label: 'Lobby', subtitle: 'Director' },
      { path: '/health', label: 'Health', subtitle: 'Systems' },
      { path: '/engine-room', label: 'Engine Room', subtitle: 'Traffic' },
    ],
  },
  {
    label: 'Reports',
    items: [
      { path: '/ai-calls', label: 'AI Calls', subtitle: 'Activity' },
      { path: '/daily-stats', label: 'Daily Stats', subtitle: 'Reports' },
    ],
  },
  {
    label: 'Admin',
    items: [
      { path: '/admin/language-strings', label: 'Language Strings', subtitle: 'Translations' },
    ],
  },
]

export default function ShellLayout() {
  return (
    <div className="min-h-screen bg-slate-900 flex">
      <aside className="w-60 bg-slate-950 border-r border-slate-700 flex flex-col">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <svg width="22" height="22" viewBox="0 0 24 24" className="flex-shrink-0">
              <polygon points="12,2 22,7 22,17 12,22 2,17 2,7" fill="none" stroke="#f5a623" strokeWidth="1.5" />
              <polygon points="12,7 17,9.5 17,14.5 12,17 7,14.5 7,9.5" fill="#f5a623" opacity="0.4" />
            </svg>
            <div>
              <div className="text-[11px] tracking-[0.25em] text-ember-500 font-semibold uppercase">Tower</div>
              <div className="text-[9px] tracking-[0.15em] text-slate-500 uppercase mt-0.5">Phajot // Operator</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-4">
          {NAV_GROUPS.map((group, idx) => (
            <div key={group.label} className={idx > 0 ? 'mt-6' : ''}>
              <div className="px-6 mb-2 text-[9px] tracking-[0.3em] text-slate-600 uppercase font-bold">
                {group.label}
              </div>
              <div className="px-3 space-y-0.5">
                {group.items.map(item => (
                  <NavItem
                    key={item.path}
                    path={item.path}
                    label={item.label}
                    subtitle={item.subtitle}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <div className="text-[9px] tracking-[0.2em] text-slate-500 uppercase font-semibold">Guardian</div>
          <div className="text-[11px] text-slate-100 mt-1 font-medium">Speaker</div>
          <div className="text-[9px] text-slate-600 mt-2 font-mono tracking-wider">v0.2.0 // BUILD 51E</div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto flex flex-col">
        <HeaderStrip />
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
