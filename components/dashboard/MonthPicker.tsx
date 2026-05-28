"use client";

import { useRouter } from "next/navigation";

export function MonthPicker({ value }: { value: string }) {
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const params = new URLSearchParams();
    if (e.target.value) params.set("month", e.target.value);
    router.push(`/dashboard?${params}`);
  }

  return (
    <input
      type="month"
      value={value}
      onChange={handleChange}
      className="h-9 rounded-lg border border-border/60 bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
    />
  );
}
