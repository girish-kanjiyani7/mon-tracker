export interface NetWorthAccount {
  type: string;
  balance: number;
}

export interface NetWorthSummary {
  /** depository + investment balances */
  accountAssets: number;
  /** accountAssets + manualCash (manualCash may be negative, unclamped) */
  netWorth: number;
  /** informational only: total credit-card balances, not subtracted */
  creditBalances: number;
}

const ASSET_TYPES: ReadonlySet<string> = new Set(["depository", "investment"]);

/**
 * Net worth is savings + investments (+ manual cash), not reduced by credit
 * card or loan balances: cards are used purely to log spend into categories.
 */
export function computeNetWorth(accounts: readonly NetWorthAccount[], manualCash = 0): NetWorthSummary {
  const accountAssets = accounts
    .filter((a) => ASSET_TYPES.has(a.type))
    .reduce((sum, a) => sum + a.balance, 0);
  const creditBalances = accounts
    .filter((a) => a.type === "credit")
    .reduce((sum, a) => sum + a.balance, 0);
  return { accountAssets, creditBalances, netWorth: accountAssets + manualCash };
}
