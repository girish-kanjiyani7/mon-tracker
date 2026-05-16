"use client";

import { useEffect, useState, useCallback } from "react";
import { AccountCard } from "@/components/accounts/AccountCard";
import { PlaidLinkButton } from "@/components/accounts/PlaidLinkButton";

interface Account {
  id: string;
  name: string;
  officialName: string | null;
  type: string;
  subtype: string | null;
  balance: number;
  item: { institutionName: string };
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    const res = await fetch("/api/plaid/accounts");
    const data = await res.json();
    if (Array.isArray(data)) setAccounts(data);
  }, []);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const handleSync = async () => {
    setSyncing(true);
    await fetch("/api/plaid/sync", { method: "POST" });
    await fetchAccounts();
    setLastSync(new Date().toLocaleTimeString());
    setSyncing(false);
  };

  const totalAssets = accounts
    .filter((a) => a.type !== "credit")
    .reduce((s, a) => s + a.balance, 0);
  const totalCredit = accounts
    .filter((a) => a.type === "credit")
    .reduce((s, a) => s + a.balance, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Accounts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {accounts.length > 0
              ? `${accounts.length} account${accounts.length !== 1 ? "s" : ""} connected`
              : "No accounts connected"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastSync && (
            <span className="text-xs text-muted-foreground">Synced {lastSync}</span>
          )}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="h-9 rounded-lg border border-border/60 bg-card px-4 text-sm font-medium hover:bg-white/5 disabled:opacity-50 transition-colors"
          >
            {syncing ? "Syncing…" : "Sync Now"}
          </button>
          {accounts.length > 0 && <PlaidLinkButton onSuccess={fetchAccounts} />}
        </div>
      </div>

      {accounts.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-border/60 bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">Total Accounts</p>
            <p className="mt-1 text-xl font-bold">{accounts.length}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">Total Assets</p>
            <p className="mt-1 text-xl font-bold text-emerald-400">
              ${totalAssets.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">Credit Balances</p>
            <p className="mt-1 text-xl font-bold text-rose-400">
              ${totalCredit.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">Net Worth</p>
            <p className="mt-1 text-xl font-bold gradient-text">
              ${(totalAssets - totalCredit).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>
      )}

      {accounts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/50 py-20 text-center">
          <p className="text-lg font-semibold">No accounts connected</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Link your Chase, Discover, Amex, or Apple Card to get started.
          </p>
          <div className="mt-6 flex justify-center">
            <PlaidLinkButton onSuccess={fetchAccounts} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {accounts.map((acct) => (
            <AccountCard key={acct.id} account={acct} />
          ))}
        </div>
      )}
    </div>
  );
}
