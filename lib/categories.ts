export const CATEGORY_GROUPS: Record<string, readonly string[]> = {
  "Food & Drink": ["GROCERIES", "RESTAURANTS", "COFFEE_AND_TEA", "FAST_FOOD", "BARS_AND_NIGHTLIFE", "FOOD_DELIVERY"],
  "Shopping": ["CLOTHING_AND_APPAREL", "ELECTRONICS", "ONLINE_SHOPPING", "HOME_AND_DECOR", "GAMING", "GIFTS"],
  "Transportation": ["GAS_AND_FUEL", "PARKING", "RIDESHARE", "PUBLIC_TRANSIT", "CAR_INSURANCE", "CAR_MAINTENANCE"],
  "Entertainment": ["STREAMING", "MOVIES_AND_EVENTS", "SPORTS_AND_RECREATION", "GYM_AND_FITNESS"],
  "Housing": ["RENT", "UTILITIES", "INTERNET_AND_PHONE", "HOUSEHOLD_SUPPLIES"],
  "Health": ["HEALTHCARE", "PHARMACY", "DENTAL_AND_VISION", "MENTAL_HEALTH"],
  "Financial": ["BANK_FEES", "CREDIT_CARD_PAYMENT", "INVESTMENTS", "SAVINGS_TRANSFER"],
  "Income": ["PAYCHECK", "FREELANCE_INCOME", "SIDE_HUSTLE", "OTHER_INCOME"],
  "Education": ["TUITION", "BOOKS_AND_SUPPLIES", "STUDENT_LOANS"],
  "Travel": ["HOTELS", "FLIGHTS", "VACATION"],
  "Other": ["SUBSCRIPTIONS", "PERSONAL_CARE", "GOVERNMENT_AND_NON_PROFIT", "OTHER"],
};

export const CATEGORIES: readonly string[] = Object.values(CATEGORY_GROUPS).flat();

export type Category = string;

export interface PlaidPersonalFinanceCategory {
  primary?: string | null;
  detailed?: string | null;
}

/**
 * Map a Plaid personal finance category to an app category.
 * The detailed category disambiguates LOAN_PAYMENTS: credit card bill
 * payments must not be lumped in with student loans.
 */
export function mapPlaidCategory(pfc?: PlaidPersonalFinanceCategory | null): string | null {
  if (!pfc?.primary) return null;
  if (pfc.detailed === "LOAN_PAYMENTS_CREDIT_CARD_PAYMENT") return "CREDIT_CARD_PAYMENT";
  return PLAID_TO_CATEGORY[pfc.primary] ?? pfc.primary;
}

export const PLAID_TO_CATEGORY: Record<string, string> = {
  FOOD_AND_DRINK: "RESTAURANTS",
  GENERAL_MERCHANDISE: "ONLINE_SHOPPING",
  TRANSPORTATION: "RIDESHARE",
  TRAVEL: "FLIGHTS",
  ENTERTAINMENT: "MOVIES_AND_EVENTS",
  RENT_AND_UTILITIES: "RENT",
  MEDICAL: "HEALTHCARE",
  PERSONAL_CARE: "PERSONAL_CARE",
  EDUCATION: "TUITION",
  INCOME: "PAYCHECK",
  TRANSFER_IN: "OTHER_INCOME",
  TRANSFER_OUT: "SAVINGS_TRANSFER",
  LOAN_PAYMENTS: "STUDENT_LOANS",
  BANK_FEES: "BANK_FEES",
  HOME_IMPROVEMENT: "HOME_AND_DECOR",
  GENERAL_SERVICES: "SUBSCRIPTIONS",
  GOVERNMENT_AND_NON_PROFIT: "GOVERNMENT_AND_NON_PROFIT",
  OTHER: "OTHER",
};
