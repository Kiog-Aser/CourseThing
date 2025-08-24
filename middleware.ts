import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "~/server/auth";
import { isAdminEmail } from "~/server/auth/utils/is-admin";

/**
 * Middleware: Admin Gate for Dashboard
 *
 * Logic:
 *  1. Only run auth check for paths we care about (/dashboard and its subpaths).
 *  2. If no session → redirect to /signin.
 *  3. If session exists but user email is not in ADMIN_EMAILS → redirect home.
 *  4. Otherwise allow the request.
 *
 * This is defense-in-depth. The tRPC router & server components still do their
 * own admin checks. Early rejection improves UX and avoids unnecessary work.
 *
 * Adjust ADMIN_GUARDED_PREFIXES if you later add more protected areas (e.g. /admin).
 */

const ADMIN_GUARDED_PREFIXES = ["/dashboard"];

/**
 * Decide if the path should be checked.
 * We ignore:
 *  - _next (static / build assets)
 *  - api/auth (NextAuth internal)
 *  - public files (contain a dot) except explicitly guarded
 */
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

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  // Retrieve session (NextAuth v5 compatible in middleware)
  const session = await auth();

  if (!session?.user) {
    const url = new URL("/signin", req.url);
    // Preserve original destination so we can potentially redirect back post-login
    url.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  if (!isAdminEmail(session.user.email)) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Optionally add a header to indicate middleware passed (useful for debugging)
  const res = NextResponse.next();
  res.headers.set("x-admin-middleware", "allow");
  return res;
}

/**
 * Matcher:
 *  We match /dashboard and all subpaths. If you add more guarded roots,
 *  extend this array or switch to a custom matcher function pattern.
 */
export const config = {
  matcher: ["/dashboard/:path*"],
};
