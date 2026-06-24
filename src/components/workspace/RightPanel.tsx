"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Zap, Shield, BarChart3, GitBranch, FileCode, AlertTriangle, CheckCircle, Copy, MessageSquare, ArrowRight, TrendingDown, TrendingUp, Layers, Info, GitCompare, Database, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import type { QueryResult } from "@/app/workspace/page";
import SQLDiff from "./SQLDiff";

const TABS = [
  { id: "overview", label: "Overview", icon: Brain },
  { id: "playground", label: "Playground", icon: Zap },
  { id: "explain", label: "Explain", icon: Info },
  { id: "indexes", label: "Indexes", icon: GitBranch },
  { id: "plan", label: "Exec Plan", icon: Layers },
  { id: "alternatives", label: "Alt Queries", icon: FileCode },
  { id: "chat", label: "AI Chat", icon: MessageSquare },
  { id: "diff", label: "SQL Diff", icon: GitCompare },
  { id: "live", label: "Live EXPLAIN", icon: Database },
  { id: "export", label: "Export", icon: Shield },
];

function HealthGauge({ value, label, color }: { value: number; label: string; color: string }) {
  const r = 26; const circ = 2 * Math.PI * r;
  const offset = circ * (1 - value / 100);
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="68" height="68" className="circular-progress">
        <circle cx="34" cy="34" r={r} fill="none" stroke="#1C1C1F" strokeWidth="5" />
        <motion.circle cx="34" cy="34" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeLinecap="round" strokeDasharray={circ} initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }} transition={{ duration: 1.2, ease: "easeOut" }} />
        <text x="34" y="39" textAnchor="middle" fill={color} fontSize="13" fontWeight="600" fontFamily="JetBrains Mono">{value}</text>
      </svg>
      <span className="text-[10px] text-zinc-500">{label}</span>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3 p-4">
      {[80, 60, 90, 50].map((w, i) => <div key={i} className={`h-3 shimmer rounded-full w-${w === 80 ? "4/5" : w === 60 ? "3/5" : w === 90 ? "9/10" : "1/2"}`} />)}
    </div>
  );
}

