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
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => setRows(transactions), [transactions]);

  const active = rows.find((t) => t.id === activeId) ?? null;

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this transaction? This can't be undone.")) return;
    setDeletingId(id);
    const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    setDeletingId(null);
    if (res.ok) {
      setRows((prev) => prev.filter((t) => t.id !== id));
      router.refresh();
    } else {
      setError("Couldn't delete that transaction — try again.");
    }
  }

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
            <div key={tx.id} className="flex w-full items-center gap-2 px-5 py-3.5 min-h-11">
              <button
                type="button"
                disabled={readOnly}
                onClick={() => setActiveId(tx.id)}
                className="flex flex-1 min-w-0 items-center justify-between gap-3 text-left transition-colors disabled:pointer-events-none"
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
              {!readOnly && tx.manual && (
                <button
                  type="button"
                  disabled={deletingId === tx.id}
                  onClick={() => handleDelete(tx.id)}
                  className="shrink-0 rounded-md border border-border/60 px-2 py-1 text-xs text-rose-400 hover:text-rose-300 transition-colors disabled:opacity-50"
                >
                  Delete
                </button>
              )}
            </div>
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
