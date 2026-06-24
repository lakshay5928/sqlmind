import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { parseSQLSchema, parseCSVSchema, schemaToSQL } from "@/lib/sql/schema-parser";

export async function POST(req: NextRequest) {
  try {
    const { content, name, source } = await req.json();
    let tables = [];
    let rawSQL = content;

    if (source === "csv") {
      const table = parseCSVSchema(content, name || "imported_data");
      tables = [table];
      rawSQL = schemaToSQL(tables);
    } else {
      tables = parseSQLSchema(content);
    }

    const saved = await prisma.schema.create({
      data: { name: name || "Schema " + Date.now(), content: rawSQL, tables: JSON.stringify(tables), source: source || "paste" },
    });
    return NextResponse.json({ id: saved.id, tables, rawSQL });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function GET() {
  try {
    const schemas = await prisma.schema.findMany({ orderBy: { createdAt: "desc" }, take: 20 });
    return NextResponse.json(schemas.map((s: {id:string;name:string;content:string;tables:string;source:string;createdAt:Date}) => ({ ...s, tables: JSON.parse(s.tables) })));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await prisma.schema.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
