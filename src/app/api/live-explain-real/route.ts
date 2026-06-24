import { NextRequest, NextResponse } from "next/server";

interface ExplainNode {
  step: string;
  type: string;
  cost: number;
  rows: number;
  detail: string;
  actualTime?: number;
  actualRows?: number;
}

function parsePostgresExplain(raw: string): ExplainNode[] {
  const lines = raw.split("\n").filter(Boolean);
  const nodes: ExplainNode[] = [];
  let step = 1;

  lines.forEach(line => {
    const costMatch = line.match(/cost=[\d.]+\.\.([\d.]+)/);
    const rowsMatch = line.match(/rows=(\d+)/);
    const actualTimeMatch = line.match(/actual time=[\d.]+\.\.([\d.]+)/);
    const actualRowsMatch = line.match(/actual rows=(\d+)/);
    const typeMatch = line.match(/->?\s+(\w[\w\s]+?)\s+on\s+\w+|\s+->\s+(\w[\w\s]+?)\s*\(/);

    if (costMatch || typeMatch) {
      const rawType = (typeMatch?.[1] || typeMatch?.[2] || "Scan").trim();
      const type = rawType.split(" ").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      nodes.push({
        step: `Step ${step++}`,
        type,
        cost: parseFloat(costMatch?.[1] || "0"),
        rows: parseInt(rowsMatch?.[1] || "0"),
        detail: line.trim().replace(/->?\s+/, "").slice(0, 80),
        actualTime: actualTimeMatch ? parseFloat(actualTimeMatch[1]) : undefined,
        actualRows: actualRowsMatch ? parseInt(actualRowsMatch[1]) : undefined,
      });
    }
  });

  return nodes.length > 0 ? nodes : [{ step: "Step 1", type: "Query", cost: 0, rows: 0, detail: raw.slice(0, 100) }];
}

function parseMySQLExplain(rows: Record<string, string>[]): ExplainNode[] {
  return rows.map((row, i) => ({
    step: `Step ${i + 1}`,
    type: row.type?.toUpperCase() || "SCAN",
    cost: parseFloat(row.filtered || "100"),
    rows: parseInt(row.rows || "0"),
    detail: `Table: ${row.table} | Key: ${row.key || "none"} | Extra: ${row.Extra || ""}`,
  }));
}

export async function POST(req: NextRequest) {
  try {
    const { sql, connectionUrl, dbType } = await req.json();

    if (!sql?.trim()) return NextResponse.json({ error: "SQL required" }, { status: 400 });
    if (!connectionUrl?.trim()) return NextResponse.json({ error: "Connection URL required" }, { status: 400 });

    // Only allow SELECT / EXPLAIN for safety
    if (!/^\s*(SELECT|EXPLAIN|WITH)/i.test(sql)) {
      return NextResponse.json({ error: "Only SELECT queries can be explained for safety" }, { status: 400 });
    }

    const explainSQL = dbType === "mysql"
      ? `EXPLAIN FORMAT=JSON ${sql}`
      : `EXPLAIN (ANALYZE, FORMAT TEXT, BUFFERS) ${sql}`;

    if (dbType === "postgresql") {
      const { Client } = await import("pg");
      const client = new Client({ connectionString: connectionUrl, connectionTimeoutMillis: 5000 });
      await client.connect();
      try {
        const result = await client.query(explainSQL);
        const raw = result.rows.map((r: Record<string, string>) => Object.values(r)[0]).join("\n");
        const nodes = parsePostgresExplain(raw);
        return NextResponse.json({ nodes, raw, provider: "postgresql", live: true });
      } finally { await client.end(); }
    }

    if (dbType === "mysql") {
      const mysql = await import("mysql2/promise");
      const conn = await mysql.createConnection(connectionUrl);
      try {
        const [rows] = await conn.query(explainSQL) as [Record<string, string>[], unknown];
        const nodes = parseMySQLExplain(Array.isArray(rows) ? rows : []);
        return NextResponse.json({ nodes, raw: JSON.stringify(rows, null, 2), provider: "mysql", live: true });
      } finally { await conn.end(); }
    }

    return NextResponse.json({ error: "Unsupported DB type. Use postgresql or mysql." }, { status: 400 });
  } catch (e: unknown) {
    const msg = String(e);
    if (msg.includes("ECONNREFUSED")) return NextResponse.json({ error: "Could not connect to database. Check connection URL and that the DB is running." }, { status: 503 });
    if (msg.includes("password") || msg.includes("authentication")) return NextResponse.json({ error: "Authentication failed. Check credentials in connection URL." }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
