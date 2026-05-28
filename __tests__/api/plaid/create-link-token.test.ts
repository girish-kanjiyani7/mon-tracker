const mockPlaid = {
  linkTokenCreate: jest.fn(),
};

jest.mock("@/lib/db", () => ({ prisma: {} }));
jest.mock("@/lib/plaid", () => ({ plaidClient: mockPlaid }));

import { POST } from "@/app/api/plaid/create-link-token/route";

beforeEach(() => jest.clearAllMocks());

describe("POST /api/plaid/create-link-token", () => {
  it("returns link_token on success", async () => {
    mockPlaid.linkTokenCreate.mockResolvedValue({ data: { link_token: "link-sandbox-abc123" } });
    const res = await POST();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.link_token).toBe("link-sandbox-abc123");
  });

  it("calls linkTokenCreate with correct params", async () => {
    mockPlaid.linkTokenCreate.mockResolvedValue({ data: { link_token: "link-sandbox-xyz" } });
    await POST();
    expect(mockPlaid.linkTokenCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        client_name: "Mon Tracker",
        user: { client_user_id: "local-user" },
      })
    );
  });

  it("returns 500 when Plaid call fails", async () => {
    mockPlaid.linkTokenCreate.mockRejectedValue(new Error("Plaid error"));
    const res = await POST();
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });
});
