import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware: Admin Gate (lightweight)
 *
 * NOTE: We purposely avoid importing auth()/Prisma here because middleware runs on the Edge runtime.
 * We only check for presence of a NextAuth session cookie. Full session + admin validation still
 * happens in server components and tRPC procedures using auth().
 *
 * If cookie absent => redirect to /signin (with callbackUrl).
 * If present => allow and let downstream do full checks.
 */

const ADMIN_GUARDED_PREFIXES = ["/dashboard"];

function isProtectedPath(pathname: string): boolean {
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  ) {
    return false;
  }
  return ADMIN_GUARDED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!isProtectedPath(pathname)) return NextResponse.next();

  const hasSession =
    req.cookies.has("authjs.session-token") ||
    req.cookies.has("__Secure-authjs.session-token");

  if (!hasSession) {
    const url = new URL("/signin", req.url);
    url.searchParams.set(
      "callbackUrl",
      req.nextUrl.pathname + req.nextUrl.search,
    );
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
