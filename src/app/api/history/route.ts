import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const dialect = searchParams.get("dialect");
    const history = await prisma.query.findMany({
      where: dialect ? { dialect } : {},
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, input: true, mode: true, dialect: true, role: true, rawSql: true, healthScore: true, complexity: true, aiProvider: true, createdAt: true, notes: true },
    });
    return NextResponse.json(history);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (id === "all") {
      await prisma.query.deleteMany();
    } else {
      await prisma.query.delete({ where: { id } });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, notes } = await req.json();
    const updated = await prisma.query.update({ where: { id }, data: { notes } });
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
