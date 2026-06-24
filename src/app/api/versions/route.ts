import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    const query = await prisma.query.findUnique({ where: { id }, select: { versions: true, rawSql: true, optimized: true, input: true } });
    if (!query) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const versions = JSON.parse(query.versions || "[]");
    return NextResponse.json(versions);
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const { id, sql, label } = await req.json();
    const query = await prisma.query.findUnique({ where: { id }, select: { versions: true } });
    if (!query) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const versions = JSON.parse(query.versions || "[]");
    versions.push({ sql, label: label || `Version ${versions.length + 1}`, savedAt: new Date().toISOString() });
    await prisma.query.update({ where: { id }, data: { versions: JSON.stringify(versions) } });
    return NextResponse.json({ success: true, versions });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
