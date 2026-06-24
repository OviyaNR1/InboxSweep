// Shared helpers for the OAuth serverless functions.
// Keeping CORS, cookie, and origin-check logic here avoids drift between the
// exchange / refresh / revoke endpoints.

const REFRESH_COOKIE = "is_rt"; // httpOnly refresh-token cookie name

export const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
export const REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke";

/** CORS + security headers. Origin is echoed only if it matches ALLOWED_ORIGIN. */
export function corsHeaders(origin: string | undefined): Record<string, string> {
  const allowed = process.env.ALLOWED_ORIGIN ?? "";
  const ok = origin && origin === allowed;
  return {
    "Access-Control-Allow-Origin": ok ? origin! : allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Credentials": "true",
    "Content-Type": "application/json",
  };
}

/**
 * CSRF defense for the cookie-bearing endpoints: the request's Origin must
 * match ALLOWED_ORIGIN. Because the refresh cookie is SameSite=Strict this is
 * belt-and-suspenders, but it cheaply blocks cross-site POSTs.
 */
export function isAllowedOrigin(origin: string | undefined): boolean {
  return !!origin && origin === process.env.ALLOWED_ORIGIN;
}

/** Build the Set-Cookie header that stores the refresh token. */
export function setRefreshCookie(refreshToken: string): string {
  const parts = [
    `${REFRESH_COOKIE}=${encodeURIComponent(refreshToken)}`,
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    // Scope the cookie to the functions path so it's never sent with page loads
    // or Gmail API calls — only to our own auth endpoints.
    "Path=/.netlify/functions",
    `Max-Age=${60 * 60 * 24 * 30}`, // 30 days
  ];
  return parts.join("; ");
}

/** Set-Cookie header that immediately clears the refresh cookie. */
export function clearRefreshCookie(): string {
  return `${REFRESH_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/.netlify/functions; Max-Age=0`;
}

/** Read the refresh token out of the incoming Cookie header. */
export function readRefreshCookie(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  for (const pair of cookieHeader.split(";")) {
    const [k, ...rest] = pair.trim().split("=");
    if (k === REFRESH_COOKIE) return decodeURIComponent(rest.join("="));
  }
  return null;
}

/** Decode (without verifying) the payload of a JWT id_token to read email. */
export function decodeIdToken(idToken: string | undefined): {
  email?: string;
  name?: string;
  picture?: string;
} {
  if (!idToken) return {};
  try {
    const payload = idToken.split(".")[1];
    const json = Buffer.from(payload, "base64url").toString("utf8");
    const data = JSON.parse(json);
    return { email: data.email, name: data.name, picture: data.picture };
  } catch {
    return {};
  }
}

export function json(
  statusCode: number,
  body: unknown,
  headers: Record<string, string>,
  extraSetCookie?: string
) {
  const h: Record<string, string> = { ...headers };
  if (extraSetCookie) h["Set-Cookie"] = extraSetCookie;
  return { statusCode, headers: h, body: JSON.stringify(body) };
}
