import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

/** Format a date-only string ("YYYY-MM-DD" or ISO) without timezone day-shift. */
export function formatDateOnly(dateStr: string): string {
  const [year, month, day] = dateStr.slice(0, 10).split("-").map(Number);
  return formatDate(new Date(year, month - 1, day));
}

export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function getMonthRange(date = new Date()): { from: string; to: string } {
  const y = date.getFullYear();
  const m = date.getMonth();
  const pad = (n: number) => String(n).padStart(2, "0");
  const from = `${y}-${pad(m + 1)}-01`;
  const lastDay = new Date(y, m + 1, 0).getDate();
  const to = `${y}-${pad(m + 1)}-${pad(lastDay)}`;
  return { from, to };
}

export function groupByCategory(
  transactions: Array<{ category?: string | null; personalCategory?: string | null; amount: number }>
): Array<{ name: string; value: number }> {
  const map = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.amount <= 0) continue; // skip credits/refunds
    const cat = tx.personalCategory ?? tx.category ?? "Other";
    map.set(cat, (map.get(cat) ?? 0) + tx.amount);
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({ name: formatCategoryName(name), value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value);
}

export function formatCategoryName(raw: string): string {
  return raw
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
