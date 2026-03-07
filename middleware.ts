import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { APP_MODE, defaultPostLoginPath } from "./lib/app-mode";
import {
  buildLoginRedirectUrl,
  getSessionCookieValue,
  isAuthRoute,
  isProtectedRoute,
  validateSessionWithAuthServer,
} from "./lib/middleware-session";

const PERSONAL_ROUTE_PREFIXES = ["/", "/groups", "/friends", "/create", "/settings"];

function isPersonalRoute(pathname: string): boolean {
  if (pathname === "/") return true;
  return PERSONAL_ROUTE_PREFIXES
    .filter((prefix) => prefix !== "/")
    .some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSessionCookie = Boolean(
    getSessionCookieValue((cookieName) => request.cookies.get(cookieName)?.value)
  );
  const shouldCheckSession = isAuthRoute(pathname) || isProtectedRoute(pathname);

  if (shouldCheckSession) {
    const authServerBaseUrl =
      process.env.NEXT_PUBLIC_API_URL ?? request.nextUrl.origin;

    const isSessionValid =
      hasSessionCookie &&
      (await validateSessionWithAuthServer({
        authServerBaseUrl,
        cookieHeader: request.headers.get("cookie") ?? "",
      }));

    if (isAuthRoute(pathname) && isSessionValid) {
      return NextResponse.redirect(
        new URL(defaultPostLoginPath, request.nextUrl.origin)
      );
    }

    if (isProtectedRoute(pathname) && !isSessionValid) {
      return NextResponse.redirect(buildLoginRedirectUrl(request.nextUrl));
    }
  }

  if (APP_MODE === "personal" && pathname.startsWith("/organization")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (
    APP_MODE === "organization" &&
    !isAuthRoute(pathname) &&
    isPersonalRoute(pathname)
  ) {
    return NextResponse.redirect(new URL("/organization", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|_next/data|favicon.ico|robots.txt|sitemap.xml).*)"],
};
