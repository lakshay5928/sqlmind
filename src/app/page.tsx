"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { Zap, Brain, Shield, BarChart3, GitBranch, FileCode, Database, Layers, ArrowRight, Sparkles, Terminal, Search } from "lucide-react";

const FLOATING_SNIPPETS = [
  { sql: "SELECT * FROM users\nWHERE role = 'admin'\nLIMIT 10;", cls: "float-1 top-20 left-8 opacity-60" },
  { sql: "CREATE INDEX idx_email\nON users(email);", cls: "float-2 top-32 right-12 opacity-50" },
  { sql: "WITH cte AS (\n  SELECT id, AVG(score)\n  FROM metrics\n  GROUP BY id\n)\nSELECT * FROM cte;", cls: "float-3 bottom-32 left-16 opacity-40" },
];

const FEATURES = [
  { icon: Brain, title: "NL → SQL Generation", desc: "Describe what you want in plain English. SQLMind generates optimized SQL instantly — schema-aware and role-based.", color: "from-purple-500 to-violet-600", tag: "AI-Powered" },
  { icon: Zap, title: "Query Playground", desc: "See Before vs After metrics — Execution Cost, Memory, Rows affected. Understand exactly why a query is faster.", color: "from-cyan-500 to-blue-600", tag: "Unique" },
  { icon: Database, title: "Schema Import", desc: "Upload .sql, .db, .sqlite, .csv or .xlsx. AI reads your actual tables and generates context-aware queries.", color: "from-emerald-500 to-teal-600", tag: "Smart" },
  { icon: BarChart3, title: "Health Scoring", desc: "4-axis health score: Performance, Security, Readability, Optimization. Circular gauges, real analysis.", color: "from-orange-500 to-red-600", tag: "Analysis" },
  { icon: GitBranch, title: "ER Diagram Visualizer", desc: "Interactive schema visualization with D3.js. Tables, columns, relationships — all in a clickable graph.", color: "from-pink-500 to-rose-600", tag: "Visual" },
  { icon: Shield, title: "Production Audit", desc: "AI reviews your query for production readiness. Catches missing WHERE clauses, unindexed joins, SQL injection risks.", color: "from-yellow-500 to-amber-600", tag: "Safety" },
  { icon: Layers, title: "Role-Based Generation", desc: "Admin, Developer, End User modes. Query generation respects permissions — end users only get SELECT.", color: "from-indigo-500 to-purple-600", tag: "RBAC" },
  { icon: FileCode, title: "REST API Export", desc: "Convert any SQL query to Express.js or FastAPI route. One click from query to backend endpoint.", color: "from-teal-500 to-cyan-600", tag: "Export" },
  { icon: Terminal, title: "Groq + Ollama Hybrid", desc: "Uses Groq (Llama 3.3 70B) as primary AI. Falls back to local Ollama or deterministic rules — always works.", color: "from-slate-500 to-zinc-600", tag: "Free" },
];

