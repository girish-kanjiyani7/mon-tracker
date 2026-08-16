import { formatCategoryName } from "@/lib/utils";
import { PAYMENT_CATEGORIES } from "@/lib/categories";

export interface CycleWindow {
  openDate: string; // "YYYY-MM-DD", first day of the cycle (inclusive)
  closeDate: string; // "YYYY-MM-DD", statement close date (inclusive)
}

export interface CycleSource {
  /** Day of month the statement closes (1-31), clamped in shorter months. */
  closeDay?: number | null;
  /** Actual close dates reported by Plaid; take precedence over projections. */
  knownCloseDates?: ReadonlyArray<Date | string>;
  /** 0 = current cycle, 1 = previous, ... */
  offset?: number;
  /** Date strings are used as-is; Date objects use the local calendar date. */
  today?: Date | string;
}

export interface SpendTransaction {
  amount: number;
  category?: string | null;
  personalCategory?: string | null;
  pending?: boolean;
}

export interface StatementSpendSummary {
  total: number;
  pendingTotal: number;
  categories: Array<{ name: string; value: number }>;
}

const MIN_CLOSE_DAY = 1;
const MAX_CLOSE_DAY = 31;
const MS_PER_DAY = 86_400_000;

const pad = (n: number): string => String(n).padStart(2, "0");

