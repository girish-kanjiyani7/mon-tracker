import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const MIN_CLOSE_DAY = 1;
const MAX_CLOSE_DAY = 31;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || typeof id !== "string" || id.trim().length === 0) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const { statementCloseDay } = await req.json();

    const isValidCloseDay =
      statementCloseDay === null ||
      (typeof statementCloseDay === "number" &&
        Number.isInteger(statementCloseDay) &&
        statementCloseDay >= MIN_CLOSE_DAY &&
        statementCloseDay <= MAX_CLOSE_DAY);

    if (!isValidCloseDay) {
      return NextResponse.json(
        { error: `statementCloseDay must be an integer between ${MIN_CLOSE_DAY} and ${MAX_CLOSE_DAY}, or null` },
        { status: 400 }
      );
    }

    const account = await prisma.account.update({
      where: { id: id.trim() },
      data: { statementCloseDay },
    });

    return NextResponse.json(account);
  } catch {
    return NextResponse.json({ error: "Failed to update account" }, { status: 500 });
  }
}
