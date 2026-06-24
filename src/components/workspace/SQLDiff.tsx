"use client";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { Copy, GitCompare, Minus, Plus, Equal } from "lucide-react";
import { toast } from "sonner";

interface DiffLine {
  type: "added" | "removed" | "unchanged";
  content: string;
  lineNumBefore?: number;
  lineNumAfter?: number;
}

function computeDiff(before: string, after: string): DiffLine[] {
  const bLines = before.trim().split("\n");
  const aLines = after.trim().split("\n");
  const result: DiffLine[] = [];

  // Simple LCS-based diff
  const m = bLines.length, n = aLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = bLines[i - 1].trim() === aLines[j - 1].trim() ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);

  // Backtrack
  const ops: Array<{ type: "unchanged" | "removed" | "added"; line: string }> = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && bLines[i - 1].trim() === aLines[j - 1].trim()) {
      ops.unshift({ type: "unchanged", line: bLines[i - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.unshift({ type: "added", line: aLines[j - 1] });
      j--;
    } else {
      ops.unshift({ type: "removed", line: bLines[i - 1] });
      i--;
    }
  }

  // Assign line numbers
  let lb = 1, la = 1;
  ops.forEach(op => {
    if (op.type === "unchanged") { result.push({ type: "unchanged", content: op.line, lineNumBefore: lb++, lineNumAfter: la++ }); }
    else if (op.type === "removed") { result.push({ type: "removed", content: op.line, lineNumBefore: lb++ }); }
    else { result.push({ type: "added", content: op.line, lineNumAfter: la++ }); }
  });
  return result;
}

interface SQLDiffProps {
  before: string;
  after: string;
  improvements?: string[];
}

export default function SQLDiff({ before, after, improvements = [] }: SQLDiffProps) {
  const diff = useMemo(() => computeDiff(before, after), [before, after]);
  const added = diff.filter(d => d.type === "added").length;
  const removed = diff.filter(d => d.type === "removed").length;
  const unchanged = diff.filter(d => d.type === "unchanged").length;

  const copy = (text: string, label: string) => { navigator.clipboard.writeText(text); toast.success(`Copied ${label}`); };

  if (before.trim() === after.trim()) {
    return (
      <div className="text-center py-6 text-zinc-600">
        <Equal size={20} className="mx-auto mb-2 opacity-50" />
        <p className="text-xs">No differences — query is already optimized</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Stats bar */}
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5 text-green-400">
          <Plus size={11} /> <span>{added} added</span>
        </div>
        <div className="flex items-center gap-1.5 text-red-400">
          <Minus size={11} /> <span>{removed} removed</span>
        </div>
        <div className="flex items-center gap-1.5 text-zinc-600">
          <Equal size={11} /> <span>{unchanged} unchanged</span>
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={() => copy(before, "original")}
            className="text-[10px] glass border border-white/5 hover:border-white/10 text-zinc-500 hover:text-zinc-300 rounded px-2 py-0.5 transition-all flex items-center gap-1">
            <Copy size={8} /> Original
          </button>
          <button onClick={() => copy(after, "optimized")}
            className="text-[10px] glass border border-green-500/20 hover:border-green-500/40 text-green-500 hover:text-green-400 rounded px-2 py-0.5 transition-all flex items-center gap-1">
            <Copy size={8} /> Optimized
          </button>
        </div>
      </div>

      {/* Diff view */}
      <div className="glass rounded-xl border border-white/5 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-2 border-b border-white/5">
          <div className="px-3 py-2 text-[10px] text-red-400 font-medium border-r border-white/5 flex items-center gap-1.5">
            <Minus size={9} /> Before
          </div>
          <div className="px-3 py-2 text-[10px] text-green-400 font-medium flex items-center gap-1.5">
            <Plus size={9} /> After (Optimized)
          </div>
        </div>

        {/* Split diff */}
        <div className="grid grid-cols-2 divide-x divide-white/5 font-mono text-[11px]">
          {/* Left: before */}
          <div className="overflow-x-auto">
            {diff.map((line, i) => (
              line.type !== "added" ? (
                <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.01 }}
                  className={`flex items-start gap-2 px-2 py-0.5 ${line.type === "removed" ? "diff-removed" : ""}`}>
                  <span className="text-zinc-700 select-none w-6 text-right flex-none text-[9px] pt-px">{line.lineNumBefore}</span>
                  <span className={`flex-1 ${line.type === "removed" ? "text-red-300" : "text-zinc-400"} whitespace-pre`}>
                    {line.type === "removed" && <span className="text-red-500 mr-1">-</span>}
                    {line.content || " "}
                  </span>
                </motion.div>
              ) : (
                <div key={i} className="px-2 py-0.5 bg-black/10" />
              )
            ))}
          </div>

          {/* Right: after */}
          <div className="overflow-x-auto">
            {diff.map((line, i) => (
              line.type !== "removed" ? (
                <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.01 }}
                  className={`flex items-start gap-2 px-2 py-0.5 ${line.type === "added" ? "diff-added" : ""}`}>
                  <span className="text-zinc-700 select-none w-6 text-right flex-none text-[9px] pt-px">{line.lineNumAfter}</span>
                  <span className={`flex-1 ${line.type === "added" ? "text-green-300" : "text-zinc-400"} whitespace-pre`}>
                    {line.type === "added" && <span className="text-green-500 mr-1">+</span>}
                    {line.content || " "}
                  </span>
                </motion.div>
              ) : (
                <div key={i} className="px-2 py-0.5 bg-black/10" />
              )
            ))}
          </div>
        </div>
      </div>

      {/* What changed */}
      {improvements.length > 0 && (
        <div className="glass rounded-xl p-3 border border-purple-500/15">
          <div className="text-[10px] font-medium text-purple-400 mb-2 flex items-center gap-1.5">
            <GitCompare size={10} /> Changes Made
          </div>
          <div className="space-y-1">
            {improvements.map((imp, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px] text-zinc-400">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 flex-none" />
                {imp}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
