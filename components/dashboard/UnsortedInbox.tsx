"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDateOnly, formatCategoryName } from "@/lib/utils";
import type { DashboardTransaction } from "./types";
import { SortSheet } from "./SortSheet";

interface UnsortedInboxProps {
  transactions: DashboardTransaction[];
  boxCategories: string[];
  readOnly: boolean;
}

export function UnsortedInbox({ transactions, boxCategories, readOnly }: UnsortedInboxProps) {
  const router = useRouter();
  const [rows, setRows] = useState(transactions);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setRows(transactions), [transactions]);

  const active = rows.find((t) => t.id === activeId) ?? null;

  async function handleAssign(category: string) {
    if (!activeId) return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/transactions/${activeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personalCategory: category }),
    });
    setBusy(false);
    if (res.ok) {
      setRows((prev) => prev.filter((t) => t.id !== activeId));
      setActiveId(null);
      router.refresh();
    } else {
      setError("Couldn't sort that transaction — try again.");
    }
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Unsorted{rows.length > 0 && ` — ${rows.length}`}
        </p>
      </div>

      {error && <p className="px-5 pt-3 text-xs text-rose-400">{error}</p>}

      {!rows.length ? (
        <div className="px-5 py-10 text-center text-sm text-muted-foreground">
          Inbox zero — everything is sorted.
        </div>
      ) : (
        <div className="divide-y divide-border/40">
          {rows.map((tx) => (
            <button
              key={tx.id}
              type="button"
              disabled={readOnly}
              onClick={() => setActiveId(tx.id)}
              className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition-colors hover:bg-white/2 active:bg-white/5 disabled:pointer-events-none min-h-11"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{tx.merchantName ?? tx.name}</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">{formatDateOnly(String(tx.date))}</p>
                  {tx.category && (
                    <span className="rounded-md border border-border/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      Suggested: {formatCategoryName(tx.category)}
                    </span>
                  )}
                </div>
              </div>
              <p className={`shrink-0 text-sm font-semibold tabular-nums ${tx.amount < 0 ? "text-emerald-400" : ""}`}>
                {tx.amount < 0 ? "+" : "−"}{formatCurrency(Math.abs(tx.amount))}
              </p>
            </button>
          ))}
        </div>
      )}

      <SortSheet
        transaction={active}
        boxCategories={boxCategories}
        busy={busy}
        onAssign={handleAssign}
        onOpenChange={(open) => { if (!open) setActiveId(null); }}
      />
    </div>
  );
}
