import { NextRequest } from "next/server";

const mockItem = { upsert: jest.fn() };
const mockAccount = { upsert: jest.fn() };
const mockPlaid = {
  itemPublicTokenExchange: jest.fn(),
  accountsGet: jest.fn(),
};

jest.mock("@/lib/db", () => ({ prisma: { item: mockItem, account: mockAccount } }));
jest.mock("@/lib/plaid", () => ({ plaidClient: mockPlaid }));

import { POST } from "@/app/api/plaid/exchange-token/route";

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/plaid/exchange-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  public_token: "public-sandbox-abc123",
  institution_id: "ins_1",
  institution_name: "Chase",
};

const exchangeResult = {
  data: { access_token: "access-sandbox-xyz", item_id: "item-id-1" },
};

const accountsResult = {
  data: {
    accounts: [
      {
        account_id: "acct-1",
        name: "Checking",
        official_name: "Chase Checking",
        type: "depository",
        subtype: "checking",
        balances: { current: 1500.0 },
      },
    ],
  },
};

const upsertedItem = { id: "db-item-1", plaidItemId: "item-id-1", accessToken: "access-sandbox-xyz" };

beforeEach(() => jest.clearAllMocks());

describe("POST /api/plaid/exchange-token", () => {
  it("exchanges token and upserts item + account", async () => {
    mockPlaid.itemPublicTokenExchange.mockResolvedValue(exchangeResult);
    mockItem.upsert.mockResolvedValue(upsertedItem);
    mockAccount.upsert.mockResolvedValue({});
    mockPlaid.accountsGet.mockResolvedValue(accountsResult);

    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(mockPlaid.itemPublicTokenExchange).toHaveBeenCalledWith({ public_token: validBody.public_token });
    expect(mockItem.upsert).toHaveBeenCalledTimes(1);
    expect(mockAccount.upsert).toHaveBeenCalledTimes(1);
  });

  it("works without optional institution fields", async () => {
    mockPlaid.itemPublicTokenExchange.mockResolvedValue(exchangeResult);
    mockItem.upsert.mockResolvedValue(upsertedItem);
    mockAccount.upsert.mockResolvedValue({});
    mockPlaid.accountsGet.mockResolvedValue(accountsResult);

    const res = await POST(makeReq({ public_token: "public-sandbox-abc123" }));
    expect(res.status).toBe(200);
  });

  it("returns 400 for missing public_token", async () => {
    const res = await POST(makeReq({ institution_id: "ins_1" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid public_token format", async () => {
    const res = await POST(makeReq({ public_token: "not-a-valid-token" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for institution_id too long", async () => {
    const res = await POST(makeReq({ public_token: "public-sandbox-abc123", institution_id: "a".repeat(201) }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for institution_name too long", async () => {
    const res = await POST(makeReq({ public_token: "public-sandbox-abc123", institution_name: "a".repeat(201) }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for institution_id of wrong type", async () => {
    const res = await POST(makeReq({ public_token: "public-sandbox-abc123", institution_id: 12345 }));
    expect(res.status).toBe(400);
  });

  it("returns 500 when Plaid exchange call fails", async () => {
    mockPlaid.itemPublicTokenExchange.mockRejectedValue(new Error("Plaid error"));
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(500);
  });

  it("returns 500 when db upsert fails", async () => {
    mockPlaid.itemPublicTokenExchange.mockResolvedValue(exchangeResult);
    mockItem.upsert.mockRejectedValue(new Error("db down"));
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(500);
  });
});
