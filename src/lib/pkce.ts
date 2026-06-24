// PKCE (Proof Key for Code Exchange) helpers — RFC 7636.
// PKCE lets a public client (our browser app) do the OAuth Authorization Code
// flow safely without embedding a secret: we send a hashed "challenge" up front
// and prove ownership with the original "verifier" at token-exchange time.

function base64url(bytes: Uint8Array): string {
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Cryptographically random URL-safe string used as the PKCE verifier / state. */
export function randomString(byteLength = 48): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

/** SHA-256(verifier), base64url-encoded → the code_challenge sent to Google. */
export async function challengeFromVerifier(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64url(new Uint8Array(digest));
}
