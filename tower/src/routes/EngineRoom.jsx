// Room A-02 — Engine Room: System Integrity HUD + hourly AI traffic chart.
// Sprint G Item 1, Session 18; redesigned Session 20 Phase 2.
//
// Single Supabase query (7-day ai_call_log slice) feeds two sections:
//   Section 1: 4-stat integrity HUD + per-endpoint telemetry rows
//   Section 2: Recharts line chart bucketed by UTC hour, last 24h
//
// Data source: Supabase ai_call_log table via tower/src/lib/supabase.js.

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
import {
  Module,
  Stat,
  StatusPill,
  PageTitle,
  Btn,
} from "../components/shared";

const WINDOW_HOURS = 24;
const WINDOW_DAYS = 7;
const SELECT_COLUMNS = "created_at, provider, endpoint, status";
const KNOWN_ENDPOINTS = ["/parse", "/ocr", "/advise", "/monthly-report"];

// --- helpers (preserved verbatim) --------------------------------------

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

function hourBucket(date) {
  const y = date.getUTCFullYear();
  const mo = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const h = String(date.getUTCHours()).padStart(2, "0");
  return `${y}-${mo}-${d}T${h}`;
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

  // Section 1: 7-day integrity aggregation (logic preserved).
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

  // Section 2: 24h hourly chart (logic preserved).
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

  const integrityTone =
    totalSignals === 0 ? "default"
    : (integrity ?? 0) >= 99.5 ? "good"
    : (integrity ?? 0) >= 95 ? "warn"
    : "bad";

  const anomalyTone =
    totalSignals === 0 ? "default"
    : anomalies === 0 ? "good"
    : "warn";

  return (
    <div className="px-10 py-8 max-w-[1400px]">
      <PageTitle
        kicker={["OPERATIONS", "ROOM A-02"]}
        title="Engine Room"
        desc="7-day signal integrity from ai_call_log plus hourly AI traffic. Manual refresh."
        actions={
          <>
            {lastFetchAt && (
              <span className="hud-label">
                last sync <span className="text-slate-400 hud-data ml-1">{formatAge(lastFetchAt.toISOString())}</span>
              </span>
            )}
            <Btn icon="↻" onClick={fetchCalls}>{loading ? "…" : "refresh"}</Btn>
          </>
        }
      />

      {/* Error banner */}
      {error && (
        <div className="mb-4 border border-red-500/40 bg-red-500/5 p-4 rounded-sm">
          <div className="hud-kicker text-red-400 mb-1">QUERY FAILED</div>
          <div className="text-sm text-slate-300">{error}</div>
          <div className="mt-3">
            <Btn variant="ghost" onClick={fetchCalls}>retry</Btn>
          </div>
        </div>
      )}

      {/* First-fetch loading */}
      {loading && rows.length === 0 && !error && (
        <div className="mb-4 hud-label text-slate-400">connecting to supabase…</div>
      )}

      {!error && (
        <>
          {/* Section 1: 4-stat HUD */}
          <Module code="A-02 · INTEGRITY" title="SYSTEM INTEGRITY · REAL-TIME" className="mb-6">
            <div className="grid grid-cols-4 gap-8">
              <Stat
                label="INTEGRITY · 7D"
                value={integrity != null ? integrity.toFixed(1) : "—"}
                unit={integrity != null ? "%" : undefined}
                tone={integrityTone}
                sub={totalSignals === 0 ? "no data" : "derived from ai_call_log"}
              />
              <Stat
                label="SIGNALS · 7D"
                value={totalSignals.toLocaleString("en-US")}
                sub={`${KNOWN_ENDPOINTS.length} endpoints tracked`}
              />
              <Stat
                label="ANOMALIES · 7D"
                value={anomalies.toLocaleString("en-US")}
                tone={anomalyTone}
                sub="errors + timeouts"
              />
              <Stat
                label="ACTIVE"
                value={activeEndpoints}
                unit={`/ ${KNOWN_ENDPOINTS.length}`}
                sub="endpoints with traffic"
                tone={activeEndpoints > 0 ? "good" : "default"}
              />
            </div>
          </Module>

          {/* Endpoint telemetry */}
          <Module code="A-02 · ENDPOINTS" title="ENDPOINT TELEMETRY · 7D" className="mb-6">
            <div className="space-y-3">
              {endpoints.map((ep) => {
                const isIdle = ep.total === 0;
                const isOk = !isIdle && ep.success === ep.total;
                const hasErrors = !isIdle && ep.success < ep.total;
                const pillKind = isIdle ? "idle" : isOk ? "ok" : "warn";
                const pillLabel = isIdle ? "idle" : isOk ? "ok" : "warn";
                const pct = ep.uptimePct ?? 0;
                const barCls = isOk ? "bg-emerald-500" : hasErrors ? "bg-amber-500" : "bg-slate-700";
                return (
                  <div
                    key={ep.endpoint}
                    className={`grid grid-cols-[180px_90px_1fr_80px_80px] items-center gap-4 ${isIdle ? "opacity-50" : ""}`}
                  >
                    <span className="hud-data text-[13px] text-slate-200">{ep.endpoint}</span>
                    <span className="hud-label text-slate-500">
                      {isIdle ? "—" : `${ep.success}/${ep.total}`}
                    </span>
                    <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full ${barCls}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className={`hud-data text-[13px] text-right ${isOk ? "text-emerald-400" : hasErrors ? "text-amber-400" : "text-slate-500"}`}>
                      {ep.uptimePct != null ? `${ep.uptimePct.toFixed(1)}%` : "—"}
                    </span>
                    <span className="justify-self-end">
                      <StatusPill kind={pillKind} label={pillLabel} size="sm" />
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 pt-4 border-t border-slate-800/70 flex items-center justify-between">
              <span className="hud-label text-slate-500">source · ai_call_log · idle endpoints dimmed</span>
              <a
                href="https://stats.uptimerobot.com/FbQp9qBnJr"
                target="_blank"
                rel="noopener noreferrer"
                className="hud-label text-slate-500 hover:text-orange-400 transition-colors"
              >
                external ping ↗
              </a>
            </div>
          </Module>

          {/* Section 2: Traffic chart */}
          <Module code="A-02 · TRAFFIC" title="AI TRAFFIC · HOURLY · LAST 24H">
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid stroke="#1e293b" strokeDasharray="2 4" />
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
                      background: "#0f172a",
                      border: "1px solid #334155",
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
            <div className="mt-3 flex items-center gap-5 hud-label">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-slate-400 inline-block rounded-sm" /> gemini
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-slate-500 inline-block rounded-sm" /> anthropic
              </span>
              <span className="ml-auto text-slate-600">
                window · last 24h (UTC) · updated {formatAge(lastFetchAt?.toISOString())}
              </span>
            </div>
          </Module>
        </>
      )}
    </div>
  );
}
