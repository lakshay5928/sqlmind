"use client";
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Zap, BarChart3, Home, Brain, ChevronDown } from "lucide-react";
import Link from "next/link";
import CreditDisplay from "@/components/workspace/CreditDisplay";
import LeftPanel from "@/components/workspace/LeftPanel";
import CenterPanel from "@/components/workspace/CenterPanel";
import RightPanel from "@/components/workspace/RightPanel";

export type Role = "admin" | "developer" | "end_user";
export type Dialect = "postgresql" | "mysql" | "sqlite" | "generic";
export type Mode = "nl" | "sql";

export interface QueryResult {
  id?: string;
  rawSQL: string;
  optimizedSQL: string;
  explanation: string;
  englishExplanation: string;
  hindiExplanation: string;
  creditsUsed: number;
  health: { performance: number; security: number; readability: number; optimization: number; overall: number };
  complexity: { score: number; rating: string; joins: number; subqueries: number; aggregations: number; nesting: number };
  warnings: Array<{ type: string; message: string; severity: string; fix?: string }>;
  indexes: Array<{ column: string; table: string; reason: string; confidence: number; estimatedBenefit: string; sql: string }>;
  playground: { before: { executionCost: number; memoryMB: number; estimatedRows: number }; after: { executionCost: number; memoryMB: number; estimatedRows: number }; improvements: string[] };
  restAPI: { express: string; fastapi: string };
  executionPlan: Array<{ step: string; type: string; cost: number; rows: number; detail: string }>;
  alternatives: Array<{ label: string; sql: string; tradeoff: string }>;
  aiProvider: string;
  productionReady: boolean;
  productionIssues: string[];
}

const ROLE_COLORS: Record<Role, string> = { admin: "text-red-400 bg-red-400/10 border-red-400/30", developer: "text-cyan-400 bg-cyan-400/10 border-cyan-400/30", end_user: "text-green-400 bg-green-400/10 border-green-400/30" };
const ROLE_LABELS: Record<Role, string> = { admin: "Admin", developer: "Developer", end_user: "End User" };

export default function WorkspacePage() {
  const [role, setRole] = useState<Role>("developer");
  const [dialect, setDialect] = useState<Dialect>("postgresql");
  const [mode, setMode] = useState<Mode>("nl");
  const [schema, setSchema] = useState<string>("");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiProvider, setAiProvider] = useState<string>("rules");
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [rateLimit, setRateLimit] = useState({ remaining: 20, limit: 20 });
  const [creditsUsed, setCreditsUsed] = useState(0);

  const handleQuery = useCallback(async (input: string, notes?: string) => {
    if (!input.trim()) return toast.error("Please enter a query or SQL statement");
    setLoading(true);
    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, mode, dialect, role, schema: schema || undefined, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setResult(data);
      setAiProvider(data.aiProvider);
      if (data.rateLimit) setRateLimit(data.rateLimit);
      if (data.creditsUsed !== undefined) setCreditsUsed(data.creditsUsed);
      setHistoryRefresh(n => n + 1);
      toast.success("Query analyzed!", { description: `${data.warnings?.length || 0} issues found · Health: ${data.health?.overall}/100` });
    } catch (e: unknown) {
      toast.error("Analysis failed", { description: String(e) });
    } finally {
      setLoading(false);
    }
  }, [mode, dialect, role, schema]);

  return (
    <div className="h-screen flex flex-col bg-[#09090B] overflow-hidden">
      {/* Top Bar */}
      <header className="flex-none h-12 glass border-b border-white/5 flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-1.5 group">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
              <Zap size={12} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-zinc-300 group-hover:text-white transition-colors">SQLMind</span>
          </Link>

          <div className="w-px h-4 bg-white/10" />

          {/* Mode Toggle */}
          <div className="flex items-center gap-1 glass rounded-lg p-0.5 border border-white/5">
            {(["nl", "sql"] as Mode[]).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${mode === m ? "bg-purple-600 text-white" : "text-zinc-500 hover:text-zinc-300"}`}>
                {m === "nl" ? "🧠 Natural Language" : "💾 Raw SQL"}
              </button>
            ))}
          </div>

          {/* Dialect */}
          <div className="relative">
            <select value={dialect} onChange={e => setDialect(e.target.value as Dialect)}
              className="appearance-none glass border border-white/5 rounded-lg px-3 py-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer pr-6 bg-transparent focus:outline-none focus:border-purple-500/50">
              <option value="postgresql">PostgreSQL</option>
              <option value="mysql">MySQL</option>
              <option value="sqlite">SQLite</option>
              <option value="generic">Generic SQL</option>
            </select>
            <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* AI Provider badge */}
          <AnimatePresence>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${aiProvider === "groq" ? "text-purple-300 bg-purple-500/10 border-purple-500/30" : aiProvider === "ollama" ? "text-green-300 bg-green-500/10 border-green-500/30" : "text-zinc-500 bg-zinc-500/10 border-zinc-500/30"}`}>
              <Brain size={10} />
              {aiProvider === "groq" ? "Groq · Llama 3.3" : aiProvider === "ollama" ? "Ollama Local" : "Rule Engine"}
            </motion.div>
          </AnimatePresence>

          <CreditDisplay remaining={rateLimit.remaining} limit={rateLimit.limit} creditsUsed={creditsUsed} provider={aiProvider} />

          {/* Role selector */}
          <div className="relative">
            <select value={role} onChange={e => setRole(e.target.value as Role)}
              className={`appearance-none border rounded-lg px-3 py-1 text-xs font-medium cursor-pointer pr-6 bg-transparent focus:outline-none transition-all ${ROLE_COLORS[role]}`}>
              <option value="admin">Admin</option>
              <option value="developer">Developer</option>
              <option value="end_user">End User</option>
            </select>
            <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-current pointer-events-none opacity-60" />
          </div>

          <Link href="/dashboard" className="flex items-center gap-1.5 glass border border-white/5 hover:border-white/15 text-zinc-400 hover:text-zinc-200 transition-all rounded-lg px-3 py-1.5 text-xs">
            <BarChart3 size={12} />
            Dashboard
          </Link>
          <Link href="/" className="text-zinc-600 hover:text-zinc-400 transition-colors">
            <Home size={15} />
          </Link>
        </div>
      </header>

      {/* 3-Column Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left — History + Schema */}
        <div className="w-64 flex-none border-r border-white/5 overflow-y-auto">
          <LeftPanel schema={schema} onSchemaChange={setSchema} historyRefresh={historyRefresh}
            onHistorySelect={(sql) => { setMode("sql"); handleQuery(sql); }} />
        </div>

        {/* Center — Editor */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-white/5">
          <CenterPanel mode={mode} dialect={dialect} role={role} schema={schema}
            loading={loading} onSubmit={handleQuery} result={result} />
        </div>

        {/* Right — AI Analysis */}
        <div className="w-[420px] flex-none overflow-y-auto">
          <RightPanel result={result} loading={loading} schema={schema} />
        </div>
      </div>
    </div>
  );
}
