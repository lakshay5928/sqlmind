import { NextRequest, NextResponse } from "next/server";
import { processQuery } from "@/lib/ai/engine";
import { prisma } from "@/lib/db/prisma";
import { checkRateLimit, getSessionId } from "@/lib/security/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const sessionId = await getSessionId(req);

    // Rate limit check
    const rl = await checkRateLimit(sessionId);
    if (!rl.allowed) {
      return NextResponse.json({
        error: "Rate limit exceeded",
        message: `Too many requests. Try again in ${rl.retryAfterSeconds}s.`,
        retryAfter: rl.retryAfterSeconds,
        remaining: 0,
        limit: rl.limit,
      }, { status: 429 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const { input, mode, dialect, role, schema, notes } = body;
    if (!input?.trim()) return NextResponse.json({ error: "Input required" }, { status: 400 });

    const result = await processQuery(
      String(input),
      (mode === "sql" ? "sql" : "nl") as "nl" | "sql",
      dialect || "postgresql",
      role || "developer",
      schema || undefined
    );

    // Save to DB — session-scoped (no cross-session data leakage)
    let savedId: string | undefined;
    try {
      const saved = await prisma.query.create({
        data: {
          input: String(input),
          mode: mode || "nl",
          dialect: dialect || "postgresql",
          role: role || "developer",
          rawSql: result.rawSQL || "",
          optimized: result.optimizedSQL || "",
          explanation: result.englishExplanation || "",
          hindiExplanation: result.hindiExplanation || "",
          healthScore: result.health?.overall ?? 0,
          complexity: result.complexity?.rating || "Simple",
          warnings: JSON.stringify(result.warnings ?? []),
          indexes: JSON.stringify(result.indexes ?? []),
          beforeCost: result.playground?.before?.executionCost ?? 0,
          afterCost: result.playground?.after?.executionCost ?? 0,
          beforeMemory: result.playground?.before?.memoryMB ?? 0,
          afterMemory: result.playground?.after?.memoryMB ?? 0,
          beforeRows: result.playground?.before?.estimatedRows ?? 0,
          afterRows: result.playground?.after?.estimatedRows ?? 0,
          improvements: JSON.stringify(result.playground?.improvements ?? []),
          notes: notes ? String(notes) : null,
          schemaContext: schema ? String(schema).slice(0, 5000) : null,
          aiProvider: result.aiProvider || "rules",
        },
      });
      savedId = saved.id;
    } catch (dbErr) {
      // DB save failure shouldn't block the response
      process.stderr.write("DB save error: " + String(dbErr) + "\n");
    }

    return NextResponse.json({
      ...result,
      id: savedId,
      rateLimit: { remaining: rl.remaining, limit: rl.limit, resetIn: rl.retryAfterSeconds },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : typeof err === "string" ? err : "Unknown error";
    process.stderr.write("Query API error: " + msg + "\n");
    return NextResponse.json({ error: "Query processing failed", details: msg }, { status: 500 });
  }
}
