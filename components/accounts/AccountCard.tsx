import { formatCurrency } from "@/lib/utils";

interface Account {
  id: string;
  name: string;
  officialName: string | null;
  type: string;
  subtype: string | null;
  balance: number;
  item: { institutionName: string };
}

const typeIcon: Record<string, string> = {
  depository: "🏦",
  credit: "💳",
  investment: "📈",
  loan: "📋",
  other: "💼",
};

export function AccountCard({ account }: { account: Account }) {
  const isCredit = account.type === "credit";
  const icon = typeIcon[account.type] ?? typeIcon.other;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-lg">
            {icon}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{account.item.institutionName}</p>
            <p className="text-sm font-semibold leading-tight">{account.name}</p>
          </div>
        </div>
        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize border ${
          isCredit
            ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
            : "border-indigo-500/30 bg-indigo-500/10 text-indigo-400"
        }`}>
          {account.subtype ?? account.type}
        </span>
      </div>

      <div className="mt-4">
        <p className={`text-2xl font-bold tabular-nums ${isCredit ? "text-rose-400" : "text-emerald-400"}`}>
          {isCredit ? `−${formatCurrency(account.balance)}` : formatCurrency(account.balance)}
        </p>
        {account.officialName && (
          <p className="mt-1 text-xs text-muted-foreground truncate">{account.officialName}</p>
        )}
      </div>
    </div>
  );
}
