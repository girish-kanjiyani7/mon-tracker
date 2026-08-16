"use client";

import { formatCurrency, formatDateOnly, formatCategoryName } from "@/lib/utils";
import type { DashboardTransaction } from "./types";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";

interface SortSheetProps {
  transaction: DashboardTransaction | null;
  boxCategories: string[];
  busy: boolean;
  onAssign: (category: string) => void;
  onOpenChange: (open: boolean) => void;
}

export function SortSheet({ transaction, boxCategories, busy, onAssign, onOpenChange }: SortSheetProps) {
  const suggested = transaction?.category && boxCategories.includes(transaction.category)
    ? transaction.category
    : null;
  const ordered = suggested
    ? [suggested, ...boxCategories.filter((c) => c !== suggested)]
    : boxCategories;

  return (
    <Sheet open={transaction !== null} onOpenChange={onOpenChange}>
      <SheetContent>
        {transaction && (
          <>
            <div>
              <SheetTitle>{transaction.merchantName ?? transaction.name}</SheetTitle>
              <SheetDescription>
                {formatDateOnly(String(transaction.date))} · {formatCurrency(Math.abs(transaction.amount))}
              </SheetDescription>
            </div>

            {ordered.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No boxes yet — tap the “+” card on the dashboard to create one, then come back to sort this transaction.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {ordered.map((category) => (
                  <button
                    key={category}
                    type="button"
                    disabled={busy}
                    onClick={() => onAssign(category)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition-colors disabled:opacity-50 ${
                      category === suggested
                        ? "border-primary text-primary"
                        : "border-border/60 hover:border-primary hover:text-primary"
                    }`}
                  >
                    {formatCategoryName(category)}
                    {category === suggested && <span className="ml-1 text-xs opacity-70">suggested</span>}
                  </button>
                ))}
              </div>
            )}

            <SheetClose className="self-start text-xs text-muted-foreground hover:text-foreground transition-colors">
              Leave unsorted
            </SheetClose>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
