import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const MAX_SEARCH_LENGTH = 200;
const MAX_PARAM_LENGTH = 100;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("accountId") ?? undefined;
    const category = searchParams.get("category") ?? undefined;
    const search = searchParams.get("search") ?? undefined;
    const month = searchParams.get("month");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT));

    if (month !== null && !MONTH_PATTERN.test(month)) {
      return NextResponse.json({ error: "Invalid month format. Use YYYY-MM." }, { status: 400 });
    }
    if (search && search.length > MAX_SEARCH_LENGTH) {
      return NextResponse.json({ error: "Search term too long" }, { status: 400 });
    }
    if (accountId && accountId.length > MAX_PARAM_LENGTH) {
      return NextResponse.json({ error: "Invalid accountId" }, { status: 400 });
    }
    if (category && category.length > MAX_PARAM_LENGTH) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

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

    const [data, total] = await prisma.$transaction([
      prisma.transaction.findMany({
        where,
        include: { account: { select: { name: true, item: { select: { institutionName: true } } } } },
        orderBy: { date: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ]);

    return NextResponse.json({ data, total });
  } catch {
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
  }
}
