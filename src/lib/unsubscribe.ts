// Unsubscribe logic. There is no Gmail "unsubscribe" API — we implement RFC 2369
// (List-Unsubscribe) and RFC 8058 (List-Unsubscribe-Post / one-click).

export interface UnsubTargets {
  httpsUrl?: string;
  mailto?: string; // bare email address (no "mailto:" prefix)
  mailtoSubject?: string;
  oneClick: boolean; // true if RFC 8058 one-click POST is supported
}

/**
 * Parse a List-Unsubscribe header into actionable targets.
 * Header looks like: `<https://host/u?x>, <mailto:unsub@host?subject=...>`
 */
export function parseUnsubscribe(
  listUnsubscribe?: string,
  listUnsubscribePost?: string
): UnsubTargets {
  const targets: UnsubTargets = { oneClick: false };
  if (!listUnsubscribe) return targets;

  // Extract every <...> bracketed value.
  const matches = listUnsubscribe.match(/<([^>]+)>/g) ?? [];
  for (const raw of matches) {
    const url = raw.slice(1, -1).trim();
    if (/^https?:\/\//i.test(url) && !targets.httpsUrl) {
      targets.httpsUrl = url;
    } else if (/^mailto:/i.test(url) && !targets.mailto) {
      const without = url.slice("mailto:".length);
      const [addr, queryStr] = without.split("?");
      targets.mailto = addr.trim();
      const subj = new URLSearchParams(queryStr ?? "").get("subject");
      if (subj) targets.mailtoSubject = subj;
    }
  }

  // One-click requires the POST header AND an https endpoint.
  targets.oneClick =
    !!targets.httpsUrl &&
    !!listUnsubscribePost &&
    /one-click/i.test(listUnsubscribePost);

  return targets;
}

export type UnsubMethod = "one-click" | "manual-link" | "mailto" | "none";

/** Decide how a given sender can be unsubscribed, in order of preference. */
export function unsubMethod(t: UnsubTargets): UnsubMethod {
  if (t.oneClick) return "one-click";
  if (t.httpsUrl) return "manual-link";
  if (t.mailto) return "mailto";
  return "none";
}

/** Perform the true one-click unsubscribe via our serverless proxy (RFC 8058). */
export async function oneClickUnsubscribe(httpsUrl: string): Promise<boolean> {
  try {
    const res = await fetch("/.netlify/functions/unsubscribe-proxy", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: httpsUrl }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return !!data.ok;
  } catch {
    return false;
  }
}

/** Build a mailto: URL for the manual email-unsubscribe fallback. */
export function mailtoUrl(t: UnsubTargets): string {
  const subject = encodeURIComponent(t.mailtoSubject ?? "unsubscribe");
  return `mailto:${t.mailto}?subject=${subject}`;
}
