"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCategoryName } from "@/lib/utils";

interface QuickAddTransactionProps {
  boxCategories?: string[];
  onAdded?: () => void;
}

export function QuickAddTransaction({ boxCategories = [], onAdded }: QuickAddTransactionProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [personalCategory, setPersonalCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!name.trim() || isNaN(amt)) return;
    setSaving(true);
    setError("");
    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        amount: amt,
        date,
        personalCategory: personalCategory || undefined,
      }),
    });
    if (res.ok) {
      setName(""); setAmount(""); setPersonalCategory("");
      setDate(new Date().toISOString().slice(0, 10));
      setOpen(false);
      router.refresh();
      onAdded?.();
    } else {
      const j = await res.json();
      setError(j.error ?? "Failed to save");
    }
    setSaving(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 h-9 rounded-lg border border-dashed border-border/60 px-4 text-sm text-muted-foreground hover:text-foreground hover:border-border transition-colors"
      >
        <span className="text-base leading-none">+</span> Log a transaction
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-4">Log a Transaction</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <input
          type="text"
          placeholder="Description (e.g. Rent, Paycheck)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-9 w-full rounded-lg border border-border/60 bg-muted px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary sm:w-52"
          required
        />
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
          <input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-9 w-full rounded-lg border border-border/60 bg-muted pl-7 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary sm:w-32"
            step="0.01"
            required
          />
        </div>
        <p className="text-xs text-muted-foreground w-full -mb-1">Tip: use a negative amount for income (e.g. −2500 for paycheck)</p>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-9 w-full rounded-lg border border-border/60 bg-muted px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary sm:w-auto"
        />
        <select
          value={personalCategory}
          onChange={(e) => setPersonalCategory(e.target.value)}
          className="h-9 w-full rounded-lg border border-border/60 bg-muted px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary sm:w-auto"
        >
          <option value="">Leave unsorted</option>
          {boxCategories.map((c) => (
            <option key={c} value={c}>{formatCategoryName(c)}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => { setOpen(false); setError(""); }}
            className="h-9 rounded-lg border border-border/60 px-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </div>
        {error && <p className="text-xs text-rose-400 w-full">{error}</p>}
      </form>
    </div>
  );
}
