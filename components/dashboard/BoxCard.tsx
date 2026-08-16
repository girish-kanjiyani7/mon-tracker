import { formatCurrency, formatCategoryName } from "@/lib/utils";
import type { Box } from "@/lib/boxes";

interface BoxCardProps {
  box: Box;
  onSelect: () => void;
}

export function BoxCard({ box, onSelect }: BoxCardProps) {
  const hasLimit = box.monthlyLimit > 0;
  const pct = hasLimit ? box.spent / box.monthlyLimit : 0;
  const over = hasLimit && pct > 1;
  const atRisk = hasLimit && !over && pct >= box.alertAt;

  const barColor = over
    ? "oklch(0.65 0.22 25)"
    : atRisk
      ? "oklch(0.75 0.18 75)"
      : "linear-gradient(90deg, oklch(0.65 0.22 280), oklch(0.65 0.22 320))";

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-card p-4 text-left transition-colors hover:border-border active:bg-white/2"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium truncate">{formatCategoryName(box.category)}</span>
        {box.txCount > 0 && (
          <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground tabular-nums">
            {box.txCount}
          </span>
        )}
      </div>

      <p className={`text-lg font-semibold tabular-nums ${over ? "text-rose-400" : ""}`}>
        {formatCurrency(box.spent)}
      </p>

      {hasLimit ? (
        <>
          <p className="text-xs text-muted-foreground -mt-1">of {formatCurrency(box.monthlyLimit)}</p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(Math.max(pct, 0) * 100, 100)}%`, background: barColor }}
            />
          </div>
        </>
      ) : (
        <p className="text-xs text-muted-foreground -mt-1">No budget set</p>
      )}
    </button>
  );
}
