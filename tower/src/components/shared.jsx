// Shared primitives used across all rooms.

import React from 'react';

const ACCENTS = {
  ember:  { hex: '#f97316', soft: 'rgba(249,115,22,0.12)', text: 'text-orange-400', bg: 'bg-orange-500', border: 'border-orange-500' },
  cyan:   { hex: '#22d3ee', soft: 'rgba(34,211,238,0.12)',  text: 'text-cyan-400',   bg: 'bg-cyan-500',   border: 'border-cyan-500' },
  violet: { hex: '#a78bfa', soft: 'rgba(167,139,250,0.12)', text: 'text-violet-400', bg: 'bg-violet-500', border: 'border-violet-500' },
};

// L-bracket corners on HUD cards.
function CornerBrackets({ color = '#f97316', size = 10, opacity = 0.55 }) {
  const style = { color, opacity };
  const s = size;
  const common = 'absolute pointer-events-none';
  return (
    <>
      <span className={`${common} top-0 left-0`} style={{ width: s, height: s, borderTop: `1px solid ${color}`, borderLeft: `1px solid ${color}`, opacity }} />
      <span className={`${common} top-0 right-0`} style={{ width: s, height: s, borderTop: `1px solid ${color}`, borderRight: `1px solid ${color}`, opacity }} />
      <span className={`${common} bottom-0 left-0`} style={{ width: s, height: s, borderBottom: `1px solid ${color}`, borderLeft: `1px solid ${color}`, opacity }} />
      <span className={`${common} bottom-0 right-0`} style={{ width: s, height: s, borderBottom: `1px solid ${color}`, borderRight: `1px solid ${color}`, opacity }} />
    </>
  );
}

// Card / module. A slate-800 surface with optional corner brackets + footer code.
function Module({ code, title, action, children, corners = true, pad = true, className = '' }) {
  const showOrn = true;
  return (
    <section className={`relative bg-slate-900/60 border border-slate-800 rounded-sm ${className}`}>
      {corners && showOrn && <CornerBrackets />}
      {(title || action || code) && (
        <header className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-slate-800/70">
          <div className="flex items-center gap-2">
            {showOrn && <span className="hud-kicker text-orange-500/80">◈</span>}
            {title && <h2 className="hud-kicker text-slate-300">{title}</h2>}
          </div>
          <div className="flex items-center gap-3">
            {action}
            {code && <span className="hud-label text-slate-600">{code}</span>}
          </div>
        </header>
      )}
      <div className={pad ? 'p-4' : ''}>{children}</div>
    </section>
  );
}

// Big stat block — "HERO" metric.
function Stat({ label, value, unit, sub, tone = 'default', size = 'lg' }) {
  const toneColor = {
    default: 'text-slate-100',
    good: 'text-emerald-400',
    warn: 'text-amber-400',
    bad: 'text-red-400',
    accent: 'text-orange-400',
  }[tone];
  const sizes = {
    lg: { v: 'text-[34px] leading-none font-semibold', u: 'text-base' },
    md: { v: 'text-[26px] leading-none font-semibold', u: 'text-sm' },
    sm: { v: 'text-[20px] leading-none font-semibold', u: 'text-xs' },
  }[size];
  return (
    <div className="flex flex-col gap-2">
      <div className="hud-label">{label}</div>
      <div className="flex items-baseline gap-1.5">
        <span className={`hud-data ${sizes.v} ${toneColor}`}>{value}</span>
        {unit && <span className={`hud-data ${sizes.u} text-slate-500`}>{unit}</span>}
      </div>
      {sub && <div className="text-[12px] text-slate-500 font-mono">{sub}</div>}
    </div>
  );
}

