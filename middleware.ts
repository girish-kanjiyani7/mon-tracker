import { NextRequest, NextResponse } from "next/server";

const APP_SECRET = process.env.APP_SECRET;
const SESSION_COOKIE = "app_session";

function isAuthenticated(req: NextRequest): boolean {
  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  if (cookie === APP_SECRET) return true;

  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  return bearerToken === APP_SECRET;
}

export function middleware(req: NextRequest) {
  if (!APP_SECRET) return NextResponse.next();

  const { pathname } = req.nextUrl;

  if (pathname === "/login" || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  if (isAuthenticated(req)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
