"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/utils";

const COLORS = [
  "#818cf8", "#34d399", "#fbbf24", "#f87171", "#60a5fa",
  "#e879f9", "#2dd4bf", "#fb923c", "#a78bfa", "#86efac",
];

interface DataPoint {
  name: string;
  value: number;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border/60 bg-card px-3 py-2 shadow-xl text-xs">
      <p className="font-medium text-foreground">{payload[0].name}</p>
      <p className="text-muted-foreground">{formatCurrency(payload[0].value)}</p>
    </div>
  );
}

export function SpendingByCategory({ data }: { data: DataPoint[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);

  if (!data.length) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-6">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Spending</p>
        <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
          No transactions this month
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6">
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Spending by Category</p>

      <div className="mt-4 flex items-center gap-4">
        <div className="h-36 w-36 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={38}
                outerRadius={58}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 space-y-2 min-w-0">
          {data.slice(0, 5).map((item, index) => (
            <div key={item.name} className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ background: COLORS[index % COLORS.length] }}
                />
                <span className="truncate text-muted-foreground">{item.name}</span>
              </div>
              <span className="font-medium shrink-0">
                {total > 0 ? Math.round((item.value / total) * 100) : 0}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
