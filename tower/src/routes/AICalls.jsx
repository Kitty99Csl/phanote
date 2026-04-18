// Room 2 — AI call log filtered table (Sprint F Item 5, Session 17).
//
// Plain table of ai_call_log rows. 100 newest first on mount, client-side
// filtered by Endpoint/Status/Provider dropdowns, server-side paginated
// via cursor ("Load more 100" fetches rows older than oldest loaded).
//
// Visible to admins only (Migration 009 policy "admins see all ai calls" +
// App.jsx is_admin gate). Non-admin sessions can't reach this route; if
// they did, Supabase RLS would return only their own rows — still safe.
//
// Data source: Supabase ai_call_log table via tower/src/lib/supabase.js.
// Module code: L-02.

import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import StatusChip from "../components/StatusChip";

const PAGE_SIZE = 100;

const ENDPOINT_OPTIONS = ["parse", "advise", "ocr", "monthly-report"];
const STATUS_OPTIONS = ["success", "error", "timeout"];
const PROVIDER_OPTIONS = ["gemini", "anthropic"];

const SELECT_COLUMNS =
  "id, created_at, endpoint, provider, model, status, duration_ms, tokens_in, tokens_out, cost_usd, error_class, error_message";

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

// Time column: relative if <1h, UTC clock if <24h, date+time otherwise.
function formatCallTime(iso) {
  if (!iso) return "—";
  const then = new Date(iso);
  const now = new Date();
  const secs = Math.floor((now - then) / 1000);
  if (secs < 3600) return formatAge(iso);
  const hh = String(then.getUTCHours()).padStart(2, "0");
  const mm = String(then.getUTCMinutes()).padStart(2, "0");
  if (secs < 86400) return `UTC ${hh}:${mm}`;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[then.getUTCMonth()]} ${then.getUTCDate()} ${hh}:${mm}`;
}

function formatDuration(ms) {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatTokens(tin, tout) {
  if (tin == null || tout == null) return "—";
  return `${tin}/${tout}`;
}

function formatCost(cost) {
  if (cost == null) return "—";
  return `$${Number(cost).toFixed(4)}`;
}

function statusToChip(status) {
  if (status === "success") return "nominal";
  if (status === "error") return "critical";
  if (status === "timeout") return "caution";
  return "standby";
}

// --- main component -----------------------------------------------------

export default function AICalls() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetchAt, setLastFetchAt] = useState(null);
  const [hasMore, setHasMore] = useState(false);

  const [filterEndpoint, setFilterEndpoint] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterProvider, setFilterProvider] = useState("");

  // Initial / manual-refresh fetch: newest 100 rows, reset pagination.
  const fetchInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: qError } = await supabase
      .from("ai_call_log")
      .select(SELECT_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (qError) {
      setError(qError.message || "Supabase query failed");
      setRows([]);
      setHasMore(false);
    } else {
      setRows(data || []);
      setHasMore((data || []).length >= PAGE_SIZE);
      setLastFetchAt(new Date());
    }
    setLoading(false);
  }, []);

  // Paginated fetch: cursor on oldest loaded row's created_at.
  const fetchMore = useCallback(async () => {
    if (rows.length === 0 || loadingMore) return;
    const cursor = rows[rows.length - 1].created_at;
    setLoadingMore(true);
    const { data, error: qError } = await supabase
      .from("ai_call_log")
      .select(SELECT_COLUMNS)
      .lt("created_at", cursor)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (qError) {
      setError(qError.message || "Load-more query failed");
    } else {
      const next = data || [];
      setRows((prev) => [...prev, ...next]);
      setHasMore(next.length >= PAGE_SIZE);
      setLastFetchAt(new Date());
    }
    setLoadingMore(false);
  }, [rows, loadingMore]);

  useEffect(() => {
    document.title = "Tower · AI Calls";
    fetchInitial();
  }, [fetchInitial]);

  // Client-side filter
  const filteredRows = rows.filter((r) => {
    if (filterEndpoint && r.endpoint !== filterEndpoint) return false;
    if (filterStatus && r.status !== filterStatus) return false;
    if (filterProvider && r.provider !== filterProvider) return false;
    return true;
  });

  return (
    <div className="max-w-7xl">
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1 h-5 bg-ember-500"></div>
            <div className="text-[10px] tracking-[0.35em] text-ember-500 uppercase font-bold">
              Reports · Room 02
            </div>
          </div>
          <h1 className="text-3xl font-semibold text-slate-50 tracking-tight mb-2">
            AI call log
          </h1>
          <p className="text-sm text-slate-400">
            Raw call-level records from the worker. Newest first. Client-side filter, server-side pagination.
          </p>
        </div>

        <button
          onClick={fetchInitial}
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
            onClick={fetchInitial}
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

      {/* Module card: filter bar + table */}
      {!loading && !error && (
        <div className="bg-slate-800 border border-slate-700 p-4 relative">
          {/* Top-right ember corner cut */}
          <div className="absolute top-0 right-0 w-0 h-0 border-l-[12px] border-l-transparent border-t-[12px] border-t-ember-500/60"></div>

          {/* Filter bar */}
          <div className="flex gap-4 mb-4 pb-4 border-b border-slate-700/50">
            <FilterSelect
              label="Endpoint"
              value={filterEndpoint}
              onChange={setFilterEndpoint}
              options={ENDPOINT_OPTIONS}
            />
            <FilterSelect
              label="Status"
              value={filterStatus}
              onChange={setFilterStatus}
              options={STATUS_OPTIONS}
            />
            <FilterSelect
              label="Provider"
              value={filterProvider}
              onChange={setFilterProvider}
              options={PROVIDER_OPTIONS}
            />
          </div>

          {/* Table or empty states */}
          {rows.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">
              No AI calls logged yet.
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-700">
                  <Th className="w-24">Time</Th>
                  <Th className="w-20">Endpoint</Th>
                  <Th className="w-16">Provider</Th>
                  <Th className="w-32">Model</Th>
                  <Th className="w-20">Status</Th>
                  <Th className="w-16 text-right">Duration</Th>
                  <Th className="w-20 text-right">Tokens</Th>
                  <Th className="w-20 text-right">Cost</Th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-sm text-slate-500">
                      No calls match these filters.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((r) => {
                    const isError = r.status !== "success";
                    return (
                      <tr
                        key={r.id}
                        className={`border-b border-slate-700/30 text-[11px] text-slate-300 ${
                          isError
                            ? "bg-ember-950/20 hover:bg-ember-950/30"
                            : "hover:bg-slate-800/50"
                        }`}
                      >
                        <td className="py-2 px-2 whitespace-nowrap" title={r.created_at}>
                          {formatCallTime(r.created_at)}
                        </td>
                        <td className="py-2 px-2 whitespace-nowrap">{r.endpoint}</td>
                        <td className="py-2 px-2 whitespace-nowrap">{r.provider}</td>
                        <td className="py-2 px-2 whitespace-nowrap font-mono text-[10px]" title={r.model}>
                          {r.model}
                        </td>
                        <td className="py-2 px-2">
                          <StatusChip status={statusToChip(r.status)}>
                            {(r.status || "").toUpperCase()}
                          </StatusChip>
                        </td>
                        <td className="py-2 px-2 text-right whitespace-nowrap">
                          {formatDuration(r.duration_ms)}
                        </td>
                        <td className="py-2 px-2 text-right whitespace-nowrap font-mono">
                          {formatTokens(r.tokens_in, r.tokens_out)}
                        </td>
                        <td className="py-2 px-2 text-right whitespace-nowrap font-mono">
                          {formatCost(r.cost_usd)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {/* Load more */}
          {rows.length > 0 && hasMore && (
            <div className="pt-4 flex justify-center">
              <button
                onClick={fetchMore}
                disabled={loadingMore}
                className="px-6 py-2 text-[11px] tracking-[0.15em] uppercase font-semibold border border-slate-700 text-slate-300 hover:border-ember-500 hover:text-ember-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loadingMore ? "Loading..." : `Load more ${PAGE_SIZE}`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Footer metadata */}
      {rows.length > 0 && lastFetchAt && (
        <div className="mt-4 text-[10px] tracking-[0.15em] text-slate-600 uppercase font-mono">
          Source · ai_call_log &nbsp;·&nbsp; Last refresh {formatAge(lastFetchAt.toISOString())} &nbsp;·&nbsp; Module L-02 &nbsp;·&nbsp; {filteredRows.length} of {rows.length} rows visible
        </div>
      )}
    </div>
  );
}

// --- small helpers ------------------------------------------------------

function Th({ children, className = "" }) {
  return (
    <th
      className={`py-2 px-2 text-[10px] tracking-[0.15em] text-slate-400 uppercase font-mono font-medium ${className}`}
    >
      {children}
    </th>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div className="flex flex-col">
      <label className="text-[9px] tracking-[0.15em] text-slate-400 uppercase font-mono mb-1">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-slate-900 border border-slate-700 text-slate-200 text-[11px] px-2 py-1.5 focus:outline-none focus:border-ember-500"
      >
        <option value="">All</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
