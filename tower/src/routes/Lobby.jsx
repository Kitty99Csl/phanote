// Room A-00 — Lobby: director overview.
//
// Static placeholder metrics for now; real wiring happens post-Phase-4.
// Reference: docs/session-20/design-reference/check_tower/src/room_lobby.jsx.

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Module,
  Stat,
  StatusPill,
  Kicker,
  PageTitle,
  MeterBar,
  LiveDot,
  CornerBrackets,
} from '../components/shared';

const ROOMS = [
  { path: '/health',                   code: 'A-01', label: 'System Health',    status: 'ok',   value: 'Nominal',    metric: 'api.phajot.com/health', group: 'OPS' },
  { path: '/engine-room',              code: 'A-02', label: 'Engine Room',      status: 'ok',   value: '100.0%',     metric: '7d signal integrity',   group: 'OPS' },
  { path: '/ai-calls',                 code: 'B-01', label: 'AI Call Log',      status: 'info', value: 'live',       metric: 'ai_call_log · paged',    group: 'REPORTS' },
  { path: '/daily-stats',              code: 'B-02', label: 'Daily Stats',      status: 'info', value: '14-day roll',metric: 'refresh 02:00 UTC',     group: 'REPORTS' },
  { path: '/admin/language-strings',   code: 'C-01', label: 'Language Strings', status: 'warn', value: '425 keys',   metric: 'translations · LO/TH/EN', group: 'ADMIN' },
];

export default function Lobby() {
  useEffect(() => {
    document.title = 'Tower · Lobby';
  }, []);

  return (
    <div className="px-10 py-8 max-w-[1400px]">
      <PageTitle
        kicker={['DIRECTOR', 'ROOM A-00']}
        title="System online."
        desc="Phajot watches your money. Tower watches Phajot. Everything is nominal — one soft-flag in Language Strings needs attention this week."
      />

      {/* Primary status row */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        <Module code="01" title="SYSTEM" className="col-span-1">
          <Stat label="STATE" value="NOMINAL" tone="good" size="md" />
          <div className="mt-4 flex items-center gap-2">
            <LiveDot />
            <span className="hud-label">all 4 services responding</span>
          </div>
        </Module>
        <Module code="02" title="AI ACTIVITY · 24H" className="col-span-1">
          <Stat label="CALLS" value="—" unit="reqs" sub="see engine room" size="md" />
          <MeterBar value={0} max={30} tone="accent" right="capacity" />
        </Module>
        <Module code="03" title="PENDING" className="col-span-1">
          <Stat label="REPORTS" value="1" unit="item" sub="daily_rollup · 02:00 UTC" size="md" />
          <div className="mt-3">
            <StatusPill kind="idle" label="standby" size="sm" />
          </div>
        </Module>
        <Module code="04" title="TRANSLATIONS" className="col-span-1">
          <Stat label="COVERAGE" value="96" unit="%" tone="warn" sub="see language strings" size="md" />
          <MeterBar value={96} tone="warn" />
        </Module>
      </div>

      {/* Rooms grid */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <Kicker parts={['ROOMS', `${ROOMS.length + 1} ACTIVE`]} glyph="▣" />
          <span className="hud-label">click a room to enter</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {ROOMS.map(r => (
            <Link
              key={r.path}
              to={r.path}
              className="group relative block text-left bg-slate-900/60 border border-slate-800 hover:border-orange-500/50 rounded-sm p-4 transition-colors"
            >
              <CornerBrackets />
              <div className="flex items-center justify-between mb-3">
                <span className="hud-label text-slate-500">{r.group}</span>
                <span className="hud-label text-slate-600">{r.code}</span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-[17px] text-slate-100 font-medium tracking-tight">{r.label}</h3>
                <StatusPill kind={r.status} label={r.status === 'ok' ? 'ok' : r.status === 'warn' ? 'attn' : 'live'} size="sm" />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="hud-data text-[13px] text-slate-300">{r.value}</span>
                <span className="hud-label text-slate-500">{r.metric}</span>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800/70 flex items-center justify-between">
                <span className="hud-label text-slate-600">enter</span>
                <span className="text-orange-500/60 group-hover:text-orange-400 group-hover:translate-x-0.5 transition">→</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Field report */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Module code="A-00 · FIELD" title="FIELD REPORT · SESSION 20">
            <ul className="space-y-3">
              {[
                { tag: 'SPRINT',  text: 'Sprint 20 in progress · Tower UX redesign · Phases 1–4',         tone: 'accent' },
                { tag: 'ACCESS',  text: 'Cloudflare Access active · admin allowlist + is_admin flag',    tone: 'good' },
                { tag: 'ATTN',    text: 'Language Strings Phase 3 redesign pending · side panel + fonts', tone: 'warn' },
                { tag: 'NOTE',    text: 'Foundation shipped Phase 1 · primitives + Shell + Sidebar',     tone: 'info' },
              ].map((r, i) => (
                <li key={i} className="flex items-start gap-3 py-1">
                  <span className={`hud-label shrink-0 w-14 ${
                    r.tone === 'good' ? 'text-emerald-400' :
                    r.tone === 'warn' ? 'text-amber-400' :
                    r.tone === 'accent' ? 'text-orange-400' : 'text-sky-400'
                  }`}>{r.tag}</span>
                  <span className="text-[14px] text-slate-300 leading-relaxed">{r.text}</span>
                </li>
              ))}
            </ul>
          </Module>
        </div>

        <Module code="A-00 · TIMELINE" title="RECENT">
          <ul className="space-y-2.5">
            {[
              { t: 'now',  txt: 'lobby rendered · primitives live', tone: 'good' },
              { t: '—',    txt: 'wire live metrics post-Phase-4',   tone: 'info' },
            ].map((r, i) => (
              <li key={i} className="flex items-start gap-3 text-[12.5px]">
                <span className="hud-data text-slate-600 shrink-0 w-10">{r.t}</span>
                <span className="text-slate-300">{r.txt}</span>
              </li>
            ))}
          </ul>
        </Module>
      </div>
    </div>
  );
}
