"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { SpendingByCategory } from "@/components/dashboard/SpendingByCategory";
import { CycleSummary, type CycleSummaryData } from "@/components/statement/CycleSummary";
import { CycleComparison, type PreviousCycle } from "@/components/statement/CycleComparison";
import { StatementTransactions, type StatementTransaction } from "@/components/statement/StatementTransactions";
import { formatDateOnly } from "@/lib/utils";

interface CreditAccount {
  id: string;
  name: string;
  type: string;
  item: { institutionName: string };
}

interface StatementData extends CycleSummaryData {
  account: { id: string; name: string; institutionName: string; statementCloseDay: number | null };
  offset: number;
  cycleSource: "plaid" | "manual" | "calendar";
  spend: { total: number; pendingTotal: number; categories: Array<{ name: string; value: number }> };
  transactions: StatementTransaction[];
  previousCycles: PreviousCycle[];
}

export default function StatementPage() {
  const [creditAccounts, setCreditAccounts] = useState<CreditAccount[]>([]);
  const [hasLoadedAccounts, setHasLoadedAccounts] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [statement, setStatement] = useState<StatementData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const res = await fetch("/api/plaid/accounts");
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error("Unexpected response");
        const credit = data.filter((a: CreditAccount) => a.type === "credit");
        setCreditAccounts(credit);
        if (credit.length > 0) setSelectedAccountId(credit[0].id);
      } catch {
        setError("Failed to load accounts");
      } finally {
        setHasLoadedAccounts(true);
      }
    };
    loadAccounts();
  }, []);

  const fetchStatement = useCallback(async () => {
    if (!selectedAccountId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/statements?accountId=${selectedAccountId}&offset=${offset}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Request failed");
      setStatement(json.data);
    } catch {
      setError("Failed to load statement");
    } finally {
      setIsLoading(false);
    }
  }, [selectedAccountId, offset]);

  useEffect(() => { fetchStatement(); }, [fetchStatement]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetch("/api/plaid/sync", { method: "POST" });
      await fetch("/api/plaid/liabilities", { method: "POST" });
      await fetchStatement();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSelectAccount = (accountId: string) => {
    setSelectedAccountId(accountId);
    setOffset(0);
  };

  if (hasLoadedAccounts && creditAccounts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 bg-card/50 py-20 text-center">
        <p className="text-lg font-semibold">No credit cards connected</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Link a credit card on the Accounts page to track statement cycles.
        </p>
        <Link
          href="/accounts"
          className="mt-6 inline-flex h-9 items-center rounded-lg border border-border/60 bg-card px-4 text-sm font-medium hover:bg-white/5 transition-colors"
        >
          Go to Accounts
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Statement</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {statement
              ? `${formatDateOnly(statement.window.openDate)} – ${formatDateOnly(statement.window.closeDate)}`
              : "Track spending for the current billing cycle"}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="h-9 rounded-lg border border-border/60 bg-card px-4 text-sm font-medium hover:bg-white/5 disabled:opacity-50 transition-colors"
        >
          {isRefreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {creditAccounts.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {creditAccounts.map((account) => (
            <button
              key={account.id}
              onClick={() => handleSelectAccount(account.id)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                account.id === selectedAccountId
                  ? "border-indigo-500/50 bg-indigo-500/10 text-foreground"
                  : "border-border/60 bg-card text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
            >
              {account.item.institutionName} · {account.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={() => setOffset(offset + 1)}
          className="h-8 rounded-lg border border-border/60 bg-card px-3 text-sm hover:bg-white/5 transition-colors"
        >
          ← Older
        </button>
        <span className="text-sm text-muted-foreground min-w-32 text-center">
          {offset === 0 ? "Current cycle" : offset === 1 ? "Last statement" : `${offset} cycles ago`}
        </span>
        <button
          onClick={() => setOffset(Math.max(0, offset - 1))}
          disabled={offset === 0}
          className="h-8 rounded-lg border border-border/60 bg-card px-3 text-sm hover:bg-white/5 disabled:opacity-40 transition-colors"
        >
          Newer →
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          {error}
        </div>
      )}

      {isLoading && !statement && (
        <div className="rounded-2xl border border-border/60 bg-card/50 py-20 text-center text-sm text-muted-foreground">
          Loading statement…
        </div>
      )}

      {statement && (
        <div className={`space-y-6 ${isLoading ? "opacity-60" : ""}`}>
          {statement.cycleSource === "calendar" && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
              No statement dates available for this card yet — showing calendar months.{" "}
              <Link href="/accounts" className="underline underline-offset-2">
                Set the statement close day
              </Link>{" "}
              on the Accounts page, or Refresh to pull statement dates from your bank.
            </div>
          )}

          <CycleSummary data={statement} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <SpendingByCategory data={statement.spend.categories} />
            <CycleComparison
              currentTotal={statement.spend.total}
              elapsedDays={statement.elapsedDays}
              isCurrentCycle={statement.isCurrentCycle}
              previousCycles={statement.previousCycles}
            />
          </div>

          <StatementTransactions transactions={statement.transactions} />
        </div>
      )}
    </div>
  );
}
