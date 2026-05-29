"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { formatCurrency, formatCategoryName, getMonthRange } from "@/lib/utils";
import { CATEGORY_GROUPS } from "@/lib/categories";
import { DateRangePicker } from "@/components/DateRangePicker";

interface Budget {
  id: string;
  category: string;
  monthlyLimit: number;
  month: string;
  rollover: boolean;
  alertAt: number;
}

interface Transaction {
  category?: string | null;
  personalCategory?: string | null;
  amount: number;
  date: string;
}

interface HistoryEntry {
  months: string[];
  budgets: Budget[];
}

const DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/;
const ALL_CATEGORIES = Object.values(CATEGORY_GROUPS).flat();
const FIRST_CATEGORY = ALL_CATEGORIES[0];

function statusFor(pct: number, alertAt: number): "over" | "at-risk" | "on-track" {
  if (pct > 1) return "over";
  if (pct >= alertAt) return "at-risk";
  return "on-track";
}

function BudgetsContent() {
  const searchParams = useSearchParams();
  const defaults = getMonthRange();
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const from = fromParam && DATE_PATTERN.test(fromParam) ? fromParam : defaults.from;
  const to = toParam && DATE_PATTERN.test(toParam) ? toParam : defaults.to;
  const month = from.slice(0, 7);

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [category, setCategory] = useState<string>(FIRST_CATEGORY);
  const [limit, setLimit] = useState("");
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const [editingLimitId, setEditingLimitId] = useState<string | null>(null);
  const [editingLimitValue, setEditingLimitValue] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryEntry | null>(null);
  const [historyTx, setHistoryTx] = useState<{ month: string; transactions: Transaction[] }[]>([]);

  const prevMonth = (() => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();

  const fetchData = useCallback(async () => {
    const [budgetsRes, txRes] = await Promise.all([
      fetch(`/api/budgets?month=${month}`),
      fetch(`/api/transactions?from=${from}&to=${to}&limit=1000`),
    ]);
    const [budgetsData, txData] = await Promise.all([budgetsRes.json(), txRes.json()]);
    if (Array.isArray(budgetsData)) setBudgets(budgetsData);
    if (Array.isArray(txData?.data)) setTransactions(txData.data);
  }, [month, from, to]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Rollover: fetch last month's transactions to calculate carried-over amount
  const [prevTransactions, setPrevTransactions] = useState<Transaction[]>([]);
  useEffect(() => {
    const haRollover = budgets.some((b) => b.rollover);
    if (!haRollover) return;
    const prevFrom = `${prevMonth}-01`;
    const prevY = parseInt(prevMonth.split("-")[0]);
    const prevM = parseInt(prevMonth.split("-")[1]);
    const lastDay = new Date(prevY, prevM, 0).getDate();
    const prevTo = `${prevMonth}-${String(lastDay).padStart(2, "0")}`;
    fetch(`/api/transactions?from=${prevFrom}&to=${prevTo}&limit=1000`)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d?.data)) setPrevTransactions(d.data); });
  }, [budgets, prevMonth]);

  function getSpent(b: Budget, txList: Transaction[]) {
    return txList
      .filter((t) => (t.personalCategory ?? t.category) === b.category && t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
  }

  function getEffectiveLimit(b: Budget) {
    if (!b.rollover) return b.monthlyLimit;
    const prevBudget = budgets.find((x) => x.category === b.category);
    const prevSpent = getSpent(b, prevTransactions);
    const prevLimit = prevBudget?.monthlyLimit ?? b.monthlyLimit;
    const carryover = Math.max(0, prevLimit - prevSpent);
    return b.monthlyLimit + carryover;
  }

  function getProjected(spent: number) {
    const start = new Date(from);
    const end = new Date(to);
    const today = new Date();
    const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
    const elapsed = Math.max(1, Math.min(totalDays, Math.round((today.getTime() - start.getTime()) / 86400000) + 1));
    return (spent / elapsed) * totalDays;
  }

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

  const handlePatch = async (id: string, data: Record<string, unknown>) => {
    const res = await fetch(`/api/budgets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const updated = await res.json();
    setBudgets((prev) => prev.map((b) => (b.id === id ? { ...b, ...updated } : b)));
  };

  const handleLimitSave = async (id: string) => {
    const val = Number(editingLimitValue);
    if (!isNaN(val) && val > 0) await handlePatch(id, { monthlyLimit: val });
    setEditingLimitId(null);
  };

  const handleCopyFromLastMonth = async () => {
    setCopying(true);
    const res = await fetch(`/api/budgets?month=${prevMonth}`);
    const prev: Budget[] = await res.json();
    if (Array.isArray(prev) && prev.length > 0) {
      await Promise.all(
        prev.map((b) =>
          fetch("/api/budgets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ category: b.category, monthlyLimit: b.monthlyLimit, month }),
          })
        )
      );
      await fetchData();
    }
    setCopying(false);
  };

  const handleToggleHistory = async () => {
    if (!showHistory && !history) {
      const res = await fetch(`/api/budgets?month=${month}&history=true`);
      const data = await res.json();
      setHistory(data);
      // fetch transactions for each historical month
      const months: string[] = data.months ?? [];
      const txResults = await Promise.all(
        months.map(async (m: string) => {
          const [y, mo] = m.split("-").map(Number);
          const lastDay = new Date(y, mo, 0).getDate();
          const r = await fetch(`/api/transactions?from=${m}-01&to=${m}-${String(lastDay).padStart(2, "0")}&limit=1000`);
          const d = await r.json();
          return { month: m, transactions: Array.isArray(d?.data) ? d.data : [] };
        })
      );
      setHistoryTx(txResults);
    }
    setShowHistory((v) => !v);
  };

  const totalBudgeted = budgets.reduce((s, b) => s + getEffectiveLimit(b), 0);
  const totalSpent = budgets.reduce((s, b) => s + getSpent(b, transactions), 0);
  const onTrackCount = budgets.filter((b) => {
    const spent = getSpent(b, transactions);
    const lim = getEffectiveLimit(b);
    return statusFor(spent / lim, b.alertAt) === "on-track";
  }).length;
  const atRiskCount = budgets.length - onTrackCount;

  const allCategories = history
    ? [...new Set(history.budgets.map((b) => b.category))]
    : [];

  const monthLabel = (m: string) => {
    const [y, mo] = m.split("-").map(Number);
    return new Date(y, mo - 1, 1).toLocaleString("default", { month: "short", year: "2-digit" });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Budgets</h1>
          <p className="text-sm text-muted-foreground mt-1">{from} – {to}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleCopyFromLastMonth}
            disabled={copying}
            className="h-9 rounded-lg border border-border/60 px-3 text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors disabled:opacity-40"
          >
            {copying ? "Copying…" : `Copy from ${monthLabel(prevMonth)}`}
          </button>
          <DateRangePicker from={from} to={to} />
        </div>
      </div>

      {/* Summary cards */}
      {budgets.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
          <div className="rounded-xl border border-border/60 bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">On Track</p>
            <p className="mt-1 text-xl font-bold text-emerald-400">{onTrackCount}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">At Risk / Over</p>
            <p className={`mt-1 text-xl font-bold ${atRiskCount > 0 ? "text-amber-400" : "text-muted-foreground"}`}>{atRiskCount}</p>
          </div>
        </div>
      )}

      {/* Add budget form */}
      <div className="rounded-2xl border border-border/60 bg-card p-5">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-4">Add Budget</p>
        <form onSubmit={handleAdd} className="flex gap-3 flex-wrap">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-9 rounded-lg border border-border/60 bg-muted px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {Object.entries(CATEGORY_GROUPS).map(([group, cats]) => (
              <optgroup key={group} label={group}>
                {cats.map((c) => (
                  <option key={c} value={c}>{formatCategoryName(c)}</option>
                ))}
              </optgroup>
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

      {/* Budget cards */}
      {budgets.length === 0 ? (
        <p className="text-sm text-muted-foreground">No budgets for this month yet.</p>
      ) : (
        <div className="space-y-3">
          {budgets.map((budget) => {
            const spent = getSpent(budget, transactions);
            const effectiveLimit = getEffectiveLimit(budget);
            const carryover = effectiveLimit - budget.monthlyLimit;
            const pct = effectiveLimit > 0 ? spent / effectiveLimit : 0;
            const status = statusFor(pct, budget.alertAt);
            const projected = getProjected(spent);
            const projectedOver = projected > effectiveLimit;

            const barColor =
              status === "over"
                ? "oklch(0.65 0.22 25)"
                : status === "at-risk"
                ? "oklch(0.75 0.18 75)"
                : "linear-gradient(90deg, oklch(0.65 0.22 280), oklch(0.65 0.22 320))";

            const statusBadge = {
              "on-track": <span className="text-xs px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-medium">On Track</span>,
              "at-risk": <span className="text-xs px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 font-medium">At Risk</span>,
              "over": <span className="text-xs px-1.5 py-0.5 rounded-md bg-rose-500/10 text-rose-400 font-medium">Over</span>,
            }[status];

            return (
              <div key={budget.id} className="rounded-2xl border border-border/60 bg-card p-5 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{formatCategoryName(budget.category)}</span>
                    {statusBadge}
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Rollover toggle */}
                    <label className="flex items-center gap-1.5 cursor-pointer" title="Carry unused budget to next month">
                      <span className="text-xs text-muted-foreground">Rollover</span>
                      <button
                        role="switch"
                        aria-checked={budget.rollover}
                        onClick={() => handlePatch(budget.id, { rollover: !budget.rollover })}
                        className={`relative inline-flex h-4 w-7 shrink-0 rounded-full transition-colors ${budget.rollover ? "bg-primary" : "bg-muted-foreground/30"}`}
                      >
                        <span className={`inline-block h-3 w-3 mt-0.5 rounded-full bg-white shadow transition-transform ${budget.rollover ? "translate-x-3.5" : "translate-x-0.5"}`} />
                      </button>
                    </label>
                    {/* Spent / limit (inline edit) */}
                    <span className={`text-sm tabular-nums ${status === "over" ? "text-rose-400 font-semibold" : "text-muted-foreground"}`}>
                      {formatCurrency(spent)}
                      <span className="text-muted-foreground/60"> / </span>
                      {editingLimitId === budget.id ? (
                        <input
                          type="number"
                          autoFocus
                          value={editingLimitValue}
                          onChange={(e) => setEditingLimitValue(e.target.value)}
                          onBlur={() => handleLimitSave(budget.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleLimitSave(budget.id);
                            if (e.key === "Escape") setEditingLimitId(null);
                          }}
                          className="w-20 rounded border border-primary/60 bg-card px-1 text-sm focus:outline-none"
                          min="1"
                        />
                      ) : (
                        <button
                          onClick={() => { setEditingLimitId(budget.id); setEditingLimitValue(String(budget.monthlyLimit)); }}
                          className="hover:text-foreground transition-colors underline-offset-2 hover:underline"
                          title="Click to edit"
                        >
                          {formatCurrency(effectiveLimit)}
                        </button>
                      )}
                    </span>
                    <button
                      onClick={() => handleDelete(budget.id)}
                      className="text-xs text-muted-foreground hover:text-rose-400 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {carryover > 0 && (
                  <p className="text-xs text-emerald-400/80">+ {formatCurrency(carryover)} rollover from last month</p>
                )}

                {/* Progress bar */}
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(pct * 100, 100)}%`, background: barColor }}
                  />
                </div>

                {/* Alert threshold marker */}
                <div className="relative h-1 -mt-2">
                  <div
                    className="absolute top-0 w-px h-2 bg-muted-foreground/30"
                    style={{ left: `${budget.alertAt * 100}%` }}
                    title={`Alert at ${Math.round(budget.alertAt * 100)}%`}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  {status === "over" ? (
                    <span className="text-rose-400">Over by {formatCurrency(spent - effectiveLimit)}</span>
                  ) : (
                    <span>{formatCurrency(effectiveLimit - spent)} remaining</span>
                  )}
                  <span className={projectedOver ? "text-amber-400" : ""}>
                    Projected: {formatCurrency(projected)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* History */}
      {budgets.length > 0 && (
        <div>
          <button
            onClick={handleToggleHistory}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <span>{showHistory ? "▾" : "▸"}</span>
            {showHistory ? "Hide" : "Show"} spending history
          </button>

          {showHistory && history && (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-border/60 bg-card">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/60">
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Category</th>
                    {history.months.map((m) => (
                      <th key={m} className="text-right px-4 py-3 text-muted-foreground font-medium">{monthLabel(m)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {allCategories.map((cat) => (
                    <tr key={cat} className="hover:bg-white/2 transition-colors">
                      <td className="px-4 py-3 font-medium">{formatCategoryName(cat)}</td>
                      {history.months.map((m) => {
                        const b = history.budgets.find((x) => x.category === cat && x.month === m);
                        const txForMonth = historyTx.find((t) => t.month === m)?.transactions ?? [];
                        const s = b ? txForMonth
                          .filter((t) => (t.personalCategory ?? t.category) === cat && t.amount > 0)
                          .reduce((sum, t) => sum + t.amount, 0) : null;
                        const over = b && s !== null && s > b.monthlyLimit;
                        return (
                          <td key={m} className={`px-4 py-3 text-right tabular-nums ${over ? "text-rose-400" : "text-muted-foreground"}`}>
                            {b && s !== null ? (
                              <>{formatCurrency(s)}<span className="text-muted-foreground/50"> / {formatCurrency(b.monthlyLimit)}</span></>
                            ) : (
                              <span className="text-muted-foreground/30">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function BudgetsPage() {
  return (
    <Suspense>
      <BudgetsContent />
    </Suspense>
  );
}
