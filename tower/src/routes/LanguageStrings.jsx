// Room C-01 — Language Strings: editor-first redesign (Sprint H Item H-2,
// Session 19; redesigned Session 20 Phase 3).
//
// CRUD over public.translations:
//   - Inline cell editing on EN/LO/TH (textarea, autosize, blur/enter saves,
//     escape cancels)
//   - Click KEY column → opens side panel for longer translations
//   - Pill filter: all / missing (N) / recently edited (7 days)
//   - Search by code, en, lo, th
//   - Coverage widget showing % filled + per-language stacked bars
//   - "Sync from code" upserts new keys from shared/i18n-data.js (preserves
//     code-authoritative model — no manual "+ Add string" affordance)
//
// Data source: Supabase translations table via tower/src/lib/supabase.js.

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "../lib/supabase";
import { i18nData as i18n } from "@shared/i18n-data";
import { Kicker, Btn } from "../components/shared";

const SELECT_COLUMNS = "id, code, en, lo, th, used_in, notes, updated_at, updated_by";
const RECENT_WINDOW_MS = 7 * 24 * 3600 * 1000;

function formatAge(iso) {
  if (!iso) return "—";
  const secs = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export default function LanguageStrings() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetchAt, setLastFetchAt] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all"); // 'all' | 'missing' | 'recent'
  const [showContext, setShowContext] = useState(true);

  const [editingCell, setEditingCell] = useState(null); // { rowId, field }
  const [selectedId, setSelectedId] = useState(null);

  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState(null); // { type, message }
  const [lastSavedRowId, setLastSavedRowId] = useState(null);

  useEffect(() => { document.title = "Tower · Language Strings"; }, []);

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

  // Coverage stats (derived from current rows).
  const stats = useMemo(() => {
    const total = rows.length;
    const enHave = rows.filter(r => r.en).length;
    const loHave = rows.filter(r => r.lo).length;
    const thHave = rows.filter(r => r.th).length;
    const slots = total * 3;
    const filled = enHave + loHave + thHave;
    const missingCount = slots - filled;
    const coverage = slots > 0 ? Math.round((filled / slots) * 100) : 0;
    const enPct = total > 0 ? Math.round((enHave / total) * 100) : 0;
    const loPct = total > 0 ? Math.round((loHave / total) * 100) : 0;
    const thPct = total > 0 ? Math.round((thHave / total) * 100) : 0;
    return { total, missingCount, coverage, enPct, loPct, thPct };
  }, [rows]);

  const filteredRows = useMemo(() => {
    let r = rows;
    if (filter === "missing") {
      r = r.filter(row => row.lo == null || row.th == null);
    } else if (filter === "recent") {
      const cutoff = Date.now() - RECENT_WINDOW_MS;
      r = r.filter(row => row.updated_at && new Date(row.updated_at).getTime() >= cutoff);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      r = r.filter(row =>
        row.code?.toLowerCase().includes(q) ||
        row.en?.toLowerCase().includes(q) ||
        (row.lo || "").toLowerCase().includes(q) ||
        (row.th || "").toLowerCase().includes(q)
      );
    }
    return r;
  }, [rows, filter, searchQuery]);

  const selectedRow = useMemo(
    () => rows.find(r => r.id === selectedId) || null,
    [rows, selectedId]
  );

  // --- mutations (preserved verbatim from previous implementation) -----

  async function saveEdit(rowId, field, newValue) {
    setEditingCell(null);
    const row = rows.find(r => r.id === rowId);
    if (!row) return;
    const oldValue = row[field] ?? "";
    const trimmed = newValue ?? "";
    if (trimmed === oldValue) return;

    setRows(prev => prev.map(r => r.id === rowId ? { ...r, [field]: trimmed || null } : r));

    const { error: err } = await supabase
      .from("translations")
      .update({ [field]: trimmed || null })
      .eq("id", rowId);

    if (err) {
      setRows(prev => prev.map(r => r.id === rowId ? row : r));
      setToast({ type: "error", message: `Save failed: ${err.message}` });
    } else {
      setToast({ type: "success", message: "Saved" });
      setLastSavedRowId(rowId);
      setTimeout(() => setLastSavedRowId(null), 1500);
    }
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

  // --- handlers --------------------------------------------------------

  const handleSelectKey = (id) => setSelectedId(id === selectedId ? null : id);
  const handleEdit = (rowId, field) => setEditingCell({ rowId, field });
  const handleCancelEdit = () => setEditingCell(null);
  const handleClosePanel = () => setSelectedId(null);

  const recentCount = useMemo(() => {
    const cutoff = Date.now() - RECENT_WINDOW_MS;
    return rows.filter(r => r.updated_at && new Date(r.updated_at).getTime() >= cutoff).length;
  }, [rows]);

  return (
    <div className="flex flex-col h-[calc(100vh-40px)] min-w-0">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 border text-[12px] tracking-[0.1em] uppercase rounded-sm shadow-lg ${
            toast.type === "success"
              ? "bg-emerald-950 border-emerald-500/60 text-emerald-300"
              : "bg-red-950 border-red-500/60 text-red-300"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header row */}
      <div className="px-10 pt-8 pb-5 border-b border-slate-800/60 shrink-0">
        <div className="flex items-end justify-between gap-6">
          <div className="min-w-0">
            <Kicker parts={["ADMIN", "ROOM C-01"]} />
            <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-slate-50">Language Strings</h1>
            <p className="mt-1 text-[15px] text-slate-400 max-w-[70ch]">
              Edit app translations for Phajot. Click any cell to edit inline — or select a row and use the panel for longer strings.
            </p>
          </div>

          {/* Coverage widget */}
          <div className="flex items-center gap-8 shrink-0">
            <div>
              <div className="hud-label">COVERAGE</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-[26px] font-semibold text-slate-100 hud-data">{stats.coverage}%</span>
                {stats.missingCount > 0 && (
                  <span className="text-[13px] text-amber-400">{stats.missingCount} missing</span>
                )}
              </div>
            </div>
            <div className="w-56">
              <div className="hud-label mb-1.5">EN · LO · TH</div>
              <div className="flex h-2 gap-1 rounded-sm overflow-hidden bg-slate-800/60">
                <div className="bg-emerald-500/70" style={{ width: `${stats.enPct / 3}%` }} />
                <div className="bg-orange-500/70" style={{ width: `${stats.loPct / 3}%` }} />
                <div className="bg-sky-500/70" style={{ width: `${stats.thPct / 3}%` }} />
              </div>
              <div className="mt-1.5 grid grid-cols-3 gap-1 text-[11px] text-slate-500 font-mono">
                <span>EN · {stats.enPct}%</span>
                <span className="text-center">LO · {stats.loPct}%</span>
                <span className="text-right">TH · {stats.thPct}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="mt-5 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">⌕</span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search key, English, Lao, or Thai…"
              className="w-full bg-slate-900/80 border border-slate-700 text-slate-100 placeholder-slate-500 rounded-sm pl-9 pr-3 py-2.5 text-[14px] focus:border-orange-500/60 focus:bg-slate-900 outline-none"
            />
          </div>

          <div className="flex items-center rounded-sm border border-slate-700 overflow-hidden">
            {[
              { key: "all",     label: "All" },
              { key: "missing", label: `Missing (${stats.missingCount})` },
              { key: "recent",  label: `Recently edited${recentCount ? ` (${recentCount})` : ""}` },
            ].map((f, i) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-2 text-[13px] transition-colors ${
                  filter === f.key
                    ? "bg-orange-500/15 text-orange-300"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                } ${i > 0 ? "border-l border-slate-700" : ""}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setShowContext(s => !s)}
              className={`text-[13px] px-3 py-2 rounded-sm border transition-colors ${
                showContext
                  ? "border-orange-500/40 text-orange-300 bg-orange-500/10"
                  : "border-slate-700 text-slate-400 hover:text-slate-200"
              }`}
            >
              {showContext ? "☑" : "☐"} Show context
            </button>
            <Btn icon="↻" onClick={fetchRows} title={lastFetchAt ? `fetched ${formatAge(lastFetchAt.toISOString())}` : ""}>
              {loading ? "…" : "refresh"}
            </Btn>
            <Btn icon="⟳" variant="primary" onClick={syncFromCode}>
              {syncing ? "syncing…" : "sync from code"}
            </Btn>
          </div>
        </div>

        {/* Keyboard shortcuts */}
        <div className="mt-3 flex items-center gap-4 text-[12px] text-slate-500">
          <span><Kbd>↵</Kbd> save</span>
          <span><Kbd>esc</Kbd> cancel</span>
          <span><Kbd>⇧ ↵</Kbd> newline</span>
          <span className="ml-auto hud-label">{filteredRows.length} of {rows.length} keys</span>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-10 mt-4 border border-red-500/40 bg-red-500/5 p-4 rounded-sm shrink-0">
          <div className="hud-kicker text-red-400 mb-1">QUERY FAILED</div>
          <div className="text-sm text-slate-300">{error}</div>
        </div>
      )}

      {/* Loading */}
      {loading && rows.length === 0 && !error && (
        <div className="px-10 py-8 hud-label text-slate-400">loading translations…</div>
      )}

      {/* Body: table + side panel */}
      {!loading && !error && (
        <div className="flex-1 min-h-0 flex">
          {/* Table */}
          <div className="flex-1 min-w-[500px] overflow-auto">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10 bg-[#0b1220]">
                <tr className="text-left">
                  <th className="w-[220px] px-5 py-3 text-[11px] font-mono tracking-[0.18em] uppercase text-slate-500 border-b border-slate-800 font-medium">
                    Key
                  </th>
                  <th className="px-5 py-3 text-[11px] font-mono tracking-[0.18em] uppercase text-slate-500 border-b border-slate-800 font-medium">
                    <span className="inline-flex items-center gap-2">
                      <span className="text-emerald-400">●</span> English <span className="text-slate-600 ml-1 normal-case tracking-normal">source</span>
                    </span>
                  </th>
                  <th className="px-5 py-3 text-[11px] font-mono tracking-[0.18em] uppercase text-slate-500 border-b border-slate-800 font-medium">
                    <span className="inline-flex items-center gap-2"><span className="text-orange-400">●</span> Lao</span>
                  </th>
                  <th className="px-5 py-3 text-[11px] font-mono tracking-[0.18em] uppercase text-slate-500 border-b border-slate-800 font-medium">
                    <span className="inline-flex items-center gap-2"><span className="text-sky-400">●</span> Thai</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, idx) => (
                  <StringRow
                    key={row.id}
                    row={row}
                    selected={selectedId === row.id}
                    editing={editingCell}
                    showContext={showContext}
                    zebra={idx % 2 === 1}
                    isSaved={lastSavedRowId === row.id}
                    onSelectKey={() => handleSelectKey(row.id)}
                    onEdit={(field) => handleEdit(row.id, field)}
                    onCommit={saveEdit}
                    onCancel={handleCancelEdit}
                  />
                ))}
                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center text-[13px] text-slate-500">
                      {searchQuery || filter !== "all"
                        ? "No rows match filter"
                        : "No translations found — try Sync from code"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Side panel */}
          {selectedRow && (
            <StringSidePanel
              row={selectedRow}
              onCommit={saveEdit}
              onClose={handleClosePanel}
            />
          )}
        </div>
      )}
    </div>
  );
}

