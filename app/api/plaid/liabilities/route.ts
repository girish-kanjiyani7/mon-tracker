import { NextResponse } from "next/server";
import { plaidClient } from "@/lib/plaid";
import { prisma } from "@/lib/db";

interface ItemLiabilitiesResult {
  institutionName: string;
  status: "updated" | "unsupported";
  statementsUpserted: number;
}

/**
 * Refresh statement data from Plaid Liabilities for every linked item.
 * Items whose institution (or Plaid plan) doesn't support liabilities are
 * reported as "unsupported" — the manual statementCloseDay covers them.
 */
export async function POST() {
  try {
    const items = await prisma.item.findMany({ include: { accounts: true } });
    const results: ItemLiabilitiesResult[] = [];

    for (const item of items) {
      try {
        const response = await plaidClient.liabilitiesGet({ access_token: item.accessToken });
        const creditLiabilities = response.data.liabilities.credit ?? [];
        let statementsUpserted = 0;

        for (const liability of creditLiabilities) {
          if (!liability.account_id || !liability.last_statement_issue_date) continue;
          const account = item.accounts.find((a) => a.plaidAccountId === liability.account_id);
          if (!account) continue;

          const closeDate = new Date(liability.last_statement_issue_date);
          await prisma.statement.upsert({
            where: { accountId_closeDate: { accountId: account.id, closeDate } },
            update: { statementBalance: liability.last_statement_balance ?? null },
            create: {
              accountId: account.id,
              closeDate,
              statementBalance: liability.last_statement_balance ?? null,
              source: "plaid",
            },
          });
          await prisma.account.update({
            where: { id: account.id },
            data: { lastStatementDate: closeDate },
          });
          statementsUpserted += 1;
        }

        results.push({ institutionName: item.institutionName, status: "updated", statementsUpserted });
      } catch (error: unknown) {
        console.error(`Liabilities fetch failed for item ${item.id}`, error);
        results.push({ institutionName: item.institutionName, status: "unsupported", statementsUpserted: 0 });
      }
    }

    return NextResponse.json({ success: true, data: results });
  } catch (error: unknown) {
    console.error("Liabilities refresh failed", error);
    return NextResponse.json({ success: false, error: "Failed to refresh liabilities" }, { status: 500 });
  }
}
