"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Sparkles, Copy, RotateCcw, FileCode, BookOpen, StickyNote, ChevronDown, Check, Wand2 } from "lucide-react";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import type { QueryResult } from "@/app/workspace/page";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface Template { id: string; name: string; category: string; description: string; sql: string; tags: string }

const MONACO_OPTIONS = {
  fontSize: 13, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.7,
  minimap: { enabled: false }, scrollBeyondLastLine: false, wordWrap: "on" as const,
  theme: "vs-dark", padding: { top: 16, bottom: 16 }, scrollbar: { vertical: "hidden" as const },
  overviewRulerLanes: 0, hideCursorInOverviewRuler: true, renderLineHighlight: "gutter" as const,
  lineNumbers: "on" as const, glyphMargin: false, folding: false, lineDecorationsWidth: 0,
};

export default function CenterPanel({ mode, dialect, role, schema, loading, onSubmit, result }: {
  mode: "nl" | "sql"; dialect: string; role: string; schema: string;
  loading: boolean; onSubmit: (input: string, notes?: string) => void; result: QueryResult | null;
}) {
  const [nlInput, setNlInput] = useState("");
  const [sqlInput, setSqlInput] = useState("SELECT * FROM employees WHERE department = 'IT' LIMIT 10;");
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [copied, setCopied] = useState(false);
  const [templateFilter, setTemplateFilter] = useState("All");
  const nlRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch("/api/templates").then(r => r.json()).then(setTemplates).catch(() => {});
  }, []);

  useEffect(() => {
    if (result?.optimizedSQL && mode === "sql") setSqlInput(result.optimizedSQL);
    if (result?.rawSQL && mode === "nl") setSqlInput(result.rawSQL);
  }, [result, mode]);

  const handleSubmit = () => {
    const input = mode === "nl" ? nlInput.trim() : sqlInput.trim();
    onSubmit(input, notes || undefined);
  };

  const copySQL = async () => {
    const sql = result?.rawSQL || sqlInput;
    await navigator.clipboard.writeText(sql);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
    toast.success("Copied to clipboard");
  };

  const categories = ["All", ...Array.from(new Set(templates.map(t => t.category)))];
  const filteredTemplates = templateFilter === "All" ? templates : templates.filter(t => t.category === templateFilter);

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex-none flex items-center justify-between px-4 py-2 border-b border-white/5 bg-black/20">
        <div className="flex items-center gap-2">
          <FileCode size={13} className="text-zinc-600" />
          <span className="text-xs text-zinc-500 font-mono">{dialect}.sql</span>
          {schema && <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full">Schema loaded</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowTemplates(!showTemplates)}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 glass border border-white/5 hover:border-white/10 rounded-lg px-2.5 py-1 transition-all">
            <BookOpen size={11} /> Templates
          </button>
          <button onClick={() => setShowNotes(!showNotes)}
            className={`flex items-center gap-1.5 text-xs glass border rounded-lg px-2.5 py-1 transition-all ${showNotes ? "border-yellow-500/30 text-yellow-400 bg-yellow-500/5" : "border-white/5 text-zinc-500 hover:text-zinc-300 hover:border-white/10"}`}>
            <StickyNote size={11} /> Notes
          </button>
          <button onClick={copySQL}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 glass border border-white/5 hover:border-white/10 rounded-lg px-2.5 py-1 transition-all">
            {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button onClick={() => { setSqlInput(""); setNlInput(""); }}
            className="text-zinc-600 hover:text-zinc-400 transition-colors p-1">
            <RotateCcw size={12} />
          </button>
        </div>
      </div>

      {/* Templates dropdown */}
      <AnimatePresence>
        {showTemplates && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="flex-none border-b border-white/5 bg-black/30 overflow-hidden">
            <div className="p-3">
              <div className="flex items-center gap-2 mb-2 overflow-x-auto pb-1">
                {categories.map(c => (
                  <button key={c} onClick={() => setTemplateFilter(c)}
                    className={`flex-none text-[10px] px-2.5 py-1 rounded-full border transition-all font-medium ${templateFilter === c ? "bg-purple-600/20 border-purple-500/40 text-purple-300" : "border-white/5 text-zinc-600 hover:text-zinc-400"}`}>
                    {c}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {filteredTemplates.map(t => (
                  <button key={t.id} onClick={() => { setSqlInput(t.sql); setShowTemplates(false); toast.success(`Template: ${t.name}`); }}
                    className="text-left glass rounded-lg p-2.5 border border-white/5 hover:border-purple-500/30 transition-all group">
                    <div className="text-xs font-medium text-zinc-300 group-hover:text-white transition-colors">{t.name}</div>
                    <div className="text-[10px] text-zinc-600 mt-0.5">{t.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notes */}
      <AnimatePresence>
        {showNotes && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="flex-none border-b border-yellow-500/10 bg-yellow-500/3 overflow-hidden">
            <div className="p-3">
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add notes about this query (saved to history)..."
                className="w-full bg-transparent text-xs text-zinc-300 placeholder:text-zinc-700 focus:outline-none" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Editor area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {mode === "nl" ? (
          <div className="flex-1 flex flex-col p-4 gap-3">
            {/* NL Input */}
            <div className="flex-1 relative">
              <div className="absolute top-3 left-3 text-xs text-zinc-700 font-medium flex items-center gap-1.5">
                <Sparkles size={10} className="text-purple-400" />
                Natural Language Input
              </div>
              <textarea
                ref={nlRef}
                value={nlInput}
                onChange={e => setNlInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit(); }}
                placeholder={"Describe what you want in plain English...\n\nExamples:\n• Show top 10 employees by salary in IT department\n• Find all orders placed in last 30 days with customer names\n• Count products grouped by category\n• Update salary of employees in Marketing by 15%"}
                className="w-full h-full bg-[#0D0D0F] border border-white/5 rounded-xl pt-8 pb-4 px-4 text-sm text-zinc-300 placeholder:text-zinc-700 resize-none focus:outline-none focus:border-purple-500/40 font-sans leading-relaxed transition-colors"
              />
              {schema && (
                <div className="absolute bottom-3 left-3 text-[10px] text-cyan-400/60">
                  Schema context active · {schema.split("CREATE TABLE").length - 1} tables
                </div>
              )}
              <div className="absolute bottom-3 right-3 text-[10px] text-zinc-700">Ctrl+Enter to run</div>
            </div>

            {/* Generated SQL preview */}
            {result?.rawSQL && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="flex-none bg-[#0D0D0F] border border-white/5 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
                  <span className="text-[10px] text-zinc-600 font-mono">Generated SQL</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${result.productionReady ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>
                      {result.productionReady ? "✓ Production Ready" : "⚠ Review needed"}
                    </span>
                  </div>
                </div>
                <pre className="p-3 text-xs font-mono text-green-400 overflow-x-auto max-h-32 overflow-y-auto">{result.rawSQL}</pre>
              </motion.div>
            )}
          </div>
        ) : (
          <div className="flex-1 relative overflow-hidden">
            <div className="h-full bg-[#0D0D0F]">
              <MonacoEditor
                height="100%"
                language="sql"
                value={sqlInput}
                onChange={v => setSqlInput(v || "")}
                options={MONACO_OPTIONS}
                theme="vs-dark"
              />
            </div>
          </div>
        )}
      </div>

      {/* Submit bar */}
      <div className="flex-none border-t border-white/5 bg-black/30 p-3 flex items-center justify-between">
        <div className="text-[10px] text-zinc-700">
          {mode === "nl" ? "AI will generate SQL based on your description" : "Paste any SQL — AI will analyze and optimize it"}
          {role === "end_user" && <span className="ml-2 text-green-400/60">· Read-only mode</span>}
        </div>
        <motion.button
          onClick={handleSubmit}
          disabled={loading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-purple-900/30"
        >
          {loading ? (
            <>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full" />
              Analyzing...
            </>
          ) : (
            <>
              {mode === "nl" ? <Wand2 size={14} /> : <Play size={14} />}
              {mode === "nl" ? "Generate & Analyze" : "Analyze SQL"}
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
}
