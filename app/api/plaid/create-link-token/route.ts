import { NextResponse } from "next/server";
import { CountryCode, Products } from "plaid";
import { plaidClient } from "@/lib/plaid";

export async function POST() {
  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: "local-user" },
      client_name: "Mon Tracker",
      products: [Products.Transactions],
      optional_products: [Products.Liabilities],
      country_codes: [CountryCode.Us],
      language: "en",
    });
    return NextResponse.json({ link_token: response.data.link_token });
  } catch {
    return NextResponse.json({ error: "Failed to create link token" }, { status: 500 });
  }
}
