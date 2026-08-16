import { NextRequest } from "next/server";

const mockTransaction = {
  findMany: jest.fn(),
  count: jest.fn(),
  create: jest.fn(),
};

const mockPrisma$transaction = jest.fn();

jest.mock("@/lib/db", () => ({
  prisma: {
    transaction: mockTransaction,
    $transaction: mockPrisma$transaction,
  },
}));
jest.mock("@/lib/plaid", () => ({ plaidClient: {} }));

import { GET, POST } from "@/app/api/transactions/route";

function makeReq(search: string = ""): NextRequest {
  return new NextRequest(`http://localhost/api/transactions${search}`);
}

const baseTx = {
  id: "tx1",
  name: "Coffee Shop",
  merchantName: "Starbucks",
  category: "FOOD_AND_DRINK",
  amount: 5.5,
  date: new Date("2026-05-15"),
  pending: false,
  account: { name: "Checking", item: { institutionName: "Chase" } },
};

function setupDb(txs = [baseTx], total = 1) {
  mockPrisma$transaction.mockResolvedValue([txs, total]);
}

beforeEach(() => jest.clearAllMocks());

describe("GET /api/transactions", () => {
  it("returns paginated data with total", async () => {
    setupDb();
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data[0].id).toBe("tx1");
    expect(json.total).toBe(1);
  });

  it("filters by valid month", async () => {
    setupDb([], 0);
    const res = await GET(makeReq("?month=2026-05"));
    expect(res.status).toBe(200);
    const findManyArgs = mockTransaction.findMany.mock.calls[0][0];
    expect(findManyArgs.where.date.gte).toEqual(new Date(2026, 4, 1));
    expect(findManyArgs.where.date.lt).toEqual(new Date(2026, 5, 1));
  });

  it("returns 400 for invalid month format", async () => {
    const res = await GET(makeReq("?month=bad-month"));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/month/i);
  });

  it("returns 400 for month=2026-00", async () => {
    const res = await GET(makeReq("?month=2026-00"));
    expect(res.status).toBe(400);
  });

  it("returns 400 for month=2026-13", async () => {
    const res = await GET(makeReq("?month=2026-13"));
    expect(res.status).toBe(400);
  });

  it("filters by search term", async () => {
    setupDb();
    const res = await GET(makeReq("?search=coffee"));
    expect(res.status).toBe(200);
    const findManyArgs = mockTransaction.findMany.mock.calls[0][0];
    expect(findManyArgs.where.name).toEqual({ contains: "coffee" });
  });

  it("returns 400 for search term exceeding max length", async () => {
    const res = await GET(makeReq(`?search=${"a".repeat(201)}`));
    expect(res.status).toBe(400);
  });

  it("filters by accountId", async () => {
    setupDb();
    const res = await GET(makeReq("?accountId=acct123"));
    expect(res.status).toBe(200);
    const findManyArgs = mockTransaction.findMany.mock.calls[0][0];
    expect(findManyArgs.where.accountId).toBe("acct123");
  });

  it("returns 400 for accountId exceeding max length", async () => {
    const res = await GET(makeReq(`?accountId=${"a".repeat(101)}`));
    expect(res.status).toBe(400);
  });

  it("filters by category", async () => {
    setupDb();
    const res = await GET(makeReq("?category=FOOD_AND_DRINK"));
    expect(res.status).toBe(200);
    const findManyArgs = mockTransaction.findMany.mock.calls[0][0];
    expect(findManyArgs.where.category).toBe("FOOD_AND_DRINK");
  });

  it("returns 400 for category exceeding max length", async () => {
    const res = await GET(makeReq(`?category=${"a".repeat(101)}`));
    expect(res.status).toBe(400);
  });

  it("applies skip/take for page 2", async () => {
    setupDb([], 0);
    const res = await GET(makeReq("?page=2"));
    expect(res.status).toBe(200);
    const findManyArgs = mockTransaction.findMany.mock.calls[0][0];
    expect(findManyArgs.skip).toBe(25);
    expect(findManyArgs.take).toBe(25);
  });

  it("combines multiple filters", async () => {
    setupDb();
    const res = await GET(makeReq("?month=2026-05&search=coffee&category=FOOD_AND_DRINK"));
    expect(res.status).toBe(200);
    const findManyArgs = mockTransaction.findMany.mock.calls[0][0];
    expect(findManyArgs.where.date).toBeDefined();
    expect(findManyArgs.where.name).toEqual({ contains: "coffee" });
    expect(findManyArgs.where.category).toBe("FOOD_AND_DRINK");
  });

  it("returns 500 on db error", async () => {
    mockPrisma$transaction.mockRejectedValue(new Error("db down"));
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
  });

  it("filters uncategorized transactions", async () => {
    setupDb();
    const res = await GET(makeReq("?uncategorized=true"));
    expect(res.status).toBe(200);
    const findManyArgs = mockTransaction.findMany.mock.calls[0][0];
    expect(findManyArgs.where.personalCategory).toBeNull();
  });

  it("returns 400 when uncategorized combined with category", async () => {
    const res = await GET(makeReq("?uncategorized=true&category=FOOD_AND_DRINK"));
    expect(res.status).toBe(400);
  });
});

function jsonReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/transactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validPost = { name: "Rent", amount: 1500, date: "2026-05-01" };

describe("POST /api/transactions", () => {
  it("creates a manual transaction", async () => {
    mockTransaction.create.mockResolvedValue({ id: "tx1", ...validPost, manual: true });
    const res = await POST(jsonReq(validPost));
    expect(res.status).toBe(201);
    expect(mockTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ manual: true, personalCategory: null }) })
    );
  });

  it("stores a valid personalCategory", async () => {
    mockTransaction.create.mockResolvedValue({ id: "tx1", ...validPost, manual: true });
    const res = await POST(jsonReq({ ...validPost, personalCategory: "RENT" }));
    expect(res.status).toBe(201);
    expect(mockTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ personalCategory: "RENT" }) })
    );
  });

  it("returns 400 for an invalid personalCategory", async () => {
    const res = await POST(jsonReq({ ...validPost, personalCategory: "NOT_A_REAL_CATEGORY" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing name", async () => {
    const res = await POST(jsonReq({ amount: 10, date: "2026-05-01" }));
    expect(res.status).toBe(400);
  });
});
