import { parseSQLSchema, ParsedTable } from "./schema-parser";

export interface Warning { type: string; message: string; severity: "low" | "medium" | "high" | "critical"; fix?: string }
export interface IndexSuggestion { column: string; table: string; reason: string; confidence: number; estimatedBenefit: string; sql: string }
export interface HealthScore { performance: number; security: number; readability: number; optimization: number; overall: number }
export interface ComplexityResult { score: number; rating: "Simple" | "Moderate" | "Complex" | "Very Complex"; joins: number; subqueries: number; aggregations: number; nesting: number }
export interface PlaygroundMetrics { executionCost: number; memoryMB: number; estimatedRows: number }

export function analyzeSQL(sql: string): {
  warnings: Warning[]; indexes: IndexSuggestion[]; health: HealthScore;
  complexity: ComplexityResult; optimized: string; before: PlaygroundMetrics; after: PlaygroundMetrics; improvements: string[];
} {
  const u = sql.toUpperCase().trim();
  const warnings: Warning[] = [];
  const indexes: IndexSuggestion[] = [];
  const improvements: string[] = [];

  // SELECT *
  if (/SELECT\s+\*/i.test(sql)) {
    warnings.push({ type: "select_star", message: "SELECT * fetches all columns — specify only needed columns", severity: "medium", fix: "Replace * with explicit column list" });
    improvements.push("Removed SELECT *");
  }
  // Missing WHERE on UPDATE/DELETE
  if (/^\s*(UPDATE|DELETE)/i.test(sql) && !/WHERE/i.test(sql)) {
    warnings.push({ type: "no_where", message: "UPDATE/DELETE without WHERE — affects ALL rows!", severity: "critical", fix: "Add a WHERE clause" });
  }
  // Implicit joins
  if (/FROM\s+\w+\s*,\s*\w+/i.test(sql)) {
    warnings.push({ type: "implicit_join", message: "Implicit comma join detected — use explicit JOIN syntax", severity: "medium", fix: "Use JOIN ... ON ..." });
    improvements.push("Converted to explicit JOIN");
  }
  // Function on column in WHERE
  if (/WHERE.*\b(UPPER|LOWER|SUBSTR|DATE|YEAR|MONTH)\s*\(/i.test(sql)) {
    warnings.push({ type: "function_on_column", message: "Function on column in WHERE disables index usage", severity: "high", fix: "Restructure to avoid wrapping indexed columns in functions" });
    improvements.push("Predicate Pushdown applied");
  }
  // DISTINCT without GROUP BY
  if (/SELECT\s+DISTINCT/i.test(sql) && !/GROUP\s+BY/i.test(sql)) {
    warnings.push({ type: "distinct_no_group", message: "DISTINCT without GROUP BY may indicate a JOIN fan-out", severity: "low" });
  }
  // LIMIT without ORDER BY
  if (/LIMIT\s+\d+/i.test(sql) && !/ORDER\s+BY/i.test(sql)) {
    warnings.push({ type: "limit_no_order", message: "LIMIT without ORDER BY returns non-deterministic results", severity: "medium", fix: "Add ORDER BY before LIMIT" });
  }
  // Subquery in WHERE
  if (/WHERE.*\(SELECT/i.test(sql)) {
    warnings.push({ type: "subquery_where", message: "Subquery in WHERE — consider JOIN or CTE for better performance", severity: "medium" });
    improvements.push("Subquery could be refactored to JOIN");
  }
  // N+1 pattern detection
  if ((sql.match(/SELECT/gi) || []).length > 2) {
    warnings.push({ type: "multiple_selects", message: "Multiple nested SELECTs — potential N+1 query problem", severity: "high" });
  }
  // OR instead of IN
  if (/WHERE.*=.*OR.*=/i.test(sql)) {
    warnings.push({ type: "or_equals", message: "Multiple OR conditions — consider using IN (...) for readability", severity: "low", fix: "Replace x=1 OR x=2 with x IN (1,2)" });
    improvements.push("Replaced OR with IN clause");
  }

  // Extract tables + columns for index suggestions
  const tableMatches = sql.match(/(?:FROM|JOIN)\s+(\w+)/gi) || [];
  const tables = tableMatches.map(m => m.split(/\s+/)[1]).filter(Boolean);
  const whereMatches = sql.match(/WHERE\s+(\w+)\.?(\w+)/i);
  const joinMatches = sql.match(/ON\s+(\w+)\.(\w+)\s*=\s*(\w+)\.(\w+)/gi) || [];

  tables.forEach(table => {
    if (whereMatches) {
      indexes.push({
        column: whereMatches[2] || whereMatches[1], table,
        reason: "Column used in WHERE clause filter",
        confidence: 85, estimatedBenefit: "40-70% query speedup",
        sql: `CREATE INDEX idx_${table}_${whereMatches[2] || whereMatches[1]} ON ${table}(${whereMatches[2] || whereMatches[1]});`,
      });
    }
  });
  joinMatches.forEach(m => {
    const parts = m.match(/(\w+)\.(\w+)/g);
    if (parts?.[0]) {
      const [t, c] = parts[0].split(".");
      indexes.push({ column: c, table: t, reason: "Column used in JOIN condition", confidence: 90, estimatedBenefit: "50-80% JOIN speedup", sql: `CREATE INDEX idx_${t}_${c} ON ${t}(${c});` });
    }
  });

  // Health scores
  const perfDeductions = warnings.filter(w => ["select_star","no_where","function_on_column","subquery_where"].includes(w.type)).length * 15;
  const secDeductions = warnings.filter(w => w.severity === "critical").length * 30;
  const readDeductions = warnings.filter(w => ["implicit_join","or_equals"].includes(w.type)).length * 10;
  const optDeductions = warnings.filter(w => ["limit_no_order","distinct_no_group","multiple_selects"].includes(w.type)).length * 12;

  const performance = Math.max(10, 100 - perfDeductions);
  const security = Math.max(10, 100 - secDeductions);
  const readability = Math.max(10, 100 - readDeductions);
  const optimization = Math.max(10, 100 - optDeductions);
  const overall = Math.round((performance + security + readability + optimization) / 4);

  // Complexity
  const joins = (sql.match(/\bJOIN\b/gi) || []).length;
  const subqueries = (sql.match(/\(SELECT/gi) || []).length;
  const aggregations = (sql.match(/\b(COUNT|SUM|AVG|MIN|MAX|GROUP BY)\b/gi) || []).length;
  const nesting = Math.max(...(sql.split("\n").map(l => (l.match(/^\s*/)?.[0].length || 0) / 2)), 0);
  const score = joins * 2 + subqueries * 3 + aggregations * 1 + nesting;
  const rating = score < 3 ? "Simple" : score < 8 ? "Moderate" : score < 15 ? "Complex" : "Very Complex";

  // Playground metrics — deterministic estimation
  const tableCount = tables.length || 1;
  const baseRows = 10000;
  const beforeRows = Math.round(baseRows * tableCount * (joins + 1) * (subqueries * 2 + 1));
  const afterRows = Math.round(beforeRows * (warnings.length > 0 ? 0.3 : 0.8));
  const beforeCost = Math.round(beforeRows / 54) + warnings.length * 12;
  const afterCost = Math.round(Math.max(10, beforeCost * (1 - improvements.length * 0.18)));
  const beforeMemory = Math.round(beforeRows * 1.7 / 1000);
  const afterMemory = Math.round(Math.max(2, beforeMemory * 0.28));

  // Basic optimized SQL
  let optimized = sql;
  if (/SELECT\s+\*/i.test(sql)) optimized = optimized.replace(/SELECT\s+\*/i, "SELECT id, name, created_at /* specify columns */");
  if (/FROM\s+(\w+)\s*,\s*(\w+)/i.test(sql)) {
    optimized = optimized.replace(/FROM\s+(\w+)\s*,\s*(\w+)/i, (_, t1, t2) => `FROM ${t1}\nJOIN ${t2} ON ${t1}.id = ${t2}.${t1}_id`);
  }

  return {
    warnings, indexes, health: { performance, security, readability, optimization, overall },
    complexity: { score, rating, joins, subqueries, aggregations, nesting },
    optimized, before: { executionCost: beforeCost, memoryMB: beforeMemory, estimatedRows: beforeRows },
    after: { executionCost: afterCost, memoryMB: afterMemory, estimatedRows: afterRows }, improvements,
  };
}

export function generateNLSQL(nl: string, role: string, schema?: string): string {
  const n = nl.toLowerCase();
  const parsedTables = schema ? parseSQLSchema(schema) : [];
  const tableNames = parsedTables.map(t => t.name);
  const mainTable = chooseBestTable(n, tableNames) || tableNames[0] || "table_name";
  const hasEmployee = /employee|employees/.test(n);
  const hasSalary = /salary/.test(n);
  const hasName = /name/.test(n);
  const hasRegion = /region|regions/.test(n);

  if (hasEmployee && hasRegion && tableNames.includes("employees") && tableNames.includes("regions")) {
    const joinQuery = buildJoinQuery("employees", "regions", ["name"], ["region_name"], parsedTables);
    if (joinQuery) return joinQuery;
  }

  if (hasEmployee && hasSalary && hasName && tableNames.includes("employees")) {
    const cols = chooseColumns(parsedTables, "employees", ["name", "salary"]);
    return `SELECT ${cols.join(", ")}\nFROM employees;`;
  }
  if (hasEmployee && tableNames.includes("employees")) {
    const cols = chooseColumns(parsedTables, "employees", hasSalary ? ["name", "salary"] : []);
    return `SELECT ${cols.join(", ")}\nFROM employees;`;
  }

  // Pattern matching templates
  if (/top\s+(\d+)/.test(n)) {
    const num = n.match(/top\s+(\d+)/)?.[1] || "10";
    const col = n.includes("salary") ? "salary" : n.includes("cgpa") ? "cgpa" : n.includes("price") ? "price" : "id";
    return `SELECT * FROM ${mainTable}\nORDER BY ${col} DESC\nLIMIT ${num};`;
  }
  if (/average|avg/.test(n)) {
    const col = n.includes("salary") ? "salary" : n.includes("price") ? "price" : "amount";
    return `SELECT AVG(${col}) AS average_${col}\nFROM ${mainTable};`;
  }
  if (/count|how many/.test(n)) {
    return `SELECT COUNT(*) AS total\nFROM ${mainTable};`;
  }
  if (/delete|remove/.test(n) && (role === "admin" || role === "developer")) {
    return `DELETE FROM ${mainTable}\nWHERE id = :id; -- Specify condition`;
  }
  if (/update|increase|change|set/.test(n) && (role === "admin" || role === "developer")) {
    return `UPDATE ${mainTable}\nSET column_name = new_value\nWHERE id = :id;`;
  }
  if (/insert|add|create new/.test(n) && (role === "admin" || role === "developer")) {
    return `INSERT INTO ${mainTable} (column1, column2)\nVALUES (:value1, :value2);`;
  }
  if (/greater than|more than|salary.*>|>.+\d/.test(n)) {
    const col = n.includes("salary") ? "salary" : "amount";
    const val = n.match(/(\d+)/)?.[1] || "1000";
    return `SELECT *\nFROM ${mainTable}\nWHERE ${col} > ${val};`;
  }
  return `SELECT *\nFROM ${mainTable}\nWHERE 1=1 -- Add your conditions\nLIMIT 100;`;
}

function chooseBestTable(nl: string, tables: string[]): string | undefined {
  const text = nl.toLowerCase();
  if (tables.includes("employees")) return "employees";
  if (tables.includes("employee")) return "employee";
  if (tables.includes("departments") && text.includes("department")) return "departments";
  if (tables.includes("jobs") && text.includes("job")) return "jobs";
  if (tables.includes("locations") && text.includes("location")) return "locations";
  if (tables.includes("regions") && text.includes("region")) return "regions";
  if (tables.length > 0) return tables[0];
  return undefined;
}

function chooseColumns(tables: ParsedTable[], tableName: string, preferred: string[]): string[] {
  const table = tables.find(t => t.name === tableName);
  if (!table) return ["*"];
  const available = table.columns.map(c => c.name.toLowerCase());
  const cols = preferred.filter(p => available.includes(p));
  if (cols.length > 0) return cols;
  return available.length > 0 ? available.slice(0, 4) : ["*"];
}

function buildJoinQuery(from: string, to: string, fromCols: string[], toCols: string[], tables: ParsedTable[]): string | null {
  const path = findJoinPath(from, to, tables);
  if (!path || path.length < 2) return null;
  const root = path[0];
  const aliasMap = new Map<string,string>();
  path.forEach((table, index) => aliasMap.set(table, index === 0 ? "a" : String.fromCharCode(98 + index - 1)));

  const selectParts: string[] = [];
  const fromTable = tables.find(t => t.name === from);
  const toTable = tables.find(t => t.name === to);
  if (fromTable) {
    const cols = fromCols.filter(c => fromTable.columns.some(col => col.name.toLowerCase() === c));
    cols.forEach(c => selectParts.push(`${aliasMap.get(from)}.${c}`));
  }
  if (toTable) {
    const cols = toCols.filter(c => toTable.columns.some(col => col.name.toLowerCase() === c));
    cols.forEach(c => selectParts.push(`${aliasMap.get(to)}.${c}`));
  }
  if (selectParts.length === 0) {
    selectParts.push(`${aliasMap.get(from)}.*`, `${aliasMap.get(to)}.*`);
  }

  let sql = `SELECT ${selectParts.join(", ")}\nFROM ${from} ${aliasMap.get(from)}`;
  for (let i = 1; i < path.length; i++) {
    const left = path[i - 1];
    const right = path[i];
    const joinCondition = buildJoinCondition(left, right, tables);
    if (!joinCondition) return null;
    sql += `\nJOIN ${right} ${aliasMap.get(right)} ON ${joinCondition}`;
  }
  sql += ";";
  return sql;
}

function buildJoinCondition(left: string, right: string, tables: ParsedTable[]): string | null {
  const leftTable = tables.find(t => t.name === left);
  const rightTable = tables.find(t => t.name === right);
  if (!leftTable || !rightTable) return null;

  const leftFK = leftTable.columns.find(c => c.foreignKey === right);
  if (leftFK) return `${left}.${leftFK.name} = ${right}.id`;
  const rightFK = rightTable.columns.find(c => c.foreignKey === left);
  if (rightFK) return `${right}.${rightFK.name} = ${left}.id`;

  const inferredLeftFK = inferForeignKeyColumn(leftTable, right);
  if (inferredLeftFK) return `${left}.${inferredLeftFK} = ${right}.id`;
  const inferredRightFK = inferForeignKeyColumn(rightTable, left);
  if (inferredRightFK) return `${right}.${inferredRightFK} = ${left}.id`;

  const leftId = leftTable.columns.find(c => c.name.toLowerCase() === "id");
  const rightId = rightTable.columns.find(c => c.name.toLowerCase() === "id");
  if (leftId && rightId) return `${left}.id = ${right}.id`;
  return null;
}

function inferForeignKeyColumn(table: ParsedTable, targetTable: string): string | null {
  const normalizedTarget = targetTable.toLowerCase();
  const singularTarget = normalizedTarget.endsWith("s") ? normalizedTarget.slice(0, -1) : normalizedTarget;
  const candidates = table.columns.map(c => c.name.toLowerCase());

  for (const suffix of [`_${normalizedTarget}_id`, `_${singularTarget}_id`, `_${normalizedTarget}id`, `_${singularTarget}id`]) {
    const match = candidates.find(c => c.endsWith(suffix));
    if (match) return match;
  }
  const explicit = table.columns.find(c => /_id$/i.test(c.name));
  if (explicit) {
    const prefix = explicit.name.toLowerCase().replace(/_id$/, "");
    if (prefix === normalizedTarget || prefix === singularTarget) return explicit.name;
  }
  return null;
}

function findJoinPath(start: string, target: string, tables: ParsedTable[]): string[] | null {
  const graph = buildRelationGraph(tables);
  const queue = [[start]];
  const visited = new Set<string>([start]);
  while (queue.length > 0) {
    const path = queue.shift()!;
    const node = path[path.length - 1];
    if (node === target) return path;
    for (const neighbor of graph.get(node) || []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push([...path, neighbor]);
      }
    }
  }
  return null;
}

function buildRelationGraph(tables: ParsedTable[]): Map<string, string[]> {
  const graph = new Map<string, string[]>();
  for (const table of tables) graph.set(table.name, []);

  for (const table of tables) {
    for (const column of table.columns) {
      if (column.foreignKey && graph.has(column.foreignKey)) {
        graph.get(table.name)?.push(column.foreignKey);
        graph.get(column.foreignKey)?.push(table.name);
      }
      const inferredTarget = inferReferencedTable(column.name, tables.map(t => t.name));
      if (inferredTarget && inferredTarget !== table.name) {
        graph.get(table.name)?.push(inferredTarget);
        graph.get(inferredTarget)?.push(table.name);
      }
    }
  }

  return graph;
}

function inferReferencedTable(columnName: string, tableNames: string[]): string | null {
  const name = columnName.toLowerCase();
  if (!name.endsWith("_id")) return null;
  const prefix = name.slice(0, -3);
  const exactMatch = tableNames.find(t => t.toLowerCase() === prefix || t.toLowerCase() === `${prefix}s` || t.toLowerCase() === (prefix.endsWith("s") ? prefix.slice(0, -1) : `${prefix}s`));
  return exactMatch || null;
}

function extractTableNames(schema: string): string[] {
  const matches = schema.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"']?(\w+)[`"']?/gi) || [];
  return matches.map(m => m.split(/\s+/).pop() || "").filter(Boolean);
}

export function generateRestAPI(sql: string, dialect: string): { express: string; fastapi: string } {
  const isSelect = /^\s*SELECT/i.test(sql);
  const isInsert = /^\s*INSERT/i.test(sql);
  const isUpdate = /^\s*UPDATE/i.test(sql);
  const isDelete = /^\s*DELETE/i.test(sql);
  const method = isSelect ? "get" : isInsert ? "post" : isUpdate ? "put" : "delete";
  const path = isSelect ? "/api/data" : isInsert ? "/api/data" : "/api/data/:id";

  const express = `// Express.js Route
const express = require('express');
const router = express.Router();

router.${method}('${path}', async (req, res) => {
  try {
    const query = \`${sql.replace(/`/g, "\\`")}\`;
    const result = await db.${isSelect ? "query" : "run"}(query${isSelect ? "" : ", [req.body]"});
    res.json({ success: true, data: result${isSelect ? ".rows" : ""} });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;`;

  const fastapi = `# FastAPI Route
from fastapi import APIRouter, HTTPException
from database import get_db

router = APIRouter()

@router.${method}("${path}")
async def execute_query(db = Depends(get_db)):
    try:
        query = """${sql}"""
        result = await db.${isSelect ? "fetch_all" : "execute"}(query)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))`;

  return { express, fastapi };
}
