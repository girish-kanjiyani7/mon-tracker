import { NextRequest, NextResponse } from "next/server";
import { plaidClient } from "@/lib/plaid";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { public_token, institution_id, institution_name } = await req.json();

    if (!public_token || typeof public_token !== "string") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const exchangeResponse = await plaidClient.itemPublicTokenExchange({ public_token });
    const { access_token, item_id } = exchangeResponse.data;

    const item = await prisma.item.upsert({
      where: { plaidItemId: item_id },
      update: { accessToken: access_token },
      create: {
        plaidItemId: item_id,
        accessToken: access_token,
        institutionId: institution_id ?? "",
        institutionName: institution_name ?? "Unknown",
      },
    });

    // Pull initial accounts
    const accountsResponse = await plaidClient.accountsGet({ access_token });
    for (const acct of accountsResponse.data.accounts) {
      await prisma.account.upsert({
        where: { plaidAccountId: acct.account_id },
        update: {
          balance: acct.balances.current ?? 0,
        },
        create: {
          plaidAccountId: acct.account_id,
          itemId: item.id,
          name: acct.name,
          officialName: acct.official_name ?? null,
          type: acct.type,
          subtype: acct.subtype ?? null,
          balance: acct.balances.current ?? 0,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to exchange token" }, { status: 500 });
  }
}
