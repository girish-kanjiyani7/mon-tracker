import { NextRequest } from "next/server";

const mockBudget = {
  findMany: jest.fn(),
  upsert: jest.fn(),
  delete: jest.fn(),
};

jest.mock("@/lib/db", () => ({ prisma: { budget: mockBudget } }));
jest.mock("@/lib/plaid", () => ({ plaidClient: {} }));

import { GET, POST, DELETE } from "@/app/api/budgets/route";

function makeReq(url: string, options: ConstructorParameters<typeof NextRequest>[1] = {}): NextRequest {
  return new NextRequest(url, options);
}

function jsonBody(body: unknown) {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  } as const;
}

beforeEach(() => jest.clearAllMocks());

describe("GET /api/budgets", () => {
  it("returns budgets for current month when no param given", async () => {
    mockBudget.findMany.mockResolvedValue([{ id: "1", category: "FOOD", monthlyLimit: 200, month: "2026-05" }]);
    const res = await GET(makeReq("http://localhost/api/budgets"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(mockBudget.findMany).toHaveBeenCalledTimes(1);
  });

  it("returns budgets filtered by valid month param", async () => {
    mockBudget.findMany.mockResolvedValue([]);
    const res = await GET(makeReq("http://localhost/api/budgets?month=2026-01"));
    expect(res.status).toBe(200);
    expect(mockBudget.findMany).toHaveBeenCalledWith({ where: { month: "2026-01" } });
  });

  it("returns 400 for invalid month format", async () => {
    const res = await GET(makeReq("http://localhost/api/budgets?month=invalid"));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/month/i);
  });

  it("returns 400 for month 00", async () => {
    const res = await GET(makeReq("http://localhost/api/budgets?month=2026-00"));
    expect(res.status).toBe(400);
  });

  it("returns 400 for month 13", async () => {
    const res = await GET(makeReq("http://localhost/api/budgets?month=2026-13"));
    expect(res.status).toBe(400);
  });

  it("returns 500 on db error", async () => {
    mockBudget.findMany.mockRejectedValue(new Error("db down"));
    const res = await GET(makeReq("http://localhost/api/budgets"));
    expect(res.status).toBe(500);
  });
});

describe("POST /api/budgets", () => {
  it("creates a budget with valid data", async () => {
    const budget = { id: "1", category: "FOOD", monthlyLimit: 300, month: "2026-05" };
    mockBudget.upsert.mockResolvedValue(budget);
    const res = await POST(makeReq("http://localhost/api/budgets", jsonBody({ category: "FOOD", monthlyLimit: 300, month: "2026-05" })));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe("1");
  });

  it("upserts without month param (defaults to current)", async () => {
    mockBudget.upsert.mockResolvedValue({ id: "2", category: "TRAVEL", monthlyLimit: 500, month: "2026-05" });
    const res = await POST(makeReq("http://localhost/api/budgets", jsonBody({ category: "TRAVEL", monthlyLimit: 500 })));
    expect(res.status).toBe(200);
    expect(mockBudget.upsert).toHaveBeenCalledTimes(1);
  });

  it("returns 400 for missing category", async () => {
    const res = await POST(makeReq("http://localhost/api/budgets", jsonBody({ monthlyLimit: 100, month: "2026-05" })));
    expect(res.status).toBe(400);
  });

  it("returns 400 for empty category string", async () => {
    const res = await POST(makeReq("http://localhost/api/budgets", jsonBody({ category: "   ", monthlyLimit: 100 })));
    expect(res.status).toBe(400);
  });

  it("returns 400 for category exceeding max length", async () => {
    const res = await POST(makeReq("http://localhost/api/budgets", jsonBody({ category: "A".repeat(101), monthlyLimit: 100 })));
    expect(res.status).toBe(400);
  });

  it("returns 400 for negative monthlyLimit", async () => {
    const res = await POST(makeReq("http://localhost/api/budgets", jsonBody({ category: "FOOD", monthlyLimit: -1 })));
    expect(res.status).toBe(400);
  });

  it("returns 400 for non-number monthlyLimit", async () => {
    const res = await POST(makeReq("http://localhost/api/budgets", jsonBody({ category: "FOOD", monthlyLimit: "abc" })));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid month format", async () => {
    const res = await POST(makeReq("http://localhost/api/budgets", jsonBody({ category: "FOOD", monthlyLimit: 100, month: "05-2026" })));
    expect(res.status).toBe(400);
  });

  it("allows zero monthlyLimit", async () => {
    mockBudget.upsert.mockResolvedValue({ id: "3", category: "FOOD", monthlyLimit: 0, month: "2026-05" });
    const res = await POST(makeReq("http://localhost/api/budgets", jsonBody({ category: "FOOD", monthlyLimit: 0 })));
    expect(res.status).toBe(200);
  });

  it("returns 500 on db error", async () => {
    mockBudget.upsert.mockRejectedValue(new Error("db down"));
    const res = await POST(makeReq("http://localhost/api/budgets", jsonBody({ category: "FOOD", monthlyLimit: 100 })));
    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/budgets", () => {
  it("deletes a budget by id", async () => {
    mockBudget.delete.mockResolvedValue({});
    const res = await DELETE(makeReq("http://localhost/api/budgets", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: "abc123" }) }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it("returns 400 for missing id", async () => {
    const res = await DELETE(makeReq("http://localhost/api/budgets", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for empty id string", async () => {
    const res = await DELETE(makeReq("http://localhost/api/budgets", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: "  " }) }));
    expect(res.status).toBe(400);
  });

  it("returns 500 on db error", async () => {
    mockBudget.delete.mockRejectedValue(new Error("not found"));
    const res = await DELETE(makeReq("http://localhost/api/budgets", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: "abc" }) }));
    expect(res.status).toBe(500);
  });
});
