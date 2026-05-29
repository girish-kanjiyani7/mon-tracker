import { formatCurrency, formatCategoryName } from "@/lib/utils";
import Link from "next/link";

interface Budget {
  id: string;
  category: string;
  monthlyLimit: number;
  alertAt: number;
}

interface Transaction {
  category?: string | null;
  personalCategory?: string | null;
  amount: number;
}

interface Props {
  budgets: Budget[];
  transactions: Transaction[];
}

export function BudgetProgress({ budgets, transactions }: Props) {
  if (!budgets.length) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-6">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Budgets</p>
        <div className="mt-4 flex flex-col items-center justify-center gap-2 py-8 text-center">
          <p className="text-sm text-muted-foreground">No budgets set yet.</p>
          <Link href="/budgets" className="text-xs text-primary hover:underline">
            Set up budgets →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6">
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Budgets</p>
      <div className="mt-4 space-y-4">
        {budgets.map((budget) => {
          const spent = transactions
            .filter((t) => (t.personalCategory ?? t.category) === budget.category && t.amount > 0)
            .reduce((sum, t) => sum + t.amount, 0);
          const pct = budget.monthlyLimit > 0 ? spent / budget.monthlyLimit : 0;
          const over = pct > 1;
          const atRisk = !over && pct >= budget.alertAt;

          const barColor = over
            ? "oklch(0.65 0.22 25)"
            : atRisk
            ? "oklch(0.75 0.18 75)"
            : "linear-gradient(90deg, oklch(0.65 0.22 280), oklch(0.65 0.22 320))";

          return (
            <div key={budget.id} className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-medium">{formatCategoryName(budget.category)}</span>
                <span className={over ? "text-rose-400 font-semibold" : atRisk ? "text-amber-400" : "text-muted-foreground"}>
                  {formatCurrency(spent)}
                  <span className="text-muted-foreground/60"> / {formatCurrency(budget.monthlyLimit)}</span>
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(pct * 100, 100)}%`, background: barColor }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