export default function RightPanel({ result, loading, schema }: { result: QueryResult | null; loading: boolean; schema: string }) {
  const [tab, setTab] = useState("overview");
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "ai"; content: string }>>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [exportFormat, setExportFormat] = useState<"sql" | "express" | "fastapi" | "markdown" | "json">("sql");
  const [liveConnUrl, setLiveConnUrl] = useState("");
  const [liveDbType, setLiveDbType] = useState<"postgresql" | "mysql">("postgresql");
  const [liveExplainResult, setLiveExplainResult] = useState<{nodes: Array<{step:string;type:string;cost:number;rows:number;detail:string;actualTime?:number;actualRows?:number}>;raw:string;live:boolean} | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [versions, setVersions] = useState<Array<{sql:string;label:string;savedAt:string}>>([]);
  const [versionLabel, setVersionLabel] = useState("");

  const copy = (text: string) => { navigator.clipboard.writeText(text); toast.success("Copied!"); };

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    const msg = chatInput.trim();
    setChatInput("");
    setChatMessages(m => [...m, { role: "user", content: msg }]);
    setChatLoading(true);
    try {
      const r = await fetch("/api/ai-chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: msg, currentSQL: result?.rawSQL, schema, history: chatMessages.map(m => ({ role: m.role === "ai" ? "assistant" : "user", content: m.content })) }) });
      const d = await r.json();
      setChatMessages(m => [...m, { role: "ai", content: d.response }]);
    } catch { setChatMessages(m => [...m, { role: "ai", content: "Error connecting to AI." }]); }
    finally { setChatLoading(false); }
  };

  const getExportContent = () => {
    if (!result) return "";
    if (exportFormat === "sql") return result.optimizedSQL || result.rawSQL;
    if (exportFormat === "express") return result.restAPI?.express || "";
    if (exportFormat === "fastapi") return result.restAPI?.fastapi || "";
    if (exportFormat === "json") return JSON.stringify({ raw: result.rawSQL, optimized: result.optimizedSQL, health: result.health, warnings: result.warnings, indexes: result.indexes }, null, 2);
    if (exportFormat === "markdown") return `# SQL Query Report\n\n## Raw SQL\n\`\`\`sql\n${result.rawSQL}\n\`\`\`\n\n## Health Score\n- Performance: ${result.health.performance}/100\n- Security: ${result.health.security}/100\n- Readability: ${result.health.readability}/100\n- Optimization: ${result.health.optimization}/100\n\n## Explanation\n${result.explanation}\n\n## Warnings\n${result.warnings.map(w => `- **${w.severity.toUpperCase()}**: ${w.message}`).join("\n")}\n\n## Index Suggestions\n${result.indexes.map(i => `- \`${i.sql}\` — ${i.reason}`).join("\n")}`;
    return "";
  };

  const downloadExport = () => {
    const content = getExportContent();
    const ext = { sql: "sql", express: "js", fastapi: "py", markdown: "md", json: "json" }[exportFormat];
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `sqlmind-query.${ext}`; a.click();
    URL.revokeObjectURL(url); toast.success(`Downloaded as .${ext}`);
  };

  const sevColor = (s: string) => ({ critical: "severity-critical", high: "severity-high", medium: "severity-medium", low: "severity-low" }[s] || "severity-low");
  const planTypeColor = (t: string) => ({ "Table Scan": "#EF4444", "Filter": "#F59E0B", "Hash Join": "#7C3AED", "Aggregate": "#06B6D4", "Sort": "#10B981", "Limit": "#A78BFA", "Output": "#71717A", "Sequential Scan": "#EF4444" }[t] || "#71717A");

  if (!result && !loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-[#0A0A0C]">
        <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600/20 to-cyan-600/20 border border-purple-500/20 flex items-center justify-center mb-4 mx-auto">
            <Brain size={28} className="text-purple-400" />
          </div>
        </motion.div>
        <h3 className="text-sm font-semibold text-zinc-400 mb-2">AI Analysis Ready</h3>
        <p className="text-xs text-zinc-700 leading-relaxed">Enter a natural language query or SQL statement and click Analyze to see health scores, optimizations, execution plan, and more.</p>
        <div className="mt-6 grid grid-cols-2 gap-2 w-full">
          {["Health Score", "Playground", "Exec Plan", "AI Chat"].map(f => (
            <div key={f} className="glass rounded-lg p-2.5 border border-white/5 text-center text-[10px] text-zinc-700">{f}</div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#0A0A0C]">
      {/* Tab bar */}
      <div className="flex-none flex overflow-x-auto border-b border-white/5 scrollbar-none">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-none flex items-center gap-1 px-3 py-2.5 text-[10px] font-medium whitespace-nowrap border-b-2 transition-all ${tab === t.id ? "border-purple-500 text-purple-400 bg-purple-500/5" : "border-transparent text-zinc-600 hover:text-zinc-400"}`}>
            <t.icon size={10} />
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && <Skeleton />}

        <AnimatePresence mode="wait">
          {result && !loading && (
            <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 space-y-4">

              {/* OVERVIEW TAB */}
              {tab === "overview" && (
                <>
                  {/* Production badge */}
                  <div className={`flex items-center gap-2 rounded-xl p-3 border ${result.productionReady ? "bg-green-500/5 border-green-500/20" : "bg-red-500/5 border-red-500/20"}`}>
                    {result.productionReady ? <CheckCircle size={14} className="text-green-400" /> : <AlertTriangle size={14} className="text-red-400" />}
                    <div>
                      <div className={`text-xs font-semibold ${result.productionReady ? "text-green-400" : "text-red-400"}`}>
                        {result.productionReady ? "Production Ready" : "Needs Review"}
                      </div>
                      {!result.productionReady && result.productionIssues.length > 0 && (
                        <div className="text-[10px] text-zinc-600 mt-0.5">{result.productionIssues[0]}</div>
                      )}
                    </div>
                  </div>

                  {/* Health gauges */}
                  <div>
                    <div className="text-xs font-semibold text-zinc-400 mb-3 flex items-center justify-between">
                      <span>Health Score</span>
                      <span className="text-2xl font-bold gradient-text-purple">{result.health.overall}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      <HealthGauge value={result.health.performance} label="Perf" color={result.health.performance >= 80 ? "#10B981" : result.health.performance >= 60 ? "#F59E0B" : "#EF4444"} />
                      <HealthGauge value={result.health.security} label="Sec" color={result.health.security >= 80 ? "#10B981" : result.health.security >= 60 ? "#F59E0B" : "#EF4444"} />
                      <HealthGauge value={result.health.readability} label="Read" color={result.health.readability >= 80 ? "#10B981" : "#F59E0B"} />
                      <HealthGauge value={result.health.optimization} label="Opt" color={result.health.optimization >= 80 ? "#10B981" : "#F59E0B"} />
                    </div>
                  </div>

                  {/* Complexity */}
                  <div className="glass rounded-xl p-3 border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-zinc-500">Complexity</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${result.complexity.rating === "Simple" ? "bg-green-500/15 text-green-400" : result.complexity.rating === "Moderate" ? "bg-cyan-500/15 text-cyan-400" : result.complexity.rating === "Complex" ? "bg-yellow-500/15 text-yellow-400" : "bg-red-500/15 text-red-400"}`}>
                        {result.complexity.rating}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[["Joins", result.complexity.joins], ["Subqueries", result.complexity.subqueries], ["Aggregations", result.complexity.aggregations]].map(([l, v]) => (
                        <div key={l as string} className="text-center">
                          <div className="text-base font-bold text-zinc-300">{v}</div>
                          <div className="text-[10px] text-zinc-700">{l}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Warnings */}
                  {result.warnings.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-zinc-400 mb-2">Warnings ({result.warnings.length})</div>
                      <div className="space-y-1.5">
                        {result.warnings.map((w, i) => (
                          <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                            className={`rounded-lg p-2.5 text-xs ${sevColor(w.severity)}`}>
                            <div className="font-medium">{w.message}</div>
                            {w.fix && <div className="text-[10px] mt-1 opacity-70">Fix: {w.fix}</div>}
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Provider */}
                  <div className="text-center">
                    <span className={`text-[10px] px-2 py-1 rounded-full font-mono ${result.aiProvider === "groq" ? "bg-purple-500/10 text-purple-400" : result.aiProvider === "ollama" ? "bg-green-500/10 text-green-400" : "bg-zinc-800 text-zinc-600"}`}>
                      Analyzed by: {result.aiProvider}
                    </span>
                  </div>
                </>
              )}

              {/* PLAYGROUND TAB */}
              {tab === "playground" && (
                <>
                  <div className="text-xs text-zinc-500 text-center mb-2">Estimated performance impact of optimization</div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Execution Cost", before: result.playground.before.executionCost, after: result.playground.after.executionCost, unit: "" },
                      { label: "Memory", before: result.playground.before.memoryMB, after: result.playground.after.memoryMB, unit: "MB" },
                      { label: "Est. Rows", before: result.playground.before.estimatedRows, after: result.playground.after.estimatedRows, unit: "" },
                    ].map((m, i) => {
                      const improved = m.after < m.before;
                      const pct = m.before > 0 ? Math.round(Math.abs(m.before - m.after) / m.before * 100) : 0;
                      return (
                        <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                          className="glass rounded-xl p-3 border border-white/5 text-center">
                          <div className="text-[10px] text-zinc-600 mb-2">{m.label}</div>
                          <div className="text-base font-bold text-red-400">{m.before.toLocaleString()}{m.unit}</div>
                          <div className="text-zinc-700 my-1">↓</div>
                          <div className="text-base font-bold text-green-400">{m.after.toLocaleString()}{m.unit}</div>
                          <div className={`text-[10px] mt-1.5 flex items-center justify-center gap-1 font-semibold ${improved ? "text-green-400" : "text-zinc-600"}`}>
                            {improved ? <TrendingDown size={10} /> : <TrendingUp size={10} />}
                            {improved ? `-${pct}%` : "No change"}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {result.playground.improvements.length > 0 && (
                    <div className="glass rounded-xl p-3 border border-white/5">
                      <div className="text-xs font-semibold text-zinc-400 mb-2 flex items-center gap-1.5">
                        <Zap size={11} className="text-yellow-400" /> WHY faster?
                      </div>
                      <div className="space-y-1.5">
                        {result.playground.improvements.map((imp, i) => (
                          <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                            className="flex items-center gap-2 text-xs text-zinc-400">
                            <CheckCircle size={10} className="text-green-400 flex-none" />
                            {imp}
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Save version */}
                  {result.id && (
                    <div className="flex gap-2">
                      <input value={versionLabel} onChange={e => setVersionLabel(e.target.value)}
                        placeholder="Version label (optional)..."
                        className="flex-1 bg-black/30 border border-white/5 rounded-lg px-2 py-1.5 text-[10px] text-zinc-400 placeholder:text-zinc-700 focus:outline-none focus:border-purple-500/40" />
                      <button onClick={async () => {
                        if (!result.id) return;
                        await fetch("/api/versions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: result.id, sql: result.optimizedSQL, label: versionLabel || undefined }) });
                        const vUrl = `/api/versions?id=${result.id}`; const r = await fetch(vUrl);
                        setVersions(await r.json());
                        setVersionLabel("");
                        import("sonner").then(({ toast }) => toast.success("Version saved"));
                      }} className="text-[10px] bg-purple-500/15 border border-purple-500/30 text-purple-400 rounded-lg px-3 py-1.5 hover:bg-purple-500/25 transition-all whitespace-nowrap">
                        Save Version
                      </button>
                    </div>
                  )}

                  {versions.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] text-zinc-600 font-medium">Saved Versions ({versions.length})</div>
                      {versions.map((v, i) => (
                        <div key={i} className="glass rounded-lg p-2 border border-white/5 flex items-center justify-between gap-2">
                          <div>
                            <div className="text-[10px] font-medium text-zinc-300">{v.label}</div>
                            <div className="text-[9px] text-zinc-700">{new Date(v.savedAt).toLocaleString()}</div>
                          </div>
                          <button onClick={() => copy(v.sql)} className="text-zinc-600 hover:text-zinc-300 transition-colors"><Copy size={9} /></button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Optimized SQL */}
                  <div className="glass rounded-xl border border-white/5 overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
                      <span className="text-[10px] text-zinc-600 font-mono">Optimized SQL</span>
                      <button onClick={() => copy(result.optimizedSQL)} className="text-zinc-600 hover:text-zinc-300 transition-colors"><Copy size={10} /></button>
                    </div>
                    <pre className="p-3 text-xs font-mono text-green-400 overflow-x-auto">{result.optimizedSQL}</pre>
                  </div>
                </>
              )}

              {/* EXPLAIN TAB */}
              {tab === "explain" && (
                <>
                  {/* English Explanation */}
                  <div className="glass rounded-xl p-3 border border-purple-500/10">
                    <div className="text-[10px] text-purple-400 font-medium mb-2 flex items-center gap-1.5">
                      🇬🇧 English Explanation
                    </div>
                    <div className="text-xs text-zinc-300 leading-relaxed">
                      <ReactMarkdown>{result.englishExplanation || result.explanation || "Run a query to see explanation."}</ReactMarkdown>
                    </div>
                  </div>

                  {/* Hindi/Hinglish Explanation */}
                  {result.hindiExplanation && (
                    <div className="glass rounded-xl p-3 border border-cyan-500/15">
                      <div className="text-[10px] text-cyan-400 font-medium mb-1.5 flex items-center gap-1">🇮🇳 Hindi / Hinglish Explanation</div>
                      <p className="text-xs text-zinc-400 leading-relaxed">{result.hindiExplanation}</p>
                    </div>
                  )}
                </>
              )}

              {/* INDEXES TAB */}
              {tab === "indexes" && (
                result.indexes.length > 0 ? (
                  <div className="space-y-3">
                    {result.indexes.map((idx, i) => (
                      <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                        className="glass rounded-xl p-3 border border-white/5">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="text-xs font-mono text-cyan-400">{idx.table}.{idx.column}</div>
                            <div className="text-[10px] text-zinc-600 mt-0.5">{idx.reason}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-semibold text-green-400">{idx.confidence}%</div>
                            <div className="text-[10px] text-zinc-700">confidence</div>
                          </div>
                        </div>
                        <div className="text-[10px] text-purple-300 mb-2">↑ {idx.estimatedBenefit}</div>
                        <div className="bg-black/30 rounded-lg p-2 flex items-center justify-between gap-2">
                          <code className="text-[10px] font-mono text-zinc-400 flex-1 truncate">{idx.sql}</code>
                          <button onClick={() => copy(idx.sql)} className="text-zinc-600 hover:text-zinc-300 transition-colors flex-none"><Copy size={10} /></button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-zinc-700">
                    <CheckCircle size={24} className="mx-auto mb-2 text-green-500/50" />
                    <p className="text-xs">No additional indexes needed</p>
                  </div>
                )
              )}

              {/* EXECUTION PLAN TAB */}
              {tab === "plan" && (
                <div className="space-y-2">
                  <div className="text-[10px] text-zinc-600 text-center mb-3 bg-yellow-500/5 border border-yellow-500/10 rounded-lg p-2">
                    ⚠ Estimated plan (AST-based). Connect a live DB for real EXPLAIN output.
                  </div>
                  {result.executionPlan.map((step, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}>
                      <div className="flex items-start gap-3">
                        {i < result.executionPlan.length - 1 && (
                          <div className="flex flex-col items-center">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-none" style={{ background: planTypeColor(step.type) + "20", border: `1px solid ${planTypeColor(step.type)}40` }}>
                              <span className="text-[9px] font-bold" style={{ color: planTypeColor(step.type) }}>{i + 1}</span>
                            </div>
                            <div className="w-px flex-1 bg-white/5 mt-1 min-h-4" />
                          </div>
                        )}
                        {i === result.executionPlan.length - 1 && (
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-none bg-green-500/10 border border-green-500/20">
                            <span className="text-[9px] font-bold text-green-400">{i + 1}</span>
                          </div>
                        )}
                        <div className="plan-node flex-1 p-2.5 mb-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-semibold" style={{ color: planTypeColor(step.type) }}>{step.type}</span>
                            <div className="flex items-center gap-2 text-[9px] text-zinc-600">
                              <span>cost: {step.cost}</span>
                              <span>rows: {step.rows.toLocaleString()}</span>
                            </div>
                          </div>
                          <div className="text-[10px] text-zinc-600">{step.detail}</div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* ALTERNATIVES TAB */}
              {tab === "alternatives" && (
                result.alternatives.length > 0 ? (
                  <div className="space-y-3">
                    {result.alternatives.map((alt, i) => (
                      <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                        className="glass rounded-xl border border-white/5 overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
                          <span className="text-xs font-semibold text-zinc-300">{alt.label}</span>
                          <button onClick={() => copy(alt.sql)} className="text-zinc-600 hover:text-zinc-300 transition-colors"><Copy size={10} /></button>
                        </div>
                        <pre className="p-3 text-[10px] font-mono text-green-400 overflow-x-auto">{alt.sql}</pre>
                        <div className="px-3 py-2 border-t border-white/5 text-[10px] text-zinc-600">{alt.tradeoff}</div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-zinc-700 text-xs">No alternatives generated for this query type.</div>
                )
              )}

              {/* CHAT TAB */}
              {tab === "chat" && (
                <div className="flex flex-col" style={{ height: "450px" }}>
                  <div className="flex-1 overflow-y-auto space-y-3 mb-3">
                    {chatMessages.length === 0 && (
                      <div className="text-center py-6">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-3">
                          <Brain size={18} className="text-purple-400" />
                        </div>
                        <p className="text-xs text-zinc-600 leading-relaxed">Ask me anything about the current query — explain it, optimize it, check production readiness, or suggest indexes.</p>
                        <div className="flex flex-wrap gap-1.5 mt-3 justify-center">
                          {["Explain this query", "Is it production-ready?", "What indexes do I need?", "How to optimize?"].map(s => (
                            <button key={s} onClick={() => { setChatInput(s); }}
                              className="text-[10px] glass border border-white/5 hover:border-purple-500/30 text-zinc-500 hover:text-zinc-300 rounded-full px-2.5 py-1 transition-all">{s}</button>
                          ))}
                        </div>
                      </div>
                    )}
                    {chatMessages.map((m, i) => (
                      <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${m.role === "user" ? "bg-purple-600/20 border border-purple-500/30 text-zinc-200" : "glass border border-white/5 text-zinc-300"}`}>
                          {m.role === "ai" ? <ReactMarkdown className="prose prose-invert prose-xs max-w-none text-xs">{m.content}</ReactMarkdown> : m.content}
                        </div>
                      </motion.div>
                    ))}
                    {chatLoading && (
                      <div className="flex justify-start">
                        <div className="glass border border-white/5 rounded-xl px-3 py-2">
                          <div className="flex gap-1 items-center">
                            {[0, 0.2, 0.4].map((d, i) => <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: d }} className="w-1.5 h-1.5 bg-purple-400 rounded-full" />)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 border-t border-white/5 pt-3">
                    <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendChat()}
                      placeholder="Ask about this query..."
                      className="flex-1 bg-black/30 border border-white/5 rounded-xl px-3 py-2 text-xs text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-purple-500/40" />
                    <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()}
                      className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-xl px-3 py-2 transition-colors">
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              )}


              {/* DIFF TAB */}
              {tab === "diff" && (
                result.rawSQL && result.optimizedSQL ? (
                  <SQLDiff
                    before={result.rawSQL}
                    after={result.optimizedSQL}
                    improvements={result.playground?.improvements || []}
                  />
                ) : (
                  <div className="text-center py-8 text-zinc-700 text-xs">Run a query first to see the diff.</div>
                )
              )}

              {/* LIVE EXPLAIN TAB */}
              {tab === "live" && (
                <div className="space-y-3">
                  <div className="glass rounded-xl p-3 border border-cyan-500/15">
                    <div className="text-xs font-semibold text-cyan-400 mb-3 flex items-center gap-1.5">
                      <Wifi size={11} /> Live DB EXPLAIN
                    </div>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        {(["postgresql","mysql"] as const).map(db => (
                          <button key={db} onClick={() => setLiveDbType(db)}
                            className={`flex-1 text-[10px] py-1.5 rounded-lg border transition-all font-medium ${liveDbType === db ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-400" : "border-white/5 text-zinc-600 hover:text-zinc-400"}`}>
                            {db}
                          </button>
                        ))}
                      </div>
                      <input value={liveConnUrl} onChange={e => setLiveConnUrl(e.target.value)}
                        placeholder={liveDbType === "postgresql" ? "postgresql://user:pass@host:5432/db" : "mysql://user:pass@host:3306/db"}
                        className="w-full bg-black/30 border border-white/5 rounded-lg px-3 py-2 text-[10px] font-mono text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-cyan-500/40" />
                      <button
                        onClick={async () => {
                          if (!liveConnUrl || !result?.rawSQL) return;
                          setLiveLoading(true);
                          setLiveExplainResult(null);
                          try {
                            const r = await fetch("/api/live-explain-real", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ sql: result.rawSQL, connectionUrl: liveConnUrl, dbType: liveDbType }),
                            });
                            const d = await r.json();
                            if (!r.ok) throw new Error(d.error);
                            setLiveExplainResult(d);
                          } catch (e) {
                            import("sonner").then(({ toast }) => toast.error(String(e)));
                          } finally { setLiveLoading(false); }
                        }}
                        disabled={!liveConnUrl || !result?.rawSQL || liveLoading}
                        className="w-full bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-400 rounded-lg py-2 text-xs font-medium transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                        {liveLoading ? (
                          <><span className="animate-spin">◌</span> Running EXPLAIN...</>
                        ) : (
                          <><Wifi size={11} /> Run EXPLAIN ANALYZE</>
                        )}
                      </button>
                    </div>
                  </div>

                  {liveExplainResult && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[10px] text-green-400">
                        <Wifi size={9} /> Live execution plan from your database
                      </div>
                      {liveExplainResult.nodes.map((node, i) => (
                        <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                          className="plan-node p-2.5">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-semibold text-cyan-400">{node.type}</span>
                            <div className="text-[9px] text-zinc-600 space-x-2">
                              <span>cost: {node.cost}</span>
                              <span>rows: {node.rows.toLocaleString()}</span>
                              {node.actualTime && <span className="text-green-400">actual: {node.actualTime}ms</span>}
                              {node.actualRows !== undefined && <span className="text-green-400">actual rows: {node.actualRows}</span>}
                            </div>
                          </div>
                          <div className="text-[10px] text-zinc-600">{node.detail}</div>
                        </motion.div>
                      ))}
                      <details className="glass rounded-lg border border-white/5">
                        <summary className="px-3 py-2 text-[10px] text-zinc-600 cursor-pointer">Raw EXPLAIN output</summary>
                        <pre className="p-3 text-[9px] font-mono text-zinc-500 overflow-x-auto whitespace-pre-wrap">{liveExplainResult.raw}</pre>
                      </details>
                    </div>
                  )}

                  {!liveConnUrl && (
                    <div className="text-center py-4">
                      <WifiOff size={20} className="mx-auto mb-2 text-zinc-700" />
                      <p className="text-[10px] text-zinc-700">Enter a PostgreSQL or MySQL connection string above to run real EXPLAIN ANALYZE against your database.</p>
                    </div>
                  )}
                </div>
              )}

              {/* EXPORT TAB */}
              {tab === "export" && (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {(["sql", "express", "fastapi", "markdown", "json"] as const).map(f => (
                      <button key={f} onClick={() => setExportFormat(f)}
                        className={`text-[10px] px-2.5 py-1 rounded-full border font-medium transition-all ${exportFormat === f ? "bg-purple-600/20 border-purple-500/40 text-purple-300" : "border-white/5 text-zinc-600 hover:text-zinc-400"}`}>
                        {f === "express" ? "Express.js" : f === "fastapi" ? "FastAPI" : f.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  <div className="glass rounded-xl border border-white/5 overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
                      <span className="text-[10px] text-zinc-600 font-mono">{exportFormat}</span>
                      <button onClick={() => copy(getExportContent())} className="text-zinc-600 hover:text-zinc-300 transition-colors"><Copy size={10} /></button>
                    </div>
                    <pre className="p-3 text-[10px] font-mono text-zinc-400 overflow-x-auto max-h-60 overflow-y-auto whitespace-pre-wrap">{getExportContent()}</pre>
                  </div>
                  <button onClick={downloadExport}
                    className="w-full bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 rounded-xl py-2.5 text-xs font-medium transition-all">
                    Download .{exportFormat === "express" ? "js" : exportFormat === "fastapi" ? "py" : exportFormat === "markdown" ? "md" : exportFormat}
                  </button>
                  <button onClick={() => window.print()}
                    className="w-full glass border border-white/5 hover:border-white/10 text-zinc-400 rounded-xl py-2.5 text-xs font-medium transition-all">
                    🖨 Print / Save as PDF
                  </button>
                </div>
              )}

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
