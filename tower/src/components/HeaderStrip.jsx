import { useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'

const ROUTE_CRUMBS = {
  '/': ['TOWER', 'OPERATIONS', 'LOBBY'],
  '/health': ['TOWER', 'OPERATIONS', 'HEALTH'],
  '/ai-calls': ['TOWER', 'REPORTS', 'AI CALLS'],
  '/daily-stats': ['TOWER', 'REPORTS', 'DAILY STATS'],
}

export default function HeaderStrip() {
  const location = useLocation()
  const [utcTime, setUtcTime] = useState('')

  useEffect(() => {
    const update = () => {
      const now = new Date()
      const h = String(now.getUTCHours()).padStart(2, '0')
      const m = String(now.getUTCMinutes()).padStart(2, '0')
      setUtcTime(`${h}:${m}`)
    }
    update()
    const interval = setInterval(update, 30000)
    return () => clearInterval(interval)
  }, [])

  const crumbs = ROUTE_CRUMBS[location.pathname] || ['TOWER']

  return (
    <div className="h-9 border-b border-slate-700 bg-slate-950/60 backdrop-blur-sm flex items-center px-6 text-[10px] tracking-[0.15em] uppercase font-mono font-medium">
      {/* Left: breadcrumb */}
      <div className="flex items-center gap-2 text-slate-400">
        {crumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-2">
            {i > 0 && <span className="text-slate-600">//</span>}
            <span className={i === crumbs.length - 1 ? 'text-ember-500' : ''}>
              {crumb}
            </span>
          </span>
        ))}
      </div>

      {/* Center: global status */}
      <div className="flex-1 flex justify-center items-center gap-2">
        <div
          className="w-1.5 h-1.5 rounded-full status-pulse"
          style={{ backgroundColor: 'var(--color-status-nominal)' }}
        ></div>
        <span className="text-slate-300">System Nominal</span>
      </div>

      {/* Right: UTC + build */}
      <div className="flex items-center gap-4 text-slate-500">
        <span>UTC {utcTime}</span>
        <span className="text-slate-700">·</span>
        <span>BUILD 51E2192</span>
      </div>
    </div>
  )
}
