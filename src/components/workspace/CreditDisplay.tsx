"use client";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, AlertTriangle, CheckCircle } from "lucide-react";

interface CreditDisplayProps {
  remaining: number;
  limit: number;
  creditsUsed: number;
  provider: string;
}

export default function CreditDisplay({ remaining, limit, creditsUsed, provider }: CreditDisplayProps) {
  const pct = Math.round((remaining / limit) * 100);
  const isLow = pct <= 20;
  const isCritical = pct <= 5;
  const color = isCritical ? "#EF4444" : isLow ? "#F59E0B" : "#10B981";

  if (provider === "rules" || provider === "ollama") {
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-zinc-600 glass border border-white/5 rounded-lg px-2.5 py-1">
        <CheckCircle size={9} className="text-green-400" />
        {provider === "ollama" ? "Ollama — Unlimited" : "Rule Engine — Free"}
      </div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`flex items-center gap-2 glass border rounded-lg px-2.5 py-1 ${isCritical ? "border-red-500/30 bg-red-500/5" : isLow ? "border-yellow-500/30 bg-yellow-500/5" : "border-white/5"}`}
      >
        {isCritical ? <AlertTriangle size={9} className="text-red-400" /> : <Zap size={9} className="text-purple-400" />}

        <div className="flex items-center gap-1.5">
          <div className="w-20 h-1 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: color }}
              initial={{ width: "100%" }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <span className="text-[10px] font-mono" style={{ color }}>
            {remaining}/{limit}
          </span>
        </div>

        <span className="text-[10px] text-zinc-600">per min</span>

        {creditsUsed > 0 && (
          <span className="text-[9px] text-zinc-700 border-l border-white/5 pl-1.5">
            {creditsUsed} API {creditsUsed === 1 ? "call" : "calls"}
          </span>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
