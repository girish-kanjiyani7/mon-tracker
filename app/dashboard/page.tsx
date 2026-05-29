import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { NetWorthCard } from "@/components/dashboard/NetWorthCard";
import { SpendingByCategory } from "@/components/dashboard/SpendingByCategory";
import { BudgetProgress } from "@/components/dashboard/BudgetProgress";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { DateRangePicker } from "@/components/DateRangePicker";
import { QuickAddTransaction } from "@/components/dashboard/QuickAddTransaction";
import { groupByCategory, getMonthRange, getCurrentMonth } from "@/lib/utils";

const DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/;

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/");

  const { from: fromParam, to: toParam } = await searchParams;
  const defaults = getMonthRange();
  const from = fromParam && DATE_PATTERN.test(fromParam) ? fromParam : defaults.from;
  const to = toParam && DATE_PATTERN.test(toParam) ? toParam : defaults.to;

  const start = new Date(from);
  const end = new Date(to);
  end.setDate(end.getDate() + 1);

  const month = getCurrentMonth();

  const [accounts, transactions, budgets, recentTx] = await Promise.all([
    prisma.account.findMany({ include: { item: { select: { institutionName: true } } } }),
    prisma.transaction.findMany({ where: { date: { gte: start, lt: end } } }),
    prisma.budget.findMany({ where: { month } }),
    prisma.transaction.findMany({
      where: { date: { gte: start, lt: end } },
      select: { id: true, name: true, merchantName: true, category: true, personalCategory: true, amount: true, date: true, pending: true },
      orderBy: { date: "desc" },
      take: 10,
    }),
  ]);

  const categoryData = groupByCategory(transactions);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">{from} – {to}</p>
        </div>
        <DateRangePicker from={from} to={to} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <NetWorthCard accounts={accounts} />
        <SpendingByCategory data={categoryData} />
        <BudgetProgress budgets={budgets} transactions={transactions} />
      </div>

      <RecentTransactions transactions={recentTx} />
      <QuickAddTransaction />
    </div>
  );
}
