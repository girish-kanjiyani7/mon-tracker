import { NextRequest } from "next/server";

const mockAccount = {
  findUnique: jest.fn(),
};
const mockTransaction = {
  findMany: jest.fn(),
};

jest.mock("@/lib/db", () => ({
  prisma: {
    account: mockAccount,
    transaction: mockTransaction,
  },
}));

import { GET } from "@/app/api/statements/route";

function makeReq(search: string = ""): NextRequest {
  return new NextRequest(`http://localhost/api/statements${search}`);
}

const creditAccount = {
  id: "acc1",
  name: "Sapphire",
  type: "credit",
  statementCloseDay: 16,
  lastStatementDate: null,
  statements: [] as Array<{ closeDate: Date; statementBalance: number | null }>,
  item: { institutionName: "Chase" },
};

const currentCycleTxs = [
  { id: "t1", amount: 50, date: new Date("2026-06-20"), category: "RESTAURANTS", personalCategory: null, pending: false },
  { id: "t2", amount: 30, date: new Date("2026-07-01"), category: "ONLINE_SHOPPING", personalCategory: null, pending: true },
  { id: "t3", amount: -200, date: new Date("2026-06-25"), category: "CREDIT_CARD_PAYMENT", personalCategory: null, pending: false },
];
const previousCycleTxs = [
  { id: "t4", amount: 40, date: new Date("2026-05-20"), category: "RESTAURANTS", personalCategory: null, pending: false },
];

beforeAll(() => {
  jest.useFakeTimers();
  // Local noon so localDateString resolves to 2026-07-03 regardless of TZ
  jest.setSystemTime(new Date(2026, 6, 3, 12, 0, 0));
});

afterAll(() => {
  jest.useRealTimers();
});

beforeEach(() => {
  jest.clearAllMocks();
  mockAccount.findUnique.mockResolvedValue(creditAccount);
  mockTransaction.findMany.mockResolvedValue([...currentCycleTxs, ...previousCycleTxs]);
});

describe("GET /api/statements", () => {
  it("returns 400 when accountId is missing", async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(400);
  });

  it("returns 400 for a negative offset", async () => {
    const res = await GET(makeReq("?accountId=acc1&offset=-1"));
    expect(res.status).toBe(400);
  });

  it("returns 400 for a non-integer offset", async () => {
    const res = await GET(makeReq("?accountId=acc1&offset=abc"));
    expect(res.status).toBe(400);
  });

  it("returns 404 for an unknown account", async () => {
    mockAccount.findUnique.mockResolvedValue(null);
    const res = await GET(makeReq("?accountId=nope"));
    expect(res.status).toBe(404);
  });

  it("resolves the current cycle window from the manual close day", async () => {
    const res = await GET(makeReq("?accountId=acc1"));
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data.window).toEqual({ openDate: "2026-06-17", closeDate: "2026-07-16" });
    expect(data.cycleSource).toBe("manual");
    expect(data.daysRemaining).toBe(13);
    expect(data.elapsedDays).toBe(17);
    expect(data.totalDays).toBe(30);
  });

  it("totals cycle spend excluding payments and flags pending spend", async () => {
    const res = await GET(makeReq("?accountId=acc1"));
    const { data } = await res.json();
    expect(data.spend.total).toBe(80);
    expect(data.spend.pendingTotal).toBe(30);
  });

  it("projects end-of-cycle spend at the current pace", async () => {
    const res = await GET(makeReq("?accountId=acc1"));
    const { data } = await res.json();
    expect(data.projectedTotal).toBeCloseTo((80 / 17) * 30, 1);
  });

  it("lists all window transactions including the payment", async () => {
    const res = await GET(makeReq("?accountId=acc1"));
    const { data } = await res.json();
    expect(data.transactions).toHaveLength(3);
  });

  it("compares against previous cycles at the same point in cycle", async () => {
    const res = await GET(makeReq("?accountId=acc1"));
    const { data } = await res.json();
    expect(data.previousCycles).toHaveLength(3);
    expect(data.previousCycles[0].window).toEqual({ openDate: "2026-05-17", closeDate: "2026-06-16" });
    expect(data.previousCycles[0].total).toBe(40);
    expect(data.previousCycles[0].totalAtSamePoint).toBe(40);
  });

  it("uses Plaid statement close dates when available", async () => {
    mockAccount.findUnique.mockResolvedValue({
      ...creditAccount,
      statementCloseDay: null,
      statements: [{ closeDate: new Date("2026-06-14"), statementBalance: 512.34 }],
    });
    const res = await GET(makeReq("?accountId=acc1"));
    const { data } = await res.json();
    expect(data.window).toEqual({ openDate: "2026-06-15", closeDate: "2026-07-14" });
    expect(data.cycleSource).toBe("plaid");
  });

  it("returns the statement balance for a closed Plaid statement", async () => {
    mockAccount.findUnique.mockResolvedValue({
      ...creditAccount,
      statementCloseDay: null,
      statements: [{ closeDate: new Date("2026-06-14"), statementBalance: 512.34 }],
    });
    const res = await GET(makeReq("?accountId=acc1&offset=1"));
    const { data } = await res.json();
    expect(data.window.closeDate).toBe("2026-06-14");
    expect(data.statementBalance).toBe(512.34);
  });

  it("falls back to the calendar month with no cycle info", async () => {
    mockAccount.findUnique.mockResolvedValue({ ...creditAccount, statementCloseDay: null, statements: [] });
    const res = await GET(makeReq("?accountId=acc1"));
    const { data } = await res.json();
    expect(data.window).toEqual({ openDate: "2026-07-01", closeDate: "2026-07-31" });
    expect(data.cycleSource).toBe("calendar");
  });

  it("returns 500 with a friendly error when the database fails", async () => {
    mockAccount.findUnique.mockRejectedValue(new Error("db down"));
    const res = await GET(makeReq("?accountId=acc1"));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.success).toBe(false);
  });
});
