// Room 4 — Engine Room: external uptime embed + hourly AI traffic chart (Sprint G Item 1, Session 18).
//
// Section 1: UptimeRobot status page embedded via iframe (no Supabase dependency).
// Section 2: Line chart of ai_call_log rows bucketed by UTC hour, last 24h.
//
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

const WINDOW_HOURS = 24;
const SELECT_COLUMNS = "created_at, provider";

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

// --- main component ----------------------------------------------------

export default function EngineRoom() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetchAt, setLastFetchAt] = useState(null);

  const fetchCalls = useCallback(async () => {
    setLoading(true);
    setError(null);
    const since = new Date(Date.now() - WINDOW_HOURS * 3_600_000).toISOString();
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

  // Build 24 UTC hourly buckets and count rows per provider.
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

      {/* Section 1: UptimeRobot embed */}
      <div className="bg-slate-800 border border-slate-700 p-4 relative mb-4">
        <div className="absolute top-0 right-0 w-0 h-0 border-l-[12px] border-l-transparent border-t-[12px] border-t-ember-500/60"></div>

        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] tracking-[0.2em] text-slate-400 uppercase font-semibold">
            Uptime
          </div>
          <div className="text-[9px] tracking-[0.15em] text-slate-600 font-mono uppercase">
            Module E-04-U
          </div>
        </div>

        <iframe
          src="https://stats.uptimerobot.com/FbQp9qBnJr"
          width="100%"
          height="500"
          frameBorder="0"
          title="UptimeRobot status"
        />

        <div className="mt-3 text-[9px] tracking-[0.15em] text-slate-600 font-mono uppercase">
          Source: UptimeRobot · External · Not native Tower data
        </div>
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
