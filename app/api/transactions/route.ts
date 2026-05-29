import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { CATEGORIES } from "@/lib/categories";

const DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/;
const MAX_SEARCH_LENGTH = 200;
const MAX_PARAM_LENGTH = 100;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 1000;
const VALID_CATEGORIES = new Set<string>(CATEGORIES);

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
    if (category) {
      where.OR = [
        { personalCategory: category },
        { personalCategory: null, category: category },
      ];
    }
    if (search) where.name = { contains: search, mode: "insensitive" };
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
          amount: true, date: true, pending: true, manual: true,
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

export async function POST(req: NextRequest) {
  try {
    const { name, amount, date, category, merchantName } = await req.json();

    if (!name || typeof name !== "string" || name.trim().length === 0 || name.length > 200) {
      return NextResponse.json({ error: "Invalid name" }, { status: 400 });
    }
    if (typeof amount !== "number" || !isFinite(amount)) {
      return NextResponse.json({ error: "Amount must be a number" }, { status: 400 });
    }
    if (!date || !DATE_PATTERN.test(date)) {
      return NextResponse.json({ error: "Invalid date. Use YYYY-MM-DD." }, { status: 400 });
    }
    if (category && !VALID_CATEGORIES.has(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    const transaction = await prisma.transaction.create({
      data: {
        name: name.trim(),
        merchantName: merchantName?.trim() || null,
        amount,
        date: new Date(date),
        category: category || null,
        manual: true,
      },
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 });
  }
}