// --- StringRow ---------------------------------------------------------

function StringRow({ row, selected, editing, showContext, zebra, isSaved, onSelectKey, onEdit, onCommit, onCancel }) {
  const isMissing = row.lo == null || row.th == null;
  const baseBg =
    isSaved ? "bg-emerald-500/10"
    : selected ? "bg-orange-500/[0.06]"
    : isMissing ? "bg-amber-500/[0.04]"
    : zebra ? "bg-slate-900/30" : "";
  const accentBorder = selected
    ? "border-l-orange-500"
    : isMissing
    ? "border-l-amber-500/40"
    : "border-l-transparent";

  return (
    <tr className={`border-l-2 ${accentBorder} ${baseBg} hover:bg-orange-500/[0.04] transition-colors duration-300`}>
      {/* KEY cell — click opens side panel */}
      <td
        onClick={onSelectKey}
        className="align-top px-5 py-3.5 border-b border-slate-800/50 cursor-pointer group"
        title="Click to open side panel"
      >
        <div className="font-mono text-[13px] text-slate-300 group-hover:text-slate-100 transition-colors">{row.code}</div>
        {showContext && row.used_in && (
          <div className="mt-1 text-[11.5px] text-slate-500">{row.used_in}</div>
        )}
      </td>

      <Cell
        row={row} field="en"
        editing={editing} onEdit={onEdit} onCommit={onCommit} onCancel={onCancel}
        font=""
      />
      <Cell
        row={row} field="lo"
        editing={editing} onEdit={onEdit} onCommit={onCommit} onCancel={onCancel}
        font="font-lao"
        placeholder="ຫາຍໄປ — ຄລິກເພື່ອເພີ່ມ"
      />
      <Cell
        row={row} field="th"
        editing={editing} onEdit={onEdit} onCommit={onCommit} onCancel={onCancel}
        font="font-thai"
        placeholder="หายไป — คลิกเพื่อเพิ่ม"
      />
    </tr>
  );
}

