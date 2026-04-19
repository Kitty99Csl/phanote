// Room 4 — Engine Room: System Integrity HUD + hourly AI traffic chart (Sprint G Item 1, Session 18).
//
// Section 1: Native "System Integrity" tactical HUD — derives uptime from ai_call_log signal
//   traffic over a 7-day window. 4 aggregate stat cards + per-endpoint telemetry rows.
//   UptimeRobot kept as secondary "External ping ↗" affordance in footer.
// Section 2: Recharts line chart of ai_call_log rows bucketed by UTC hour, last 24h.
//
// Single Supabase query covers both sections (7-day window; chart uses last 24h slice).
// Data source: Supabase ai_call_log table via tower/src/lib/supabase.js.
// Pattern source: AICalls.jsx (header/footer/error/loading), DailyStats.jsx (useMemo aggregation).
// Module code: E-04.

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../lib/supabase";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const WINDOW_HOURS = 24;   // Section 2 chart window
const WINDOW_DAYS = 7;     // Section 1 integrity window
const SELECT_COLUMNS = "created_at, provider, endpoint, status";
const KNOWN_ENDPOINTS = ["parse", "ocr", "advise", "monthly-report"];

// --- helpers -----------------------------------------------------------

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

// Returns YYYY-MM-DDTHH for the UTC hour containing `date`.
function hourBucket(date) {
  const y = date.getUTCFullYear();
  const mo = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const h = String(date.getUTCHours()).padStart(2, "0");
  return `${y}-${mo}-${d}T${h}`;
}

function integrityStatus(pct, totalCalls) {
  if (totalCalls === 0) return "standby";
  if (pct >= 99.5) return "nominal";
  if (pct >= 95) return "caution";
  return "critical";
}

function statusCardClass(status) {
  if (status === "nominal") return "border-green-500/40 bg-green-500/5";
  if (status === "caution") return "border-ember-500/60 bg-ember-500/5";
  if (status === "critical") return "border-red-500/40 bg-red-500/5";
  return "border-slate-700 bg-slate-800";
}

function statusTextClass(status) {
  if (status === "nominal") return "text-green-500";
  if (status === "caution") return "text-ember-500";
  if (status === "critical") return "text-red-500";
  return "text-slate-500";
}

// --- sub-components ----------------------------------------------------

function CornerBrackets() {
  return (
    <>
      <span className="absolute top-2 left-2 w-3 h-3 border-t border-l border-ember-500/50" />
      <span className="absolute top-2 right-2 w-3 h-3 border-t border-r border-ember-500/50" />
      <span className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-ember-500/50" />
      <span className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-ember-500/50" />
    </>
  );
}

function StatCard({ label, readout, meta, status, showPulse }) {
  return (
    <div className={`relative border p-3 ${statusCardClass(status)}`}>
      {showPulse && status === "nominal" && (
        <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_6px_rgba(34,197,94,0.8)]" />
      )}
      <div className="text-[9px] tracking-[0.2em] text-slate-500 uppercase font-mono mb-1.5">
        {label}
      </div>
      <div className={`text-2xl font-semibold tracking-tight mb-1 ${statusTextClass(status)}`}>
        {readout}
      </div>
      <div className="text-[9px] tracking-[0.15em] text-slate-600 uppercase font-mono">
        {meta}
      </div>
    </div>
  );
}

function EndpointRow({ ep }) {
  const { endpoint, total, success, uptimePct } = ep;
  const isIdle = total === 0;
  const hasErrors = !isIdle && success < total;
  const isOk = !isIdle && !hasErrors;

  const prefix = isIdle ? "◌" : "▲";
  const prefixClass = isIdle ? "text-slate-600" : "text-ember-500";

  let badgeText, badgeClass;
  if (isIdle) {
    badgeText = "◌ IDLE";
    badgeClass = "text-slate-600";
  } else if (isOk) {
    badgeText = "◉ OK";
    badgeClass = "text-green-500";
  } else {
    badgeText = "▲ WARN";
    badgeClass = "text-ember-500";
  }

  const pctDisplay = uptimePct != null ? `${uptimePct.toFixed(1)}%` : "—";
  const barFill = uptimePct ?? 0;
  const barFillClass = isOk
    ? "bg-green-500/70 shadow-[0_0_4px_rgba(34,197,94,0.5)]"
    : hasErrors
    ? "bg-ember-500/70"
    : "bg-slate-700";

  return (
    <div className={`flex items-center gap-3 py-2.5 border-b border-slate-700/30 ${isIdle ? "opacity-50" : ""}`}>
      <div className="w-36 flex items-center gap-1.5 font-mono text-[11px]">
        <span className={prefixClass}>{prefix}</span>
        <span className={isIdle ? "text-slate-600" : "text-slate-300"}>/{endpoint}</span>
      </div>
      <div className="w-16 text-[11px] font-mono text-slate-400 text-right">
        {isIdle ? "—" : `${success}/${total}`}
      </div>
      <div
        className={`w-16 text-[11px] font-mono text-right ${
          isOk ? "text-green-500" : hasErrors ? "text-ember-500" : "text-slate-600"
        }`}
      >
        {pctDisplay}
      </div>
      <div className="flex-1">
        <div className="w-full h-1.5 bg-slate-900 overflow-hidden">
          <div
            className={`h-full transition-all ${barFillClass}`}
            style={{ width: `${barFill}%` }}
          />
        </div>
      </div>
      <div className={`w-16 text-[9px] tracking-[0.1em] font-mono uppercase text-right ${badgeClass}`}>
        {badgeText}
      </div>
    </div>
  );
}

