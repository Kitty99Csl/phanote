// Room B-01 — AI call log (Sprint F Item 5, Session 17; redesigned Session 20 Phase 2).
//
// Plain table of ai_call_log rows. 100 newest first on mount, client-side
// filtered by Endpoint/Status/Provider dropdowns, server-side paginated
// via cursor ("Load more 100" fetches rows older than oldest loaded).
//
// Visible to admins only (Migration 009 policy + App.jsx is_admin gate).

import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "../lib/supabase";
import {
  Module,
  Stat,
  StatusPill,
  PageTitle,
  Btn,
  Select,
  LiveDot,
} from "../components/shared";

const PAGE_SIZE = 100;

const ENDPOINT_OPTIONS = ["parse", "advise", "ocr", "monthly-report"];
const STATUS_OPTIONS = ["success", "error", "timeout"];
const PROVIDER_OPTIONS = ["gemini", "anthropic"];

const SELECT_COLUMNS =
  "id, created_at, endpoint, provider, model, status, duration_ms, tokens_in, tokens_out, cost_usd, error_class, error_message";

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

function statusPillKind(status) {
  if (status === "success") return "ok";
  if (status === "error") return "bad";
  if (status === "timeout") return "warn";
  return "idle";
}

// --- main component ---------------------------------------------------

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

  const filteredRows = rows.filter((r) => {
    if (filterEndpoint && r.endpoint !== filterEndpoint) return false;
    if (filterStatus && r.status !== filterStatus) return false;
    if (filterProvider && r.provider !== filterProvider) return false;
    return true;
  });

  // Summary stats derived from currently-loaded rows.
  const summary = useMemo(() => {
    const total = rows.length;
    const success = rows.filter(r => r.status === "success").length;
    const errors = rows.filter(r => r.status === "error" || r.status === "timeout").length;
    const durations = rows
      .map(r => r.duration_ms)
      .filter(v => v != null && !Number.isNaN(v))
      .sort((a, b) => a - b);
    const median = durations.length > 0 ? durations[Math.floor(durations.length / 2)] : null;
    return { total, success, errors, median };
  }, [rows]);

  const endpointOptions = ["all", ...ENDPOINT_OPTIONS];
  const statusOptions = ["all", ...STATUS_OPTIONS];
  const providerOptions = ["all", ...PROVIDER_OPTIONS];

  return (
    <div className="px-10 py-8 max-w-[1400px]">
      <PageTitle
        kicker={["REPORTS", "ROOM B-01"]}
        title="AI Call Log"
        desc="Raw call-level records from the worker. Newest first. Client-side filter, server-side pagination."
        actions={
          <>
            {lastFetchAt && (
              <span className="hud-label">
                last sync <span className="text-slate-400 hud-data ml-1">{formatAge(lastFetchAt.toISOString())}</span>
              </span>
            )}
            <Btn icon="↻" variant="primary" onClick={fetchInitial}>{loading ? "…" : "refresh"}</Btn>
          </>
        }
      />

      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <Module code="TOTAL" title="CALLS · LOADED">
          <Stat label="" value={summary.total.toLocaleString("en-US")} sub={hasMore ? "more available ↓" : "all rows"} size="md" />
        </Module>
        <Module code="OK" title="SUCCESS">
          <Stat
            label=""
            value={summary.success.toLocaleString("en-US")}
            unit={`/ ${summary.total.toLocaleString("en-US")}`}
            tone="good"
            size="md"
          />
        </Module>
        <Module code="ERR" title="ERRORS">
          <Stat
            label=""
            value={summary.errors.toLocaleString("en-US")}
            tone={summary.errors > 0 ? "warn" : "good"}
            sub={summary.total > 0 ? `${((summary.errors / summary.total) * 100).toFixed(1)}%` : "—"}
            size="md"
          />
        </Module>
        <Module code="LAT" title="MEDIAN LATENCY">
          <Stat
            label=""
            value={summary.median != null ? (summary.median / 1000).toFixed(2) : "—"}
            unit={summary.median != null ? "s" : undefined}
            sub="from loaded rows"
            size="md"
          />
        </Module>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 border border-red-500/40 bg-red-500/5 p-4 rounded-sm">
          <div className="hud-kicker text-red-400 mb-1">QUERY FAILED</div>
          <div className="text-sm text-slate-300">{error}</div>
          <div className="mt-3">
            <Btn variant="ghost" onClick={fetchInitial}>retry</Btn>
          </div>
        </div>
      )}

      {/* Initial loading */}
      {loading && rows.length === 0 && !error && (
        <div className="mb-4 hud-label text-slate-400">connecting to supabase…</div>
      )}

      {/* Activity log */}
      {!loading && !error && (
        <Module code="B-01 · LOG" title="ACTIVITY LOG">
          {/* Filters */}
          <div className="flex items-center gap-4 pb-3 mb-3 border-b border-slate-800/70 flex-wrap">
            <Select
              label="endpoint"
              value={filterEndpoint || "all"}
              onChange={v => setFilterEndpoint(v === "all" ? "" : v)}
              options={endpointOptions}
            />
            <Select
              label="status"
              value={filterStatus || "all"}
              onChange={v => setFilterStatus(v === "all" ? "" : v)}
              options={statusOptions}
            />
            <Select
              label="provider"
              value={filterProvider || "all"}
              onChange={v => setFilterProvider(v === "all" ? "" : v)}
              options={providerOptions}
            />
            <div className="ml-auto flex items-center gap-3 hud-label">
              <span>{filteredRows.length} of {rows.length}</span>
              <span className="text-slate-700">|</span>
              <span className="flex items-center gap-1.5"><LiveDot /> streaming</span>
            </div>
          </div>

          {/* Table */}
          {rows.length === 0 ? (
            <div className="py-8 text-center hud-label text-slate-500">no AI calls logged yet</div>
          ) : (
            <div className="font-mono text-[12.5px]">
              <div className="grid grid-cols-[130px_110px_90px_1fr_90px_90px_110px_100px] gap-3 px-2 py-2 hud-label text-slate-500 border-b border-slate-800/70">
                <span>TIME</span>
                <span>ENDPOINT</span>
                <span>PROVIDER</span>
                <span>MODEL</span>
                <span>STATUS</span>
                <span className="text-right">DURATION</span>
                <span className="text-right">TOKENS</span>
                <span className="text-right">COST</span>
              </div>
              {filteredRows.length === 0 ? (
                <div className="py-8 text-center hud-label text-slate-500">no calls match these filters</div>
              ) : (
                filteredRows.map((r, i) => (
                  <div
                    key={r.id}
                    className={`grid grid-cols-[130px_110px_90px_1fr_90px_90px_110px_100px] gap-3 px-2 py-2.5 items-center border-b border-slate-800/40 hover:bg-orange-500/[0.04] ${i % 2 ? "bg-slate-800/20" : ""}`}
                    title={r.created_at}
                  >
                    <span className="text-slate-500">{formatCallTime(r.created_at)}</span>
                    <span className="text-slate-200 truncate">{r.endpoint}</span>
                    <span className="text-slate-400">{r.provider}</span>
                    <span className="text-slate-400 truncate" title={r.model}>{r.model}</span>
                    <span>
                      <StatusPill kind={statusPillKind(r.status)} label={r.status || "—"} size="sm" />
                    </span>
                    <span className="text-right hud-data text-slate-300">{formatDuration(r.duration_ms)}</span>
                    <span className="text-right hud-data text-slate-400">{formatTokens(r.tokens_in, r.tokens_out)}</span>
                    <span className="text-right hud-data text-slate-400">{formatCost(r.cost_usd)}</span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Load more */}
          {rows.length > 0 && hasMore && (
            <div className="mt-4 flex justify-center">
              <Btn onClick={fetchMore}>
                {loadingMore ? "loading…" : `load more ${PAGE_SIZE}`}
              </Btn>
            </div>
          )}
        </Module>
      )}
    </div>
  );
}
