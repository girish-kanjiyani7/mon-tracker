"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/accounts", label: "Accounts" },
  { href: "/statement", label: "Statement" },
  { href: "/transactions", label: "Transactions" },
  { href: "/budgets", label: "Budgets" },
];

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (pathname === "/" || pathname === "/login") return null;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:gap-8 sm:px-6">
        <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-linear-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L13 4V10L7 13L1 10V4L7 1Z" fill="white" fillOpacity="0.9" />
            </svg>
          </div>
          <span className="hidden text-sm font-semibold tracking-tight sm:inline">Mon Tracker</span>
        </Link>

        <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
          {navLinks.map((link) => {
            const active = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative shrink-0 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}
              >
                {link.label}
                {active && (
                  <span className="absolute inset-x-2 -bottom-px h-px bg-linear-to-r from-indigo-500 to-purple-500" />
                )}
              </Link>
            );
          })}
        </nav>

        {session?.user && (
          <div className="flex shrink-0 items-center gap-3">
            {session.user.image && (
              <img
                src={session.user.image}
                alt={session.user.name ?? ""}
                width={28}
                height={28}
                className="rounded-full"
              />
            )}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
