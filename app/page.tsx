import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth();
  if (session) redirect("/dashboard");

  async function googleSignIn() {
    "use server";
    await signIn("google", { redirectTo: "/dashboard" });
  }

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8 text-center">

        {/* Logo + name */}
        <div className="space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500 to-purple-600 shadow-xl shadow-indigo-500/30">
            <svg width="22" height="22" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L13 4V10L7 13L1 10V4L7 1Z" fill="white" fillOpacity="0.9" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Mon Tracker</h1>
            <p className="mt-1 text-sm text-muted-foreground">Personal finance, privately tracked.</p>
          </div>
        </div>

        {/* Sign-in card */}
        <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-lg">
          <div className="mb-5 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span>Login required to continue</span>
          </div>

          <form action={googleSignIn}>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-3 h-10 rounded-lg border border-border/60 bg-background text-sm font-medium hover:bg-white/5 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
          </form>
        </div>

        {/* Locked feature preview */}
        <div className="grid grid-cols-3 gap-2 opacity-30 select-none pointer-events-none" aria-hidden>
          {["Dashboard", "Accounts", "Budgets"].map((label) => (
            <div key={label} className="rounded-xl border border-border/60 bg-card px-3 py-3 text-xs font-medium text-muted-foreground">
              <div className="mx-auto mb-1.5 h-6 w-6 rounded-md bg-muted" />
              {label}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
