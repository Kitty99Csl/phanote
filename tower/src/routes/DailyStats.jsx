// Room 3 — Daily stats: summary cards + 14-day table (Sprint F Item 6, Session 17).
//
// 4 "Today (UTC)" summary cards above a 14-day aggregate table.
// No chart (per DECISIONS-16 Q5).
//
// Data source: public.admin_daily_stats (wrapper VIEW from Migration 009,
// gates by is_admin inline). Tower's authenticated session cannot SELECT
// the raw ai_daily_stats matview anymore.
//
// Module code: D-03.

import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import StatusChip from "../components/StatusChip";

const WINDOW_DAYS = 14;

const SELECT_COLUMNS =
  "day, endpoint, provider, plan_tier, call_count, success_count, error_count, cost_usd_total, avg_duration_ms, p95_duration_ms";

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

function formatInt(n) {
  if (n == null || Number.isNaN(n)) return "—";
  return Number(n).toLocaleString("en-US");
}

function formatPercent(n) {
  if (n == null || Number.isNaN(n)) return "—";
  return `${Number(n).toFixed(1)}%`;
}

function formatCost(cost) {
  if (cost == null) return "—";
  return `$${Number(cost).toFixed(4)}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Render a YYYY-MM-DD day string as "MMM DD" in UTC.
function formatDay(dayStr) {
  if (!dayStr) return "—";
  const [y, m, d] = dayStr.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}

// Today UTC as YYYY-MM-DD
function todayUTC() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Date 14 days ago in YYYY-MM-DD (inclusive window)
function windowStart() {
  const now = new Date();
  now.setUTCDate(now.getUTCDate() - WINDOW_DAYS);
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// --- error-rate threshold → chip status --------------------------------

function errorRateStatus(errorRate, totalCalls) {
  if (totalCalls === 0) return "standby";
  if (errorRate < 1) return "nominal";
  if (errorRate <= 5) return "caution";
  return "critical";
}

function errorRateLabel(status) {
  if (status === "nominal") return "WITHIN LIMITS";
  if (status === "caution") return "ELEVATED";
  if (status === "critical") return "CRITICAL";
  return "NO DATA";
}

// --- ModuleCard (local, optional status chip) --------------------------

function ModuleCard({ label, code, readout, body, metadata, status, statusLabel }) {
  return (
    <div className="bg-slate-800 border border-slate-700 p-4 relative">
      <div className="absolute top-0 right-0 w-0 h-0 border-l-[12px] border-l-transparent border-t-[12px] border-t-ember-500/60"></div>

      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] tracking-[0.2em] text-slate-400 uppercase font-semibold">
          {label}
        </div>
        <div className="text-[9px] tracking-[0.15em] text-slate-600 font-mono uppercase">
          Module {code}
        </div>
      </div>

      <div className="text-2xl font-semibold text-slate-50 tracking-tight mb-1">
        {readout}
      </div>

      <div className="text-[11px] text-slate-500 mb-3">{body}</div>

      <div className="pt-3 border-t border-slate-700/50 flex items-center justify-between">
        {status ? (
          <>
            <div className="text-[9px] tracking-[0.1em] text-slate-600 uppercase font-mono">
              {metadata}
            </div>
            <StatusChip status={status}>{statusLabel || status.toUpperCase()}</StatusChip>
          </>
        ) : (
          <div className="text-[9px] tracking-[0.1em] text-slate-600 uppercase font-mono">
            {metadata}
          </div>
        )}
      </div>
    </div>
  );
}

// --- main component ----------------------------------------------------

export default function DailyStats() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetchAt, setLastFetchAt] = useState(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: qError } = await supabase
      .from("admin_daily_stats")
      .select(SELECT_COLUMNS)
      .gte("day", windowStart())
      .order("day", { ascending: false })
      .order("endpoint", { ascending: true })
      .order("provider", { ascending: true });

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
    document.title = "Tower · Daily Stats";
    fetchStats();
  }, [fetchStats]);

  // Derive "today" (max day in returned rows) + per-day aggregates
  const maxDay = rows.length > 0 ? rows[0].day : null;
  const todayRows = rows.filter((r) => r.day === maxDay);

  const totalCalls = todayRows.reduce((s, r) => s + Number(r.call_count || 0), 0);
  const totalErrors = todayRows.reduce((s, r) => s + Number(r.error_count || 0), 0);
  const totalCost = todayRows.reduce((s, r) => s + Number(r.cost_usd_total || 0), 0);
  const errorRate = totalCalls > 0 ? (totalErrors / totalCalls) * 100 : 0;

  // Weighted p95 across today's endpoints
  const p95Weighted =
    totalCalls > 0
      ? Math.round(
          todayRows.reduce(
            (s, r) => s + Number(r.p95_duration_ms || 0) * Number(r.call_count || 0),
            0
          ) / totalCalls
        )
      : null;

  const todayEndpointCount = new Set(todayRows.map((r) => r.endpoint)).size;
  const todayFormatted = maxDay ? formatDay(maxDay) : "—";
  const errRateChipStatus = errorRateStatus(errorRate, totalCalls);
  const todayISO = todayUTC();

  return (
    <div className="max-w-7xl">
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1 h-5 bg-ember-500"></div>
            <div className="text-[10px] tracking-[0.35em] text-ember-500 uppercase font-bold">
              Reports · Room 03
            </div>
          </div>
          <h1 className="text-3xl font-semibold text-slate-50 tracking-tight mb-2">
            Daily stats
          </h1>
          <p className="text-sm text-slate-400">
            Daily aggregates of AI volume, cost, error rate, and p95 latency. Materialized nightly at 02:00 UTC.
          </p>
        </div>

        <button
          onClick={fetchStats}
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
            onClick={fetchStats}
            className="mt-3 px-3 py-1.5 text-[10px] tracking-[0.15em] uppercase font-semibold border border-ember-500/50 text-ember-500 hover:bg-ember-500/10 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Initial loading state */}
      {loading && rows.length === 0 && !error && (
        <div className="bg-slate-800 border border-slate-700 p-6">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-ember-500 animate-pulse"></div>
            <div className="text-sm text-slate-400">Connecting to Supabase...</div>
          </div>
        </div>
      )}

      {/* Empty state: no rows in 14-day window */}
      {!loading && !error && rows.length === 0 && (
        <div className="bg-slate-800 border border-slate-700 p-8 text-center">
          <div className="text-sm text-slate-400">No daily stats available yet.</div>
          <div className="text-[11px] text-slate-600 mt-2">
            ai_daily_stats materializes nightly at 02:00 UTC. First data lands after the first cron run following a logged AI call.
          </div>
        </div>
      )}

      {/* Summary cards + table */}
      {!loading && !error && rows.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <ModuleCard
              label="Total Calls"
              code="D-03-C"
              readout={formatInt(totalCalls)}
              body={`Today (UTC) · ${todayFormatted}`}
              metadata={`Across ${todayEndpointCount} endpoint${todayEndpointCount === 1 ? "" : "s"}`}
            />
            <ModuleCard
              label="Total Cost"
              code="D-03-$"
              readout={formatCost(totalCost)}
              body={`Today (UTC) · ${todayFormatted}`}
              metadata="Budget tracking · TBD"
            />
            <ModuleCard
              label="Error Rate"
              code="D-03-E"
              readout={formatPercent(errorRate)}
              body={`${formatInt(totalErrors)} of ${formatInt(totalCalls)} calls`}
              metadata="Threshold · 1% / 5%"
              status={errRateChipStatus}
              statusLabel={errorRateLabel(errRateChipStatus)}
            />
            <ModuleCard
              label="Avg p95"
              code="D-03-P"
              readout={p95Weighted == null ? "—" : `${p95Weighted}ms`}
              body="Weighted across endpoints"
              metadata="Window · last 24h (UTC day)"
            />
          </div>

          {/* 14-day table */}
          <div className="bg-slate-800 border border-slate-700 p-4 relative">
            <div className="absolute top-0 right-0 w-0 h-0 border-l-[12px] border-l-transparent border-t-[12px] border-t-ember-500/60"></div>

            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-700">
                  <Th className="w-24">Day</Th>
                  <Th className="w-24">Endpoint</Th>
                  <Th className="w-20">Provider</Th>
                  <Th className="w-20 text-right">Calls</Th>
                  <Th className="w-20 text-right">Errors</Th>
                  <Th className="w-24 text-right">Cost</Th>
                  <Th className="w-20 text-right">p95 ms</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const isError = Number(r.error_count || 0) > 0;
                  const isToday = r.day === todayISO;
                  return (
                    <tr
                      key={`${r.day}-${r.endpoint}-${r.provider}-${r.plan_tier}-${i}`}
                      className={`border-b border-slate-700/30 text-[11px] text-slate-300 ${
                        isError
                          ? "bg-ember-950/20 hover:bg-ember-950/30"
                          : "hover:bg-slate-800/50"
                      }`}
                    >
                      <td className="py-2 px-2 whitespace-nowrap" title={r.day}>
                        {formatDay(r.day)}
                        {isToday && (
                          <span className="ml-2 text-[9px] tracking-[0.15em] text-ember-500 font-mono font-semibold uppercase">
                            Today
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2 whitespace-nowrap">{r.endpoint}</td>
                      <td className="py-2 px-2 whitespace-nowrap">{r.provider}</td>
                      <td className="py-2 px-2 text-right whitespace-nowrap font-mono">
                        {formatInt(r.call_count)}
                      </td>
                      <td className="py-2 px-2 text-right whitespace-nowrap font-mono">
                        {formatInt(r.error_count)}
                      </td>
                      <td className="py-2 px-2 text-right whitespace-nowrap font-mono">
                        {formatCost(r.cost_usd_total)}
                      </td>
                      <td className="py-2 px-2 text-right whitespace-nowrap font-mono">
                        {r.p95_duration_ms == null ? "—" : formatInt(r.p95_duration_ms)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Footer metadata */}
      {rows.length > 0 && lastFetchAt && (
        <div className="mt-4 text-[10px] tracking-[0.15em] text-slate-600 uppercase font-mono">
          Source · admin_daily_stats (view over ai_daily_stats) &nbsp;·&nbsp; Last refresh {formatAge(lastFetchAt.toISOString())} &nbsp;·&nbsp; Module D-03 &nbsp;·&nbsp; {rows.length} row{rows.length === 1 ? "" : "s"} across {WINDOW_DAYS} days
        </div>
      )}
    </div>
  );
}

// --- small helpers -----------------------------------------------------

function Th({ children, className = "" }) {
  return (
    <th
      className={`py-2 px-2 text-[10px] tracking-[0.15em] text-slate-400 uppercase font-mono font-medium ${className}`}
    >
      {children}
    </th>
  );
}
