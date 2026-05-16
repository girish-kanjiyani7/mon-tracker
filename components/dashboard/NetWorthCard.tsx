import { formatCurrency } from "@/lib/utils";

interface Account {
  type: string;
  balance: number;
}

export function NetWorthCard({ accounts }: { accounts: Account[] }) {
  const assets = accounts
    .filter((a) => a.type !== "credit")
    .reduce((sum, a) => sum + a.balance, 0);
  const liabilities = accounts
    .filter((a) => a.type === "credit")
    .reduce((sum, a) => sum + a.balance, 0);
  const netWorth = assets - liabilities;

  return (
    <div className="relative overflow-hidden rounded-2xl p-6 gradient-border"
      style={{
        background: "linear-gradient(135deg, oklch(0.16 0.04 280) 0%, oklch(0.13 0.03 300) 100%)",
      }}
    >
      <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full opacity-20"
        style={{ background: "radial-gradient(circle, oklch(0.65 0.22 280), transparent)" }}
      />
      <div className="relative">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Net Worth</p>
        <p className="mt-2 text-4xl font-bold gradient-text">{formatCurrency(netWorth)}</p>

        <div className="mt-6 flex gap-6">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Assets</p>
            <p className="text-base font-semibold text-emerald-400">{formatCurrency(assets)}</p>
          </div>
          <div className="w-px bg-border" />
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Liabilities</p>
            <p className="text-base font-semibold text-rose-400">{formatCurrency(liabilities)}</p>
          </div>
        </div>

        {accounts.length === 0 && (
          <p className="mt-4 text-xs text-muted-foreground">Connect accounts to see your net worth</p>
        )}
      </div>
    </div>
  );
}
