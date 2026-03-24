import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Redirect logged-in users away from /login to home
    if (
      (req.nextUrl.pathname === "/login" || req.nextUrl.pathname === "/signup") &&
      req.nextauth.token
    ) {
      return NextResponse.redirect(new URL("/library", req.url));
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        // /login, /signup, and /privacy are always accessible
        if (
          req.nextUrl.pathname === "/" ||
          req.nextUrl.pathname === "/login" ||
          req.nextUrl.pathname === "/signup" ||
          req.nextUrl.pathname === "/privacy" ||
          req.nextUrl.pathname === "/pricing"
        )
          return true;
        // Everything else requires a session token
        return !!token;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: ["/((?!api/auth|api/fetch-youtube|api/fetch-url|api/fetch-metadata-ai|api/collections|api/entries|api/stripe|api/topics|api/keywords|_next/static|_next/image|favicon.ico).*)"],
};
