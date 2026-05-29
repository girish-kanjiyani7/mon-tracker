import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/;
const MAX_SEARCH_LENGTH = 200;
const MAX_PARAM_LENGTH = 100;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 1000;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("accountId") ?? undefined;
    const category = searchParams.get("category") ?? undefined;
    const search = searchParams.get("search") ?? undefined;
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT));

    if (from !== null && !DATE_PATTERN.test(from)) {
      return NextResponse.json({ error: "Invalid from date. Use YYYY-MM-DD." }, { status: 400 });
    }
    if (to !== null && !DATE_PATTERN.test(to)) {
      return NextResponse.json({ error: "Invalid to date. Use YYYY-MM-DD." }, { status: 400 });
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
    if (from || to) {
      const dateFilter: Record<string, Date> = {};
      if (from) dateFilter.gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setDate(toDate.getDate() + 1);
        dateFilter.lt = toDate;
      }
      where.date = dateFilter;
    }

    const [data, total] = await prisma.$transaction([
      prisma.transaction.findMany({
        where,
        select: {
          id: true, name: true, merchantName: true, category: true, personalCategory: true,
          amount: true, date: true, pending: true,
          account: { select: { name: true, item: { select: { institutionName: true } } } },
        },
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
