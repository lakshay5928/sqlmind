import { NextRequest, NextResponse } from "next/server";
import { callAI, detectProvider } from "@/lib/ai/provider";
import { analyzeSQL } from "@/lib/sql/rules";

export async function POST(req: NextRequest) {
  try {
    const { message, currentSQL, schema, history } = await req.json();
    const provider = await detectProvider();

    if (provider !== "rules") {
      const systemPrompt = `You are SQLMind AI, an expert SQL assistant and database coach.
${currentSQL ? `Current SQL in editor:\n\`\`\`sql\n${currentSQL}\n\`\`\`` : ""}
${schema ? `Database schema:\n${schema}` : ""}
Answer concisely but completely. Format SQL with markdown code blocks.
If asked to modify the query, return the complete new SQL.`;

      const messages = [
        ...(history || []).slice(-6),
        { role: "user", content: message },
      ];

      const fullPrompt = messages.map((m: { role: string; content: string }) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n\n");
      const res = await callAI(fullPrompt, systemPrompt);
      return NextResponse.json({ response: res.text, provider });
    }

    // Rule-based fallback
    const analysis = currentSQL ? analyzeSQL(currentSQL) : null;
    let response = "";

    const m = message.toLowerCase();
    if (m.includes("explain") || m.includes("what does")) {
      response = analysis ? `**Query Analysis:**\n\n${analysis.warnings.length > 0 ? `⚠️ Issues: ${analysis.warnings.map(w => w.message).join(", ")}` : "✅ No major issues found."}\n\nHealth Score: **${analysis.health.overall}/100**\nComplexity: **${analysis.complexity.rating}**` : "Please load a SQL query in the editor first.";
    } else if (m.includes("optimize") || m.includes("improve")) {
      response = analysis ? `**Optimization Suggestions:**\n\n${analysis.warnings.map(w => `• ${w.message}${w.fix ? `\n  Fix: ${w.fix}` : ""}`).join("\n") || "Your query looks well-optimized!"}` : "Please load a SQL query first.";
    } else if (m.includes("index")) {
      response = analysis?.indexes.length ? `**Recommended Indexes:**\n\n${analysis.indexes.map(i => `\`\`\`sql\n${i.sql}\n\`\`\`\n*${i.reason} — ${i.estimatedBenefit}*`).join("\n\n")}` : "No specific index suggestions for current query.";
    } else if (m.includes("production") || m.includes("safe")) {
      response = analysis ? (analysis.warnings.filter(w => w.severity === "critical" || w.severity === "high").length === 0 ? "✅ Query appears production-ready! No critical issues found." : `⚠️ **Production Issues Found:**\n\n${analysis.warnings.filter(w => w.severity === "critical" || w.severity === "high").map(w => `• ${w.message}`).join("\n")}`) : "Please load a query first.";
    } else {
      response = `I'm running in **rule-based mode** (no AI provider detected).\n\nI can help you with:\n• **Explain** — "explain this query"\n• **Optimize** — "how to optimize?"\n• **Indexes** — "what indexes do I need?"\n• **Production** — "is this production-ready?"\n\nFor full AI chat, add a **GROQ_API_KEY** or run **Ollama** locally.`;
    }
    return NextResponse.json({ response, provider: "rules" });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