const STATS = [
  { label: "AI Providers", value: "3", sub: "Groq · Ollama · Rules" },
  { label: "SQL Dialects", value: "4", sub: "PostgreSQL · MySQL · SQLite · Generic" },
  { label: "User Roles", value: "3", sub: "Admin · Developer · End User" },
  { label: "Export Formats", value: "5", sub: "SQL · PDF · MD · JSON · API" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen aurora-bg overflow-hidden">
      {/* Orbs */}
      <div className="orb w-96 h-96 bg-purple-600 top-0 left-1/4 fixed" />
      <div className="orb w-80 h-80 bg-cyan-500 top-1/3 right-1/4 fixed" />
      <div className="orb w-64 h-64 bg-emerald-500 bottom-1/4 left-1/3 fixed" />

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
              <Zap size={14} className="text-white" />
            </div>
            <span className="font-semibold text-sm tracking-tight">SQLMind <span className="gradient-text-purple">AI</span></span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/workspace" className="text-sm text-zinc-400 hover:text-white transition-colors px-3 py-1.5">Workspace</Link>
            <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-white transition-colors px-3 py-1.5">Dashboard</Link>
            <Link href="/workspace" className="text-sm bg-purple-600 hover:bg-purple-500 transition-colors text-white px-4 py-1.5 rounded-lg font-medium">
              Launch App →
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center pt-14">
        {/* Floating SQL snippets */}
        {FLOATING_SNIPPETS.map((s, i) => (
          <div key={i} className={`absolute hidden lg:block ${s.cls}`}>
            <div className="glass rounded-xl p-3 font-mono text-xs text-zinc-400 leading-relaxed whitespace-pre border border-white/5">
              {s.sql}
            </div>
          </div>
        ))}

        <div className="relative z-10 text-center max-w-4xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 text-xs text-zinc-400 mb-8 border border-purple-500/20">
              <Sparkles size={12} className="text-purple-400" />
              <span>Powered by Groq · Llama 3.3 70B · 100% Free</span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight"
          >
            The SQL Copilot
            <br />
            <span className="gradient-text">Built for Developers</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-zinc-400 mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            Write SQL in plain English. Get optimized queries, health scores, execution plans, ER diagrams, and REST API routes — all schema-aware and role-based.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
            className="flex items-center justify-center gap-4 flex-wrap"
          >
            <Link href="/workspace">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white px-8 py-3.5 rounded-xl font-semibold text-sm shadow-lg shadow-purple-900/30 transition-all">
                <Zap size={16} />
                Open Workspace
                <ArrowRight size={14} />
              </motion.button>
            </Link>
            <Link href="/dashboard">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 glass border border-white/10 hover:border-white/20 text-zinc-300 px-8 py-3.5 rounded-xl font-medium text-sm transition-all">
                <BarChart3 size={16} />
                View Dashboard
              </motion.button>
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.5 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16"
          >
            {STATS.map((s, i) => (
              <motion.div key={i} whileHover={{ y: -4 }}
                className="glass rounded-2xl p-4 border border-white/5 card-3d">
                <div className="text-3xl font-bold gradient-text-purple mb-1">{s.value}</div>
                <div className="text-sm font-medium text-zinc-300">{s.label}</div>
                <div className="text-xs text-zinc-600 mt-1">{s.sub}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Demo preview */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
          className="glass-strong rounded-2xl border border-white/8 overflow-hidden shadow-2xl shadow-black/60"
        >
          {/* Titlebar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-black/30">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
            <span className="text-xs text-zinc-600 ml-3 font-mono">SQLMind Workspace</span>
          </div>
          <div className="grid grid-cols-3 divide-x divide-white/5 min-h-48">
            <div className="p-4 col-span-1 bg-black/20">
              <div className="text-xs text-zinc-600 mb-3 font-mono">NL INPUT</div>
              <div className="text-sm text-zinc-300 leading-relaxed">"Show top 10 employees by salary in IT department with their manager names"</div>
              <div className="mt-4 inline-flex items-center gap-1.5 bg-purple-600/20 border border-purple-500/30 rounded-lg px-3 py-1.5 text-xs text-purple-300">
                <Brain size={10} /> AI Generating...
              </div>
            </div>
            <div className="p-4 col-span-1 bg-black/10">
              <div className="text-xs text-zinc-600 mb-3 font-mono">GENERATED SQL</div>
              <pre className="text-xs text-green-400 font-mono leading-relaxed">{`SELECT e.id, e.name,
  e.salary, m.name AS manager
FROM employees e
JOIN employees m
  ON e.manager_id = m.id
WHERE e.department = 'IT'
ORDER BY e.salary DESC
LIMIT 10;`}</pre>
            </div>
            <div className="p-4 col-span-1">
              <div className="text-xs text-zinc-600 mb-3 font-mono">HEALTH SCORE</div>
              <div className="flex gap-3">
                {[["Perf", 92, "#10B981"], ["Sec", 88, "#06B6D4"], ["Read", 95, "#A78BFA"]].map(([l, v, c]) => (
                  <div key={l as string} className="text-center">
                    <div className="text-lg font-bold" style={{ color: c as string }}>{v}</div>
                    <div className="text-xs text-zinc-600">{l}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 space-y-1.5">
                {["✅ Explicit JOIN used", "✅ LIMIT applied", "✅ Indexed columns"].map(t => (
                  <div key={t} className="text-xs text-zinc-500">{t}</div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features grid */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-16">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything a SQL developer needs</h2>
          <p className="text-zinc-400 max-w-xl mx-auto">From NL input to optimized output — with health scoring, ER diagrams, execution plans, and more.</p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.07 }}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className="glass rounded-2xl p-6 border border-white/5 group cursor-default"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center shadow-lg`}>
                  <f.icon size={18} className="text-white" />
                </div>
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-white/5 text-zinc-500">{f.tag}</span>
              </div>
              <h3 className="font-semibold text-sm mb-2 text-zinc-100 group-hover:text-white transition-colors">{f.title}</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 py-24 text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}>
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Start writing better SQL today</h2>
          <p className="text-zinc-400 mb-8">No login required. Free forever. Open source. Just open the workspace and start querying.</p>
          <Link href="/workspace">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 text-white px-10 py-4 rounded-xl font-semibold text-base shadow-xl shadow-purple-900/40 glow-purple transition-all">
              <Search size={18} />
              Open Workspace — It&apos;s Free
              <ArrowRight size={16} />
            </motion.button>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-8">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between text-xs text-zinc-600">
          <div className="flex items-center gap-2">
            <Zap size={12} className="text-purple-400" />
            <span>SQLMind AI — Built with Next.js, Groq, SQLite</span>
          </div>
          <div>100% Free · Open Source · No Login Required</div>
        </div>
      </footer>
    </div>
  );
}