export function utcDateString(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function localDateString(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

interface DateParts {
  year: number;
  month: number; // 1-12
  day: number;
}

function parseDateParts(dateStr: string): DateParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) {
    throw new Error(`Invalid date string: "${dateStr}" (expected YYYY-MM-DD)`);
  }
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function addDays(dateStr: string, days: number): string {
  const { year, month, day } = parseDateParts(dateStr);
  return utcDateString(new Date(Date.UTC(year, month - 1, day + days)));
}

/** Whole days from `fromStr` to `toStr` (positive when `toStr` is later). */
function daysBetween(fromStr: string, toStr: string): number {
  const from = parseDateParts(fromStr);
  const to = parseDateParts(toStr);
  const fromMs = Date.UTC(from.year, from.month - 1, from.day);
  const toMs = Date.UTC(to.year, to.month - 1, to.day);
  return Math.round((toMs - fromMs) / MS_PER_DAY);
}

function closeDateForMonth(year: number, month: number, closeDay: number): string {
  const day = Math.min(closeDay, daysInMonth(year, month));
  return `${year}-${pad(month)}-${pad(day)}`;
}

function nextMonth(year: number, month: number): [number, number] {
  return month === 12 ? [year + 1, 1] : [year, month + 1];
}

function previousMonth(year: number, month: number): [number, number] {
  return month === 1 ? [year - 1, 12] : [year, month - 1];
}

function normalizeToday(today?: Date | string): string {
  if (today === undefined) return localDateString(new Date());
  return typeof today === "string" ? today : localDateString(today);
}

function normalizeCloseDate(date: Date | string): string {
  return typeof date === "string" ? date : utcDateString(date);
}

function calendarMonthWindow(todayStr: string, offset: number): CycleWindow {
  const today = parseDateParts(todayStr);
  const monthIndex = today.year * 12 + (today.month - 1) - offset;
  const year = Math.floor(monthIndex / 12);
  const month = (monthIndex % 12) + 1;
  return {
    openDate: `${year}-${pad(month)}-01`,
    closeDate: `${year}-${pad(month)}-${pad(daysInMonth(year, month))}`,
  };
}

/**
 * Resolve the [open, close] window for a statement cycle.
 *
 * Known close dates (from Plaid statements) anchor the cycles they cover;
 * cycles beyond them are projected from `closeDay` (or, if absent, the day
 * of the latest known close). With no cycle information at all, falls back
 * to the calendar month.
 */
export function resolveCycleWindow(source: CycleSource): CycleWindow {
  const offset = source.offset ?? 0;
  if (!Number.isInteger(offset) || offset < 0) {
    throw new Error(`Invalid cycle offset: ${offset} (expected integer >= 0)`);
  }
  if (source.closeDay != null && (!Number.isInteger(source.closeDay) || source.closeDay < MIN_CLOSE_DAY || source.closeDay > MAX_CLOSE_DAY)) {
    throw new Error(`Invalid statement close day: ${source.closeDay} (expected ${MIN_CLOSE_DAY}-${MAX_CLOSE_DAY})`);
  }

  const today = normalizeToday(source.today);
  const known = [...new Set((source.knownCloseDates ?? []).map(normalizeCloseDate))].sort();
  const lastKnown = known.length > 0 ? parseDateParts(known[known.length - 1]) : null;
  const closeDay = source.closeDay ?? lastKnown?.day ?? null;

  if (closeDay === null) {
    return calendarMonthWindow(today, offset);
  }

  // Extend the known closes forward with projections until one covers today.
  const closes = [...known];
  while (closes.length === 0 || closes[closes.length - 1] < today) {
    if (closes.length === 0) {
      const todayParts = parseDateParts(today);
      const candidate = closeDateForMonth(todayParts.year, todayParts.month, closeDay);
      closes.push(candidate >= today ? candidate : closeDateForMonth(...nextMonth(todayParts.year, todayParts.month), closeDay));
    } else {
      const last = parseDateParts(closes[closes.length - 1]);
      closes.push(closeDateForMonth(...nextMonth(last.year, last.month), closeDay));
    }
  }

  // The current cycle closes at the earliest close date on or after today.
  let currentIndex = closes.findIndex((close) => close >= today);

  // Extend backward with projections until the requested cycle has an open boundary.
  while (currentIndex - offset - 1 < 0) {
    const first = parseDateParts(closes[0]);
    closes.unshift(closeDateForMonth(...previousMonth(first.year, first.month), closeDay));
    currentIndex += 1;
  }

  return {
    openDate: addDays(closes[currentIndex - offset - 1], 1),
    closeDate: closes[currentIndex - offset],
  };
}

export function getDaysRemaining(window: CycleWindow, today: Date | string): number {
  return Math.max(0, daysBetween(normalizeToday(today), window.closeDate));
}

export function getElapsedDays(window: CycleWindow, today: Date | string): number {
  const totalDays = daysBetween(window.openDate, window.closeDate) + 1;
  const elapsed = daysBetween(window.openDate, normalizeToday(today)) + 1;
  return Math.min(Math.max(elapsed, 1), totalDays);
}

const roundToCents = (value: number): number => Math.round(value * 100) / 100;

/** Linear projection of end-of-cycle spend at the current daily pace. */
export function projectCycleSpend(spendSoFar: number, window: CycleWindow, today: Date | string): number {
  const totalDays = daysBetween(window.openDate, window.closeDate) + 1;
  const elapsedDays = getElapsedDays(window, today);
  if (elapsedDays >= totalDays) return roundToCents(spendSoFar);
  return roundToCents((spendSoFar / elapsedDays) * totalDays);
}

/** A negative amount in a payment/transfer category is a bill payment, not a refund. */
export function isCardPayment(transaction: SpendTransaction): boolean {
  if (transaction.amount >= 0) return false;
  const category = transaction.personalCategory ?? transaction.category ?? "";
  return PAYMENT_CATEGORIES.has(category);
}

/**
 * Spend summary for a statement window: card payments are excluded,
 * refunds (other negative amounts) net against their category and the total.
 */
export function summarizeStatementSpend(transactions: ReadonlyArray<SpendTransaction>): StatementSpendSummary {
  const byCategory = new Map<string, number>();
  let total = 0;
  let pendingTotal = 0;

  for (const transaction of transactions) {
    if (isCardPayment(transaction)) continue;
    total += transaction.amount;
    if (transaction.pending && transaction.amount > 0) {
      pendingTotal += transaction.amount;
    }
    const category = transaction.personalCategory ?? transaction.category ?? "Other";
    byCategory.set(category, (byCategory.get(category) ?? 0) + transaction.amount);
  }

  const categories = Array.from(byCategory.entries())
    .map(([name, value]) => ({ name: formatCategoryName(name), value: roundToCents(value) }))
    .filter(({ value }) => value !== 0)
    .sort((a, b) => b.value - a.value);

  return { total: roundToCents(total), pendingTotal: roundToCents(pendingTotal), categories };
}

/** Keep transactions dated within the window (boundaries inclusive). */
export function filterTransactionsInWindow<T extends { date: Date | string }>(
  transactions: ReadonlyArray<T>,
  window: CycleWindow
): T[] {
  return transactions.filter((transaction) => {
    const dateStr = typeof transaction.date === "string"
      ? transaction.date.slice(0, 10)
      : utcDateString(transaction.date);
    return dateStr >= window.openDate && dateStr <= window.closeDate;
  });
}
