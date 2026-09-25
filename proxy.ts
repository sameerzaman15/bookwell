import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIES = ["better-auth.session_token", "__Secure-better-auth.session_token"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const protectedPath = pathname.startsWith("/portal") || pathname.startsWith("/admin");
  if (!protectedPath) return NextResponse.next();
  const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name));
  if (hasSession) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/portal/:path*", "/admin/:path*"],
};
