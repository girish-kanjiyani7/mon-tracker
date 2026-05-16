import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, formatCategoryName } from "@/lib/utils";
import Link from "next/link";

interface Transaction {
  id: string;
  name: string;
  merchantName: string | null;
  category: string | null;
  amount: number;
  date: string | Date;
  pending: boolean;
}

export function RecentTransactions({ transactions }: { transactions: Transaction[] }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Recent Transactions</p>
        <Link href="/transactions" className="text-xs text-primary hover:underline">
          View all →
        </Link>
      </div>

      {!transactions.length ? (
        <div className="px-6 py-10 text-center text-sm text-muted-foreground">
          No transactions yet. Sync your accounts.
        </div>
      ) : (
        <div className="divide-y divide-border/40">
          {transactions.slice(0, 10).map((tx) => (
            <div key={tx.id} className="flex items-center justify-between gap-4 px-6 py-3.5 hover:bg-white/2 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-bold uppercase text-muted-foreground">
                  {(tx.merchantName ?? tx.name).charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{tx.merchantName ?? tx.name}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(tx.date)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {tx.category && (
                  <span className="hidden sm:inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-xs text-muted-foreground">
                    {formatCategoryName(tx.category)}
                  </span>
                )}
                {tx.pending && (
                  <Badge variant="secondary" className="text-xs">Pending</Badge>
                )}
                <p className={`text-sm font-semibold tabular-nums ${tx.amount < 0 ? "text-emerald-400" : "text-foreground"}`}>
                  {tx.amount < 0 ? "+" : "−"}{formatCurrency(Math.abs(tx.amount))}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
