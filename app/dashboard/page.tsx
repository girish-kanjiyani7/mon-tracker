import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { NetWorthCard } from "@/components/dashboard/NetWorthCard";
import { SpendingByCategory } from "@/components/dashboard/SpendingByCategory";
import { BudgetProgress } from "@/components/dashboard/BudgetProgress";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { groupByCategory, getCurrentMonth } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/");
  const month = getCurrentMonth();
  const [year, mon] = month.split("-").map(Number);
  const start = new Date(year, mon - 1, 1);
  const end = new Date(year, mon, 1);

  const [accounts, transactions, budgets, recentTx] = await Promise.all([
    prisma.account.findMany({ include: { item: { select: { institutionName: true } } } }),
    prisma.transaction.findMany({ where: { date: { gte: start, lt: end } } }),
    prisma.budget.findMany({ where: { month } }),
    prisma.transaction.findMany({ orderBy: { date: "desc" }, take: 10 }),
  ]);

  const categoryData = groupByCategory(transactions);

  const now = new Date();
  const monthLabel = now.toLocaleString("default", { month: "long", year: "numeric" });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">{monthLabel}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <NetWorthCard accounts={accounts} />
        <SpendingByCategory data={categoryData} />
        <BudgetProgress budgets={budgets} transactions={transactions} />
      </div>

      <RecentTransactions transactions={recentTx} />
    </div>
  );
}
