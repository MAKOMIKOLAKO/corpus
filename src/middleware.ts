import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  checkApiRateLimit,
  checkAuthRateLimit,
  isAuthRateLimitPath,
} from "@/lib/rateLimit";

const PUBLIC_PAGE_EXACT = new Set([
  "/",
  "/login",
  "/signup",
  "/pricing",
  "/privacy",
  "/forgot-password",
  "/setup-username",
  "/onboarding",
  "/sitemap.xml",
  "/robots.txt",
]);

const PUBLIC_PAGE_PREFIXES = [
  "/reset-password/",
  "/verify-email/",
  "/c/",
  "/profile/",
];

/** Single-segment paths that are public profile pages (not reserved app routes). */
const RESERVED_ROOT_SEGMENTS = new Set([
  "login",
  "signup",
  "library",
  "add",
  "feed",
  "pricing",
  "privacy",
  "admin",
  "collections",
  "connections",
  "entries",
  "account",
  "setup-username",
  "onboarding",
  "forgot-password",
  "api",
  "c",
  "profile",
  "verify-email",
  "reset-password",
  "research",
  "_next",
  "favicon.ico",
]);

function isPublicProfileUsernamePath(pathname: string): boolean {
  if (pathname.includes(".") || pathname.split("/").length !== 2) return false;
  const seg = pathname.slice(1);
  if (!seg || seg.includes("/")) return false;
  return !RESERVED_ROOT_SEGMENTS.has(seg.toLowerCase());
}

function isPublicApiPath(pathname: string): boolean {
  if (pathname.startsWith("/api/auth/")) return true;
  if (pathname === "/api/stripe/webhook") return true;
  if (pathname.startsWith("/api/collections/public/")) return true;
  if (pathname.startsWith("/api/profile/")) return true;
  if (pathname === "/api/cron/smart-alerts") return true;
  if (pathname === "/api/cron/research-ingest") return true;
  if (pathname === "/api/cron/research-profiles") return true;
  if (pathname === "/api/test-cron") return true;
  return false;
}

function isPublicPagePath(pathname: string): boolean {
  if (PUBLIC_PAGE_EXACT.has(pathname)) return true;
  if (PUBLIC_PAGE_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  if (isPublicProfileUsernamePath(pathname)) return true;
  return false;
}

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = clientIp(req);

  if (req.method === "OPTIONS" && pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Skip token parsing for cron job route - it uses Bearer token auth
  if (
    pathname === "/api/cron/smart-alerts" ||
    pathname === "/api/cron/research-ingest" ||
    pathname === "/api/cron/research-profiles"
  ) {
    // Check rate limit for cron if needed
    return NextResponse.next();
  }

  let token: { userId?: string; sub?: string } | any = null;
  try {
    token = (await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
      // Explicitly derive secureCookie so the correct cookie name
      // (__Secure-next-auth.session-token vs next-auth.session-token) is used
      // even when NEXTAUTH_URL is missing or mis-configured.
      secureCookie:
        process.env.NEXTAUTH_URL?.startsWith("https://") ??
        process.env.NODE_ENV === "production",
    })) as { userId?: string; sub?: string } | any;
  } catch (error) {
    if (error instanceof URIError) {
      console.error("[middleware] Failed to parse auth token - URI malformed (clearing cookie)");
      // Clear the malformed cookie by setting it to expire
      const response = NextResponse.next();
      response.cookies.delete("next-auth.session-token");
      response.cookies.delete("__Secure-next-auth.session-token");
      return response;
    } else {
      console.error("[middleware] Failed to parse auth token:", error);
      token = null;
    }
  }

  if (pathname.startsWith("/api")) {
    if (isAuthRateLimitPath(pathname)) {
      const { success } = checkAuthRateLimit(ip);
      if (!success) {
        return NextResponse.json(
          { error: "Too many attempts. Please try again later." },
          { status: 429 }
        );
      }
    }

    if (
      pathname !== "/api/stripe/webhook" &&
      pathname !== "/api/cron/smart-alerts" &&
      pathname !== "/api/cron/research-ingest" &&
      pathname !== "/api/cron/research-profiles" &&
      pathname !== "/api/test-cron" &&
      !pathname.startsWith("/api/auth/")
    ) {
      const identifier =
        (typeof token?.userId === "string" && token.userId) ||
        (typeof token?.sub === "string" && token.sub) ||
        ip;
      const { success } = checkApiRateLimit(identifier);
      if (!success) {
        return NextResponse.json(
          { error: "Rate limit exceeded. Please slow down." },
          { status: 429 }
        );
      }
    }
  }

  if (isPublicPagePath(pathname)) {
    if ((pathname === "/login" || pathname === "/signup") && token) {
      const destination = token?.onboardingCompleted === false ? "/onboarding" : "/library";
      return NextResponse.redirect(new URL(destination, req.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api")) {
    if (isPublicApiPath(pathname)) {
      return NextResponse.next();
    }
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.url);
    return NextResponse.redirect(loginUrl);
  }

  // Check onboarding status for protected routes using JWT data.
  // Prisma cannot be imported here because middleware runs on the Edge Runtime
  // which does not support Node.js native modules. The JWT callback already
  // writes onboardingCompleted from the database on every sign-in and on
  // trigger=update, so the JWT value is authoritative enough for routing.
  if (
    token?.userId &&
    !pathname.startsWith("/api") &&
    !pathname.startsWith("/_next") &&
    !pathname.startsWith("/auth") &&
    pathname !== "/onboarding" &&
    pathname !== "/research" &&
    !pathname.startsWith("/research/")
  ) {
    if (token?.onboardingCompleted === false) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
