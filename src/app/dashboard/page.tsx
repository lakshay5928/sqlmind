"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Zap, BarChart3, TrendingUp, Database, AlertTriangle, Home, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Analytics {
  empty?: boolean; total: number; avgHealth: number; avgImprovement: number;
  queriesPerDay: Array<{ date: string; count: number }>;
  healthTrend: Array<{ date: string; score: number }>;
  dialectDist: Array<{ name: string; count: number }>;
  complexityDist: Array<{ rating: string; count: number }>;
  topWarnings: Array<{ type: string; count: number }>;
  providerBreakdown: Array<{ name: string; count: number }>;
}

const COLORS = ["#7C3AED", "#06B6D4", "#10B981", "#F59E0B", "#EF4444"];
const CUSTOM_TOOLTIP = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
  if (active && payload?.length) return (
    <div className="glass border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-300">
      <div className="text-zinc-500 mb-1">{label}</div>
      <div className="font-semibold">{payload[0].value}</div>
    </div>
  );
  return null;
};

function StatCard({ title, value, sub, icon: Icon, color }: { title: string; value: string | number; sub: string; icon: React.ElementType; color: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -4 }}
      className="glass rounded-2xl p-5 border border-white/5 card-3d">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center`} style={{ background: color + "20", border: `1px solid ${color}30` }}>
          <Icon size={16} style={{ color }} />
        </div>
      </div>
      <motion.div className="text-3xl font-bold text-zinc-100 mb-1"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
        {value}
      </motion.div>
      <div className="text-sm text-zinc-500 font-medium">{title}</div>
      <div className="text-xs text-zinc-700 mt-0.5">{sub}</div>
    </motion.div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics").then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100">
      {/* Header */}
      <header className="glass border-b border-white/5 px-6 h-14 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
              <Zap size={12} className="text-white" />
            </div>
            <span className="text-sm font-semibold">SQLMind</span>
          </Link>
          <span className="text-zinc-700">/</span>
          <span className="text-sm text-zinc-400 flex items-center gap-1.5"><BarChart3 size={13} /> Dashboard</span>
        </div>
        <Link href="/workspace" className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors glass border border-white/5 px-3 py-1.5 rounded-lg">
          <ArrowLeft size={12} /> Workspace
        </Link>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {data?.empty ? (
          <div className="text-center py-24">
            <BarChart3 size={40} className="mx-auto mb-4 text-zinc-700" />
            <h2 className="text-xl font-semibold text-zinc-400 mb-2">No data yet</h2>
            <p className="text-zinc-600 text-sm mb-6">Run your first query in the workspace to see analytics here.</p>
            <Link href="/workspace" className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors">
              <Zap size={14} /> Open Workspace
            </Link>
          </div>
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard title="Total Queries" value={data?.total || 0} sub="All time" icon={Database} color="#7C3AED" />
              <StatCard title="Avg Health Score" value={`${data?.avgHealth || 0}/100`} sub="Across all queries" icon={TrendingUp} color="#10B981" />
              <StatCard title="Avg Improvement" value={`${data?.avgImprovement || 0}%`} sub="After optimization" icon={Zap} color="#06B6D4" />
              <StatCard title="Warnings Caught" value={data?.topWarnings?.reduce((s, w) => s + w.count, 0) || 0} sub="Total issues found" icon={AlertTriangle} color="#F59E0B" />
            </div>

            {/* Charts row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              {/* Queries per day */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-5 border border-white/5">
                <h3 className="text-sm font-semibold text-zinc-300 mb-4">Queries per Day (14d)</h3>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={data?.queriesPerDay || []}>
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#52525B" }} tickFormatter={d => d.slice(5)} />
                    <YAxis tick={{ fontSize: 9, fill: "#52525B" }} />
                    <Tooltip content={<CUSTOM_TOOLTIP />} />
                    <Bar dataKey="count" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>

              {/* Health trend */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-2xl p-5 border border-white/5">
                <h3 className="text-sm font-semibold text-zinc-300 mb-4">Health Score Trend</h3>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={data?.healthTrend || []}>
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#52525B" }} tickFormatter={d => d.slice(5)} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#52525B" }} />
                    <Tooltip content={<CUSTOM_TOOLTIP />} />
                    <Line type="monotone" dataKey="score" stroke="#10B981" strokeWidth={2} dot={{ r: 3, fill: "#10B981" }} />
                  </LineChart>
                </ResponsiveContainer>
              </motion.div>
            </div>

            {/* Charts row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Dialect dist */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass rounded-2xl p-5 border border-white/5">
                <h3 className="text-sm font-semibold text-zinc-300 mb-4">SQL Dialects</h3>
                <ResponsiveContainer width="100%" height={120}>
                  <PieChart>
                    <Pie data={data?.dialectDist || []} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={50}>
                      {(data?.dialectDist || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number, n: string) => [v, n]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(data?.dialectDist || []).map((d, i) => (
                    <div key={d.name} className="flex items-center gap-1 text-[10px] text-zinc-500">
                      <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      {d.name} ({d.count})
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Complexity dist */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-2xl p-5 border border-white/5">
                <h3 className="text-sm font-semibold text-zinc-300 mb-4">Query Complexity</h3>
                <div className="space-y-2.5">
                  {(data?.complexityDist || []).map((c, i) => {
                    const total = data?.total || 1;
                    const pct = Math.round(c.count / total * 100);
                    return (
                      <div key={c.rating}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-zinc-400">{c.rating}</span>
                          <span className="text-zinc-600">{c.count} ({pct}%)</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: i * 0.1 }}
                            className="h-full rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>

              {/* Top warnings */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass rounded-2xl p-5 border border-white/5">
                <h3 className="text-sm font-semibold text-zinc-300 mb-4">Common Issues</h3>
                <div className="space-y-2">
                  {(data?.topWarnings || []).map((w, i) => (
                    <div key={w.type} className="flex items-center justify-between">
                      <span className="text-[10px] text-zinc-500 font-mono">{w.type.replace(/_/g, " ")}</span>
                      <div className="flex items-center gap-2">
                        <div className="h-1 w-16 bg-white/5 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${(w.count / (data?.topWarnings[0]?.count || 1)) * 100}%` }}
                            transition={{ duration: 0.6, delay: i * 0.1 }} className="h-full rounded-full" style={{ background: COLORS[i] }} />
                        </div>
                        <span className="text-[10px] text-zinc-600 w-4 text-right">{w.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Provider breakdown */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="glass rounded-2xl p-5 border border-white/5">
              <h3 className="text-sm font-semibold text-zinc-300 mb-4">AI Provider Usage</h3>
              <div className="flex gap-4">
                {(data?.providerBreakdown || []).map((p, i) => (
                  <div key={p.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i] }} />
                    <span className="text-sm font-semibold text-zinc-300">{p.count}</span>
                    <span className="text-xs text-zinc-600 capitalize">{p.name}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </main>
    </div>
  );
}
