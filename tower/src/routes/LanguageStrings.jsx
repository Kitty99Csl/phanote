// Room 5 — Language Strings: translation table admin UI (Sprint H Item H-2, Session 19).
//
// CRUD table over public.translations — inline cell editing, search/filter by screen,
// "Sync from code" button to insert keys present in src/lib/i18n.js but missing from DB.
//
// Inline edit: click cell → input → blur or Enter saves → optimistic update → toast.
// Escape cancels edit without saving.
// Sync: compares bundled i18n.en keys against DB codes, upserts missing rows only
//   (ON CONFLICT DO NOTHING — preserves any admin edits already in DB).
//
// Data source: Supabase translations table via tower/src/lib/supabase.js.
// Pattern source: AICalls.jsx (header/error/loading), EngineRoom.jsx (CornerBrackets, module card).
// Module code: A-05.
//
// Rule 16 note: imports shared/i18n-data per Speaker Session 19 Q7=B decision.
//   shared/ is the Rule 16-compliant extraction point. Pure data only — no
//   Supabase client, no translations.js pulled into Tower's bundle.

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../lib/supabase";
import { i18nData as i18n } from "@shared/i18n-data";

const SELECT_COLUMNS = "id, code, en, lo, th, used_in, notes, updated_at, updated_by";

