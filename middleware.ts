// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
// NOTE: We don't need heavy JWT verification here; just block when cookie missing.
// Your API routes already verify deeply.
const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "session";

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Public routes & static files
  if (
    pathname === "/signin" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    /\.(png|jpg|jpeg|gif|svg|ico|css|js|txt|map)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  // Let all /api/* through; route handlers will check auth themselves
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Protect every other page (including "/")
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    const url = new URL("/signin", req.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Match everything except the explicit public/static we handle above
export const config = {
  matcher: ["/((?!_next/|favicon|robots.txt|sitemap.xml|api/|.*\\.(?:png|jpg|jpeg|gif|svg|ico|css|js|txt|map)$).*)"],
};
