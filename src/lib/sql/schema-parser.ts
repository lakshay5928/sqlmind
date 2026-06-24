export interface ParsedTable {
  name: string;
  columns: Array<{ name: string; type: string; nullable: boolean; primaryKey: boolean; foreignKey?: string }>;
}

export interface ParsedSchema {
  tables: ParsedTable[];
  raw: string;
  source: string;
}

export function parseSQLSchema(sql: string): ParsedTable[] {
  const tables: ParsedTable[] = [];
  // Strip comments and CREATE DATABASE / USE statements
  const cleaned = sql
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/--[^\n]*/g, "")
    .replace(/^(CREATE\s+DATABASE|USE|DROP\s+DATABASE)[^\n]*;?/gim, "");

  const createStatements = cleaned.match(/CREATE\s+TABLE[\s\S]*?;/gi) || [];

  for (const stmt of createStatements) {
    const nameMatch = stmt.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"']?(\w+)[`"']?/i);
    if (!nameMatch) continue;
    const tableName = nameMatch[1];

    // Extract body between first ( and last )
    const firstParen = stmt.indexOf("(");
    const lastParen = stmt.lastIndexOf(")");
    if (firstParen === -1 || lastParen === -1) continue;
    const body = stmt.slice(firstParen + 1, lastParen);

    // Split on commas that are NOT inside parentheses
    const lines: string[] = [];
    let depth = 0, cur = "";
    for (const ch of body) {
      if (ch === "(") { depth++; cur += ch; }
      else if (ch === ")") { depth--; cur += ch; }
      else if (ch === "," && depth === 0) { lines.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
    if (cur.trim()) lines.push(cur.trim());

    const columns: ParsedTable["columns"] = [];
    for (const line of lines) {
      const t = line.trim();
      if (!t) continue;
      // Skip ALL constraint / index lines
      if (/^(PRIMARY\s+KEY|UNIQUE|INDEX|KEY|CONSTRAINT|CHECK|FOREIGN\s+KEY)/i.test(t)) continue;

      // Match: `col_name` TYPE(...) ...
      const colMatch = t.match(/^[`"']?(\w+)[`"']?\s+(\w+(?:\s*\(\s*\d+(?:\s*,\s*\d+)?\s*\))?)/i);
      if (!colMatch) continue;

      const colName = colMatch[1];
      // Skip SQL keywords that can appear as line starters
      if (/^(FOREIGN|PRIMARY|UNIQUE|INDEX|KEY|CONSTRAINT|CHECK|REFERENCES|ON|WITH|ENGINE|CHARSET|COLLATE|AUTO_INCREMENT|DEFAULT|COMMENT)$/i.test(colName)) continue;

      columns.push({
        name: colName,
        type: colMatch[2].toUpperCase().replace(/\s+/g, ""),
        nullable: !/NOT\s+NULL/i.test(t),
        primaryKey: /PRIMARY\s+KEY/i.test(t),
        foreignKey: t.match(/REFERENCES\s+[`"']?(\w+)[`"']?/i)?.[1],
      });
    }
    if (columns.length > 0) tables.push({ name: tableName, columns });
  }
  return tables;
}

export function parseCSVSchema(csv: string, tableName = "imported_data"): ParsedTable {
  const lines = csv.split("\n").filter(Boolean);
  const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ""));
  const sampleRow = lines[1]?.split(",").map(v => v.trim()) || [];
  const columns = headers.map((h, i) => {
    const val = sampleRow[i] || "";
    const type = /^\d+$/.test(val) ? "INTEGER" : /^\d+\.\d+$/.test(val) ? "DECIMAL(10,2)" : /^\d{4}-\d{2}-\d{2}/.test(val) ? "DATE" : "VARCHAR(255)";
    return { name: h.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""), type, nullable: true, primaryKey: h.toLowerCase() === "id" };
  }).filter(c => c.name);
  return { name: tableName, columns };
}

export function schemaToSQL(tables: ParsedTable[]): string {
  return tables.map(t => {
    const cols = t.columns.map(c =>
      `  ${c.name} ${c.type}${c.primaryKey ? " PRIMARY KEY" : ""}${!c.nullable ? " NOT NULL" : ""}${c.foreignKey ? ` REFERENCES ${c.foreignKey}(id)` : ""}`
    ).join(",\n");
    return `CREATE TABLE ${t.name} (\n${cols}\n);`;
  }).join("\n\n");
}

export function generateSampleQueries(tables: ParsedTable[], role: string): string[] {
  const queries: string[] = [];
  if (tables.length === 0) return queries;
  const t = tables[0];
  const cols = t.columns.map(c => c.name).slice(0, 5).join(", ");
  queries.push(`-- Select all from ${t.name}\nSELECT ${cols}\nFROM ${t.name}\nLIMIT 100;`);
  if (t.columns.find(c => c.name.includes("created") || c.name.includes("date"))) {
    const dateCol = t.columns.find(c => c.name.includes("created") || c.name.includes("date"))!.name;
    queries.push(`-- Recent records\nSELECT *\nFROM ${t.name}\nORDER BY ${dateCol} DESC\nLIMIT 10;`);
  }
  if (tables.length > 1) {
    const t2 = tables[1];
    const fk = t.columns.find(c => c.foreignKey === t2.name);
    if (fk) queries.push(`-- Join ${t.name} with ${t2.name}\nSELECT a.*, b.*\nFROM ${t.name} a\nJOIN ${t2.name} b ON a.${fk.name} = b.id\nLIMIT 50;`);
  }
  if (role !== "end_user") {
    queries.push(`-- Count by group\nSELECT ${t.columns[1]?.name || "type"}, COUNT(*) as total\nFROM ${t.name}\nGROUP BY ${t.columns[1]?.name || "type"}\nORDER BY total DESC;`);
  }
  return queries;
}