function Cell({ row, field, editing, onEdit, onCommit, onCancel, font, placeholder }) {
  const isEditing = editing?.rowId === row.id && editing?.field === field;
  const text = row[field];
  const missing = !text;

  return (
    <td
      onClick={() => !isEditing && onEdit(field)}
      className="align-top px-5 py-3.5 border-b border-slate-800/50 cursor-text"
    >
      {isEditing ? (
        <EditableCell
          initial={text}
          font={font}
          onCommit={v => onCommit(row.id, field, v)}
          onCancel={onCancel}
        />
      ) : (
        <div
          className={`${font} text-[15px] leading-[1.5] ${
            missing ? "text-amber-400 italic text-[13px]" : "text-slate-100"
          } min-h-[22px]`}
        >
          {text || (
            <span className="italic text-amber-500">{placeholder || "missing — click to add"}</span>
          )}
        </div>
      )}
    </td>
  );
}

function EditableCell({ initial, font, onCommit, onCancel }) {
  const [val, setVal] = useState(initial || "");
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); ref.current?.select?.(); }, []);

  const rows = Math.min(6, Math.max(1, (val.match(/\n/g) || []).length + 1 + Math.floor(val.length / 48)));

  return (
    <textarea
      ref={ref}
      value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={() => onCommit(val)}
      onKeyDown={e => {
        if (e.key === "Escape") { e.preventDefault(); onCancel(); }
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onCommit(val); }
      }}
      rows={rows}
      className={`w-full bg-slate-900 border border-orange-500/60 rounded-sm px-2.5 py-1.5 text-[15px] leading-[1.55] text-slate-50 outline-none ring-2 ring-orange-500/20 resize-none ${font}`}
    />
  );
}

