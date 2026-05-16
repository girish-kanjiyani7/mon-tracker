"use client";

import { useEffect, useState, useCallback } from "react";
import { formatCurrency, formatDate, formatCategoryName } from "@/lib/utils";

interface Transaction {
  id: string;
  name: string;
  merchantName: string | null;
  category: string | null;
  amount: number;
  date: string;
  pending: boolean;
  account: { name: string; item: { institutionName: string } };
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const res = await fetch(`/api/transactions?${params}`);
    const data = await res.json();
    if (Array.isArray(data)) setTransactions(data);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetchTransactions, 300);
    return () => clearTimeout(t);
  }, [fetchTransactions]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? "Loading…" : `${transactions.length} transactions`}
          </p>
        </div>
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            placeholder="Search merchants…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 rounded-lg border border-border/60 bg-card pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-56"
          />
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border/60 bg-card px-6 py-16 text-center text-sm text-muted-foreground">
          Loading transactions…
        </div>
      ) : transactions.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-card px-6 py-16 text-center text-sm text-muted-foreground">
          No transactions found. Sync your accounts first.
        </div>
      ) : (
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60">
                <th className="text-left px-6 py-3.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Date</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Merchant</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium uppercase tracking-wider text-muted-foreground hidden md:table-cell">Category</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Account</th>
                <th className="text-right px-6 py-3.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-white/2 transition-colors">
                  <td className="px-6 py-4 text-muted-foreground whitespace-nowrap text-xs">
                    {formatDate(tx.date)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-bold uppercase text-muted-foreground">
                        {(tx.merchantName ?? tx.name).charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium leading-none">{tx.merchantName ?? tx.name}</p>
                        {tx.pending && (
                          <span className="mt-1 inline-block text-xs text-amber-400">Pending</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    {tx.category ? (
                      <span className="inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-xs text-muted-foreground">
                        {formatCategoryName(tx.category)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 hidden lg:table-cell text-xs text-muted-foreground">
                    {tx.account.item.institutionName} · {tx.account.name}
                  </td>
                  <td className={`px-6 py-4 text-right font-semibold tabular-nums ${tx.amount < 0 ? "text-emerald-400" : "text-foreground"}`}>
                    {tx.amount < 0 ? "+" : "−"}{formatCurrency(Math.abs(tx.amount))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
