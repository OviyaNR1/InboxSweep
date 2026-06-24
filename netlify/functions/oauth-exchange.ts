import type { Handler } from "@netlify/functions";
import {
  TOKEN_ENDPOINT,
  corsHeaders,
  isAllowedOrigin,
  setRefreshCookie,
  decodeIdToken,
  json,
} from "./_shared";

/**
 * OAuth step 2: exchange the authorization `code` (+ PKCE verifier) for tokens.
 *
 * This MUST run server-side because it needs GOOGLE_CLIENT_SECRET, which is
 * never shipped to the browser. The refresh token is stored in an httpOnly
 * cookie here; only the short-lived access token is returned to the client.
 */
export const handler: Handler = async (event) => {
  const origin = event.headers.origin;
  const headers = corsHeaders(origin);

  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "POST")
    return json(405, { error: "method_not_allowed" }, headers);

  // CSRF / origin check.
  if (!isAllowedOrigin(origin))
    return json(403, { error: "forbidden_origin" }, headers);

  let body: { code?: string; code_verifier?: string };
  try {
    body = JSON.parse(event.body ?? "{}");
  } catch {
    return json(400, { error: "invalid_json" }, headers);
  }

  const { code, code_verifier } = body;
  if (!code || !code_verifier)
    return json(400, { error: "missing_code_or_verifier" }, headers);

  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const redirectUri = process.env.OAUTH_REDIRECT_URI!;

  // Exchange with Google's token endpoint.
  const params = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
    code_verifier,
  });

  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const data = await res.json();
  if (!res.ok) {
    return json(
      res.status,
      { error: data.error ?? "token_exchange_failed", detail: data.error_description },
      headers
    );
  }

  const { email, name, picture } = decodeIdToken(data.id_token);

  // Store refresh token in httpOnly cookie (if Google returned one — it only
  // does on first consent or with prompt=consent). Return only the access token.
  const setCookie = data.refresh_token ? setRefreshCookie(data.refresh_token) : undefined;

  return json(
    200,
    {
      access_token: data.access_token,
      expires_in: data.expires_in, // seconds
      scope: data.scope,
      user: { email, name, picture },
      has_refresh: Boolean(data.refresh_token),
    },
    headers,
    setCookie
  );
};
