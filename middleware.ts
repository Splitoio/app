import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { APP_MODE } from "./lib/app-mode";

const PERSONAL_ROUTE_PREFIXES = ["/", "/groups", "/friends", "/create", "/settings"];

function isAuthRoute(pathname: string): boolean {
  return pathname === "/login" || pathname === "/signup";
}

function isPersonalRoute(pathname: string): boolean {
  if (pathname === "/") return true;
  return PERSONAL_ROUTE_PREFIXES
    .filter((prefix) => prefix !== "/")
    .some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

