import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = new Set(["/", "/login", "/signup", "/privacy", "/pricing", "/forgot-password"]);
const PUBLIC_PREFIXES = ["/reset-password/", "/verify-email/", "/c/"];

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Use getToken with our explicit cookie name so it works in both dev and
  // production (withAuth uses __Secure- prefix in prod which mismatches our
  // custom cookie name 'next-auth.session-token').
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: "next-auth.session-token",
  }) as any;

  // Public paths: pass through, but bounce logged-in users away from auth pages
  if (PUBLIC_PATHS.has(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    if ((pathname === "/login" || pathname === "/signup") && token) {
      return NextResponse.redirect(new URL("/library", req.url));
    }
    return NextResponse.next();
  }

  // Protected path: require a valid token
  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // All authenticated users can access protected routes
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth|api/fetch-youtube|api/fetch-url|api/fetch-metadata-ai|api/ai|api/collections|api/entries|api/stripe|api/topics|api/keywords|api/users|api/connections|api/user|api/profile|_next/static|_next/image|favicon.ico).*)"],
};
