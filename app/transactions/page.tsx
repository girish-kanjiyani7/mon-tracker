"use client";

import { useEffect, useState, useCallback } from "react";
import { formatCurrency, formatDate, formatCategoryName } from "@/lib/utils";
import { CATEGORIES } from "@/lib/categories";

interface Transaction {
  id: string;
  name: string;
  merchantName: string | null;
  category: string | null;
  personalCategory: string | null;
  amount: number;
  date: string;
  pending: boolean;
  account: { name: string; item: { institutionName: string } };
}

const selectCls =
  "h-9 rounded-lg border border-border/60 bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary";

const PAGE_SIZE = 25;

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  const hasFilters = search !== "" || category !== "" || from !== "" || to !== "";
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    params.set("page", String(page));
    params.set("limit", String(PAGE_SIZE));
    const res = await fetch(`/api/transactions?${params}`);
    const json = await res.json();
    if (json && Array.isArray(json.data)) {
      setTransactions(json.data);
      setTotal(json.total ?? 0);
    }
    setLoading(false);
  }, [search, category, from, to, page]);

  useEffect(() => {
    const t = setTimeout(fetchTransactions, 300);
    return () => clearTimeout(t);
  }, [fetchTransactions]);

  function clearFilters() {
    setSearch("");
    setCategory("");
    setFrom("");
    setTo("");
    setPage(1);
  }

  async function handleCategoryChange(id: string, value: string) {
    const personalCategory = value === "" ? null : value;
    await fetch(`/api/transactions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personalCategory }),
    });
    setTransactions((prev) =>
      prev.map((tx) => (tx.id === id ? { ...tx, personalCategory } : tx))
    );
    setEditingId(null);
  }

  function handleFilterChange(setter: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setter(e.target.value);
      setPage(1);
    };
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {loading ? "Loading…" : total === 0 ? "0 transactions" : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total} transaction${total !== 1 ? "s" : ""}`}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
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
            onChange={handleFilterChange(setSearch)}
            className="h-9 rounded-lg border border-border/60 bg-card pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-52"
          />
        </div>

        <select
          value={category}
          onChange={handleFilterChange(setCategory)}
          className={selectCls}
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{formatCategoryName(c)}</option>
          ))}
        </select>

        <input
          type="date"
          value={from}
          onChange={handleFilterChange(setFrom)}
          className={selectCls}
        />
        <span className="text-xs text-muted-foreground">to</span>
        <input
          type="date"
          value={to}
          onChange={handleFilterChange(setTo)}
          className={selectCls}
        />

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="h-9 rounded-lg border border-border/60 px-3 text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border/60 bg-card px-6 py-16 text-center text-sm text-muted-foreground">
          Loading transactions…
        </div>
      ) : transactions.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-card px-6 py-16 text-center text-sm text-muted-foreground">
          {hasFilters ? "No transactions match your filters." : "No transactions found. Sync your accounts first."}
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
                    {editingId === tx.id ? (
                      <select
                        autoFocus
                        defaultValue={tx.personalCategory ?? tx.category ?? ""}
                        onBlur={(e) => handleCategoryChange(tx.id, e.target.value)}
                        onChange={(e) => handleCategoryChange(tx.id, e.target.value)}
                        className="h-7 rounded-md border border-primary/60 bg-card px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="">Uncategorized</option>
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>{formatCategoryName(c)}</option>
                        ))}
                      </select>
                    ) : (
                      <button
                        onClick={() => setEditingId(tx.id)}
                        className="group inline-flex items-center gap-1.5"
                        title="Click to change category"
                      >
                        {(tx.personalCategory ?? tx.category) ? (
                          <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs transition-colors ${tx.personalCategory ? "border-primary/50 text-primary" : "border-border/60 text-muted-foreground group-hover:border-primary/40"}`}>
                            {formatCategoryName(tx.personalCategory ?? tx.category!)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors text-xs">
                            + set category
                          </span>
                        )}
                      </button>
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

      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 1}
              className="h-9 rounded-lg border border-border/60 px-4 text-sm disabled:opacity-40 hover:bg-white/5 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page === totalPages}
              className="h-9 rounded-lg border border-border/60 px-4 text-sm disabled:opacity-40 hover:bg-white/5 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
