"use client";

import { useState } from "react";
import { formatCurrency, formatDateOnly } from "@/lib/utils";

interface Account {
  id: string;
  name: string;
  officialName: string | null;
  type: string;
  subtype: string | null;
  balance: number;
  statementCloseDay?: number | null;
  lastStatementDate?: string | null;
  item: { institutionName: string };
}

const typeIcon: Record<string, string> = {
  depository: "🏦",
  credit: "💳",
  investment: "📈",
  loan: "📋",
  other: "💼",
};

const MIN_CLOSE_DAY = 1;
const MAX_CLOSE_DAY = 31;

function StatementCloseDayEditor({ account }: { account: Account }) {
  const [closeDay, setCloseDay] = useState<number | null>(account.statementCloseDay ?? null);
  const [draft, setDraft] = useState<string>(String(account.statementCloseDay ?? ""));
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const parsed = Number(draft);
    if (!Number.isInteger(parsed) || parsed < MIN_CLOSE_DAY || parsed > MAX_CLOSE_DAY) {
      setError(`Enter a day between ${MIN_CLOSE_DAY} and ${MAX_CLOSE_DAY}`);
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/accounts/${account.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statementCloseDay: parsed }),
      });
      if (!res.ok) throw new Error("Request failed");
      setCloseDay(parsed);
      setIsEditing(false);
    } catch {
      setError("Failed to save — try again");
    } finally {
      setIsSaving(false);
    }
  };

  if (isEditing) {
    return (
      <div className="mt-3 flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">Closes on day</span>
        <input
          type="number"
          min={MIN_CLOSE_DAY}
          max={MAX_CLOSE_DAY}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="h-7 w-14 rounded-md border border-border/60 bg-background px-2 tabular-nums"
          autoFocus
        />
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 font-medium text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50 transition-colors"
        >
          {isSaving ? "Saving…" : "Save"}
        </button>
        <button
          onClick={() => { setIsEditing(false); setError(null); setDraft(String(closeDay ?? "")); }}
          className="rounded-md border border-border/60 px-2 py-1 text-muted-foreground hover:bg-white/5 transition-colors"
        >
          Cancel
        </button>
        {error && <span className="text-rose-400">{error}</span>}
      </div>
    );
  }

  return (
    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
      <span>
        {closeDay
          ? `Statement closes on day ${closeDay}`
          : "No statement close day set"}
      </span>
      <button
        onClick={() => setIsEditing(true)}
        className="rounded-md border border-border/60 px-2 py-0.5 hover:bg-white/5 transition-colors"
      >
        {closeDay ? "Edit" : "Set"}
      </button>
    </div>
  );
}

export function AccountCard({ account }: { account: Account }) {
  const isCredit = account.type === "credit";
  const icon = typeIcon[account.type] ?? typeIcon.other;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-lg">
            {icon}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{account.item.institutionName}</p>
            <p className="text-sm font-semibold leading-tight">{account.name}</p>
          </div>
        </div>
        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize border ${
          isCredit
            ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
            : "border-indigo-500/30 bg-indigo-500/10 text-indigo-400"
        }`}>
          {account.subtype ?? account.type}
        </span>
      </div>

      <div className="mt-4">
        <p className={`text-2xl font-bold tabular-nums ${isCredit ? "text-rose-400" : "text-emerald-400"}`}>
          {isCredit ? `−${formatCurrency(account.balance)}` : formatCurrency(account.balance)}
        </p>
        {account.officialName && (
          <p className="mt-1 text-xs text-muted-foreground truncate">{account.officialName}</p>
        )}
        {isCredit && account.lastStatementDate && (
          <p className="mt-1 text-xs text-muted-foreground">
            Last statement: {formatDateOnly(account.lastStatementDate)}
          </p>
        )}
        {isCredit && <StatementCloseDayEditor account={account} />}
      </div>
    </div>
  );
}
