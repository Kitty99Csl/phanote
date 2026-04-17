import { useEffect } from 'react'
import TacticalPlaceholder from '../components/TacticalPlaceholder'

export default function AICalls() {
  useEffect(() => {
    document.title = 'Tower · AI Calls'
  }, [])

  return (
    <div className="p-8 md:p-10 max-w-4xl">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-1 h-5 bg-ember-500"></div>
        <div className="text-[10px] tracking-[0.35em] text-ember-500 uppercase font-bold">Activity</div>
      </div>
      <h1 className="text-2xl md:text-3xl font-bold text-slate-50 mb-2 uppercase tracking-tight">
        AI Activity
      </h1>
      <p className="text-[13px] text-slate-400 mb-8 tracking-wide">
        Live feed of AI parse, OCR, advise activity across all worker endpoints.
      </p>

      <TacticalPlaceholder
        code="A-02"
        title="Coming Session 16 · Item 5"
        description="Will render live view of ai_call_log rows — endpoint, provider, model, status, duration, tokens, cost. Filterable by endpoint and status. Shows last 100 calls by default."
        source="ai_call_log"
        state="awaiting room wiring"
      />
    </div>
  )
}
