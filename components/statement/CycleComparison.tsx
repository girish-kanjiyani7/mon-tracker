import { formatCurrency, formatDateOnly } from "@/lib/utils";

export interface PreviousCycle {
  window: { openDate: string; closeDate: string };
  total: number;
  totalAtSamePoint: number;
}

interface CycleComparisonProps {
  currentTotal: number;
  elapsedDays: number;
  isCurrentCycle: boolean;
  previousCycles: PreviousCycle[];
}

export function CycleComparison({ currentTotal, elapsedDays, isCurrentCycle, previousCycles }: CycleComparisonProps) {
  const cyclesWithSpend = previousCycles.filter((c) => c.total > 0);
  const maxTotal = Math.max(currentTotal, ...previousCycles.map((c) => c.total), 1);
  const averageAtSamePoint =
    cyclesWithSpend.length > 0
      ? cyclesWithSpend.reduce((sum, c) => sum + c.totalAtSamePoint, 0) / cyclesWithSpend.length
      : 0;
  const delta = currentTotal - averageAtSamePoint;

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          vs. Previous Cycles
        </p>
        {isCurrentCycle && cyclesWithSpend.length > 0 && (
          <span className={`text-xs font-medium ${delta > 0 ? "text-rose-400" : "text-emerald-400"}`}>
            {delta > 0 ? "+" : ""}
            {formatCurrency(delta)} vs. usual at day {elapsedDays}
          </span>
        )}
      </div>

      {cyclesWithSpend.length === 0 ? (
        <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
          No previous cycle data yet
        </div>
      ) : (
        <div className="space-y-2.5">
          <ComparisonRow
            label={isCurrentCycle ? "This cycle (so far)" : "This cycle"}
            value={currentTotal}
            maxValue={maxTotal}
            isCurrent
          />
          {previousCycles.map((cycle) => (
            <ComparisonRow
              key={cycle.window.closeDate}
              label={`Closed ${formatDateOnly(cycle.window.closeDate)}`}
              value={cycle.total}
              maxValue={maxTotal}
              samePointValue={isCurrentCycle ? cycle.totalAtSamePoint : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ComparisonRowProps {
  label: string;
  value: number;
  maxValue: number;
  isCurrent?: boolean;
  samePointValue?: number;
}

function ComparisonRow({ label, value, maxValue, isCurrent, samePointValue }: ComparisonRowProps) {
  const barPct = (value / maxValue) * 100;

  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className={isCurrent ? "font-medium text-foreground" : "text-muted-foreground"}>
          {label}
        </span>
        <div className="flex items-center gap-2">
          {samePointValue !== undefined && (
            <span className="text-muted-foreground">{formatCurrency(samePointValue)} at same point</span>
          )}
          <span className="font-semibold tabular-nums w-20 text-right">{formatCurrency(value)}</span>
        </div>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isCurrent ? "bg-linear-to-r from-indigo-500 to-purple-500" : "bg-muted-foreground/40"
          }`}
          style={{ width: `${barPct}%` }}
        />
      </div>
    </div>
  );
}
