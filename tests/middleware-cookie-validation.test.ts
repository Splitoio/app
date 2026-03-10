import assert from "node:assert/strict";
import test from "node:test";
import {
  buildLoginRedirectUrl,
  getSessionCookieValue,
  isAuthRoute,
  isProtectedRoute,
  isPublicRoute,
  isValidSessionPayload,
  SESSION_COOKIE_NAMES,
  validateSessionWithAuthServer,
} from "../lib/middleware-session.ts";

test("session cookie validator accepts better-auth cookie names", () => {
  const cookies = new Map<string, string>([
    ["some-other-cookie", "abc"],
    [SESSION_COOKIE_NAMES[0], "valid-session"],
  ]);

  const value = getSessionCookieValue((name) => cookies.get(name));
  assert.equal(value, "valid-session");
});

test("session cookie validator returns null when no known cookie exists", () => {
  const cookies = new Map<string, string>([["unknown", "value"]]);
  const value = getSessionCookieValue((name) => cookies.get(name));
  assert.equal(value, null);
});

test("route guards classify auth, public and protected routes", () => {
  assert.equal(isAuthRoute("/login"), true);
  assert.equal(isAuthRoute("/signup"), true);
  assert.equal(isPublicRoute("/contract/view"), true);
  assert.equal(isPublicRoute("/contract/view/anything"), true);
  assert.equal(isProtectedRoute("/"), true);
  assert.equal(isProtectedRoute("/groups/123"), true);
  assert.equal(isProtectedRoute("/login"), false);
  assert.equal(isProtectedRoute("/contract/view"), false);
});

test("login redirect preserves callback path and query", () => {
  const requestUrl = new URL("https://app.example.com/groups/123?tab=activity");
  const loginRedirect = buildLoginRedirectUrl(requestUrl);
  assert.equal(loginRedirect.pathname, "/login");
  assert.equal(
    loginRedirect.searchParams.get("callbackUrl"),
    "/groups/123?tab=activity"
  );
});

test("session payload validator accepts payloads with user id", () => {
  assert.equal(isValidSessionPayload({ user: { id: "user_1" } }), true);
  assert.equal(isValidSessionPayload({ user: {} }), false);
  assert.equal(isValidSessionPayload(null), false);
});

test("auth server validation fails for missing cookie header", async () => {
  const isValid = await validateSessionWithAuthServer({
    authServerBaseUrl: "https://api.example.com",
    cookieHeader: "",
    fetchImpl: (async () => {
      throw new Error("fetch should not be called");
    }) as typeof fetch,
  });
  assert.equal(isValid, false);
});

test("auth server validation succeeds when get-session returns valid payload", async () => {
  const isValid = await validateSessionWithAuthServer({
    authServerBaseUrl: "https://api.example.com",
    cookieHeader: "better-auth.session_token=abc",
    fetchImpl: (async () =>
      ({
        ok: true,
        json: async () => ({ user: { id: "user_123" } }),
      }) as Response) as typeof fetch,
  });
  assert.equal(isValid, true);
});

test("auth server validation fails when get-session returns invalid payload", async () => {
  const isValid = await validateSessionWithAuthServer({
    authServerBaseUrl: "https://api.example.com",
    cookieHeader: "better-auth.session_token=abc",
    fetchImpl: (async () =>
      ({
        ok: true,
        json: async () => ({ session: null }),
      }) as Response) as typeof fetch,
  });
  assert.equal(isValid, false);
});

test("auth server validation fails when get-session returns non-200", async () => {
  const isValid = await validateSessionWithAuthServer({
    authServerBaseUrl: "https://api.example.com",
    cookieHeader: "better-auth.session_token=abc",
    fetchImpl: (async () =>
      ({
        ok: false,
        json: async () => ({}),
      }) as Response) as typeof fetch,
  });
  assert.equal(isValid, false);
});
