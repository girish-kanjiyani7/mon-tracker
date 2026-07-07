import {
  addDays,
  filterTransactionsInWindow,
  getDaysRemaining,
  getElapsedDays,
  isCardPayment,
  localDateString,
  projectCycleSpend,
  resolveCycleWindow,
  summarizeStatementSpend,
  utcDateString,
} from "@/lib/statementCycle";

describe("resolveCycleWindow", () => {
  it("computes current cycle from close day when today is mid-cycle", () => {
    const window = resolveCycleWindow({ closeDay: 16, today: "2026-07-03" });
    expect(window).toEqual({ openDate: "2026-06-17", closeDate: "2026-07-16" });
  });

  it("rolls to next cycle when today is past this month's close day", () => {
    const window = resolveCycleWindow({ closeDay: 16, today: "2026-07-20" });
    expect(window).toEqual({ openDate: "2026-07-17", closeDate: "2026-08-16" });
  });

  it("treats the close date itself as part of the closing cycle", () => {
    const window = resolveCycleWindow({ closeDay: 16, today: "2026-07-16" });
    expect(window).toEqual({ openDate: "2026-06-17", closeDate: "2026-07-16" });
  });

  it("returns the previous cycle for offset 1", () => {
    const window = resolveCycleWindow({ closeDay: 16, today: "2026-07-03", offset: 1 });
    expect(window).toEqual({ openDate: "2026-05-17", closeDate: "2026-06-16" });
  });

  it("clamps close day 31 in short months", () => {
    const window = resolveCycleWindow({ closeDay: 31, today: "2026-02-10" });
    expect(window).toEqual({ openDate: "2026-02-01", closeDate: "2026-02-28" });
  });

  it("clamps to Feb 29 in leap years", () => {
    const window = resolveCycleWindow({ closeDay: 31, today: "2024-02-10" });
    expect(window).toEqual({ openDate: "2024-02-01", closeDate: "2024-02-29" });
  });

  it("crosses the year boundary", () => {
    const window = resolveCycleWindow({ closeDay: 28, today: "2026-01-05" });
    expect(window).toEqual({ openDate: "2025-12-29", closeDate: "2026-01-28" });
  });

  it("uses a known close date as the current cycle open boundary", () => {
    const window = resolveCycleWindow({
      closeDay: 16,
      knownCloseDates: ["2026-06-14"],
      today: "2026-07-03",
    });
    expect(window).toEqual({ openDate: "2026-06-15", closeDate: "2026-07-16" });
  });

  it("uses a known future close date as the current cycle close", () => {
    const window = resolveCycleWindow({
      knownCloseDates: ["2026-06-14", "2026-07-15"],
      today: "2026-07-03",
    });
    expect(window).toEqual({ openDate: "2026-06-15", closeDate: "2026-07-15" });
  });

  it("pages back through known close dates with offset", () => {
    const known = ["2026-04-16", "2026-05-15", "2026-06-14"];
    expect(resolveCycleWindow({ closeDay: 16, knownCloseDates: known, today: "2026-07-03", offset: 1 }))
      .toEqual({ openDate: "2026-05-16", closeDate: "2026-06-14" });
    expect(resolveCycleWindow({ closeDay: 16, knownCloseDates: known, today: "2026-07-03", offset: 2 }))
      .toEqual({ openDate: "2026-04-17", closeDate: "2026-05-15" });
  });

  it("projects forward from a stale known close date until reaching today", () => {
    const window = resolveCycleWindow({
      closeDay: 16,
      knownCloseDates: ["2026-03-16"],
      today: "2026-07-03",
    });
    expect(window).toEqual({ openDate: "2026-06-17", closeDate: "2026-07-16" });
  });

  it("infers the close day from known close dates when closeDay is missing", () => {
    const window = resolveCycleWindow({ knownCloseDates: ["2026-06-14"], today: "2026-07-03" });
    expect(window).toEqual({ openDate: "2026-06-15", closeDate: "2026-07-14" });
  });

  it("falls back to the calendar month with no cycle info", () => {
    expect(resolveCycleWindow({ today: "2026-07-03" }))
      .toEqual({ openDate: "2026-07-01", closeDate: "2026-07-31" });
    expect(resolveCycleWindow({ today: "2026-07-03", offset: 1 }))
      .toEqual({ openDate: "2026-06-01", closeDate: "2026-06-30" });
  });

  it("accepts known close dates as Date objects (UTC midnight)", () => {
    const window = resolveCycleWindow({
      knownCloseDates: [new Date("2026-06-14")],
      today: "2026-07-03",
    });
    expect(window.openDate).toBe("2026-06-15");
  });

  it("rejects invalid close days", () => {
    expect(() => resolveCycleWindow({ closeDay: 0, today: "2026-07-03" })).toThrow();
    expect(() => resolveCycleWindow({ closeDay: 32, today: "2026-07-03" })).toThrow();
  });

  it("rejects negative offsets", () => {
    expect(() => resolveCycleWindow({ closeDay: 16, today: "2026-07-03", offset: -1 })).toThrow();
  });
});

