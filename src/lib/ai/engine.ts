import { callAI, detectProvider } from "./provider";
import { analyzeSQL, generateNLSQL, generateRestAPI } from "../sql/rules";

export interface QueryResult {
  rawSQL: string;
  optimizedSQL: string;
  explanation: string;
  englishExplanation: string;
  hindiExplanation: string;
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
  creditsUsed: number;
}

export async function processQuery(
  input: string, mode: "nl" | "sql", dialect: string, role: string, schema?: string
): Promise<QueryResult> {
  let provider = await detectProvider();
  let rawSQL = "";
  let optimizedSQL = "";
  let englishExplanation = "";
  let hindiExplanation = "";
  let creditsUsed = 0;

  const schemaCtx = schema ? `\nDatabase Schema:\n${schema}\n` : "";
  const roleCtx = role === "admin"
    ? "All SQL operations allowed (SELECT, INSERT, UPDATE, DELETE, ALTER, CREATE, DROP)"
    : role === "developer"
    ? "DML operations allowed (SELECT, INSERT, UPDATE, DELETE)"
    : "Only SELECT queries allowed (read-only user)";

  // Step 1: Generate SQL from NL or use raw SQL
  if (mode === "nl") {
    if (provider === "rules") {
      throw new Error("No AI provider configured. Please set a valid GROQ_API_KEY or enable Ollama.");
    }

    const sysPrompt = `You are an expert SQL developer. Generate ${dialect.toUpperCase()} SQL queries.
Role permissions: ${roleCtx}.
${schemaCtx}
Rules:
- Return ONLY the SQL query, no explanation, no markdown, no backticks
- Use proper ${dialect.toUpperCase()} syntax
- Apply best practices (explicit columns, proper JOINs, WHERE clauses)
- Respect role permissions strictly`;
    const res = await callAI(`Generate SQL for: ${input}`, sysPrompt);
    rawSQL = res.text.replace(/```sql\n?/gi, "").replace(/```\n?/gi, "").trim();
    if (!rawSQL) throw new Error("AI returned empty SQL");
    creditsUsed += 1;
  } else {
    rawSQL = input;
  }

  if (!rawSQL) rawSQL = `-- Could not generate SQL for: ${input}`;

  // Step 2: Deterministic analysis (always runs — never null)
  const analysis = analyzeSQL(rawSQL);
  optimizedSQL = analysis.optimized || rawSQL;

  // Step 3: AI-powered explanations (English + Hindi) + optimized SQL
  if (provider !== "rules") {
    try {
      const [engRes, hindiRes, optRes] = await Promise.allSettled([
        callAI(
          `Explain this SQL query in clear English. Cover: what it does, each clause (SELECT/FROM/WHERE/JOIN/GROUP BY etc), what data it returns, and any potential issues.\n\nSQL:\n${rawSQL}`,
          `You are a SQL teacher. Give a structured, beginner-friendly explanation. Use markdown with bold for clause names.`
        ),
        callAI(
          `Yeh SQL query ko Hindi/Hinglish mein 3-4 sentences mein explain karo. Simple language use karo.\n\nSQL:\n${rawSQL}`,
          `Aap ek SQL expert ho. Simple Hindi/Hinglish mein samjhao.`
        ),
        callAI(
          `Optimize this SQL query. Return ONLY the improved SQL, no explanation.\nKnown issues: ${analysis.warnings.map(w => w.message).join("; ")}\n\nSQL:\n${rawSQL}`,
          `You are a SQL optimization expert. Return only the optimized SQL query, no markdown, no explanation.`
        ),
      ]);

      if (engRes.status === "fulfilled") { englishExplanation = engRes.value.text; creditsUsed += 1; }
      if (hindiRes.status === "fulfilled") { hindiExplanation = hindiRes.value.text; creditsUsed += 1; }
      if (optRes.status === "fulfilled") {
        const aiOpt = optRes.value.text.replace(/```sql\n?/gi, "").replace(/```\n?/gi, "").trim();
        if (aiOpt && aiOpt.length > 10 && /SELECT|UPDATE|DELETE|INSERT/i.test(aiOpt)) {
          optimizedSQL = aiOpt;
          creditsUsed += 1;
        }
      }
    } catch {
      // AI calls failed — fallback to rule-based explanations below
    }
  }

  // Fallback explanations if AI didn't provide them
  if (!englishExplanation) englishExplanation = generateEnglishExplanation(rawSQL, analysis.warnings);
  if (!hindiExplanation) hindiExplanation = generateHindiExplanation(rawSQL);

  const executionPlan = generateExecutionPlan(rawSQL, analysis);
  const alternatives = generateAlternatives(rawSQL, dialect);
  const restAPI = generateRestAPI(rawSQL, dialect);
  const criticalWarnings = analysis.warnings.filter(w => w.severity === "critical");
  const highWarnings = analysis.warnings.filter(w => w.severity === "high");
  const productionReady = criticalWarnings.length === 0 && highWarnings.length === 0;
  const productionIssues = [...criticalWarnings, ...highWarnings].map(w => w.message);

  return {
    rawSQL,
    optimizedSQL,
    explanation: englishExplanation,
    englishExplanation,
    hindiExplanation,
    health: analysis.health,
    complexity: analysis.complexity,
    warnings: analysis.warnings,
    indexes: analysis.indexes,
    playground: { before: analysis.before, after: analysis.after, improvements: analysis.improvements },
    restAPI,
    executionPlan,
    alternatives,
    aiProvider: provider,
    productionReady,
    productionIssues,
    creditsUsed,
  };
}

