import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const accounts = await prisma.account.findMany({
      include: { item: { select: { institutionName: true } } },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(accounts);
  } catch {
    return NextResponse.json({ error: "Failed to fetch accounts" }, { status: 500 });
  }
}
