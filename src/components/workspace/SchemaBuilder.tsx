"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Table, ChevronDown, ChevronUp, Check } from "lucide-react";

interface Column { name: string; type: string; primaryKey: boolean; nullable: boolean; foreignKey: string }
interface BuilderTable { id: string; name: string; columns: Column[] }

const SQL_TYPES = ["INT", "BIGINT", "VARCHAR(255)", "TEXT", "BOOLEAN", "DECIMAL(10,2)", "DATE", "TIMESTAMP", "UUID", "JSON", "FLOAT"];

const defaultCol = (): Column => ({ name: "", type: "VARCHAR(255)", primaryKey: false, nullable: true, foreignKey: "" });
const defaultTable = (n: number): BuilderTable => ({
  id: String(Date.now()),
  name: `table_${n}`,
  columns: [{ name: "id", type: "INT", primaryKey: true, nullable: false, foreignKey: "" }, defaultCol()],
});

interface SchemaBuilderProps { onApply: (sql: string) => void }

export default function SchemaBuilder({ onApply }: SchemaBuilderProps) {
  const [tables, setTables] = useState<BuilderTable[]>([defaultTable(1)]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const addTable = () => setTables(t => [...t, defaultTable(t.length + 1)]);
  const removeTable = (id: string) => setTables(t => t.filter(x => x.id !== id));
  const updateTable = (id: string, name: string) => setTables(t => t.map(x => x.id === id ? { ...x, name } : x));
  const addCol = (id: string) => setTables(t => t.map(x => x.id === id ? { ...x, columns: [...x.columns, defaultCol()] } : x));
  const removeCol = (tid: string, ci: number) => setTables(t => t.map(x => x.id === tid ? { ...x, columns: x.columns.filter((_, i) => i !== ci) } : x));
  const updateCol = (tid: string, ci: number, field: keyof Column, val: string | boolean) =>
    setTables(t => t.map(x => x.id === tid ? { ...x, columns: x.columns.map((c, i) => i === ci ? { ...c, [field]: val } : c) } : x));

  const generateSQL = () => {
    return tables.map(t => {
      const cols = t.columns.filter(c => c.name).map(c =>
        `  ${c.name} ${c.type}${c.primaryKey ? " PRIMARY KEY" : ""}${!c.nullable ? " NOT NULL" : ""}${c.foreignKey ? ` REFERENCES ${c.foreignKey}(id)` : ""}`
      ).join(",\n");
      return `CREATE TABLE ${t.name || "unnamed"} (\n${cols}\n);`;
    }).join("\n\n");
  };

  const handleApply = () => {
    const sql = generateSQL();
    onApply(sql);
  };

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {tables.map((table, ti) => (
          <motion.div key={table.id} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="glass rounded-xl border border-white/5 overflow-hidden">
            {/* Table header */}
            <div className="flex items-center gap-2 px-3 py-2 bg-black/20 border-b border-white/5">
              <Table size={10} className="text-cyan-400 flex-none" />
              <input value={table.name} onChange={e => updateTable(table.id, e.target.value)}
                className="flex-1 bg-transparent text-xs font-mono text-zinc-200 focus:outline-none placeholder:text-zinc-700"
                placeholder="table_name" />
              <button onClick={() => setCollapsed(c => ({ ...c, [table.id]: !c[table.id] }))} className="text-zinc-600 hover:text-zinc-400 transition-colors">
                {collapsed[table.id] ? <ChevronDown size={11} /> : <ChevronUp size={11} />}
              </button>
              {tables.length > 1 && (
                <button onClick={() => removeTable(table.id)} className="text-zinc-700 hover:text-red-400 transition-colors"><Trash2 size={10} /></button>
              )}
            </div>

            {/* Columns */}
            <AnimatePresence>
              {!collapsed[table.id] && (
                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                  <div className="p-2 space-y-1">
                    {/* Column header row */}
                    <div className="grid grid-cols-12 gap-1 px-1 mb-1">
                      {["Name", "Type", "PK", "NULL", "FK →", ""].map((h, i) => (
                        <div key={i} className={`text-[9px] text-zinc-700 font-medium ${i === 0 ? "col-span-3" : i === 1 ? "col-span-3" : i === 4 ? "col-span-3" : "col-span-1"}`}>{h}</div>
                      ))}
                    </div>

                    {table.columns.map((col, ci) => (
                      <div key={ci} className="grid grid-cols-12 gap-1 items-center">
                        {/* Name */}
                        <input value={col.name} onChange={e => updateCol(table.id, ci, "name", e.target.value)}
                          className="col-span-3 bg-black/30 border border-white/5 rounded px-1.5 py-1 text-[10px] font-mono text-zinc-300 focus:outline-none focus:border-purple-500/40 placeholder:text-zinc-700"
                          placeholder="col_name" />
                        {/* Type */}
                        <select value={col.type} onChange={e => updateCol(table.id, ci, "type", e.target.value)}
                          className="col-span-3 bg-black/30 border border-white/5 rounded px-1 py-1 text-[10px] text-zinc-400 focus:outline-none cursor-pointer">
                          {SQL_TYPES.map(t => <option key={t}>{t}</option>)}
                        </select>
                        {/* PK */}
                        <button onClick={() => updateCol(table.id, ci, "primaryKey", !col.primaryKey)}
                          className={`col-span-1 h-6 w-6 rounded border flex items-center justify-center transition-all ${col.primaryKey ? "bg-yellow-500/20 border-yellow-500/40 text-yellow-400" : "border-white/5 text-zinc-700 hover:border-white/15"}`}>
                          {col.primaryKey && <Check size={8} />}
                        </button>
                        {/* Nullable */}
                        <button onClick={() => updateCol(table.id, ci, "nullable", !col.nullable)}
                          className={`col-span-1 h-6 w-6 rounded border flex items-center justify-center transition-all ${col.nullable ? "bg-green-500/10 border-green-500/20 text-green-400" : "border-white/5 text-zinc-700"}`}>
                          {col.nullable && <Check size={8} />}
                        </button>
                        {/* FK */}
                        <input value={col.foreignKey} onChange={e => updateCol(table.id, ci, "foreignKey", e.target.value)}
                          className="col-span-3 bg-black/30 border border-white/5 rounded px-1.5 py-1 text-[10px] font-mono text-purple-300 focus:outline-none focus:border-purple-500/40 placeholder:text-zinc-700"
                          placeholder="ref_table" />
                        {/* Delete */}
                        <button onClick={() => removeCol(table.id, ci)} disabled={table.columns.length <= 1}
                          className="col-span-1 text-zinc-700 hover:text-red-400 transition-colors disabled:opacity-20 flex items-center justify-center">
                          <Trash2 size={9} />
                        </button>
                      </div>
                    ))}

                    <button onClick={() => addCol(table.id)}
                      className="w-full flex items-center justify-center gap-1 text-[10px] text-zinc-700 hover:text-purple-400 transition-colors py-1.5 border border-dashed border-white/5 hover:border-purple-500/20 rounded-lg mt-1">
                      <Plus size={9} /> Add Column
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </AnimatePresence>

      <div className="flex gap-2">
        <button onClick={addTable}
          className="flex-1 flex items-center justify-center gap-1.5 text-[10px] glass border border-dashed border-white/10 hover:border-purple-500/30 text-zinc-600 hover:text-purple-400 rounded-lg py-2 transition-all">
          <Plus size={10} /> Add Table
        </button>
        <button onClick={handleApply}
          className="flex-1 flex items-center justify-center gap-1.5 text-[10px] bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-500/30 rounded-lg py-2 transition-all font-medium">
          <Check size={10} /> Apply Schema
        </button>
      </div>

      {/* Preview */}
      <details className="glass rounded-lg border border-white/5">
        <summary className="px-3 py-2 text-[10px] text-zinc-600 cursor-pointer hover:text-zinc-400 transition-colors">Preview SQL</summary>
        <pre className="px-3 pb-2 text-[10px] font-mono text-green-400 whitespace-pre-wrap">{generateSQL()}</pre>
      </details>
    </div>
  );
}
