"use client";

import { useState } from "react";
import { computeBoxes, type BoxBudget } from "@/lib/boxes";
import type { DashboardTransaction } from "./types";
import { BoxCard } from "./BoxCard";
import { AddBoxCard } from "./AddBoxCard";
import { BoxDetailSheet } from "./BoxDetailSheet";

interface BoxesGridProps {
  budgets: BoxBudget[];
  transactions: DashboardTransaction[];
  month: string;
  readOnly: boolean;
}

export function BoxesGrid({ budgets, transactions, month, readOnly }: BoxesGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const boxes = computeBoxes(budgets, transactions).sort((a, b) => b.spent - a.spent);
  const selectedBox = boxes.find((b) => b.category === selectedCategory) ?? null;
  const boxTransactions = selectedCategory
    ? transactions.filter((t) => t.personalCategory === selectedCategory)
    : [];

  if (!boxes.length && readOnly) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-6 text-center text-sm text-muted-foreground">
        No boxes were set up this month.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {boxes.map((box) => (
        <BoxCard key={box.category} box={box} onSelect={() => setSelectedCategory(box.category)} />
      ))}
      {!readOnly && (
        <AddBoxCard month={month} existingCategories={boxes.map((b) => b.category)} />
      )}

      <BoxDetailSheet
        box={selectedBox}
        transactions={boxTransactions}
        boxCategories={boxes.map((b) => b.category)}
        readOnly={readOnly}
        onOpenChange={(open) => { if (!open) setSelectedCategory(null); }}
      />
    </div>
  );
}