// --- main component ----------------------------------------------------

export default function EngineRoom() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetchAt, setLastFetchAt] = useState(null);

  const fetchCalls = useCallback(async () => {
    setLoading(true);
    setError(null);
    // 7-day window covers both Section 1 (integrity, 7d) and Section 2 (chart, last 24h slice).
    const since = new Date(Date.now() - WINDOW_DAYS * 24 * 3_600_000).toISOString();
    const { data, error: qError } = await supabase
      .from("ai_call_log")
      .select(SELECT_COLUMNS)
      .gte("created_at", since)
      .order("created_at", { ascending: true });

    if (qError) {
      setError(qError.message || "Supabase query failed");
      setRows([]);
    } else {
      setRows(data || []);
      setLastFetchAt(new Date());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    document.title = "Tower · Engine Room";
    fetchCalls();
  }, [fetchCalls]);

  // Section 1: 7-day integrity aggregation.
  const integrityStats = useMemo(() => {
    const totalSignals = rows.length;
    const totalSuccess = rows.filter((r) => r.status === "success").length;
    const anomalies = totalSignals - totalSuccess;
    const integrity = totalSignals > 0 ? (totalSuccess / totalSignals) * 100 : null;

    const endpoints = KNOWN_ENDPOINTS.map((ep) => {
      const epRows = rows.filter((r) => r.endpoint === ep);
      const total = epRows.length;
      const success = epRows.filter((r) => r.status === "success").length;
      const uptimePct = total > 0 ? (success / total) * 100 : null;
      return { endpoint: ep, total, success, uptimePct };
    });

    const activeEndpoints = endpoints.filter((e) => e.total > 0).length;
    return { totalSignals, totalSuccess, anomalies, integrity, endpoints, activeEndpoints };
  }, [rows]);

  // Section 2: 24h hourly chart bucketing (rows outside last 24h are naturally skipped).
  const chartData = useMemo(() => {
    const now = new Date();
    const buckets = [];
    for (let i = WINDOW_HOURS - 1; i >= 0; i--) {
      const t = new Date(now.getTime() - i * 3_600_000);
      const key = hourBucket(t);
      buckets.push({
        key,
        hour: String(t.getUTCHours()).padStart(2, "0") + ":00",
        gemini: 0,
        anthropic: 0,
      });
    }
    for (const row of rows) {
      const key = hourBucket(new Date(row.created_at));
      const bucket = buckets.find((b) => b.key === key);
      if (bucket) {
        if (row.provider === "gemini") bucket.gemini++;
        else if (row.provider === "anthropic") bucket.anthropic++;
      }
    }
    return buckets;
  }, [rows]);

  const { totalSignals, anomalies, integrity, endpoints, activeEndpoints } = integrityStats;
  const integrityStat = integrityStatus(integrity ?? 0, totalSignals);
  const anomalyStatus =
    totalSignals === 0 ? "standby" : anomalies === 0 ? "nominal" : "critical";
  const integrityMetaLabel =
    integrityStat === "nominal" ? "▲ NOMINAL · 7D"
    : integrityStat === "caution" ? "▲ CAUTION · 7D"
    : integrityStat === "critical" ? "▲ CRITICAL · 7D"
    : "◌ NO DATA · 7D";

  return (
    <div className="max-w-7xl">
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1 h-5 bg-ember-500"></div>
            <div className="text-[10px] tracking-[0.35em] text-ember-500 uppercase font-bold">
              Operations · Room 04
            </div>
          </div>
          <h1 className="text-3xl font-semibold text-slate-50 tracking-tight mb-2">
            Engine Room
          </h1>
          <p className="text-sm text-slate-400">
            External uptime plus hourly AI traffic. Last 24h UTC.
          </p>
        </div>

        <button
          onClick={fetchCalls}
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
            Query failed
          </div>
          <div className="text-sm text-slate-300">{error}</div>
          <button
            onClick={fetchCalls}
            className="mt-3 px-3 py-1.5 text-[10px] tracking-[0.15em] uppercase font-semibold border border-ember-500/50 text-ember-500 hover:bg-ember-500/10 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Section 1: System Integrity HUD */}
      <div className="bg-slate-800 border border-slate-700 p-5 relative mb-4">
        <CornerBrackets />

        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="text-[10px] tracking-[0.35em] text-ember-500 uppercase font-bold">
              ▲ System Integrity · Real-Time
            </div>
            <div className="text-[9px] tracking-[0.15em] text-slate-600 font-mono mt-0.5">
              derived from signal traffic · ai_call_log
            </div>
          </div>
          <div className="text-[9px] tracking-[0.15em] text-ember-500/70 font-mono uppercase">
            Module · E-04-U
          </div>
        </div>

        {/* Loading state */}
        {loading && rows.length === 0 && !error && (
          <div className="py-8">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-ember-500 animate-pulse"></div>
              <div className="text-sm text-slate-400">Connecting to Supabase...</div>
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* 4 stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <StatCard
                label="Integrity"
                readout={integrity != null ? `${integrity.toFixed(1)}%` : "—"}
                meta={integrityMetaLabel}
                status={integrityStat}
                showPulse
              />
              <StatCard
                label="Signals"
                readout={totalSignals.toLocaleString("en-US")}
                meta="Total · 7D"
                status="standby"
              />
              <StatCard
                label="Anomalies"
                readout={anomalies.toLocaleString("en-US")}
                meta="Errors + Timeouts"
                status={anomalyStatus}
              />
              {/* Active card: N/4 with N in color */}
              <div className={`relative border p-3 ${statusCardClass(activeEndpoints > 0 ? "nominal" : "standby")}`}>
                <div className="text-[9px] tracking-[0.2em] text-slate-500 uppercase font-mono mb-1.5">
                  Active
                </div>
                <div className="text-2xl font-semibold tracking-tight mb-1">
                  <span className={activeEndpoints > 0 ? "text-green-500" : "text-slate-500"}>
                    {activeEndpoints}
                  </span>
                  <span className="text-slate-500">/4</span>
                </div>
                <div className="text-[9px] tracking-[0.15em] text-slate-600 uppercase font-mono">
                  Endpoints
                </div>
              </div>
            </div>

            {/* Endpoint telemetry section label */}
            <div className="text-[9px] tracking-[0.3em] text-ember-500/60 uppercase font-mono font-bold mb-2">
              ◢ Endpoint Telemetry
            </div>

            {/* Per-endpoint rows */}
            <div>
              {endpoints.map((ep) => (
                <EndpointRow key={ep.endpoint} ep={ep} />
              ))}
            </div>

            {/* Section 1 footer */}
            <div className="mt-4 pt-3 border-t border-slate-700/50 flex items-center justify-between">
              <div className="text-[9px] tracking-[0.15em] text-slate-600 font-mono uppercase">
                ▲ Source · ai_call_log · Observed · idle endpoints dimmed
              </div>
              <a
                href="https://stats.uptimerobot.com/FbQp9qBnJr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[9px] tracking-[0.15em] font-mono uppercase text-slate-600 hover:text-ember-500 transition-colors"
              >
                External ping ↗
              </a>
            </div>
          </>
        )}
      </div>

      {/* Section 2: AI traffic chart */}
      <div className="bg-slate-800 border border-slate-700 p-4 relative mb-4">
        <div className="absolute top-0 right-0 w-0 h-0 border-l-[12px] border-l-transparent border-t-[12px] border-t-ember-500/60"></div>

        <div className="flex items-center justify-between mb-1">
          <div>
            <div className="text-[10px] tracking-[0.2em] text-slate-400 uppercase font-semibold">
              AI Traffic
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              ai_call_log only · NOT total worker traffic
            </div>
          </div>
          <div className="text-[9px] tracking-[0.15em] text-slate-600 font-mono uppercase">
            Module E-04-T
          </div>
        </div>

        {loading && rows.length === 0 && !error && (
          <div className="py-8">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-ember-500 animate-pulse"></div>
              <div className="text-sm text-slate-400">Connecting to Supabase...</div>
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="mt-4">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <CartesianGrid stroke="#334155" strokeDasharray="2 4" />
                  <XAxis
                    dataKey="hour"
                    stroke="#475569"
                    fontSize={10}
                    tick={{ fill: "#64748b" }}
                  />
                  <YAxis
                    stroke="#475569"
                    fontSize={10}
                    tick={{ fill: "#64748b" }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#1e293b",
                      border: "1px solid #475569",
                      fontSize: "11px",
                    }}
                    labelStyle={{ color: "#cbd5e1" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="gemini"
                    stroke="#94a3b8"
                    strokeWidth={1.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="anthropic"
                    stroke="#64748b"
                    strokeWidth={1.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-3 text-[9px] tracking-[0.15em] text-slate-600 font-mono uppercase">
              Window · Last 24h (UTC) · Updated {formatAge(lastFetchAt?.toISOString())}
            </div>
          </>
        )}
      </div>

      {/* Footer metadata */}
      <div className="mt-4 text-[10px] tracking-[0.15em] text-slate-600 uppercase font-mono">
        Source · ai_call_log + uptimerobot &nbsp;·&nbsp; Last refresh {formatAge(lastFetchAt?.toISOString())} &nbsp;·&nbsp; Module E-04
      </div>
    </div>
  );
}
