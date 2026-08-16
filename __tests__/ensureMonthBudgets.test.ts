const mockBudget = {
  count: jest.fn(),
  findMany: jest.fn(),
  createMany: jest.fn(),
};

jest.mock("@/lib/db", () => ({ prisma: { budget: mockBudget } }));

import { ensureMonthBudgets } from "@/lib/ensureMonthBudgets";

beforeEach(() => jest.clearAllMocks());

describe("ensureMonthBudgets", () => {
  it("does nothing when the month already has budgets", async () => {
    mockBudget.count.mockResolvedValue(2);
    await ensureMonthBudgets("2026-08");
    expect(mockBudget.findMany).not.toHaveBeenCalled();
    expect(mockBudget.createMany).not.toHaveBeenCalled();
  });

  it("does nothing when the previous month has no budgets either", async () => {
    mockBudget.count.mockResolvedValue(0);
    mockBudget.findMany.mockResolvedValue([]);
    await ensureMonthBudgets("2026-08");
    expect(mockBudget.createMany).not.toHaveBeenCalled();
  });

  it("copies the previous month's budgets into the new month", async () => {
    mockBudget.count.mockResolvedValue(0);
    mockBudget.findMany.mockResolvedValue([
      { category: "GROCERIES", monthlyLimit: 300, rollover: false, alertAt: 0.8 },
    ]);
    await ensureMonthBudgets("2026-08");
    expect(mockBudget.findMany).toHaveBeenCalledWith({ where: { month: "2026-07" } });
    expect(mockBudget.createMany).toHaveBeenCalledWith({
      data: [{ category: "GROCERIES", monthlyLimit: 300, month: "2026-08", rollover: false, alertAt: 0.8 }],
      skipDuplicates: true,
    });
  });
});
