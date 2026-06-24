import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

type QRow = { healthScore: number; dialect: string; complexity: string | null; warnings: string | null; aiProvider: string; beforeCost: number; afterCost: number; createdAt: Date };
type QSmall = { healthScore: number; createdAt: Date; beforeCost: number; afterCost: number };

export async function GET() {
  try {
    const [all, last30]: [QRow[], QSmall[]] = await Promise.all([
      prisma.query.findMany({ select: { healthScore: true, dialect: true, complexity: true, warnings: true, aiProvider: true, beforeCost: true, afterCost: true, createdAt: true } }),
      prisma.query.findMany({ where: { createdAt: { gte: new Date(Date.now() - 30 * 864e5) } }, select: { healthScore: true, createdAt: true, beforeCost: true, afterCost: true } }),
    ]);
    if (all.length === 0) return NextResponse.json({ empty: true });
    const dayMap: Record<string, number> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
      dayMap[d] = 0;
    }
    last30.forEach((q: QSmall) => { const d = q.createdAt.toISOString().slice(0, 10); if (dayMap[d] !== undefined) dayMap[d]++; });
    const queriesPerDay = Object.entries(dayMap).map(([date, count]) => ({ date, count }));
    const healthTrend = last30.slice(-10).map((q: QSmall) => ({ date: q.createdAt.toISOString().slice(0, 10), score: q.healthScore }));
    const dialectMap: Record<string, number> = {};
    all.forEach((q: QRow) => { dialectMap[q.dialect] = (dialectMap[q.dialect] || 0) + 1; });
    const dialectDist = Object.entries(dialectMap).map(([name, count]) => ({ name, count }));
    const complexityMap: Record<string, number> = {};
    all.forEach((q: QRow) => { const c = q.complexity || "Simple"; complexityMap[c] = (complexityMap[c] || 0) + 1; });
    const complexityDist = Object.entries(complexityMap).map(([rating, count]) => ({ rating, count }));
    const warnMap: Record<string, number> = {};
    all.forEach((q: QRow) => {
      try { const ws = JSON.parse(q.warnings || "[]"); ws.forEach((w: { type: string }) => { warnMap[w.type] = (warnMap[w.type] || 0) + 1; }); } catch {}
    });
    const topWarnings = Object.entries(warnMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([type, count]) => ({ type, count }));
    const improved = all.filter((q: QRow) => q.afterCost < q.beforeCost && q.beforeCost > 0);
    const avgImprovement = improved.length > 0 ? Math.round(improved.reduce((s: number, q: QRow) => s + (1 - q.afterCost / q.beforeCost) * 100, 0) / improved.length) : 0;
    const providerMap: Record<string, number> = {};
    all.forEach((q: QRow) => { providerMap[q.aiProvider] = (providerMap[q.aiProvider] || 0) + 1; });
    return NextResponse.json({
      total: all.length, avgHealth: Math.round(all.reduce((s: number, q: QRow) => s + q.healthScore, 0) / all.length), avgImprovement,
      queriesPerDay, healthTrend, dialectDist, complexityDist, topWarnings,
      providerBreakdown: Object.entries(providerMap).map(([name, count]) => ({ name, count })),
    });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
