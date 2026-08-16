import { formatCurrency } from "@/lib/utils";
import { computeNetWorth, type NetWorthAccount } from "@/lib/netWorth";

export function NetWorthCard({
  accounts,
  manualCash = 0,
}: {
  accounts: NetWorthAccount[];
  manualCash?: number;
}) {
  const { accountAssets, creditBalances, netWorth } = computeNetWorth(accounts, manualCash);
  const assets = accountAssets + manualCash;

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
            {manualCash !== 0 && (
              <p className="text-xs text-muted-foreground">incl. {formatCurrency(manualCash)} manual</p>
            )}
          </div>
          <div className="w-px bg-border" />
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Credit cards</p>
            <p className="text-base font-semibold text-rose-400">{formatCurrency(creditBalances)}</p>
            <p className="text-xs text-muted-foreground">not counted in net worth</p>
          </div>
        </div>

        {accounts.length === 0 && (
          <p className="mt-4 text-xs text-muted-foreground">Connect accounts to see your net worth</p>
        )}
      </div>
    </div>
  );
}
