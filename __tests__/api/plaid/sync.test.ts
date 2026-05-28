const mockItem = { findMany: jest.fn() };
const mockTransaction = { upsert: jest.fn(), deleteMany: jest.fn() };
const mockAccount = { update: jest.fn(), updateMany: jest.fn() };

const mockPlaid = {
  transactionsSync: jest.fn(),
  accountsGet: jest.fn(),
};

jest.mock("@/lib/db", () => ({
  prisma: { item: mockItem, transaction: mockTransaction, account: mockAccount },
}));
jest.mock("@/lib/plaid", () => ({ plaidClient: mockPlaid }));

import { POST } from "@/app/api/plaid/sync/route";

const dbAccount = { id: "db-acct-1", plaidAccountId: "plaid-acct-1", cursor: null };
const dbItem = { id: "db-item-1", accessToken: "access-sandbox-xyz", accounts: [dbAccount] };

const addedTx = {
  transaction_id: "tx-1",
  account_id: "plaid-acct-1",
  amount: 25.0,
  date: "2026-05-15",
  merchant_name: "Starbucks",
  name: "Coffee Shop",
  personal_finance_category: { primary: "FOOD_AND_DRINK" },
  pending: false,
};

const balancesResult = {
  data: { accounts: [{ account_id: "plaid-acct-1", balances: { current: 1200.0 } }] },
};

beforeEach(() => jest.clearAllMocks());

describe("POST /api/plaid/sync", () => {
  it("syncs added transactions and updates cursor + balances", async () => {
    mockItem.findMany.mockResolvedValue([dbItem]);
    mockPlaid.transactionsSync.mockResolvedValue({
      data: { added: [addedTx], modified: [], removed: [], next_cursor: "cursor-abc", has_more: false },
    });
    mockTransaction.upsert.mockResolvedValue({});
    mockAccount.update.mockResolvedValue({});
    mockPlaid.accountsGet.mockResolvedValue(balancesResult);
    mockAccount.updateMany.mockResolvedValue({});

    const res = await POST();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(mockPlaid.transactionsSync).toHaveBeenCalledWith({
      access_token: "access-sandbox-xyz",
      cursor: undefined,
    });
    expect(mockTransaction.upsert).toHaveBeenCalledTimes(1);
  });

  it("handles modified transactions (upserts them)", async () => {
    mockItem.findMany.mockResolvedValue([dbItem]);
    mockPlaid.transactionsSync.mockResolvedValue({
      data: { added: [], modified: [addedTx], removed: [], next_cursor: "cursor-abc", has_more: false },
    });
    mockTransaction.upsert.mockResolvedValue({});
    mockAccount.update.mockResolvedValue({});
    mockPlaid.accountsGet.mockResolvedValue(balancesResult);
    mockAccount.updateMany.mockResolvedValue({});

    const res = await POST();
    expect(res.status).toBe(200);
    expect(mockTransaction.upsert).toHaveBeenCalledTimes(1);
  });

  it("handles removed transactions (calls deleteMany)", async () => {
    mockItem.findMany.mockResolvedValue([dbItem]);
    mockPlaid.transactionsSync.mockResolvedValue({
      data: {
        added: [],
        modified: [],
        removed: [{ transaction_id: "tx-old" }],
        next_cursor: "cursor-abc",
        has_more: false,
      },
    });
    mockTransaction.deleteMany.mockResolvedValue({});
    mockAccount.update.mockResolvedValue({});
    mockPlaid.accountsGet.mockResolvedValue(balancesResult);
    mockAccount.updateMany.mockResolvedValue({});

    const res = await POST();
    expect(res.status).toBe(200);
    expect(mockTransaction.deleteMany).toHaveBeenCalledWith({ where: { plaidTransactionId: "tx-old" } });
  });

  it("paginates when has_more is true", async () => {
    mockItem.findMany.mockResolvedValue([dbItem]);
    mockPlaid.transactionsSync
      .mockResolvedValueOnce({
        data: { added: [addedTx], modified: [], removed: [], next_cursor: "cursor-1", has_more: true },
      })
      .mockResolvedValueOnce({
        data: { added: [], modified: [], removed: [], next_cursor: "cursor-2", has_more: false },
      });
    mockTransaction.upsert.mockResolvedValue({});
    mockAccount.update.mockResolvedValue({});
    mockPlaid.accountsGet.mockResolvedValue(balancesResult);
    mockAccount.updateMany.mockResolvedValue({});

    const res = await POST();
    expect(res.status).toBe(200);
    expect(mockPlaid.transactionsSync).toHaveBeenCalledTimes(2);
  });

  it("skips transaction if account not found in item", async () => {
    const txWithUnknownAccount = { ...addedTx, account_id: "unknown-acct" };
    mockItem.findMany.mockResolvedValue([dbItem]);
    mockPlaid.transactionsSync.mockResolvedValue({
      data: { added: [txWithUnknownAccount], modified: [], removed: [], next_cursor: "cursor-abc", has_more: false },
    });
    mockAccount.update.mockResolvedValue({});
    mockPlaid.accountsGet.mockResolvedValue(balancesResult);
    mockAccount.updateMany.mockResolvedValue({});

    const res = await POST();
    expect(res.status).toBe(200);
    expect(mockTransaction.upsert).not.toHaveBeenCalled();
  });

  it("returns success with no items to sync", async () => {
    mockItem.findMany.mockResolvedValue([]);
    const res = await POST();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(mockPlaid.transactionsSync).not.toHaveBeenCalled();
  });

  it("returns 500 on Plaid sync error", async () => {
    mockItem.findMany.mockResolvedValue([dbItem]);
    mockPlaid.transactionsSync.mockRejectedValue(new Error("Plaid down"));
    const res = await POST();
    expect(res.status).toBe(500);
  });

  it("returns 500 on db error fetching items", async () => {
    mockItem.findMany.mockRejectedValue(new Error("db down"));
    const res = await POST();
    expect(res.status).toBe(500);
  });
});
