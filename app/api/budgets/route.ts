import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const MAX_CATEGORY_LENGTH = 100;

function isValidMonth(value: unknown): value is string {
  return typeof value === "string" && MONTH_PATTERN.test(value);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const monthParam = searchParams.get("month");

    if (monthParam !== null && !isValidMonth(monthParam)) {
      return NextResponse.json({ error: "Invalid month format. Use YYYY-MM." }, { status: 400 });
    }

    const month = monthParam ?? getCurrentMonth();
    const budgets = await prisma.budget.findMany({ where: { month } });
    return NextResponse.json(budgets);
  } catch {
    return NextResponse.json({ error: "Failed to fetch budgets" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { category, monthlyLimit, month } = await req.json();

    if (!category || typeof category !== "string" || category.trim().length === 0 || category.length > MAX_CATEGORY_LENGTH) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    if (typeof monthlyLimit !== "number" || !isFinite(monthlyLimit) || monthlyLimit < 0) {
      return NextResponse.json({ error: "monthlyLimit must be a non-negative number" }, { status: 400 });
    }
    if (month !== undefined && !isValidMonth(month)) {
      return NextResponse.json({ error: "Invalid month format. Use YYYY-MM." }, { status: 400 });
    }

    const budget = await prisma.budget.upsert({
      where: { category_month: { category: category.trim(), month: month ?? getCurrentMonth() } },
      update: { monthlyLimit },
      create: { category: category.trim(), monthlyLimit, month: month ?? getCurrentMonth() },
    });
    return NextResponse.json(budget);
  } catch {
    return NextResponse.json({ error: "Failed to save budget" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();

    if (!id || typeof id !== "string" || id.trim().length === 0) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    await prisma.budget.delete({ where: { id: id.trim() } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete budget" }, { status: 500 });
  }
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
