import { formatCurrency } from "@/lib/utils";

const COLORS = [
  "#818cf8", "#34d399", "#fbbf24", "#f87171", "#60a5fa",
  "#e879f9", "#2dd4bf", "#fb923c", "#a78bfa", "#86efac",
];

interface DataPoint {
  name: string;
  value: number;
}

export function SpendingByCategory({ data }: { data: DataPoint[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const max = data[0]?.value ?? 1;

  if (!data.length) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-6">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Spending</p>
        <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
          No transactions this period
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Spending by Category</p>
        <p className="text-xs text-muted-foreground">{formatCurrency(total)}</p>
      </div>
      <div className="space-y-2.5">
        {data.map((item, index) => {
          const pct = total > 0 ? (item.value / total) * 100 : 0;
          const barPct = (item.value / max) * 100;
          const color = COLORS[index % COLORS.length];
          return (
            <div key={item.name}>
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ background: color }} />
                  <span className="truncate text-foreground font-medium">{item.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-muted-foreground">{Math.round(pct)}%</span>
                  <span className="font-semibold tabular-nums w-20 text-right">{formatCurrency(item.value)}</span>
                </div>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${barPct}%`, background: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
