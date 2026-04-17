import { useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function Lobby() {
  useEffect(() => {
    document.title = 'Tower · Lobby'
  }, [])

  return (
    <div className="p-8 md:p-10 max-w-5xl">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-1 h-5 bg-ember-500"></div>
        <div className="text-[10px] tracking-[0.35em] text-ember-500 uppercase font-bold">Director</div>
      </div>
      <h1 className="text-2xl md:text-3xl font-bold text-slate-50 mb-2 uppercase tracking-tight">
        Welcome Back, Guardian
      </h1>
      <p className="text-[13px] text-slate-400 mb-8 tracking-wide italic">
        — Phajot watches your money. Tower watches Phajot. —
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <LobbyCard
          label="System Health"
          value="NOMINAL"
          hint="All dependencies green"
          to="/health"
        />
        <LobbyCard
          label="AI Activity"
          value={<span>0<span className="text-slate-500 text-sm ml-1.5 tracking-wider">calls/hr</span></span>}
          hint="Quiet period"
          to="/ai-calls"
        />
        <LobbyCard
          label="Reports"
          value="PENDING"
          hint="Matview refresh 02:00 UTC"
          to="/daily-stats"
        />
      </div>

      <div className="bg-slate-950 border border-slate-700 p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1.5 h-1.5 bg-success rounded-full"></div>
          <div className="text-[10px] tracking-[0.3em] text-slate-300 uppercase font-semibold">Field Report</div>
        </div>
        <div className="text-[12px] text-slate-100 leading-loose space-y-1">
          <div>▸ Sprint F in progress · Session 15</div>
          <div>▸ Admin gate: Cloudflare Access active (Session 16 adds is_admin flag)</div>
          <div className="text-slate-400">▸ Rooms 2 &amp; 3 populate Session 16</div>
        </div>
      </div>
    </div>
  )
}

function LobbyCard({ label, value, hint, to }) {
  return (
    <Link
      to={to}
      className="block bg-slate-800 border border-slate-700 p-4 relative hover:border-ember-500/50 transition-colors group"
    >
      <div className="absolute top-0 right-0 w-0 h-0 border-l-[12px] border-l-transparent border-t-[12px] border-t-ember-500/60 group-hover:border-t-ember-500 transition-colors"></div>

      <div className="text-[10px] tracking-[0.2em] text-slate-400 uppercase font-semibold mb-2">
        {label}
      </div>
      <div className="text-2xl font-semibold text-slate-50 tracking-tight">
        {value}
      </div>
      <div className="text-[10px] tracking-[0.1em] text-slate-500 uppercase mt-1.5">
        {hint}
      </div>
    </Link>
  )
}
