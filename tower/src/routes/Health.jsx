import { useEffect } from 'react'
import TacticalPlaceholder from '../components/TacticalPlaceholder'

export default function Health() {
  useEffect(() => {
    document.title = 'Tower · Health'
  }, [])

  return (
    <div className="p-8 md:p-10 max-w-4xl">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-1 h-5 bg-ember-500"></div>
        <div className="text-[10px] tracking-[0.35em] text-ember-500 uppercase font-bold">Systems</div>
      </div>
      <h1 className="text-2xl md:text-3xl font-bold text-slate-50 mb-2 uppercase tracking-tight">
        System Health
      </h1>
      <p className="text-[13px] text-slate-400 mb-8 tracking-wide">
        Live status of worker dependencies, AI providers, and request volume.
      </p>

      <TacticalPlaceholder
        code="H-01"
        title="Coming Session 16 · Item 4"
        description="Will render worker /health JSON live: status, Supabase connectivity, Gemini/Anthropic recent activity, AI call volume (last hour)."
        source="api.phajot.com/health"
        state="awaiting room wiring"
      />
    </div>
  )
}
