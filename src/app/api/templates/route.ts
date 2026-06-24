import { NextResponse } from "next/server";

const TEMPLATES = [
  { id: "1", name: "Paginated Select", category: "Select", description: "Fetch records with pagination", sql: "SELECT id, name, created_at\nFROM table_name\nORDER BY created_at DESC\nLIMIT 20 OFFSET 0;", tags: "pagination,select" },
  { id: "2", name: "Search with LIKE", category: "Select", description: "Full-text search pattern", sql: "SELECT *\nFROM table_name\nWHERE name ILIKE '%search_term%'\n   OR description ILIKE '%search_term%'\nLIMIT 50;", tags: "search,select" },
  { id: "3", name: "Aggregation with GROUP BY", category: "Aggregate", description: "Count records by category", sql: "SELECT category, COUNT(*) as total, AVG(amount) as avg_amount\nFROM table_name\nGROUP BY category\nHAVING COUNT(*) > 0\nORDER BY total DESC;", tags: "aggregate,group" },
  { id: "4", name: "JOIN Two Tables", category: "Join", description: "Inner join with alias", sql: "SELECT a.id, a.name, b.value\nFROM table_a a\nINNER JOIN table_b b ON a.id = b.table_a_id\nWHERE a.active = true\nORDER BY a.created_at DESC;", tags: "join,select" },
  { id: "5", name: "LEFT JOIN with NULL check", category: "Join", description: "Find unmatched records", sql: "SELECT a.*\nFROM table_a a\nLEFT JOIN table_b b ON a.id = b.table_a_id\nWHERE b.id IS NULL;", tags: "join,null,select" },
  { id: "6", name: "Upsert (INSERT ON CONFLICT)", category: "Insert", description: "Insert or update on conflict", sql: "INSERT INTO table_name (id, name, value)\nVALUES (:id, :name, :value)\nON CONFLICT (id)\nDO UPDATE SET name = EXCLUDED.name, value = EXCLUDED.value, updated_at = NOW();", tags: "insert,upsert" },
  { id: "7", name: "Bulk Insert", category: "Insert", description: "Insert multiple rows efficiently", sql: "INSERT INTO table_name (col1, col2, col3)\nVALUES\n  (:val1a, :val1b, :val1c),\n  (:val2a, :val2b, :val2c),\n  (:val3a, :val3b, :val3c);", tags: "insert,bulk" },
  { id: "8", name: "Safe Update with CTE", category: "Update", description: "Update using CTE for safety", sql: "WITH target AS (\n  SELECT id FROM table_name\n  WHERE condition = :value\n  LIMIT 100\n)\nUPDATE table_name\nSET column = :new_value, updated_at = NOW()\nWHERE id IN (SELECT id FROM target);", tags: "update,cte" },
  { id: "9", name: "Soft Delete", category: "Delete", description: "Mark as deleted without removing", sql: "UPDATE table_name\nSET deleted_at = NOW(), is_active = false\nWHERE id = :id\n  AND deleted_at IS NULL;", tags: "delete,soft-delete" },
  { id: "10", name: "Window Function - Rank", category: "Advanced", description: "Rank rows within partitions", sql: "SELECT\n  id, name, amount, category,\n  RANK() OVER (PARTITION BY category ORDER BY amount DESC) as rank_in_category,\n  ROW_NUMBER() OVER (ORDER BY amount DESC) as global_rank\nFROM table_name;", tags: "window,rank,advanced" },
  { id: "11", name: "CTE Recursive", category: "Advanced", description: "Hierarchical data query", sql: "WITH RECURSIVE hierarchy AS (\n  SELECT id, name, parent_id, 0 as level\n  FROM table_name WHERE parent_id IS NULL\n  UNION ALL\n  SELECT t.id, t.name, t.parent_id, h.level + 1\n  FROM table_name t\n  JOIN hierarchy h ON t.parent_id = h.id\n)\nSELECT * FROM hierarchy ORDER BY level, name;", tags: "cte,recursive,hierarchy" },
  { id: "12", name: "Running Total", category: "Advanced", description: "Cumulative sum over time", sql: "SELECT\n  date, amount,\n  SUM(amount) OVER (ORDER BY date ROWS UNBOUNDED PRECEDING) as running_total\nFROM table_name\nORDER BY date;", tags: "window,sum,advanced" },
];

export async function GET() {
  return NextResponse.json(TEMPLATES);
}
