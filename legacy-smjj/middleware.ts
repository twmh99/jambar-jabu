import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME || "padsi_session";
const PUBLIC_PATHS = new Set(["/", "/login", "/api/login", "/api/logout"]);

function isPublic(pathname: string) {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/favicon")) return true;
  if (pathname.startsWith("/logo")) return true;
  if (pathname.startsWith("/api/public")) return true;
  return false;
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const session = req.cookies.get(SESSION_COOKIE)?.value;

  if (!session && !isPublic(pathname)) {
    const loginUrl = new URL("/login", req.url);
    if (pathname !== "/login") {
      loginUrl.searchParams.set("next", pathname + search);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
