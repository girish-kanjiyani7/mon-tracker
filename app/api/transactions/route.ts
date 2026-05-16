import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("accountId") ?? undefined;
    const category = searchParams.get("category") ?? undefined;
    const search = searchParams.get("search") ?? undefined;
    const month = searchParams.get("month"); // "2026-05"

    const where: Record<string, unknown> = {};
    if (accountId) where.accountId = accountId;
    if (category) where.category = category;
    if (search) where.name = { contains: search };
    if (month) {
      const [year, mon] = month.split("-").map(Number);
      const start = new Date(year, mon - 1, 1);
      const end = new Date(year, mon, 1);
      where.date = { gte: start, lt: end };
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: { account: { select: { name: true, item: { select: { institutionName: true } } } } },
      orderBy: { date: "desc" },
      take: 500,
    });

    return NextResponse.json(transactions);
  } catch {
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
  }
}
