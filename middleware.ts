import { NextResponse, type NextRequest } from "next/server";

// Supabase stores the session under sb-<project-ref>-auth-token
const SUPABASE_COOKIE = "sb-yimkcfmrqzemgqunspfh-auth-token";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAuthRoute =
    pathname.startsWith("/login") || pathname.startsWith("/auth");

  const hasSession =
    request.cookies.has(SUPABASE_COOKIE) ||
    // fallback: legacy / chunked cookie names
    [...request.cookies.getAll()].some((c) =>
      c.name.startsWith("sb-") && c.name.endsWith("-auth-token")
    );

  if (!hasSession && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (hasSession && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
