import { formatCurrency, formatDateOnly } from "@/lib/utils";

export interface CycleSummaryData {
  window: { openDate: string; closeDate: string };
  daysRemaining: number;
  elapsedDays: number;
  totalDays: number;
  spend: { total: number; pendingTotal: number };
  projectedTotal: number;
  statementBalance: number | null;
  isCurrentCycle: boolean;
}

export function CycleSummary({ data }: { data: CycleSummaryData }) {
  const progressPct = data.totalDays > 0 ? (data.elapsedDays / data.totalDays) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border/60 bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Cycle Spend</p>
          <p className="mt-1 text-xl font-bold tabular-nums">{formatCurrency(data.spend.total)}</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Pending</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-amber-400">
            {formatCurrency(data.spend.pendingTotal)}
          </p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">
            {data.isCurrentCycle ? "Days Left" : "Cycle Length"}
          </p>
          <p className="mt-1 text-xl font-bold tabular-nums">
            {data.isCurrentCycle ? data.daysRemaining : `${data.totalDays}d`}
          </p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">
            {data.isCurrentCycle ? "Projected Total" : "Statement Balance"}
          </p>
          <p className="mt-1 text-xl font-bold tabular-nums gradient-text">
            {data.isCurrentCycle
              ? formatCurrency(data.projectedTotal)
              : data.statementBalance !== null
                ? formatCurrency(data.statementBalance)
                : "—"}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-card px-4 py-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatDateOnly(data.window.openDate)}</span>
          <span>
            {data.isCurrentCycle
              ? `Day ${data.elapsedDays} of ${data.totalDays}`
              : "Closed"}
          </span>
          <span>{formatDateOnly(data.window.closeDate)}</span>
        </div>
        <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-linear-to-r from-indigo-500 to-purple-500 transition-all duration-500"
            style={{ width: `${Math.min(progressPct, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
