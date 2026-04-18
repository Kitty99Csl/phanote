// Room 1 — /health live display (Sprint F Item 4, Session 16).
//
// Module card grid matching Lobby pattern. 4 cards:
//   H-01-W — Worker (top-level status + version)
//   H-01-S — Supabase (dependencies.supabase)
//   H-01-G — Gemini (dependencies.gemini)
//   H-01-A — Anthropic (dependencies.anthropic)
//
// Manual refresh only (per DECISIONS.md Q3 revision at Session 16).
// Auto-refresh deferred to Session 17+ if genuinely useful.
//
// Endpoint: api.phajot.com/health (public, no auth, permissive CORS).

import { useEffect, useState, useCallback } from "react";
import StatusChip from "../components/StatusChip";

const HEALTH_URL = "https://api.phajot.com/health";

// --- status derivation helpers ------------------------------------------

// Worker: maps top-level status string to chip state.
function workerStatus(health) {
  if (!health) return "standby";
  if (health.status === "ok") return "nominal";
  if (health.status === "degraded") return "caution";
  return "critical";
}

// Supabase: explicit ok bool.
function supabaseStatus(dep) {
  if (!dep) return "standby";
  return dep.ok ? "nominal" : "critical";
}

// Gemini / Anthropic: heuristic from call + error counts.
// No explicit ok — quiet period (zeros/nulls) = standby, not failure.
function aiProviderStatus(dep) {
  if (!dep) return "standby";
  const calls = dep.calls_last_hour ?? 0;
  const errors = dep.errors_last_hour ?? 0;
  if (errors > 0) return calls > errors ? "caution" : "critical";
  if (calls > 0) return "nominal";
  return "standby";
}

// --- formatters ---------------------------------------------------------

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

// --- ModuleCard (local, read-only variant of Lobby's card) --------------

function ModuleCard({ label, code, readout, body, metadata, status }) {
  return (
    <div className="bg-slate-800 border border-slate-700 p-4 relative">
      {/* Top-right ember corner cut */}
      <div className="absolute top-0 right-0 w-0 h-0 border-l-[12px] border-l-transparent border-t-[12px] border-t-ember-500/60"></div>

      {/* Top row: label + Module {code} */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] tracking-[0.2em] text-slate-400 uppercase font-semibold">
          {label}
        </div>
        <div className="text-[9px] tracking-[0.15em] text-slate-600 font-mono uppercase">
          Module {code}
        </div>
      </div>

      {/* Readout */}
      <div className="text-2xl font-semibold text-slate-50 tracking-tight mb-1">
        {readout}
      </div>

      {/* Body */}
      <div className="text-[11px] text-slate-500 mb-3">{body}</div>

      {/* Bottom: metadata + StatusChip */}
      <div className="pt-3 border-t border-slate-700/50 flex items-center justify-between">
        <div className="text-[9px] tracking-[0.1em] text-slate-600 uppercase font-mono">
          {metadata}
        </div>
        <StatusChip status={status}>{status.toUpperCase()}</StatusChip>
      </div>
    </div>
  );
}

// --- main component -----------------------------------------------------

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

  // Build card data from current health snapshot
  const cards = health
    ? [
        {
          label: "Worker",
          code: "H-01-W",
          readout: health.status === "ok" ? "NOMINAL" : (health.status || "UNKNOWN").toUpperCase(),
          body: health.status_reason || `${health.service || "Phajot API"} · v${health.version}`,
          metadata: `Deployed ${formatAge(health.deployed_at)}`,
          status: workerStatus(health),
        },
        {
          label: "Supabase",
          code: "H-01-S",
          readout: health.dependencies?.supabase?.ok
            ? `${health.dependencies.supabase.ping_ms}ms`
            : "DOWN",
          body: health.dependencies?.supabase?.ok
            ? `Ping ${health.dependencies.supabase.ping_ms}ms · cache ${health.dependencies.supabase.cache_age_seconds}s`
            : "Database unreachable",
          metadata: `Checked ${formatAge(health.dependencies?.supabase?.last_checked_at)}`,
          status: supabaseStatus(health.dependencies?.supabase),
        },
        {
          label: "Gemini",
          code: "H-01-G",
          readout: `${health.dependencies?.gemini?.calls_last_hour ?? 0} calls/hr`,
          body:
            (health.dependencies?.gemini?.errors_last_hour ?? 0) > 0
              ? `${health.dependencies.gemini.errors_last_hour} errors in last hour`
              : (health.dependencies?.gemini?.calls_last_hour ?? 0) === 0
              ? "Quiet period"
              : "No errors",
          metadata:
            health.dependencies?.gemini?.last_success_at
              ? `Last success ${formatAge(health.dependencies.gemini.last_success_at)}`
              : "No recent activity",
          status: aiProviderStatus(health.dependencies?.gemini),
        },
        {
          label: "Anthropic",
          code: "H-01-A",
          readout: `${health.dependencies?.anthropic?.calls_last_hour ?? 0} calls/hr`,
          body:
            (health.dependencies?.anthropic?.errors_last_hour ?? 0) > 0
              ? `${health.dependencies.anthropic.errors_last_hour} errors in last hour`
              : (health.dependencies?.anthropic?.calls_last_hour ?? 0) === 0
              ? "Quiet period"
              : "No errors",
          metadata:
            health.dependencies?.anthropic?.last_success_at
              ? `Last success ${formatAge(health.dependencies.anthropic.last_success_at)}`
              : "No recent activity",
          status: aiProviderStatus(health.dependencies?.anthropic),
        },
      ]
    : [];

  return (
    <div className="max-w-7xl">
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] tracking-[0.2em] text-ember-500 uppercase font-semibold mb-2">
            Systems
          </div>
          <h1 className="text-3xl font-semibold text-slate-50 tracking-tight mb-2">
            System Health
          </h1>
          <p className="text-sm text-slate-400">
            Live operational state from api.phajot.com/health.
          </p>
        </div>

        <button
          onClick={fetchHealth}
          disabled={loading}
          className="mt-6 px-4 py-2 text-[11px] tracking-[0.15em] uppercase font-semibold border border-slate-700 text-slate-300 hover:border-ember-500 hover:text-ember-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-4 border border-ember-500 bg-ember-500/5 p-4">
          <div className="text-[11px] tracking-[0.15em] uppercase font-semibold text-ember-500 mb-1">
            Fetch failed
          </div>
          <div className="text-sm text-slate-300">{error}</div>
          <div className="text-[11px] text-slate-500 mt-2">
            Endpoint: {HEALTH_URL}
          </div>
        </div>
      )}

      {/* Loading state (first fetch only) */}
      {loading && !health && (
        <div className="text-sm text-slate-400 mb-4">Fetching /health...</div>
      )}

      {/* Module card grid */}
      {cards.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {cards.map((c) => (
            <ModuleCard key={c.code} {...c} />
          ))}
        </div>
      )}

      {/* Footer metadata: last fetch time */}
      {lastFetchAt && (
        <div className="text-[10px] tracking-[0.15em] text-slate-600 uppercase font-mono">
          Last synced {formatAge(lastFetchAt.toISOString())} · {lastFetchAt.toUTCString()}
        </div>
      )}
    </div>
  );
}
