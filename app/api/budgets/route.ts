import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month") ?? getCurrentMonth();
    const budgets = await prisma.budget.findMany({ where: { month } });
    return NextResponse.json(budgets);
  } catch {
    return NextResponse.json({ error: "Failed to fetch budgets" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { category, monthlyLimit, month } = await req.json();
    if (!category || typeof monthlyLimit !== "number") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const budget = await prisma.budget.upsert({
      where: { category_month: { category, month: month ?? getCurrentMonth() } },
      update: { monthlyLimit },
      create: { category, monthlyLimit, month: month ?? getCurrentMonth() },
    });
    return NextResponse.json(budget);
  } catch {
    return NextResponse.json({ error: "Failed to save budget" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await prisma.budget.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete budget" }, { status: 500 });
  }
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
