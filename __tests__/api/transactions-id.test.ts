import { NextRequest } from "next/server";

const mockTransaction = {
  findUnique: jest.fn(),
  delete: jest.fn(),
  update: jest.fn(),
};

jest.mock("@/lib/db", () => ({
  prisma: { transaction: mockTransaction },
}));

import { DELETE } from "@/app/api/transactions/[id]/route";

function makeReq(): NextRequest {
  return new NextRequest("http://localhost/api/transactions/tx1", { method: "DELETE" });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => jest.clearAllMocks());

describe("DELETE /api/transactions/[id]", () => {
  it("deletes a manual transaction", async () => {
    mockTransaction.findUnique.mockResolvedValue({ id: "tx1", manual: true });
    mockTransaction.delete.mockResolvedValue({ id: "tx1" });

    const res = await DELETE(makeReq(), makeParams("tx1"));

    expect(res.status).toBe(200);
    expect(mockTransaction.delete).toHaveBeenCalledWith({ where: { id: "tx1" } });
  });

  it("refuses to delete a Plaid-synced transaction", async () => {
    mockTransaction.findUnique.mockResolvedValue({ id: "tx1", manual: false });

    const res = await DELETE(makeReq(), makeParams("tx1"));
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toMatch(/manually added/i);
    expect(mockTransaction.delete).not.toHaveBeenCalled();
  });

  it("returns 404 when the transaction doesn't exist", async () => {
    mockTransaction.findUnique.mockResolvedValue(null);

    const res = await DELETE(makeReq(), makeParams("missing"));

    expect(res.status).toBe(404);
    expect(mockTransaction.delete).not.toHaveBeenCalled();
  });

  it("returns 400 for an empty id", async () => {
    const res = await DELETE(makeReq(), makeParams("   "));
    expect(res.status).toBe(400);
    expect(mockTransaction.findUnique).not.toHaveBeenCalled();
  });

  it("returns 500 when the database call throws", async () => {
    mockTransaction.findUnique.mockRejectedValue(new Error("db down"));
    const res = await DELETE(makeReq(), makeParams("tx1"));
    expect(res.status).toBe(500);
  });
});
