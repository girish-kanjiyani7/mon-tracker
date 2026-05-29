import { NextResponse } from "next/server";
import { plaidClient } from "@/lib/plaid";
import { prisma } from "@/lib/db";
import { PLAID_TO_CATEGORY } from "@/lib/categories";

export async function POST() {
  try {
    const items = await prisma.item.findMany({ include: { accounts: true } });

    for (const item of items) {
      let cursor = item.accounts[0]?.cursor ?? undefined;
      let hasMore = true;

      while (hasMore) {
        const response = await plaidClient.transactionsSync({
          access_token: item.accessToken,
          cursor,
        });

        const { added, modified, removed, next_cursor, has_more } = response.data;
        hasMore = has_more;
        cursor = next_cursor;

        // Upsert added/modified transactions
        for (const tx of [...added, ...modified]) {
          const account = item.accounts.find((a) => a.plaidAccountId === tx.account_id);
          if (!account) continue;

          await prisma.transaction.upsert({
            where: { plaidTransactionId: tx.transaction_id },
            update: {
              amount: tx.amount,
              pending: tx.pending,
              merchantName: tx.merchant_name ?? null,
              name: tx.name,
              category: PLAID_TO_CATEGORY[tx.personal_finance_category?.primary ?? ""] ?? tx.personal_finance_category?.primary ?? null,
            },
            create: {
              plaidTransactionId: tx.transaction_id,
              accountId: account.id,
              amount: tx.amount,
              date: new Date(tx.date),
              merchantName: tx.merchant_name ?? null,
              name: tx.name,
              category: PLAID_TO_CATEGORY[tx.personal_finance_category?.primary ?? ""] ?? tx.personal_finance_category?.primary ?? null,
              pending: tx.pending,
            },
          });
        }

        // Remove deleted transactions
        for (const tx of removed) {
          await prisma.transaction.deleteMany({
            where: { plaidTransactionId: tx.transaction_id },
          });
        }
      }

      // Update cursor on accounts
      for (const account of item.accounts) {
        await prisma.account.update({
          where: { id: account.id },
          data: { cursor },
        });
      }

      // Refresh balances
      const balancesResponse = await plaidClient.accountsGet({ access_token: item.accessToken });
      for (const acct of balancesResponse.data.accounts) {
        await prisma.account.updateMany({
          where: { plaidAccountId: acct.account_id },
          data: { balance: acct.balances.current ?? 0 },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