// Status pill — ◉ OK, ▲ WARN, ◌ IDLE.
function StatusPill({ kind = 'ok', label, size = 'md' }) {
  const map = {
    ok:   { glyph: '◉', cls: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
    warn: { glyph: '▲', cls: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
    bad:  { glyph: '✕', cls: 'text-red-400 border-red-500/30 bg-red-500/10' },
    idle: { glyph: '◌', cls: 'text-slate-500 border-slate-600/40 bg-slate-800/60' },
    info: { glyph: '◆', cls: 'text-sky-400 border-sky-500/30 bg-sky-500/10' },
  }[kind];
  const pad = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]';
  return (
    <span className={`inline-flex items-center gap-1.5 border rounded-sm ${pad} font-mono tracking-[0.14em] uppercase ${map.cls}`}>
      <span>{map.glyph}</span>
      <span>{label}</span>
    </span>
  );
}

// Breadcrumb kicker e.g. OPERATIONS · ROOM 05
function Kicker({ parts, glyph = '◈' }) {
  return (
    <div className="hud-kicker text-orange-500/90 flex items-center gap-2">
      <span className="opacity-80">{glyph}</span>
      {parts.map((p, i) => (
        <React.Fragment key={i}>
          <span>{p}</span>
          {i < parts.length - 1 && <span className="text-orange-500/40">·</span>}
        </React.Fragment>
      ))}
    </div>
  );
}

// Page title block — the top of every room.
function PageTitle({ kicker, title, desc, actions }) {
  return (
    <div className="flex items-end justify-between gap-6 mb-6">
      <div className="min-w-0">
        <Kicker parts={kicker} />
        <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-slate-50">{title}</h1>
        {desc && <p className="mt-1 text-[14px] text-slate-400 max-w-[60ch]">{desc}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

// Utility button.
function Btn({ children, onClick, variant = 'ghost', icon, size = 'md', title }) {
  const base = 'inline-flex items-center gap-2 rounded-sm font-mono tracking-[0.14em] uppercase transition-colors select-none';
  const sizes = { sm: 'text-[10px] px-2 py-1', md: 'text-[11px] px-3 py-1.5', lg: 'text-[12px] px-4 py-2' }[size];
  const variants = {
    ghost: 'border border-slate-700 text-slate-300 hover:border-orange-500/60 hover:text-orange-300 bg-slate-900/40',
    primary: 'bg-orange-500/15 border border-orange-500/60 text-orange-300 hover:bg-orange-500/25',
    solid: 'bg-orange-500 border border-orange-400 text-slate-950 hover:bg-orange-400',
    danger: 'border border-red-500/50 text-red-300 hover:bg-red-500/10',
  }[variant];
  return (
    <button onClick={onClick} title={title} className={`${base} ${sizes} ${variants}`}>
      {icon && <span className="opacity-80">{icon}</span>}
      <span>{children}</span>
    </button>
  );
}

// Simple select (native) wrapped in HUD styling.
function Select({ value, onChange, options, label }) {
  return (
    <label className="inline-flex items-center gap-2 text-[11px] font-mono tracking-[0.14em] uppercase text-slate-400">
      {label && <span>{label}</span>}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-slate-900/80 border border-slate-700 text-slate-200 rounded-sm px-2 py-1 hover:border-slate-600 focus:border-orange-500/60 font-mono text-[11px] tracking-[0.1em] uppercase"
      >
        {options.map(o => (
          <option key={typeof o === 'string' ? o : o.value} value={typeof o === 'string' ? o : o.value}>
            {typeof o === 'string' ? o : o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

// Inline progress bar w/ value.
function MeterBar({ value, max = 100, tone = 'good', label, right }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const tones = {
    good: 'bg-emerald-500',
    warn: 'bg-amber-500',
    bad: 'bg-red-500',
    accent: 'bg-orange-500',
    neutral: 'bg-slate-500',
  };
  return (
    <div>
      {(label || right) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && <span className="hud-label">{label}</span>}
          {right && <span className="hud-data text-[11px] text-slate-400">{right}</span>}
        </div>
      )}
      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
        <div className={`${tones[tone]} h-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// Live-ish ticker dot.
function LiveDot({ tone = 'good' }) {
  const bg = { good: 'bg-emerald-500', warn: 'bg-amber-500', bad: 'bg-red-500' }[tone];
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${bg} pulse-dot`} />;
}

export {
  ACCENTS,
  CornerBrackets,
  Module,
  Stat,
  StatusPill,
  Kicker,
  PageTitle,
  Btn,
  Select,
  MeterBar,
  LiveDot,
};
