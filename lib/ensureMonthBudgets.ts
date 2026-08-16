import { prisma } from "@/lib/db";
import { prevMonth } from "@/lib/utils";

/**
 * Seed a month's boxes from the previous month's Budget rows the first time
 * it's visited, so boxes carry over automatically on the 1st. No-op if the
 * month already has budgets, or if the previous month has none. Server-only:
 * kept out of lib/boxes.ts so that file's pure helpers stay safe to import
 * from client components without pulling Prisma into the bundle.
 */
export async function ensureMonthBudgets(month: string): Promise<void> {
  const existingCount = await prisma.budget.count({ where: { month } });
  if (existingCount > 0) return;

  const previous = await prisma.budget.findMany({ where: { month: prevMonth(month) } });
  if (previous.length === 0) return;

  await prisma.budget.createMany({
    data: previous.map((b) => ({
      category: b.category,
      monthlyLimit: b.monthlyLimit,
      month,
      rollover: b.rollover,
      alertAt: b.alertAt,
    })),
    skipDuplicates: true,
  });
}
