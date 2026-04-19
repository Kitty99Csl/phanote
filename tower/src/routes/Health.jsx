// Room A-01 — /health live display (Sprint F Item 4, Session 16; redesigned Session 20 Phase 2).
//
// Queries api.phajot.com/health, maps to 4 service cards (Worker / Supabase / Gemini / Anthropic).
// Manual refresh only.

import { useEffect, useState, useCallback } from "react";
import {
  Module,
  Stat,
  StatusPill,
  PageTitle,
  Btn,
  CornerBrackets,
} from "../components/shared";

const HEALTH_URL = "https://api.phajot.com/health";

// --- status derivation helpers (preserved verbatim) --------------------

function workerKind(health) {
  if (!health) return "idle";
  if (health.status === "ok") return "ok";
  if (health.status === "degraded") return "warn";
  return "bad";
}

function supabaseKind(dep) {
  if (!dep) return "idle";
  return dep.ok ? "ok" : "bad";
}

function aiProviderKind(dep) {
  if (!dep) return "idle";
  const calls = dep.calls_last_hour ?? 0;
  const errors = dep.errors_last_hour ?? 0;
  if (errors > 0) return calls > errors ? "warn" : "bad";
  if (calls > 0) return "ok";
  return "idle";
}

// --- formatters --------------------------------------------------------

