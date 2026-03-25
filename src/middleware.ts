import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = new Set(["/", "/login", "/signup", "/privacy", "/pricing"]);

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token as any;

    // Redirect logged-in users away from /login or /signup
    if ((pathname === "/login" || pathname === "/signup") && token) {
      return NextResponse.redirect(new URL("/library", req.url));
    }

    // Redirect username-less authenticated users to /setup-username
    // (skip if already on setup-username or on public/api paths)
    if (
      token &&
      !token.username &&
      pathname !== "/setup-username" &&
      !pathname.startsWith("/api/") &&
      !pathname.startsWith("/_next/") &&
      !PUBLIC_PATHS.has(pathname)
    ) {
      return NextResponse.redirect(new URL("/setup-username", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const { pathname } = req.nextUrl;
        if (PUBLIC_PATHS.has(pathname)) return true;
        return !!token;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: ["/((?!api/auth|api/fetch-youtube|api/fetch-url|api/fetch-metadata-ai|api/collections|api/entries|api/stripe|api/topics|api/keywords|api/users|api/connections|api/user|api/profile|_next/static|_next/image|favicon.ico).*)"],
};
