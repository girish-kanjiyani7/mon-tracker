import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";

const clientId = process.env.PLAID_CLIENT_ID;
const secret = process.env.PLAID_SECRET;
const env = (process.env.PLAID_ENV ?? "sandbox") as keyof typeof PlaidEnvironments;

if (!clientId || !secret) {
  throw new Error("PLAID_CLIENT_ID and PLAID_SECRET environment variables must be set");
}

if (!(env in PlaidEnvironments)) {
  throw new Error(`Invalid PLAID_ENV: "${env}". Must be one of: ${Object.keys(PlaidEnvironments).join(", ")}`);
}

const configuration = new Configuration({
  basePath: PlaidEnvironments[env],
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": clientId,
      "PLAID-SECRET": secret,
    },
  },
});

export const plaidClient = new PlaidApi(configuration);
