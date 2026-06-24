import type { Handler } from "@netlify/functions";
import {
  TOKEN_ENDPOINT,
  corsHeaders,
  isAllowedOrigin,
  readRefreshCookie,
  json,
} from "./_shared";

/**
 * OAuth refresh: mint a fresh access token using the httpOnly refresh cookie.
 * The browser calls this on load (to resume a session) and when the access
 * token nears expiry. The refresh token itself never reaches the browser.
 */
export const handler: Handler = async (event) => {
  const origin = event.headers.origin;
  const headers = corsHeaders(origin);

  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "POST")
    return json(405, { error: "method_not_allowed" }, headers);
  if (!isAllowedOrigin(origin))
    return json(403, { error: "forbidden_origin" }, headers);

  const refreshToken = readRefreshCookie(event.headers.cookie);
  if (!refreshToken) return json(401, { error: "no_refresh_token" }, headers);

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const data = await res.json();
  if (!res.ok) {
    // Refresh token revoked or expired — tell the client to sign in again.
    return json(401, { error: data.error ?? "refresh_failed" }, headers);
  }

  return json(
    200,
    { access_token: data.access_token, expires_in: data.expires_in, scope: data.scope },
    headers
  );
};
