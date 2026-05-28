const mockAccount = {
  findMany: jest.fn(),
};

jest.mock("@/lib/db", () => ({ prisma: { account: mockAccount } }));
jest.mock("@/lib/plaid", () => ({ plaidClient: {} }));

import { GET } from "@/app/api/plaid/accounts/route";

beforeEach(() => jest.clearAllMocks());

describe("GET /api/plaid/accounts", () => {
  it("returns accounts ordered by updatedAt desc", async () => {
    const accounts = [
      { id: "a1", name: "Checking", item: { institutionName: "Chase" } },
      { id: "a2", name: "Savings", item: { institutionName: "BoA" } },
    ];
    mockAccount.findMany.mockResolvedValue(accounts);

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(2);
    expect(data[0].id).toBe("a1");
    expect(mockAccount.findMany).toHaveBeenCalledWith({
      include: { item: { select: { institutionName: true } } },
      orderBy: { updatedAt: "desc" },
    });
  });

  it("returns empty array when no accounts exist", async () => {
    mockAccount.findMany.mockResolvedValue([]);
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual([]);
  });

  it("returns 500 on db error", async () => {
    mockAccount.findMany.mockRejectedValue(new Error("db down"));
    const res = await GET();
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });
});