function formatAge(iso) {
  if (!iso) return "—";
  const secs = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

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

export default function LanguageStrings() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetchAt, setLastFetchAt] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [usedInFilter, setUsedInFilter] = useState("ALL");
  const [editingCell, setEditingCell] = useState(null); // { rowId, field }
  const [editValue, setEditValue] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success'|'error', message }

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(id);
  }, [toast]);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("translations")
      .select(SELECT_COLUMNS)
      .order("code");
    if (err) {
      setError(err.message);
    } else {
      setRows(data || []);
      setLastFetchAt(new Date());
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const filteredRows = useMemo(() => {
    let r = rows;
    if (usedInFilter !== "ALL") {
      r = r.filter(row => row.used_in === usedInFilter);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      r = r.filter(row =>
        row.code?.toLowerCase().includes(q) ||
        row.en?.toLowerCase().includes(q) ||
        row.lo?.toLowerCase().includes(q) ||
        row.th?.toLowerCase().includes(q)
      );
    }
    return r;
  }, [rows, searchTerm, usedInFilter]);

  const uniqueUsedIn = useMemo(() => {
    const vals = new Set(rows.map(r => r.used_in).filter(Boolean));
    return ["ALL", ...Array.from(vals).sort()];
  }, [rows]);

  function startEdit(rowId, field, currentValue) {
    setEditingCell({ rowId, field });
    setEditValue(currentValue ?? "");
  }

  async function saveEdit(rowId, field, newValue) {
    setEditingCell(null);
    setEditValue("");
    const row = rows.find(r => r.id === rowId);
    if (!row) return;
    const oldValue = row[field] ?? "";
    if (newValue === oldValue) return; // no-op

    // Optimistic update
    setRows(prev => prev.map(r => r.id === rowId ? { ...r, [field]: newValue || null } : r));

    const { error: err } = await supabase
      .from("translations")
      .update({ [field]: newValue || null })
      .eq("id", rowId);

    if (err) {
      setRows(prev => prev.map(r => r.id === rowId ? row : r)); // revert
      setToast({ type: "error", message: `Save failed: ${err.message}` });
    } else {
      setToast({ type: "success", message: "Saved" });
    }
  }

  function cancelEdit() {
    setEditingCell(null);
    setEditValue("");
  }

  async function syncFromCode() {
    setSyncing(true);
    const dbCodes = new Set(rows.map(r => r.code));
    const toInsert = Object.entries(i18n.en)
      .filter(([key, val]) => typeof val === "string" && !dbCodes.has(key))
      .map(([key, en]) => ({
        code: key,
        en,
        lo: typeof i18n.lo?.[key] === "string" ? i18n.lo[key] : null,
        th: typeof i18n.th?.[key] === "string" ? i18n.th[key] : null,
      }));

    if (toInsert.length === 0) {
      setToast({ type: "success", message: "Already in sync — 0 new keys" });
      setSyncing(false);
      return;
    }

    const { error: err } = await supabase
      .from("translations")
      .upsert(toInsert, { onConflict: "code", ignoreDuplicates: true });

    if (err) {
      setToast({ type: "error", message: `Sync failed: ${err.message}` });
    } else {
      setToast({ type: "success", message: `Synced ${toInsert.length} new key${toInsert.length !== 1 ? "s" : ""}` });
      await fetchRows();
    }
    setSyncing(false);
  }

  // Render helper (not a component) — closes over editingCell/editValue/handlers
  function renderCell(row, field) {
    const isEditing = editingCell?.rowId === row.id && editingCell?.field === field;
    const display = row[field] ?? "";

    if (isEditing) {
      return (
        <input
          autoFocus
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onBlur={() => saveEdit(row.id, field, editValue)}
          onKeyDown={e => {
            if (e.key === "Enter") { e.preventDefault(); saveEdit(row.id, field, editValue); }
            if (e.key === "Escape") { e.preventDefault(); cancelEdit(); }
          }}
          className="w-full bg-slate-900 border border-ember-500/70 text-slate-100 text-[11px] font-mono px-1.5 py-0.5 outline-none rounded-sm"
        />
      );
    }

    return (
      <span
        onClick={() => startEdit(row.id, field, display)}
        title="Click to edit"
        className="block w-full cursor-text text-slate-300 text-[11px] font-mono truncate hover:text-slate-100 hover:bg-slate-700/30 px-1 py-0.5 rounded-sm min-h-[20px]"
      >
        {display || <span className="text-slate-600 italic">—</span>}
      </span>
    );
  }

  return (
    <div className="p-6 space-y-5 font-mono">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 border text-[11px] tracking-[0.1em] uppercase rounded-sm shadow-lg
          ${toast.type === "success"
            ? "bg-green-950 border-green-500/60 text-green-400"
            : "bg-red-950 border-red-500/60 text-red-400"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Page header */}
      <div>
        <div className="text-[9px] tracking-[0.3em] text-ember-500/80 uppercase mb-1">
          Operations · Admin · Room 05
        </div>
        <h1 className="text-2xl font-semibold text-slate-100 tracking-tight">Language Strings</h1>
        <p className="text-[11px] text-slate-500 mt-1 tracking-wide max-w-xl">
          Edit translations without redeploys. Changes propagate within 7 days (cache TTL) or on user hard-refresh.
        </p>
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={fetchRows}
          disabled={loading}
          className="px-3 py-1.5 bg-slate-800 border border-slate-700 text-[10px] tracking-[0.2em] text-slate-400 uppercase hover:border-slate-600 hover:text-slate-300 disabled:opacity-40 transition-colors"
        >
          {loading ? "Loading…" : "↻ Refresh"}
        </button>
        <button
          onClick={syncFromCode}
          disabled={syncing || loading}
          className="px-3 py-1.5 bg-ember-500/10 border border-ember-500/50 text-[10px] tracking-[0.2em] text-ember-400 uppercase hover:border-ember-500/80 hover:text-ember-300 disabled:opacity-40 transition-colors"
        >
          {syncing ? "Syncing…" : "⟳ Sync from code"}
        </button>
        <span className="ml-auto text-[9px] text-slate-600 tracking-wider">
          {lastFetchAt ? `fetched ${formatAge(lastFetchAt.toISOString())}` : ""}
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="border border-red-500/40 bg-red-500/5 p-4 text-[11px] text-red-400">
          ▲ ERROR — {error}
        </div>
      )}

      {/* Search + filter */}
      {!loading && !error && (
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search code, EN, LO, TH…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="flex-1 bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-mono px-3 py-1.5 outline-none focus:border-slate-600 placeholder:text-slate-600"
          />
          <select
            value={usedInFilter}
            onChange={e => setUsedInFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-mono px-2 py-1.5 outline-none focus:border-slate-600 uppercase tracking-wider"
          >
            {uniqueUsedIn.map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
          <span className="text-[9px] text-slate-600 tracking-wider whitespace-nowrap">
            {filteredRows.length} / {rows.length} rows
          </span>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="border border-slate-700 bg-slate-800 p-8 text-center text-[11px] text-slate-500 tracking-wider">
          Loading translations…
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="relative border border-slate-700 bg-slate-800">
          <CornerBrackets />
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-slate-700">
                  {[
                    { label: "CODE",    cls: "w-40" },
                    { label: "EN",      cls: "w-56" },
                    { label: "LO",      cls: "w-56" },
                    { label: "TH",      cls: "w-56" },
                    { label: "USED_IN", cls: "w-32" },
                    { label: "UPDATED", cls: "w-24" },
                  ].map(({ label, cls }) => (
                    <th key={label} className={`${cls} text-left px-3 py-2 text-[9px] tracking-[0.2em] text-slate-500 uppercase font-normal`}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map(row => (
                  <tr key={row.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                    <td className="px-3 py-1.5 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {row.code}
                    </td>
                    <td className="px-1 py-1">{renderCell(row, "en")}</td>
                    <td className="px-1 py-1">{renderCell(row, "lo")}</td>
                    <td className="px-1 py-1">{renderCell(row, "th")}</td>
                    <td className="px-1 py-1">{renderCell(row, "used_in")}</td>
                    <td className="px-3 py-1.5 text-[9px] text-slate-600 whitespace-nowrap">
                      {formatAge(row.updated_at)}
                    </td>
                  </tr>
                ))}
                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-[11px] text-slate-600">
                      {searchTerm || usedInFilter !== "ALL" ? "No rows match filter" : "No translations found"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-between text-[9px] text-slate-600 tracking-wider uppercase pt-1">
        <span>Module A-05 · Language Strings</span>
        <span>{rows.length} total keys</span>
      </div>

    </div>
  );
}