// --- Side panel --------------------------------------------------------

function StringSidePanel({ row, onCommit, onClose }) {
  return (
    <aside className="w-[380px] shrink-0 border-l border-slate-800/70 bg-slate-950/60 overflow-y-auto">
      <div className="px-5 py-4 border-b border-slate-800/70 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="hud-label text-slate-500">KEY</div>
          <div className="font-mono text-[14px] text-slate-100 mt-0.5 truncate">{row.code}</div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-200 text-xl leading-none px-1"
          title="Close"
        >
          ×
        </button>
      </div>

      <div className="px-5 py-4 space-y-5">
        <div>
          <div className="hud-label mb-1.5">CONTEXT</div>
          <div className="text-[13.5px] text-slate-300 leading-relaxed bg-slate-900/60 border border-slate-800 rounded-sm p-3">
            {row.used_in || <span className="text-slate-500 italic">no context provided</span>}
          </div>
        </div>

        <SidePanelField
          label="English · source"
          font=""
          value={row.en}
          accent="emerald"
          onSave={v => onCommit(row.id, "en", v)}
        />
        <SidePanelField
          label="Lao"
          font="font-lao"
          value={row.lo}
          placeholder="ໃສ່ຄຳແປລາວ…"
          accent="orange"
          onSave={v => onCommit(row.id, "lo", v)}
        />
        <SidePanelField
          label="Thai"
          font="font-thai"
          value={row.th}
          placeholder="ใส่คำแปลภาษาไทย…"
          accent="sky"
          onSave={v => onCommit(row.id, "th", v)}
        />

        {row.updated_at && (
          <div className="pt-4 border-t border-slate-800/70 hud-label text-slate-600">
            last updated {formatAge(row.updated_at)}
            {row.updated_by && <> · <span className="text-slate-500">{row.updated_by}</span></>}
          </div>
        )}
      </div>
    </aside>
  );
}

function SidePanelField({ label, font, value, placeholder, onSave, accent = "orange" }) {
  const [v, setV] = useState(value || "");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setV(value || "");
    setDirty(false);
  }, [value]);

  const dotCls = { emerald: "bg-emerald-400", orange: "bg-orange-400", sky: "bg-sky-400" }[accent];

  const save = () => {
    onSave(v);
    setDirty(false);
  };

  const rows = Math.max(2, Math.min(8, Math.floor(v.length / 40) + 1));

  return (
    <div>
      <div className="hud-label mb-1.5 flex items-center gap-2">
        <span className={`w-1.5 h-1.5 rounded-full ${dotCls}`} />
        <span className="text-slate-400">{label}</span>
        {!value && (
          <span className="text-amber-400 normal-case tracking-normal text-[11px] ml-auto">missing</span>
        )}
      </div>
      <textarea
        value={v}
        onChange={e => { setV(e.target.value); setDirty(e.target.value !== (value || "")); }}
        onKeyDown={e => {
          if (e.key === "Enter" && (e.shiftKey || e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            save();
          }
        }}
        placeholder={placeholder || "Enter translation…"}
        rows={rows}
        className={`w-full bg-slate-900 border border-slate-700 focus:border-orange-500/60 rounded-sm px-3 py-2.5 text-[15.5px] leading-[1.55] text-slate-50 placeholder-slate-600 outline-none resize-none ${font}`}
      />
      <div className="mt-1.5 flex items-center justify-between">
        <span className="text-[11px] text-slate-500 font-mono">{v.length} chars</span>
        {dirty && (
          <button
            onClick={save}
            className="text-[12px] px-2.5 py-1 rounded-sm bg-orange-500/15 border border-orange-500/50 text-orange-300 hover:bg-orange-500/25"
          >
            Save · ⇧↵
          </button>
        )}
      </div>
    </div>
  );
}

// --- tiny helpers -----------------------------------------------------

function Kbd({ children }) {
  return (
    <kbd className="px-1.5 py-0.5 rounded-sm border border-slate-700 bg-slate-800/60 text-slate-300 font-mono text-[11px]">
      {children}
    </kbd>
  );
}
