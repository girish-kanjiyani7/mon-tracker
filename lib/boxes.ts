export interface BoxBudget {
  id: string;
  category: string;
  monthlyLimit: number;
  alertAt: number;
}

export interface BoxTransaction {
  id: string;
  personalCategory?: string | null;
  category?: string | null;
  amount: number;
}

export interface Box {
  category: string;
  budgetId: string | null;
  monthlyLimit: number;
  alertAt: number;
  spent: number;
  txCount: number;
  /** true when this box has no Budget row and was inferred purely from sorted transactions. */
  implicit: boolean;
}

/**
 * Build the set of category "boxes" for a month from its budget rows and
 * transactions. Box membership is personalCategory-only (see dashboard plan):
 * a transaction only counts toward a box once the user has explicitly sorted
 * it. Categories with sorted spend but no Budget row still get an implicit,
 * limit-less box so money is never invisible.
 */
export function computeBoxes(budgets: readonly BoxBudget[], transactions: readonly BoxTransaction[]): Box[] {
  const spentByCategory = new Map<string, { spent: number; txCount: number }>();
  for (const tx of transactions) {
    if (!tx.personalCategory) continue;
    const entry = spentByCategory.get(tx.personalCategory) ?? { spent: 0, txCount: 0 };
    entry.spent += tx.amount;
    entry.txCount += 1;
    spentByCategory.set(tx.personalCategory, entry);
  }

  const boxes: Box[] = budgets.map((b) => {
    const entry = spentByCategory.get(b.category);
    spentByCategory.delete(b.category);
    return {
      category: b.category,
      budgetId: b.id,
      monthlyLimit: b.monthlyLimit,
      alertAt: b.alertAt,
      spent: entry?.spent ?? 0,
      txCount: entry?.txCount ?? 0,
      implicit: false,
    };
  });

  for (const [category, entry] of spentByCategory) {
    boxes.push({
      category,
      budgetId: null,
      monthlyLimit: 0,
      alertAt: 0.8,
      spent: entry.spent,
      txCount: entry.txCount,
      implicit: true,
    });
  }

  return boxes;
}

/** Transactions in the month that have not yet been sorted into a box. */
export function splitUnsorted<T extends { personalCategory?: string | null; date: Date | string }>(
  transactions: readonly T[]
): T[] {
  return transactions
    .filter((tx) => !tx.personalCategory)
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