describe("getDaysRemaining", () => {
  const window = { openDate: "2026-06-17", closeDate: "2026-07-16" };

  it("counts days from today to the close date", () => {
    expect(getDaysRemaining(window, "2026-07-03")).toBe(13);
  });

  it("returns 0 on the close date", () => {
    expect(getDaysRemaining(window, "2026-07-16")).toBe(0);
  });

  it("returns 0 after the close date", () => {
    expect(getDaysRemaining(window, "2026-07-20")).toBe(0);
  });
});

describe("getElapsedDays", () => {
  const window = { openDate: "2026-06-17", closeDate: "2026-07-16" };

  it("counts elapsed days inclusive of the open date and today", () => {
    expect(getElapsedDays(window, "2026-07-03")).toBe(17);
  });

  it("returns 1 on the open date", () => {
    expect(getElapsedDays(window, "2026-06-17")).toBe(1);
  });

  it("caps at the full cycle length after the close date", () => {
    expect(getElapsedDays(window, "2026-08-01")).toBe(30);
  });
});

describe("projectCycleSpend", () => {
  const window = { openDate: "2026-07-01", closeDate: "2026-07-31" };

  it("projects spend linearly at the current pace", () => {
    expect(projectCycleSpend(100, window, "2026-07-10")).toBe(310);
  });

  it("returns actual spend once the cycle has closed", () => {
    expect(projectCycleSpend(100, window, "2026-08-05")).toBe(100);
  });

  it("rounds to cents", () => {
    expect(projectCycleSpend(10, { openDate: "2026-07-01", closeDate: "2026-07-30" }, "2026-07-03")).toBe(100);
  });
});

describe("isCardPayment", () => {
  it("flags negative amounts categorized as credit card payments", () => {
    expect(isCardPayment({ amount: -500, category: "CREDIT_CARD_PAYMENT" })).toBe(true);
  });

  it("flags the Plaid LOAN_PAYMENTS mapping (stored as STUDENT_LOANS)", () => {
    expect(isCardPayment({ amount: -500, category: "STUDENT_LOANS" })).toBe(true);
  });

  it("flags raw unmapped Plaid transfer/loan categories", () => {
    expect(isCardPayment({ amount: -500, category: "LOAN_PAYMENTS" })).toBe(true);
    expect(isCardPayment({ amount: -500, category: "TRANSFER_IN" })).toBe(true);
  });

  it("does not flag refunds in spending categories", () => {
    expect(isCardPayment({ amount: -25, category: "ONLINE_SHOPPING" })).toBe(false);
  });

  it("does not flag positive amounts", () => {
    expect(isCardPayment({ amount: 500, category: "CREDIT_CARD_PAYMENT" })).toBe(false);
  });

  it("prefers personalCategory over category", () => {
    expect(isCardPayment({ amount: -500, category: "ONLINE_SHOPPING", personalCategory: "CREDIT_CARD_PAYMENT" })).toBe(true);
  });
});

describe("summarizeStatementSpend", () => {
  const transactions = [
    { amount: 20, category: "RESTAURANTS", pending: false },
    { amount: 15, category: "RESTAURANTS", pending: true },
    { amount: 100, category: "FLIGHTS", pending: false },
    { amount: 30, category: "ONLINE_SHOPPING", pending: false },
    { amount: -10, category: "ONLINE_SHOPPING", pending: false }, // refund
    { amount: -500, category: "CREDIT_CARD_PAYMENT", pending: false }, // payment
  ];

  it("totals spend excluding payments and netting refunds", () => {
    expect(summarizeStatementSpend(transactions).total).toBe(155);
  });

  it("nets refunds inside their category", () => {
    const { categories } = summarizeStatementSpend(transactions);
    expect(categories.find((c) => c.name === "Online Shopping")?.value).toBe(20);
  });

  it("sorts categories by value descending", () => {
    const { categories } = summarizeStatementSpend(transactions);
    expect(categories.map((c) => c.name)).toEqual(["Flights", "Restaurants", "Online Shopping"]);
  });

  it("sums pending spend separately", () => {
    expect(summarizeStatementSpend(transactions).pendingTotal).toBe(15);
  });

  it("returns zeros for no transactions", () => {
    expect(summarizeStatementSpend([])).toEqual({ total: 0, pendingTotal: 0, categories: [] });
  });
});

describe("filterTransactionsInWindow", () => {
  const window = { openDate: "2026-06-17", closeDate: "2026-07-16" };

  it("includes transactions on the boundary dates and excludes outside ones", () => {
    const txs = [
      { date: new Date("2026-06-16"), amount: 1 },
      { date: new Date("2026-06-17"), amount: 2 },
      { date: new Date("2026-07-16"), amount: 3 },
      { date: new Date("2026-07-17"), amount: 4 },
    ];
    const inWindow = filterTransactionsInWindow(txs, window);
    expect(inWindow.map((t) => t.amount)).toEqual([2, 3]);
  });
});

describe("date helpers", () => {
  it("addDays adds calendar days across month boundaries", () => {
    expect(addDays("2026-06-30", 1)).toBe("2026-07-01");
    expect(addDays("2026-07-01", -1)).toBe("2026-06-30");
  });

  it("utcDateString uses the UTC calendar date", () => {
    expect(utcDateString(new Date("2026-07-03T00:00:00Z"))).toBe("2026-07-03");
  });

  it("localDateString uses the local calendar date", () => {
    const d = new Date(2026, 6, 3, 23, 30);
    expect(localDateString(d)).toBe("2026-07-03");
  });
});
