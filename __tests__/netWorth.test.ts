import { computeNetWorth } from "@/lib/netWorth";

describe("computeNetWorth", () => {
  it("sums depository and investment balances into accountAssets", () => {
    const accounts = [
      { type: "depository", balance: 1000 },
      { type: "investment", balance: 5000 },
    ];
    const result = computeNetWorth(accounts);
    expect(result.accountAssets).toBe(6000);
    expect(result.netWorth).toBe(6000);
  });

  it("excludes credit balances from assets and does not subtract them from net worth", () => {
    const accounts = [
      { type: "depository", balance: 1000 },
      { type: "credit", balance: 300 },
    ];
    const result = computeNetWorth(accounts);
    expect(result.accountAssets).toBe(1000);
    expect(result.creditBalances).toBe(300);
    expect(result.netWorth).toBe(1000);
  });

  it("excludes loan and unknown account types from both assets and creditBalances", () => {
    const accounts = [
      { type: "depository", balance: 1000 },
      { type: "loan", balance: 20000 },
      { type: "other", balance: 50 },
    ];
    const result = computeNetWorth(accounts);
    expect(result.accountAssets).toBe(1000);
    expect(result.creditBalances).toBe(0);
    expect(result.netWorth).toBe(1000);
  });

  it("adds positive manualCash to net worth", () => {
    const result = computeNetWorth([{ type: "depository", balance: 1000 }], 200);
    expect(result.netWorth).toBe(1200);
  });

  it("subtracts negative manualCash from net worth with no clamp", () => {
    const result = computeNetWorth([{ type: "depository", balance: 1000 }], -200);
    expect(result.netWorth).toBe(800);
  });

  it("defaults manualCash to 0 when omitted, and handles no accounts", () => {
    expect(computeNetWorth([])).toEqual({ accountAssets: 0, creditBalances: 0, netWorth: 0 });
  });
});
