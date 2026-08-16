"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDateOnly, formatCategoryName } from "@/lib/utils";
import type { Box } from "@/lib/boxes";
import type { DashboardTransaction } from "./types";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";

interface BoxDetailSheetProps {
  box: Box | null;
  transactions: DashboardTransaction[];
  boxCategories: string[];
  readOnly: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BoxDetailSheet({ box, transactions, boxCategories, readOnly, onOpenChange }: BoxDetailSheetProps) {
  const router = useRouter();
  const [movingTxId, setMovingTxId] = useState<string | null>(null);
  const [busyTxId, setBusyTxId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [limitInput, setLimitInput] = useState("");
  const [editingLimit, setEditingLimit] = useState(false);

  async function patchTransaction(id: string, personalCategory: string | null) {
    setBusyTxId(id);
    await fetch(`/api/transactions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personalCategory }),
    });
    setBusyTxId(null);
    setMovingTxId(null);
    router.refresh();
  }

  async function handleSaveLimit() {
    if (!box?.budgetId) return;
    const monthlyLimit = parseFloat(limitInput);
    if (isNaN(monthlyLimit) || monthlyLimit < 0) return;
    await fetch(`/api/budgets/${box.budgetId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monthlyLimit }),
    });
    setEditingLimit(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!box?.budgetId) return;
    setDeleting(true);
    await fetch("/api/budgets", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: box.budgetId }),
    });
    setDeleting(false);
    onOpenChange(false);
    router.refresh();
  }

  const otherCategories = boxCategories.filter((c) => c !== box?.category);

  return (
    <Sheet open={box !== null} onOpenChange={onOpenChange}>
      <SheetContent>
        {box && (
          <>
            <div>
              <SheetTitle>{formatCategoryName(box.category)}</SheetTitle>
              <SheetDescription>
                {formatCurrency(box.spent)}
                {box.monthlyLimit > 0 && <> of {formatCurrency(box.monthlyLimit)}</>}
                {" · "}{box.txCount} transaction{box.txCount === 1 ? "" : "s"}
              </SheetDescription>
            </div>

            {!transactions.length ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No transactions in this box yet.</p>
            ) : (
              <div className="divide-y divide-border/40 -mx-1">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between gap-3 px-1 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{tx.merchantName ?? tx.name}</p>
                      <p className="text-xs text-muted-foreground">{formatDateOnly(String(tx.date))}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <p className="text-sm font-semibold tabular-nums">
                        {tx.amount < 0 ? "+" : "−"}{formatCurrency(Math.abs(tx.amount))}
                      </p>
                      {!readOnly && (
                        <div className="flex gap-1">
                          <button
                            type="button"
                            disabled={busyTxId === tx.id}
                            onClick={() => setMovingTxId(movingTxId === tx.id ? null : tx.id)}
                            className="rounded-md border border-border/60 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                          >
                            Move
                          </button>
                          <button
                            type="button"
                            disabled={busyTxId === tx.id}
                            onClick={() => patchTransaction(tx.id, null)}
                            className="rounded-md border border-border/60 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                          >
                            Unsort
                          </button>
                        </div>
                      )}
                    </div>
                    {movingTxId === tx.id && (
                      <div className="basis-full flex flex-wrap gap-1.5 pt-1">
                        {otherCategories.length === 0 && (
                          <p className="text-xs text-muted-foreground">No other boxes yet — add one first.</p>
                        )}
                        {otherCategories.map((c) => (
                          <button
                            key={c}
                            type="button"
                            disabled={busyTxId === tx.id}
                            onClick={() => patchTransaction(tx.id, c)}
                            className="rounded-full border border-border/60 px-2.5 py-1 text-xs hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
                          >
                            {formatCategoryName(c)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!readOnly && box.budgetId && (
              <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-4">
                {editingLimit ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      autoFocus
                      defaultValue={box.monthlyLimit || ""}
                      onChange={(e) => setLimitInput(e.target.value)}
                      placeholder="0.00"
                      className="h-8 w-24 rounded-lg border border-border/60 bg-muted px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button type="button" onClick={handleSaveLimit} className="text-xs text-primary hover:underline">
                      Save
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setLimitInput(String(box.monthlyLimit)); setEditingLimit(true); }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Edit limit
                  </button>
                )}
                <button
                  type="button"
                  disabled={box.txCount > 0 || deleting}
                  onClick={handleDelete}
                  title={box.txCount > 0 ? "Move or unsort transactions first" : undefined}
                  className="text-xs text-rose-400 hover:text-rose-300 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                >
                  {deleting ? "Deleting…" : "Delete box"}
                </button>
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
