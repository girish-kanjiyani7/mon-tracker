import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { CATEGORIES } from "@/lib/categories";

const VALID_CATEGORIES = new Set<string>(CATEGORIES);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || typeof id !== "string" || id.trim().length === 0) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const { personalCategory } = await req.json();

    if (personalCategory !== null && (typeof personalCategory !== "string" || !VALID_CATEGORIES.has(personalCategory))) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    const transaction = await prisma.transaction.update({
      where: { id: id.trim() },
      data: { personalCategory: personalCategory ?? null },
    });

    return NextResponse.json(transaction);
  } catch {
    return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 });
  }
}
