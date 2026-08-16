import { computeBoxes, splitUnsorted } from "@/lib/boxes";

describe("computeBoxes", () => {
  it("sums personalCategory-only spend into its matching box", () => {
    const budgets = [{ id: "b1", category: "GROCERIES", monthlyLimit: 300, alertAt: 0.8 }];
    const transactions = [
      { id: "t1", personalCategory: "GROCERIES", category: "GROCERIES", amount: 40 },
      { id: "t2", personalCategory: "GROCERIES", category: null, amount: 30 },
      { id: "t3", personalCategory: null, category: "GROCERIES", amount: 999 }, // unsorted: must not count
    ];
    const boxes = computeBoxes(budgets, transactions);
    expect(boxes).toHaveLength(1);
    expect(boxes[0]).toMatchObject({ category: "GROCERIES", spent: 70, txCount: 2, implicit: false });
  });

  it("creates an implicit, limit-less box for sorted spend with no Budget row", () => {
    const boxes = computeBoxes([], [{ id: "t1", personalCategory: "RENT", amount: 1500 }]);
    expect(boxes).toEqual([
      { category: "RENT", budgetId: null, monthlyLimit: 0, alertAt: 0.8, spent: 1500, txCount: 1, implicit: true },
    ]);
  });

  it("includes a budget with zero spend", () => {
    const budgets = [{ id: "b1", category: "TRAVEL", monthlyLimit: 200, alertAt: 0.8 }];
    const boxes = computeBoxes(budgets, []);
    expect(boxes).toEqual([
      { category: "TRAVEL", budgetId: "b1", monthlyLimit: 200, alertAt: 0.8, spent: 0, txCount: 0, implicit: false },
    ]);
  });

  it("nets refunds against spend in the same box", () => {
    const budgets = [{ id: "b1", category: "SHOPPING", monthlyLimit: 100, alertAt: 0.8 }];
    const transactions = [
      { id: "t1", personalCategory: "SHOPPING", amount: 50 },
      { id: "t2", personalCategory: "SHOPPING", amount: -20 }, // refund
    ];
    const boxes = computeBoxes(budgets, transactions);
    expect(boxes[0].spent).toBe(30);
  });

  it("returns a box with monthlyLimit 0 to represent 'no budget set'", () => {
    const budgets = [{ id: "b1", category: "GAMING", monthlyLimit: 0, alertAt: 0.8 }];
    const boxes = computeBoxes(budgets, []);
    expect(boxes[0].monthlyLimit).toBe(0);
  });
});

describe("splitUnsorted", () => {
  it("keeps only transactions without a personalCategory", () => {
    const transactions = [
      { id: "t1", personalCategory: "GROCERIES", date: "2026-08-01" },
      { id: "t2", personalCategory: null, date: "2026-08-02" },
    ];
    const result = splitUnsorted(transactions);
    expect(result.map((t) => t.id)).toEqual(["t2"]);
  });

  it("sorts unsorted transactions by date descending", () => {
    const transactions = [
      { id: "old", personalCategory: null, date: "2026-08-01" },
      { id: "new", personalCategory: null, date: "2026-08-15" },
    ];
    const result = splitUnsorted(transactions);
    expect(result.map((t) => t.id)).toEqual(["new", "old"]);
  });

  it("returns an empty array when everything is sorted", () => {
    expect(splitUnsorted([{ id: "t1", personalCategory: "RENT", date: "2026-08-01" }])).toEqual([]);
  });
});