function generateEnglishExplanation(sql: string, warnings: Array<{ type: string; message: string; severity?: string; fix?: string }>): string {
  const lines: string[] = ["## Query Explanation\n"];
  const u = sql.toUpperCase();

  if (/SELECT/i.test(sql)) {
    const cols = sql.match(/SELECT\s+([\s\S]+?)\s+FROM/i)?.[1]?.trim();
    lines.push(`**SELECT** — Retrieves ${cols === "*" ? "all columns (consider specifying only needed columns)" : `columns: \`${cols?.slice(0, 80)}\``} from the database.`);
  }
  const fromMatch = sql.match(/FROM\s+[`"]?(\w+)[`"]?/i);
  if (fromMatch) lines.push(`**FROM** — Queries the \`${fromMatch[1]}\` table as the primary data source.`);

  const joinMatches = sql.match(/\b(INNER|LEFT|RIGHT|FULL|CROSS)?\s*JOIN\s+[`"]?(\w+)[`"]?/gi) || [];
  if (joinMatches.length > 0) lines.push(`**JOIN** — Combines data from ${joinMatches.length} additional table(s): ${joinMatches.map(j => j.split(/\s+/).pop()).join(", ")}.`);

  const whereMatch = sql.match(/WHERE\s+([\s\S]+?)(?:GROUP|ORDER|LIMIT|HAVING|$)/i);
  if (whereMatch) lines.push(`**WHERE** — Filters rows where: \`${whereMatch[1].trim().slice(0, 100)}\`.`);

  if (/GROUP\s+BY/i.test(sql)) lines.push(`**GROUP BY** — Aggregates rows sharing the same group values for aggregate calculations (COUNT, SUM, AVG, etc.).`);
  if (/HAVING/i.test(sql)) lines.push(`**HAVING** — Filters aggregated groups (like WHERE but for grouped data).`);
  if (/ORDER\s+BY/i.test(sql)) {
    const orderMatch = sql.match(/ORDER\s+BY\s+([\s\S]+?)(?:LIMIT|$)/i);
    lines.push(`**ORDER BY** — Sorts results by: \`${orderMatch?.[1]?.trim().slice(0, 60) || "specified columns"}\`.`);
  }
  if (/LIMIT/i.test(sql)) lines.push(`**LIMIT** — Restricts output to ${sql.match(/LIMIT\s+(\d+)/i)?.[1]} rows — good for performance.`);
  if (/UPDATE/i.test(sql)) lines.push(`**UPDATE** — Modifies existing records. ${/WHERE/i.test(sql) ? "Safely targets specific rows via WHERE clause." : "⚠️ No WHERE clause — will affect ALL rows!"}`);
  if (/DELETE/i.test(sql)) lines.push(`**DELETE** — Removes records from the table. ${/WHERE/i.test(sql) ? "Targets specific rows via WHERE clause." : "⚠️ No WHERE clause — will delete ALL rows!"}`);
  if (/INSERT/i.test(sql)) lines.push(`**INSERT** — Adds new records into the table.`);

  if (warnings.length > 0) {
    lines.push(`\n## ⚠️ Issues Detected`);
    warnings.forEach(w => lines.push(`- **${(w.severity || "info").toUpperCase()}**: ${w.message}${w.fix ? ` → *Fix: ${w.fix}*` : ""}`));
  } else {
    lines.push(`\n✅ **No major issues detected** — this query follows good SQL practices.`);
  }
  return lines.join("\n\n");
}

function generateHindiExplanation(sql: string): string {
  const parts: string[] = [];
  if (/SELECT/i.test(sql)) parts.push("Yeh query database se data fetch karta hai.");
  if (/JOIN/i.test(sql)) parts.push("JOIN use hokar multiple tables ka data combine kiya ja raha hai.");
  if (/WHERE/i.test(sql)) parts.push("WHERE clause specific conditions ke basis pe rows filter karta hai.");
  if (/GROUP BY/i.test(sql)) parts.push("GROUP BY se data ko categories mein group kiya ja raha hai aur aggregate functions apply ho rahe hain.");
  if (/ORDER BY/i.test(sql)) parts.push("ORDER BY results ko sort karta hai.");
  if (/LIMIT/i.test(sql)) parts.push(`LIMIT se sirf ${sql.match(/LIMIT\s+(\d+)/i)?.[1] || "kuch"} rows return honge — performance ke liye achha hai.`);
  if (/UPDATE/i.test(sql)) parts.push(`Yeh query existing records update karta hai. ${/WHERE/i.test(sql) ? "WHERE clause se sirf specific rows update hongi." : "⚠️ WHERE nahi hai — SAARE rows update ho jayenge!"}`);
  if (/DELETE/i.test(sql)) parts.push(`Yeh query records delete karta hai. ${/WHERE/i.test(sql) ? "WHERE clause targeted deletion karta hai." : "⚠️ WHERE nahi hai — SAARE rows delete ho jayenge!"}`);
  if (/INSERT/i.test(sql)) parts.push("Yeh query nayi rows database mein insert karta hai.");
  return parts.join(" ") || "Yeh ek standard SQL query hai jo database ke saath interact karta hai.";
}

function generateExecutionPlan(sql: string, analysis: ReturnType<typeof analyzeSQL>) {
  const steps = [];
  let stepNum = 1;
  const tables = (sql.match(/(?:FROM|JOIN)\s+[`"]?(\w+)[`"]?/gi) || []).map(m => m.split(/\s+/).pop()?.replace(/[`"]/g, "") || "");

  tables.forEach(t => {
    steps.push({ step: `Step ${stepNum++}`, type: "Table Scan", cost: Math.round(analysis.before.executionCost * 0.4), rows: Math.round(analysis.before.estimatedRows / Math.max(tables.length, 1)), detail: `Full scan of \`${t}\`` });
  });
  if (/WHERE/i.test(sql)) steps.push({ step: `Step ${stepNum++}`, type: "Filter", cost: Math.round(analysis.before.executionCost * 0.15), rows: Math.round(analysis.before.estimatedRows * 0.3), detail: "Apply WHERE conditions" });
  if (/JOIN/i.test(sql)) steps.push({ step: `Step ${stepNum++}`, type: "Hash Join", cost: Math.round(analysis.before.executionCost * 0.25), rows: Math.round(analysis.before.estimatedRows * 0.6), detail: "Join tables on matching keys" });
  if (/GROUP\s+BY/i.test(sql)) steps.push({ step: `Step ${stepNum++}`, type: "Aggregate", cost: 8, rows: Math.round(analysis.before.estimatedRows * 0.1), detail: "Group and aggregate results" });
  if (/ORDER\s+BY/i.test(sql)) steps.push({ step: `Step ${stepNum++}`, type: "Sort", cost: 12, rows: analysis.before.estimatedRows, detail: "Sort result set" });
  if (/LIMIT/i.test(sql)) steps.push({ step: `Step ${stepNum++}`, type: "Limit", cost: 1, rows: parseInt(sql.match(/LIMIT\s+(\d+)/i)?.[1] || "100"), detail: "Apply row limit" });
  steps.push({ step: `Step ${stepNum}`, type: "Output", cost: 2, rows: analysis.after.estimatedRows, detail: "Return results to client" });

  return steps.length > 1 ? steps : [
    { step: "Step 1", type: "Sequential Scan", cost: analysis.before.executionCost, rows: analysis.before.estimatedRows, detail: "Full table scan" },
    { step: "Step 2", type: "Output", cost: 1, rows: analysis.before.estimatedRows, detail: "Return results" }
  ];
}

function generateAlternatives(sql: string, dialect: string) {
  const alts = [];
  if (/SELECT/i.test(sql)) {
    alts.push({ label: "CTE Version", sql: `WITH cte AS (\n  ${sql.replace(/\n/g, "\n  ")}\n)\nSELECT * FROM cte;`, tradeoff: "More readable, easier to debug, reusable in complex queries" });
    if (/WHERE.*IN\s*\(SELECT/i.test(sql)) {
      alts.push({ label: "EXISTS Version", sql: sql.replace(/IN\s*\(SELECT/i, "EXISTS (SELECT 1 FROM"), tradeoff: "Faster for large subsets, stops at first match" });
    } else if (!/LIMIT/i.test(sql)) {
      alts.push({ label: "Paginated Version", sql: `${sql.replace(/;?\s*$/, "")}\nORDER BY 1\nLIMIT 50 OFFSET 0;`, tradeoff: "Safer for large tables, prevents memory overload" });
    }
    alts.push({ label: "Indexed Hint", sql: `-- Add this index first:\n-- CREATE INDEX idx_filter ON ${(sql.match(/FROM\s+[`"]?(\w+)/i)?.[1] || "table_name")}(filter_column);\n\n${sql}`, tradeoff: "Best performance with proper index, requires one-time index creation" });
  }
  return alts;
}
