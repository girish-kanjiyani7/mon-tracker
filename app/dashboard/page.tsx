import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { NetWorthCard } from "@/components/dashboard/NetWorthCard";
import { QuickAddTransaction } from "@/components/dashboard/QuickAddTransaction";
import { MonthNav } from "@/components/dashboard/MonthNav";
import { BoxesGrid } from "@/components/dashboard/BoxesGrid";
import { UnsortedInbox } from "@/components/dashboard/UnsortedInbox";
import { computeBoxes, splitUnsorted } from "@/lib/boxes";
import { ensureMonthBudgets } from "@/lib/ensureMonthBudgets";
import { MONTH_PATTERN, getCurrentMonth, getMonthRangeFor, formatMonthLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/");

  const { month: monthParam } = await searchParams;
  const currentMonth = getCurrentMonth();
  const month = monthParam && MONTH_PATTERN.test(monthParam) ? monthParam : currentMonth;
  const isCurrentMonth = month === currentMonth;

  if (isCurrentMonth) {
    await ensureMonthBudgets(month);
  }

  const { from, to } = getMonthRangeFor(month);
  const start = new Date(from);
  const end = new Date(to);
  end.setDate(end.getDate() + 1);

  const [accounts, transactions, budgets, manualTx] = await Promise.all([
    prisma.account.findMany({ include: { item: { select: { institutionName: true } } } }),
    prisma.transaction.findMany({
      where: { date: { gte: start, lt: end } },
      select: {
        id: true, name: true, merchantName: true, category: true, personalCategory: true,
        amount: true, date: true, pending: true, manual: true,
      },
      orderBy: { date: "desc" },
    }),
    prisma.budget.findMany({ where: { month } }),
    prisma.transaction.findMany({ where: { manual: true }, select: { amount: true } }),
  ]);

  // net manual cash: negative Plaid amount = income, so flip sign
  const manualCash = manualTx.reduce((sum, t) => sum - t.amount, 0);

  const serialized = transactions.map((t) => ({ ...t, date: t.date.toISOString() }));
  const boxCategories = computeBoxes(budgets, serialized).map((b) => b.category);
  const unsorted = splitUnsorted(serialized);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">{formatMonthLabel(month)}</p>
        </div>
        <MonthNav month={month} />
      </div>

      <NetWorthCard accounts={accounts} manualCash={manualCash} />

      <BoxesGrid budgets={budgets} transactions={serialized} month={month} readOnly={!isCurrentMonth} />

      <UnsortedInbox transactions={unsorted} boxCategories={boxCategories} readOnly={!isCurrentMonth} />

      {isCurrentMonth && <QuickAddTransaction boxCategories={boxCategories} />}
    </div>
  );
}
