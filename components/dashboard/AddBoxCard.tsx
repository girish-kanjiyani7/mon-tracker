"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { CATEGORY_GROUPS } from "@/lib/categories";
import { formatCategoryName } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

interface AddBoxCardProps {
  month: string;
  existingCategories: string[];
}

export function AddBoxCard({ month, existingCategories }: AddBoxCardProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [limit, setLimit] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const existing = new Set(existingCategories);

  function reset() {
    setCategory("");
    setLimit("");
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!category) return;
    const monthlyLimit = limit.trim() === "" ? 0 : parseFloat(limit);
    if (isNaN(monthlyLimit) || monthlyLimit < 0) {
      setError("Limit must be a non-negative number");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch("/api/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, monthlyLimit, month }),
    });
    setSaving(false);
    if (res.ok) {
      reset();
      setOpen(false);
      router.refresh();
    } else {
      const j = await res.json();
      setError(j.error ?? "Failed to create box");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-border/60 p-4 text-muted-foreground transition-colors hover:border-border hover:text-foreground"
      >
        <Plus className="h-5 w-5" />
        <span className="text-xs font-medium">Add box</span>
      </button>

      <Sheet
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) reset();
        }}
      >
        <SheetContent>
          <SheetTitle>New box</SheetTitle>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm">
              Category
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-10 rounded-lg border border-border/60 bg-muted px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                required
              >
                <option value="">Choose a category…</option>
                {Object.entries(CATEGORY_GROUPS).map(([group, cats]) => {
                  const available = cats.filter((c) => !existing.has(c));
                  if (!available.length) return null;
                  return (
                    <optgroup key={group} label={group}>
                      {available.map((c) => (
                        <option key={c} value={c}>{formatCategoryName(c)}</option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Monthly limit (optional)
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                  className="h-10 w-full rounded-lg border border-border/60 bg-muted pl-7 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </label>
            {error && <p className="text-xs text-rose-400">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={saving || !category}
                className="h-9 flex-1 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {saving ? "Creating…" : "Create box"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-9 rounded-lg border border-border/60 px-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
