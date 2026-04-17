import { useEffect } from 'react'

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

      <PlaceholderPanel
        kicker="Incoming"
        title="Coming Session 16 · Item 4"
        body="Will render worker /health JSON live: status, Supabase connectivity, Gemini/Anthropic recent activity, AI call volume (last hour)."
      />
    </div>
  )
}

function PlaceholderPanel({ kicker, title, body }) {
  return (
    <div className="bg-slate-800 border border-slate-700 p-8 relative">
      <div className="absolute top-0 right-0 w-0 h-0 border-l-[16px] border-l-transparent border-t-[16px] border-t-ember-500/60"></div>
      <div className="text-center">
        <div className="text-[10px] tracking-[0.3em] text-ember-500 uppercase font-bold mb-3">
          {kicker}
        </div>
        <h2 className="text-lg font-semibold text-slate-50 mb-3 uppercase tracking-wide">
          {title}
        </h2>
        <p className="text-[13px] text-slate-400 max-w-md mx-auto leading-relaxed">
          {body}
        </p>
      </div>
    </div>
  )
}
