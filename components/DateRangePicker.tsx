"use client";

import { useRouter, usePathname } from "next/navigation";

interface Props {
  from: string;
  to: string;
}

export function DateRangePicker({ from, to }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  function update(key: "from" | "to", value: string) {
    const params = new URLSearchParams(window.location.search);
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params}`);
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        value={from}
        onChange={(e) => update("from", e.target.value)}
        className="h-9 rounded-lg border border-border/60 bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <span className="text-xs text-muted-foreground">to</span>
      <input
        type="date"
        value={to}
        onChange={(e) => update("to", e.target.value)}
        className="h-9 rounded-lg border border-border/60 bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </div>
  );
}
