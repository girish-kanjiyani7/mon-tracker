import { formatCurrency } from "@/lib/utils";

interface OverallSpentCardProps {
  total: number;
}

export function OverallSpentCard({ total }: OverallSpentCardProps) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Overall Spent</p>
          <p className="mt-1 text-xs text-muted-foreground">Excludes card payments &amp; transfers</p>
        </div>
        <p className="text-2xl font-bold">{formatCurrency(total)}</p>
      </div>
    </div>
  );
}
