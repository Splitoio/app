const AUTH_ROUTES = new Set(["/login", "/signup"]);
const PUBLIC_ROUTE_PREFIXES = ["/contract/view", "/sign"];

export const SESSION_COOKIE_NAMES = [
  "__Secure-better-auth.session_token",
  "__Host-better-auth.session_token",
  "better-auth.session_token",
  "session_token",
  "sessionToken",
] as const;

export function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.has(pathname);
}

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function isProtectedRoute(pathname: string): boolean {
  return !isAuthRoute(pathname) && !isPublicRoute(pathname);
}

export function getSessionCookieValue(
  getCookie: (name: string) => string | undefined
): string | null {
  for (const cookieName of SESSION_COOKIE_NAMES) {
    const value = getCookie(cookieName);
    if (value && value.trim().length > 0) {
      return value;
    }
  }
  return null;
}

export function buildLoginRedirectUrl(requestUrl: URL): URL {
  const loginUrl = new URL("/login", requestUrl.origin);
  const callbackUrl = `${requestUrl.pathname}${requestUrl.search}`;
  loginUrl.searchParams.set("callbackUrl", callbackUrl);
  return loginUrl;
}

export function isValidSessionPayload(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  if ("user" in payload) {
    const candidate = payload as { user?: { id?: unknown } };
    return typeof candidate.user?.id === "string";
  }

  return false;
}

export async function validateSessionWithAuthServer(params: {
  authServerBaseUrl: string;
  cookieHeader: string;
  fetchImpl?: typeof fetch;
}): Promise<boolean> {
  const { authServerBaseUrl, cookieHeader, fetchImpl = fetch } = params;

  if (!cookieHeader.trim()) {
    return false;
  }

  try {
    const response = await fetchImpl(
      `${authServerBaseUrl.replace(/\/+$/, "")}/api/auth/get-session`,
      {
        method: "GET",
        headers: {
          cookie: cookieHeader,
          accept: "application/json",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return false;
    }

    const payload = await response.json();
    return isValidSessionPayload(payload);
  } catch {
    return false;
  }
}