function formatAge(iso) {
  if (!iso) return "—";
  const then = new Date(iso);
  const now = new Date();
  const secs = Math.floor((now - then) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

// --- main component ----------------------------------------------------

export default function Health() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetchAt, setLastFetchAt] = useState(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(HEALTH_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setHealth(data);
      setLastFetchAt(new Date());
    } catch (err) {
      setError(err.message || "Fetch failed");
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = "Tower · Health";
    fetchHealth();
  }, [fetchHealth]);

  const services = health
    ? [
        {
          code: "A-01 · 01",
          name: "WORKER",
          kind: workerKind(health),
          readout: health.status === "ok" ? "ONLINE" : (health.status || "UNKNOWN").toUpperCase(),
          note: health.status_reason || `${health.service || "Phajot API"} · v${health.version}`,
          meta: `deployed ${formatAge(health.deployed_at)}`,
        },
        {
          code: "A-01 · 02",
          name: "SUPABASE",
          kind: supabaseKind(health.dependencies?.supabase),
          readout: health.dependencies?.supabase?.ok
            ? `${health.dependencies.supabase.ping_ms}ms`
            : "DOWN",
          note: health.dependencies?.supabase?.ok
            ? `ping ${health.dependencies.supabase.ping_ms}ms · cache ${health.dependencies.supabase.cache_age_seconds}s`
            : "database unreachable",
          meta: `checked ${formatAge(health.dependencies?.supabase?.last_checked_at)}`,
        },
        {
          code: "A-01 · 03",
          name: "GEMINI",
          kind: aiProviderKind(health.dependencies?.gemini),
          readout: `${health.dependencies?.gemini?.calls_last_hour ?? 0}`,
          note:
            (health.dependencies?.gemini?.errors_last_hour ?? 0) > 0
              ? `${health.dependencies.gemini.errors_last_hour} errors in last hour`
              : (health.dependencies?.gemini?.calls_last_hour ?? 0) === 0
              ? "quiet period"
              : "no errors",
          meta: health.dependencies?.gemini?.last_success_at
            ? `last success ${formatAge(health.dependencies.gemini.last_success_at)}`
            : "no recent activity",
        },
        {
          code: "A-01 · 04",
          name: "ANTHROPIC",
          kind: aiProviderKind(health.dependencies?.anthropic),
          readout: `${health.dependencies?.anthropic?.calls_last_hour ?? 0}`,
          note:
            (health.dependencies?.anthropic?.errors_last_hour ?? 0) > 0
              ? `${health.dependencies.anthropic.errors_last_hour} errors in last hour`
              : (health.dependencies?.anthropic?.calls_last_hour ?? 0) === 0
              ? "quiet period"
              : "no errors",
          meta: health.dependencies?.anthropic?.last_success_at
            ? `last success ${formatAge(health.dependencies.anthropic.last_success_at)}`
            : "no recent activity",
        },
      ]
    : [];

  const allOk = services.length > 0 && services.every(s => s.kind === "ok");
  const bannerTone = allOk ? "good" : services.some(s => s.kind === "bad") ? "bad" : "warn";
  const bannerBorder = bannerTone === "good" ? "border-emerald-500/20 bg-emerald-500/[0.04]"
    : bannerTone === "warn" ? "border-amber-500/20 bg-amber-500/[0.04]"
    : "border-red-500/20 bg-red-500/[0.04]";
  const bannerAccent = bannerTone === "good" ? "#10b981" : bannerTone === "warn" ? "#f59e0b" : "#ef4444";
  const bannerKicker = bannerTone === "good" ? "text-emerald-400"
    : bannerTone === "warn" ? "text-amber-400" : "text-red-400";
  const bannerLabel = bannerTone === "good" ? "SYSTEM · NOMINAL"
    : bannerTone === "warn" ? "SYSTEM · DEGRADED" : "SYSTEM · CRITICAL";

  return (
    <div className="px-10 py-8 max-w-[1400px]">
      <PageTitle
        kicker={["SYSTEMS", "ROOM A-01"]}
        title="System Health"
        desc="Live operational state from api.phajot.com/health — manual refresh."
        actions={
          <>
            {lastFetchAt && (
              <span className="hud-label">
                last sync <span className="text-slate-400 hud-data ml-1">{formatAge(lastFetchAt.toISOString())}</span>
              </span>
            )}
            <Btn icon="↻" onClick={fetchHealth}>{loading ? "…" : "refresh"}</Btn>
          </>
        }
      />

      {/* Error banner */}
      {error && (
        <div className="mb-4 border border-red-500/40 bg-red-500/5 p-4 rounded-sm">
          <div className="hud-kicker text-red-400 mb-1">FETCH FAILED</div>
          <div className="text-sm text-slate-300">{error}</div>
          <div className="hud-label text-slate-500 mt-2">endpoint · {HEALTH_URL}</div>
        </div>
      )}

      {/* First-fetch loading */}
      {loading && !health && !error && (
        <div className="mb-4 hud-label text-slate-400">fetching /health…</div>
      )}

      {/* Overall status banner */}
      {health && (
        <div className={`relative ${bannerBorder} border rounded-sm p-5 mb-6 flex items-center gap-6`}>
          <CornerBrackets color={bannerAccent} opacity={0.5} />
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border" style={{ borderColor: `${bannerAccent}66` }} />
              <div className="absolute inset-1 rounded-full border pulse-dot" style={{ borderColor: `${bannerAccent}33` }} />
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: bannerAccent }} />
            </div>
            <div>
              <div className={`hud-kicker ${bannerKicker}`}>{bannerLabel}</div>
              <div className="text-[15px] text-slate-200 mt-0.5">
                {services.length} service{services.length === 1 ? "" : "s"} probed
                {health.service && <> · <span className="text-slate-400">{health.service} v{health.version}</span></>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Service grid */}
      {services.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {services.map((s) => (
            <Module key={s.code} code={s.code} title={s.name}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Stat
                    label="STATE"
                    value={s.kind === "ok" ? "ONLINE" : s.kind === "idle" ? "STANDBY" : s.kind === "warn" ? "DEGRADED" : "OFFLINE"}
                    tone={s.kind === "ok" ? "good" : s.kind === "warn" ? "warn" : s.kind === "bad" ? "bad" : "default"}
                    size="md"
                  />
                  <div className="mt-3 hud-label text-slate-500">{s.note}</div>
                </div>
                <div className="text-right">
                  <div className="hud-label">READOUT</div>
                  <div className="hud-data text-[22px] font-semibold text-slate-100 mt-1">
                    {s.readout}
                  </div>
                  <div className="mt-2">
                    <StatusPill kind={s.kind} label={s.kind} size="sm" />
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800/70 hud-label text-slate-600">
                {s.meta}
              </div>
            </Module>
          ))}
        </div>
      )}
    </div>
  );
}
