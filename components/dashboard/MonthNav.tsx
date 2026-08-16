"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatMonthLabel, getCurrentMonth, nextMonth, prevMonth } from "@/lib/utils";

interface MonthNavProps {
  month: string;
}

export function MonthNav({ month }: MonthNavProps) {
  const router = useRouter();
  const isCurrentMonth = month === getCurrentMonth();

  function go(target: string) {
    router.push(`/dashboard?month=${target}`);
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-card px-1 py-1">
      <button
        type="button"
        onClick={() => go(prevMonth(month))}
        aria-label="Previous month"
        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="min-w-28 px-1 text-center text-sm font-medium">{formatMonthLabel(month)}</span>
      <button
        type="button"
        onClick={() => go(nextMonth(month))}
        disabled={isCurrentMonth}
        aria-label="Next month"
        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
