// Room B-02 — Daily stats: summary cards + 14-day table.
// Sprint F Item 6, Session 17; redesigned Session 20 Phase 2.
//
// 4 "Today (UTC)" summary cards above a 14-day aggregate table.
// Data source: public.admin_daily_stats (wrapper VIEW from Migration 009).

import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import {
  Module,
  Stat,
  StatusPill,
  PageTitle,
  Btn,
} from "../components/shared";

const WINDOW_DAYS = 14;

const SELECT_COLUMNS =
  "day, endpoint, provider, plan_tier, call_count, success_count, error_count, cost_usd_total, avg_duration_ms, p95_duration_ms";

// --- formatters (preserved verbatim) ----------------------------------

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

function formatDay(dayStr) {
  if (!dayStr) return "—";
  const [y, m, d] = dayStr.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}

function todayUTC() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function windowStart() {
  const now = new Date();
  now.setUTCDate(now.getUTCDate() - WINDOW_DAYS);
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Error-rate threshold → pill kind (preserved).
function errorRatePillKind(errorRate, totalCalls) {
  if (totalCalls === 0) return "idle";
  if (errorRate < 1) return "ok";
  if (errorRate <= 5) return "warn";
  return "bad";
}

function errorRateStatTone(errorRate, totalCalls) {
  if (totalCalls === 0) return "default";
  if (errorRate < 1) return "good";
  if (errorRate <= 5) return "warn";
  return "bad";
}

// --- main component ---------------------------------------------------

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

  // Derive "today" aggregates (logic preserved).
  const maxDay = rows.length > 0 ? rows[0].day : null;
  const todayRows = rows.filter((r) => r.day === maxDay);

  const totalCalls = todayRows.reduce((s, r) => s + Number(r.call_count || 0), 0);
  const totalErrors = todayRows.reduce((s, r) => s + Number(r.error_count || 0), 0);
  const totalCost = todayRows.reduce((s, r) => s + Number(r.cost_usd_total || 0), 0);
  const errorRate = totalCalls > 0 ? (totalErrors / totalCalls) * 100 : 0;

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
  const todayISO = todayUTC();

  return (
    <div className="px-10 py-8 max-w-[1400px]">
      <PageTitle
        kicker={["REPORTS", "ROOM B-02"]}
        title="Daily Stats"
        desc="Aggregated daily rollups. Materialized nightly at 02:00 UTC. 14-day window."
        actions={
          <>
            {lastFetchAt && (
              <span className="hud-label">
                last sync <span className="text-slate-400 hud-data ml-1">{formatAge(lastFetchAt.toISOString())}</span>
              </span>
            )}
            <Btn icon="↻" onClick={fetchStats}>{loading ? "…" : "refresh"}</Btn>
          </>
        }
      />

      {/* Error banner */}
      {error && (
        <div className="mb-4 border border-red-500/40 bg-red-500/5 p-4 rounded-sm">
          <div className="hud-kicker text-red-400 mb-1">QUERY FAILED</div>
          <div className="text-sm text-slate-300">{error}</div>
          <div className="mt-3">
            <Btn variant="ghost" onClick={fetchStats}>retry</Btn>
          </div>
        </div>
      )}

      {/* Initial loading */}
      {loading && rows.length === 0 && !error && (
        <div className="mb-4 hud-label text-slate-400">connecting to supabase…</div>
      )}

      {/* Empty state */}
      {!loading && !error && rows.length === 0 && (
        <Module code="B-02" title="NO DATA">
          <div className="text-sm text-slate-400">No daily stats available yet.</div>
          <div className="hud-label text-slate-600 mt-2">
            ai_daily_stats materializes nightly at 02:00 UTC. First data lands after the first cron run following a logged AI call.
          </div>
        </Module>
      )}

      {/* Summary cards + table */}
      {!loading && !error && rows.length > 0 && (
        <>
          <div className="grid grid-cols-4 gap-3 mb-6">
            <Module code="B-02 · CALLS" title="TOTAL CALLS">
              <Stat
                label=""
                value={formatInt(totalCalls)}
                sub={`today (UTC) · ${todayFormatted}`}
                size="md"
              />
              <div className="mt-3 hud-label text-slate-500">
                across {todayEndpointCount} endpoint{todayEndpointCount === 1 ? "" : "s"}
              </div>
            </Module>
            <Module code="B-02 · COST" title="TOTAL COST">
              <Stat
                label=""
                value={formatCost(totalCost)}
                sub={`today (UTC) · ${todayFormatted}`}
                tone="accent"
                size="md"
              />
              <div className="mt-3 hud-label text-slate-500">budget tracking · TBD</div>
            </Module>
            <Module code="B-02 · ERR" title="ERROR RATE">
              <Stat
                label=""
                value={formatPercent(errorRate)}
                sub={`${formatInt(totalErrors)} of ${formatInt(totalCalls)} calls`}
                tone={errorRateStatTone(errorRate, totalCalls)}
                size="md"
              />
              <div className="mt-3">
                <StatusPill
                  kind={errorRatePillKind(errorRate, totalCalls)}
                  label={errorRate < 1 ? "within limits" : errorRate <= 5 ? "elevated" : totalCalls === 0 ? "no data" : "critical"}
                  size="sm"
                />
              </div>
            </Module>
            <Module code="B-02 · P95" title="AVG P95">
              <Stat
                label=""
                value={p95Weighted == null ? "—" : formatInt(p95Weighted)}
                unit={p95Weighted == null ? undefined : "ms"}
                sub="weighted across endpoints"
                size="md"
              />
              <div className="mt-3 hud-label text-slate-500">window · last 24h (UTC day)</div>
            </Module>
          </div>

          {/* 14-day table */}
          <Module code="B-02 · TABLE" title={`14-DAY ROLLUP · ${rows.length} ROW${rows.length === 1 ? "" : "S"}`}>
            <div className="font-mono text-[12.5px]">
              <div className="grid grid-cols-[110px_110px_90px_90px_90px_110px_90px] gap-3 px-2 py-2 hud-label text-slate-500 border-b border-slate-800/70">
                <span>DAY</span>
                <span>ENDPOINT</span>
                <span>PROVIDER</span>
                <span className="text-right">CALLS</span>
                <span className="text-right">ERRORS</span>
                <span className="text-right">COST</span>
                <span className="text-right">P95 MS</span>
              </div>
              {rows.map((r, i) => {
                const isError = Number(r.error_count || 0) > 0;
                const isToday = r.day === todayISO;
                return (
                  <div
                    key={`${r.day}-${r.endpoint}-${r.provider}-${r.plan_tier}-${i}`}
                    className={`grid grid-cols-[110px_110px_90px_90px_90px_110px_90px] gap-3 px-2 py-2.5 items-center border-b border-slate-800/30 hover:bg-slate-800/20 ${isError ? "bg-amber-500/[0.04]" : ""}`}
                    title={r.day}
                  >
                    <span className="hud-data text-slate-300">
                      {formatDay(r.day)}
                      {isToday && (
                        <span className="ml-2 hud-label text-orange-400">today</span>
                      )}
                    </span>
                    <span className="text-slate-200">{r.endpoint}</span>
                    <span className="text-slate-400">{r.provider}</span>
                    <span className="text-right hud-data text-slate-300">{formatInt(r.call_count)}</span>
                    <span className={`text-right hud-data ${Number(r.error_count || 0) > 0 ? "text-amber-400" : "text-slate-500"}`}>
                      {formatInt(r.error_count)}
                    </span>
                    <span className="text-right hud-data text-slate-400">{formatCost(r.cost_usd_total)}</span>
                    <span className="text-right hud-data text-slate-400">
                      {r.p95_duration_ms == null ? "—" : formatInt(r.p95_duration_ms)}
                    </span>
                  </div>
                );
              })}
            </div>
          </Module>
        </>
      )}
    </div>
  );
}
