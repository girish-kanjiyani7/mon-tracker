import { formatCurrency, formatCategoryName, formatDate, groupByCategory, getCurrentMonth, cn } from "@/lib/utils";

describe("formatCurrency", () => {
  it("formats positive USD amount", () => {
    expect(formatCurrency(42.5)).toBe("$42.50");
  });
  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });
  it("formats large amount with commas", () => {
    expect(formatCurrency(1234.56)).toBe("$1,234.56");
  });
  it("formats negative amount", () => {
    expect(formatCurrency(-20)).toBe("-$20.00");
  });
});

describe("formatCategoryName", () => {
  it("converts FOOD_AND_DRINK to title case", () => {
    expect(formatCategoryName("FOOD_AND_DRINK")).toBe("Food And Drink");
  });
  it("handles single word", () => {
    expect(formatCategoryName("TRAVEL")).toBe("Travel");
  });
  it("handles already-lowercase input", () => {
    expect(formatCategoryName("shopping")).toBe("Shopping");
  });
});

describe("groupByCategory", () => {
  it("sums amounts per category", () => {
    const txs = [
      { category: "FOOD_AND_DRINK", amount: 20 },
      { category: "FOOD_AND_DRINK", amount: 15 },
      { category: "TRAVEL", amount: 100 },
    ];
    const result = groupByCategory(txs);
    const food = result.find((r) => r.name === "Food And Drink");
    expect(food?.value).toBe(35);
  });

  it("skips negative amounts (credits/refunds)", () => {
    const txs = [{ category: "SHOPPING", amount: -10 }];
    expect(groupByCategory(txs)).toHaveLength(0);
  });

  it("uses 'Other' for null category", () => {
    const txs = [{ category: null, amount: 50 }];
    const result = groupByCategory(txs);
    expect(result[0].name).toBe("Other");
  });

  it("sorts by value descending", () => {
    const txs = [
      { category: "TRAVEL", amount: 10 },
      { category: "FOOD_AND_DRINK", amount: 100 },
    ];
    const result = groupByCategory(txs);
    expect(result[0].value).toBeGreaterThan(result[1].value);
  });

  it("returns empty array for empty input", () => {
    expect(groupByCategory([])).toEqual([]);
  });
});

describe("getCurrentMonth", () => {
  it("returns YYYY-MM format", () => {
    expect(getCurrentMonth()).toMatch(/^\d{4}-\d{2}$/);
  });
});

describe("formatDate", () => {
  it("formats a date string", () => {
    expect(formatDate(new Date(2026, 0, 15))).toMatch(/Jan 15, 2026/);
  });
});


describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });
});
