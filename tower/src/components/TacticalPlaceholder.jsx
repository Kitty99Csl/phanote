import StatusChip from './StatusChip'

export default function TacticalPlaceholder({ code, title, description, source, state, lastUpdate = 'Session 15' }) {
  return (
    <div className="bg-slate-800 border border-slate-700 p-6 relative">
      {/* Corner cut */}
      <div className="absolute top-0 right-0 w-0 h-0 border-l-[16px] border-l-transparent border-t-[16px] border-t-ember-500/60"></div>

      {/* Top row */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="text-[10px] tracking-[0.3em] text-ember-500 uppercase font-bold">
            Incoming
          </div>
          <div className="text-[9px] tracking-[0.15em] text-slate-600 font-mono uppercase">
            Module {code}
          </div>
        </div>
        <StatusChip status="standby">Standby</StatusChip>
      </div>

      {/* Center */}
      <div className="py-6 text-center">
        <h2 className="text-lg font-semibold text-slate-50 mb-3 uppercase tracking-wide">
          {title}
        </h2>
        <p className="text-[13px] text-slate-400 max-w-md mx-auto leading-relaxed">
          {description}
        </p>
      </div>

      {/* Bottom metadata row */}
      <div className="mt-4 pt-3 border-t border-slate-700/50 flex items-center justify-between text-[9px] tracking-[0.15em] uppercase font-mono text-slate-600">
        <span>Source · <span className="text-slate-500">{source}</span></span>
        <span>State · <span className="text-slate-500">{state}</span></span>
        <span>Last structure update · <span className="text-slate-500">{lastUpdate}</span></span>
      </div>
    </div>
  )
}
