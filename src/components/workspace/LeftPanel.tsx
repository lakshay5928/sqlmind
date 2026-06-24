"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { History, Database, Plus, Trash2, Clock, ChevronRight, Upload, Table, FileCode, X, GitBranch } from "lucide-react";
import dynamic from "next/dynamic";
const ERDiagram = dynamic(() => import("./ERDiagram"), { ssr: false });
import SchemaBuilder from "./SchemaBuilder";
import { toast } from "sonner";
import { parseSQLSchema } from "@/lib/sql/schema-parser";

interface HistoryItem { id: string; input: string; mode: string; dialect: string; role: string; rawSql: string; healthScore: number; complexity: string; aiProvider: string; createdAt: string; notes?: string }
interface ParsedTable { name: string; columns: Array<{ name: string; type: string; nullable: boolean; primaryKey: boolean }> }

export default function LeftPanel({ schema, onSchemaChange, historyRefresh, onHistorySelect }: {
  schema: string; onSchemaChange: (s: string) => void;
  historyRefresh: number; onHistorySelect: (sql: string) => void;
}) {
  const [tab, setTab] = useState<"history" | "schema">("history");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [tables, setTables] = useState<ParsedTable[]>([]);
  const [schemaMode, setSchemaMode] = useState<"paste" | "upload" | "builder">("paste");
  const [pasteValue, setPasteValue] = useState("");
  const [expandedTable, setExpandedTable] = useState<string | null>(null);
  const [showERDiagram, setShowERDiagram] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      const r = await fetch("/api/history?limit=30");
      const data = await r.json();
      if (Array.isArray(data)) setHistory(data);
    } catch {}
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory, historyRefresh]);

  const deleteHistory = async (id: string) => {
    await fetch("/api/history", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setHistory(h => h.filter(i => i.id !== id));
    toast.success("Deleted");
  };

  const applySchema = (sql: string) => {
    onSchemaChange(sql);
    const parsed = parseSQLSchema(sql);
    setTables(parsed);
    toast.success(`Schema loaded — ${parsed.length} tables`);
  };

  const handleFileUpload = async (file: File) => {
    const name = file.name.toLowerCase();
    if (name.endsWith(".sql")) {
      const text = await file.text();
      applySchema(text);
      setPasteValue(text);
    } else if (name.endsWith(".csv")) {
      const text = await file.text();
      const r = await fetch("/api/schema", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: text, name: file.name.replace(".csv", ""), source: "csv" }) });
      const d = await r.json();
      if (d.rawSQL) { applySchema(d.rawSQL); setPasteValue(d.rawSQL); }
    } else {
      toast.error("Supported: .sql, .csv files");
    }
  };

  const healthColor = (s: number) => s >= 80 ? "#10B981" : s >= 60 ? "#06B6D4" : s >= 40 ? "#F59E0B" : "#EF4444";

  return (
    <div className="h-full flex flex-col bg-[#0A0A0C]">
      {/* Tabs */}
      <div className="flex border-b border-white/5">
        {[["history", History, "History"], ["schema", Database, "Schema"]].map(([key, Icon, label]) => (
          <button key={key as string} onClick={() => setTab(key as "history" | "schema")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-all border-b-2 ${tab === key ? "border-purple-500 text-purple-400 bg-purple-500/5" : "border-transparent text-zinc-600 hover:text-zinc-400"}`}>
            <Icon size={11} />
            {label as string}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {/* HISTORY TAB */}
        {tab === "history" && (
          <div className="space-y-2">
            {history.length === 0 ? (
              <div className="text-center py-8 text-zinc-700">
                <Clock size={24} className="mx-auto mb-2 opacity-50" />
                <p className="text-xs">No queries yet</p>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-2 mb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-600">{history.length} queries</span>
                    <button onClick={async () => { await fetch("/api/history", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: "all" }) }); setHistory([]); toast.success("History cleared"); }}
                      className="text-xs text-zinc-700 hover:text-red-400 transition-colors">Clear all</button>
                  </div>
                  <p className="text-[10px] text-zinc-500">Tap a query to reuse it. Use the trash icon to remove a single entry, or Clear all to reset this session's history.</p>
                </div>
                <AnimatePresence>
                  {history.map((item, i) => (
                    <motion.div key={item.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ delay: i * 0.03 }}
                      className="group glass rounded-lg p-2.5 border border-white/5 hover:border-white/10 cursor-pointer transition-all"
                      onClick={() => onHistorySelect(item.rawSql || item.input)}>
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-zinc-300 truncate font-mono">{item.input.slice(0, 40)}{item.input.length > 40 ? "…" : ""}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[10px] text-zinc-600">{item.dialect}</span>
                            <span className="text-[10px] text-zinc-700">·</span>
                            <span className="text-[10px]" style={{ color: healthColor(item.healthScore) }}>{item.healthScore}/100</span>
                            <span className="text-[10px] text-zinc-700">·</span>
                            <span className="text-[10px] text-zinc-600">{item.complexity}</span>
                          </div>
                        </div>
                        <button onClick={e => { e.stopPropagation(); deleteHistory(item.id); }}
                          className="opacity-0 group-hover:opacity-100 text-zinc-700 hover:text-red-400 transition-all p-0.5">
                          <Trash2 size={10} />
                        </button>
                      </div>
                      {item.notes && <p className="text-[10px] text-zinc-600 mt-1 italic truncate">"{item.notes}"</p>}
                      <div className="flex items-center gap-1 mt-1.5">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${item.aiProvider === "groq" ? "bg-purple-500/15 text-purple-400" : item.aiProvider === "ollama" ? "bg-green-500/15 text-green-400" : "bg-zinc-800 text-zinc-600"}`}>
                          {item.aiProvider}
                        </span>
                        <span className="text-[9px] text-zinc-700">{new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </>
            )}
          </div>
        )}

        {/* SCHEMA TAB */}
        {tab === "schema" && (
          <div className="space-y-3">
            {/* Mode selector */}
            <div className="flex gap-1 glass rounded-lg p-0.5 border border-white/5">
              {[["paste", FileCode, "Paste"], ["upload", Upload, "Upload"], ["builder", Table, "Builder"]].map(([key, Icon, label]) => (
                <button key={key as string} onClick={() => setSchemaMode(key as typeof schemaMode)}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[10px] font-medium transition-all ${schemaMode === key ? "bg-purple-600/20 text-purple-400" : "text-zinc-600 hover:text-zinc-400"}`}>
                  <Icon size={9} />
                  {label as string}
                </button>
              ))}
            </div>

            {schemaMode === "paste" && (
              <div>
                <textarea value={pasteValue} onChange={e => setPasteValue(e.target.value)}
                  placeholder={"CREATE TABLE employees (\n  id INT PRIMARY KEY,\n  name VARCHAR(255),\n  salary DECIMAL\n);"}
                  className="w-full h-36 bg-black/30 border border-white/5 rounded-lg p-2 text-[10px] font-mono text-zinc-400 resize-none focus:outline-none focus:border-purple-500/50 placeholder:text-zinc-700" />
                <button onClick={() => pasteValue && applySchema(pasteValue)}
                  className="w-full mt-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-500/30 rounded-lg py-1.5 text-xs font-medium transition-all flex items-center justify-center gap-1.5">
                  <Plus size={11} /> Apply Schema
                </button>
              </div>
            )}

            {schemaMode === "upload" && (
              <div>
                <label className="block w-full border-2 border-dashed border-white/10 hover:border-purple-500/30 rounded-xl p-6 text-center cursor-pointer transition-all group">
                  <Upload size={20} className="mx-auto mb-2 text-zinc-600 group-hover:text-purple-400 transition-colors" />
                  <p className="text-xs text-zinc-600 group-hover:text-zinc-400 transition-colors">.sql · .db · .sqlite · .csv</p>
                  <input type="file" accept=".sql,.csv,.db,.sqlite" className="hidden" onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
                </label>
              </div>
            )}

            {schemaMode === "builder" && (
              <SchemaBuilder onApply={(sql) => { applySchema(sql); setPasteValue(sql); setSchemaMode("paste"); }} />
            )}

            {/* Parsed tables */}
            {tables.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider">Parsed Tables ({tables.length})</p>
                {tables.map(t => (
                  <div key={t.name} className="glass rounded-lg border border-white/5 overflow-hidden">
                    <button onClick={() => setExpandedTable(expandedTable === t.name ? null : t.name)}
                      className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-white/3 transition-colors">
                      <div className="flex items-center gap-2">
                        <Table size={10} className="text-cyan-400" />
                        <span className="text-xs font-mono text-zinc-300">{t.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-zinc-600">{t.columns.length} cols</span>
                        <ChevronRight size={10} className={`text-zinc-600 transition-transform ${expandedTable === t.name ? "rotate-90" : ""}`} />
                      </div>
                    </button>
                    <AnimatePresence>
                      {expandedTable === t.name && (
                        <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                          <div className="border-t border-white/5 px-3 py-2 space-y-1">
                            {t.columns.map(c => (
                              <div key={c.name} className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  {c.primaryKey && <span className="text-[8px] bg-yellow-500/20 text-yellow-400 px-1 rounded">PK</span>}
                                  <span className="text-[10px] font-mono text-zinc-400">{c.name}</span>
                                </div>
                                <span className="text-[9px] text-zinc-600">{c.type}</span>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
                <div className="flex gap-1.5">
                  <button onClick={() => setShowERDiagram(true)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-[10px] bg-purple-600/15 hover:bg-purple-600/25 text-purple-400 border border-purple-500/30 rounded-lg py-1.5 transition-all">
                    <GitBranch size={9} /> ER Diagram
                  </button>
                  <button onClick={() => { setTables([]); onSchemaChange(""); setPasteValue(""); toast.success("Schema cleared"); }}
                    className="flex-1 flex items-center justify-center gap-1.5 text-[10px] text-zinc-700 hover:text-red-400 transition-colors py-1.5">
                    <X size={9} /> Clear
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {showERDiagram && schema && (
        <ERDiagram schema={schema} onClose={() => setShowERDiagram(false)} />
      )}
    </div>
  );
}