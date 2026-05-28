"use client";

import { useEffect, useState, useCallback } from "react";
import { formatCurrency, formatCategoryName, getCurrentMonth } from "@/lib/utils";
import { CATEGORIES } from "@/lib/categories";

interface Budget {
  id: string;
  category: string;
  monthlyLimit: number;
  month: string;
}

interface Transaction {
  category?: string | null;
  amount: number;
}


export default function BudgetsPage() {
  const month = getCurrentMonth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [limit, setLimit] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    const [budgetsRes, txRes] = await Promise.all([
      fetch(`/api/budgets?month=${month}`),
      fetch(`/api/transactions?month=${month}`),
    ]);
    const [budgetsData, txData] = await Promise.all([budgetsRes.json(), txRes.json()]);
    if (Array.isArray(budgetsData)) setBudgets(budgetsData);
    if (Array.isArray(txData)) setTransactions(txData);
  }, [month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!limit || isNaN(Number(limit))) return;
    setSaving(true);
    await fetch("/api/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, monthlyLimit: Number(limit), month }),
    });
    setLimit("");
    await fetchData();
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await fetch("/api/budgets", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await fetchData();
  };

  const totalBudgeted = budgets.reduce((s, b) => s + b.monthlyLimit, 0);
  const totalSpent = budgets.reduce((s, b) => {
    return s + transactions
      .filter((t) => t.category === b.category && t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
  }, 0);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Budgets</h1>
        <p className="text-sm text-muted-foreground mt-1">{month}</p>
      </div>

      {budgets.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-border/60 bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">Total Budgeted</p>
            <p className="mt-1 text-xl font-bold">{formatCurrency(totalBudgeted)}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">Total Spent</p>
            <p className={`mt-1 text-xl font-bold ${totalSpent > totalBudgeted ? "text-rose-400" : "text-emerald-400"}`}>
              {formatCurrency(totalSpent)}
            </p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border/60 bg-card p-5">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-4">Add Budget</p>
        <form onSubmit={handleAdd} className="flex gap-3 flex-wrap">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-9 rounded-lg border border-border/60 bg-muted px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{formatCategoryName(c)}</option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Monthly limit ($)"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            className="h-9 w-44 rounded-lg border border-border/60 bg-muted px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            min="1"
            step="1"
          />
          <button
            type="submit"
            disabled={saving}
            className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? "Saving…" : "Add Budget"}
          </button>
        </form>
      </div>

      {budgets.length === 0 ? (
        <p className="text-sm text-muted-foreground">No budgets for this month yet.</p>
      ) : (
        <div className="space-y-3">
          {budgets.map((budget) => {
            const spent = transactions
              .filter((t) => t.category === budget.category && t.amount > 0)
              .reduce((sum, t) => sum + t.amount, 0);
            const pct = Math.min((spent / budget.monthlyLimit) * 100, 100);
            const over = spent > budget.monthlyLimit;

            return (
              <div key={budget.id} className="rounded-2xl border border-border/60 bg-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{formatCategoryName(budget.category)}</span>
                  <div className="flex items-center gap-4">
                    <span className={`text-sm tabular-nums ${over ? "text-rose-400 font-semibold" : "text-muted-foreground"}`}>
                      {formatCurrency(spent)}
                      <span className="text-muted-foreground/60"> / {formatCurrency(budget.monthlyLimit)}</span>
                    </span>
                    <button
                      onClick={() => handleDelete(budget.id)}
                      className="text-xs text-muted-foreground hover:text-rose-400 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      background: over
                        ? "oklch(0.65 0.22 25)"
                        : `linear-gradient(90deg, oklch(0.65 0.22 280), oklch(0.65 0.22 320))`,
                    }}
                  />
                </div>

                {over && (
                  <p className="text-xs text-rose-400">
                    Over by {formatCurrency(spent - budget.monthlyLimit)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
