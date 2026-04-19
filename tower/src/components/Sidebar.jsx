// Sidebar — fixed left nav, grouped by section.

import React from 'react';
import { NavLink } from 'react-router-dom';
import { LiveDot } from './shared';

const NAV = [
  {
    group: 'OPERATIONS',
    items: [
      { path: '/',            label: 'Lobby',       sub: 'Director',  code: 'A-00' },
      { path: '/health',      label: 'Health',      sub: 'Systems',   code: 'A-01' },
      { path: '/engine-room', label: 'Engine Room', sub: 'Traffic',   code: 'A-02' },
    ],
  },
  {
    group: 'REPORTS',
    items: [
      { path: '/ai-calls',    label: 'AI Calls',    sub: 'Activity',  code: 'B-01' },
      { path: '/daily-stats', label: 'Daily Stats', sub: 'Rollups',   code: 'B-02' },
    ],
  },
  {
    group: 'ADMIN',
    items: [
      { path: '/admin/language-strings', label: 'Language Strings', sub: 'Translations', code: 'C-01' },
    ],
  },
];

function Sidebar() {
  return (
    <aside className="w-[232px] shrink-0 border-r border-slate-800/80 bg-slate-950/50 flex flex-col sticky top-0 h-screen">
      {/* Logo block */}
      <div className="px-5 pt-5 pb-5 border-b border-slate-800/70">
        <div className="flex items-center gap-2.5">
          <div className="relative w-7 h-7 flex items-center justify-center">
            <div className="absolute inset-0 border border-orange-500/70 rotate-45" />
            <div className="absolute inset-[3px] border border-orange-500/40 rotate-45" />
            <div className="relative w-1.5 h-1.5 bg-orange-500 rounded-full" />
          </div>
          <div>
            <div className="text-[15px] font-semibold tracking-[0.08em] text-slate-100">TOWER</div>
            <div className="hud-label text-[9.5px] text-slate-500 tracking-[0.2em]">phajot · operator</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        {NAV.map(section => (
          <div key={section.group} className="mb-4">
            <div className="px-5 pb-2 hud-label text-[10px] text-slate-600">{section.group}</div>
            <ul>
              {section.items.map(item => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.path === '/'}
                    className={({ isActive }) =>
                      `group w-full text-left flex items-center gap-3 px-5 py-2 border-l-2 transition-colors ${
                        isActive
                          ? 'border-orange-500 bg-orange-500/[0.06] text-slate-100'
                          : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {isActive && <span className="text-orange-500 text-[10px]">▸</span>}
                            <span className="text-[13.5px] font-medium tracking-tight whitespace-nowrap">{item.label}</span>
                          </div>
                          <div className={`hud-label mt-0.5 ${isActive ? 'text-orange-400/70' : 'text-slate-600'}`}>{item.sub}</div>
                        </div>
                        <span className={`hud-label text-[9.5px] ${isActive ? 'text-orange-400/80' : 'text-slate-700 group-hover:text-slate-500'}`}>{item.code}</span>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Operator footer */}
      <div className="px-5 py-4 border-t border-slate-800/70">
        <div className="hud-label text-slate-600">OPERATOR</div>
        <div className="mt-1 flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-amber-700 flex items-center justify-center text-[11px] font-semibold text-slate-950">K</div>
          <div className="min-w-0">
            <div className="text-[13px] text-slate-200 truncate">kitty</div>
            <div className="hud-label text-[9.5px] text-slate-600 truncate">full access</div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between hud-label text-slate-600">
          <span className="flex items-center gap-1.5"><LiveDot /> <span>session 20</span></span>
          <span>12:04</span>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
