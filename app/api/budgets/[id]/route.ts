import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id || typeof id !== "string" || id.trim().length === 0) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await req.json();
    const data: { monthlyLimit?: number; rollover?: boolean; alertAt?: number } = {};

    if (body.monthlyLimit !== undefined) {
      if (typeof body.monthlyLimit !== "number" || !isFinite(body.monthlyLimit) || body.monthlyLimit < 0) {
        return NextResponse.json({ error: "monthlyLimit must be a non-negative number" }, { status: 400 });
      }
      data.monthlyLimit = body.monthlyLimit;
    }

    if (body.rollover !== undefined) {
      if (typeof body.rollover !== "boolean") {
        return NextResponse.json({ error: "rollover must be a boolean" }, { status: 400 });
      }
      data.rollover = body.rollover;
    }

    if (body.alertAt !== undefined) {
      if (typeof body.alertAt !== "number" || body.alertAt < 0 || body.alertAt > 1) {
        return NextResponse.json({ error: "alertAt must be a number between 0 and 1" }, { status: 400 });
      }
      data.alertAt = body.alertAt;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const budget = await prisma.budget.update({ where: { id: id.trim() }, data });
    return NextResponse.json(budget);
  } catch {
    return NextResponse.json({ error: "Failed to update budget" }, { status: 500 });
  }
}
