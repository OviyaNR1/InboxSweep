import type { Handler } from "@netlify/functions";
import { corsHeaders, isAllowedOrigin, json } from "./_shared";

/**
 * Server-side proxy for RFC 8058 one-click unsubscribe.
 *
 * Browsers can't POST cross-origin to a sender's unsubscribe endpoint (CORS),
 * so the client hands us the https URL and we make the POST from the server.
 * Per the spec, the body is exactly `List-Unsubscribe=One-Click`.
 *
 * Security: only same-origin callers (CSRF origin check), https URLs only, and
 * we never follow the response body back to the client beyond a status.
 */
export const handler: Handler = async (event) => {
  const origin = event.headers.origin;
  const headers = corsHeaders(origin);

  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "POST")
    return json(405, { error: "method_not_allowed" }, headers);
  if (!isAllowedOrigin(origin))
    return json(403, { error: "forbidden_origin" }, headers);

  let url: string | undefined;
  try {
    url = JSON.parse(event.body ?? "{}").url;
  } catch {
    return json(400, { error: "invalid_json" }, headers);
  }

  // Only allow https targets — never http, file, data, etc.
  if (!url || !/^https:\/\//i.test(url)) {
    return json(400, { error: "invalid_url" }, headers);
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "List-Unsubscribe=One-Click",
      redirect: "follow",
    });
    // Many endpoints return 200/202; some redirect to a confirmation page.
    return json(
      200,
      { ok: res.ok, status: res.status },
      headers
    );
  } catch (e) {
    return json(
      502,
      { ok: false, error: e instanceof Error ? e.message : "request_failed" },
      headers
    );
  }
};
