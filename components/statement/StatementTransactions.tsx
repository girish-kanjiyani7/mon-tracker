import { formatCategoryName, formatCurrency, formatDateOnly } from "@/lib/utils";
import { isCardPayment } from "@/lib/statementCycle";

export interface StatementTransaction {
  id: string;
  amount: number;
  date: string;
  name: string;
  merchantName: string | null;
  category: string | null;
  personalCategory: string | null;
  pending: boolean;
}

export function StatementTransactions({ transactions }: { transactions: StatementTransaction[] }) {
  if (!transactions.length) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-6">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Cycle Transactions
        </p>
        <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
          No transactions in this cycle
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Cycle Transactions
        </p>
        <p className="text-xs text-muted-foreground">{transactions.length} transactions</p>
      </div>
      <div className="divide-y divide-border/40">
        {transactions.map((tx) => {
          const isPayment = isCardPayment(tx);
          const isRefund = !isPayment && tx.amount < 0;
          const category = tx.personalCategory ?? tx.category;

          return (
            <div
              key={tx.id}
              className={`flex items-center justify-between gap-3 py-2.5 ${isPayment ? "opacity-50" : ""}`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{tx.merchantName ?? tx.name}</p>
                  {tx.pending && (
                    <span className="inline-flex items-center rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                      Pending
                    </span>
                  )}
                  {isPayment && (
                    <span className="inline-flex items-center rounded-md border border-border/60 bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      Payment
                    </span>
                  )}
                  {isRefund && (
                    <span className="inline-flex items-center rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                      Refund
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatDateOnly(tx.date)}
                  {category ? ` · ${formatCategoryName(category)}` : ""}
                </p>
              </div>
              <p className={`shrink-0 text-sm font-semibold tabular-nums ${
                tx.amount < 0 ? "text-emerald-400" : "text-foreground"
              }`}>
                {tx.amount < 0 ? `+${formatCurrency(Math.abs(tx.amount))}` : formatCurrency(tx.amount)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
