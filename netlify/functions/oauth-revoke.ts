import type { Handler } from "@netlify/functions";
import {
  REVOKE_ENDPOINT,
  corsHeaders,
  isAllowedOrigin,
  readRefreshCookie,
  clearRefreshCookie,
  json,
} from "./_shared";

/**
 * Disconnect: revoke the user's tokens at Google and clear the refresh cookie.
 * Revoking the refresh token invalidates the whole grant, so any access token
 * derived from it stops working too.
 */
export const handler: Handler = async (event) => {
  const origin = event.headers.origin;
  const headers = corsHeaders(origin);

  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "POST")
    return json(405, { error: "method_not_allowed" }, headers);
  if (!isAllowedOrigin(origin))
    return json(403, { error: "forbidden_origin" }, headers);

  // Prefer revoking the refresh token (kills the grant); fall back to the
  // access token the client may pass in the body.
  const refreshToken = readRefreshCookie(event.headers.cookie);
  let accessToken: string | undefined;
  try {
    accessToken = JSON.parse(event.body ?? "{}").access_token;
  } catch {
    /* ignore */
  }

  const tokenToRevoke = refreshToken ?? accessToken;
  if (tokenToRevoke) {
    try {
      await fetch(`${REVOKE_ENDPOINT}?token=${encodeURIComponent(tokenToRevoke)}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
    } catch {
      // Even if Google's revoke call fails, still clear the cookie below so the
      // session ends locally.
    }
  }

  // Always clear the cookie.
  return json(200, { revoked: true }, headers, clearRefreshCookie());
};
