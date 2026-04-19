// Shared layout shell — sidebar + top strip + scanline main.

import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { LiveDot } from '../components/shared';

function Shell({ systemOk = true, title }) {
  const loc = useLocation();
  const route = loc.pathname === '/'
    ? 'lobby'
    : loc.pathname.replace(/^\//, '').replace(/\//g, '-');

  const [now, setNow] = React.useState(new Date());
  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const utc = now.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  const buildHash = 's20.dev';

  return (
    <div className="min-h-screen flex bg-[#0b1220]">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top strip */}
        <header className="h-10 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur flex items-center px-6 shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-5">
            <nav className="flex items-center gap-3 hud-kicker text-slate-500 whitespace-nowrap">
              <span className={route === 'lobby' ? 'text-orange-400' : ''}>TOWER</span>
              <span className="text-slate-700">›</span>
              <span className="text-slate-400 truncate max-w-[220px]">{title || route.toUpperCase()}</span>
            </nav>
          </div>
          <div className="ml-auto flex items-center gap-5 hud-label whitespace-nowrap">
            <div className="flex items-center gap-2">
              <LiveDot tone={systemOk ? 'good' : 'warn'} />
              <span className="text-slate-400">System {systemOk ? 'nominal' : 'degraded'}</span>
            </div>
            <span className="text-slate-600">·</span>
            <span className="hud-data text-[11px] text-slate-500">{utc}</span>
            <span className="text-slate-600 hidden xl:inline">·</span>
            <span className="hud-data text-[11px] text-slate-500 hidden xl:inline">build {buildHash}</span>
          </div>
        </header>

        <main className="flex-1 min-w-0 bg-grid scanline">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Shell;
