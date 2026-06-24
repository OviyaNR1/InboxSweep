import { useCallback } from "react";
import { useAuth } from "../store/auth";
import { randomString, challengeFromVerifier } from "../lib/pkce";
import {
  GOOGLE_AUTH_ENDPOINT,
  CLIENT_ID,
  REDIRECT_URI,
  SCOPES,
  FN,
  PKCE_VERIFIER_KEY,
  OAUTH_STATE_KEY,
} from "../lib/oauthConfig";

/**
 * Kick off the OAuth Authorization Code + PKCE flow.
 * Generates a verifier/state, stashes them in sessionStorage, then redirects
 * the whole page to Google's consent screen.
 */
export async function beginSignIn(): Promise<void> {
  if (!CLIENT_ID) {
    throw new Error(
      "Missing VITE_GOOGLE_CLIENT_ID. Set it in your environment / Netlify."
    );
  }
  const verifier = randomString();
  const state = randomString(16);
  const challenge = await challengeFromVerifier(verifier);

  sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);
  sessionStorage.setItem(OAUTH_STATE_KEY, state);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPES,
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    // access_type=offline + prompt=consent so Google returns a refresh token
    // we can store in the httpOnly cookie for silent re-auth.
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
  });

  window.location.assign(`${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`);
}

/**
 * Handle the redirect back from Google. Reads ?code&state from the URL,
 * validates state (CSRF), exchanges the code via our serverless function,
 * and stores the resulting access token in memory.
 *
 * Returns true if a sign-in was completed, false if there was nothing to do.
 */
export async function completeSignInFromRedirect(): Promise<boolean> {
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  const store = useAuth.getState();

  if (oauthError) {
    store.setStatus("error", `Google sign-in was cancelled or failed (${oauthError}).`);
    cleanUrl();
    return false;
  }
  if (!code) return false; // normal page load, no callback

  const expectedState = sessionStorage.getItem(OAUTH_STATE_KEY);
  const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);

  if (!expectedState || returnedState !== expectedState || !verifier) {
    store.setStatus("error", "Security check failed (state mismatch). Please try again.");
    cleanUrl();
    return false;
  }

  store.setStatus("authenticating");
  try {
    const res = await fetch(FN.exchange, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // allow the function to set the httpOnly cookie
      body: JSON.stringify({ code, code_verifier: verifier }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Token exchange failed");

    store.setSession(data.access_token, data.expires_in, data.user);
    return true;
  } catch (e) {
    store.setStatus("error", e instanceof Error ? e.message : "Sign-in failed");
    return false;
  } finally {
    sessionStorage.removeItem(PKCE_VERIFIER_KEY);
    sessionStorage.removeItem(OAUTH_STATE_KEY);
    cleanUrl();
  }
}

/** Try to silently restore a session using the refresh cookie. */
export async function refreshAccessToken(): Promise<boolean> {
  try {
    const res = await fetch(FN.refresh, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return false;
    const data = await res.json();
    useAuth.getState().setSession(data.access_token, data.expires_in);
    return true;
  } catch {
    return false;
  }
}

/**
 * Return a usable access token, refreshing first if the current one is expired
 * or missing. Returns null if the user needs to sign in again. Used by the
 * Gmail client (Milestone 3) before every API call.
 */
export async function getValidAccessToken(): Promise<string | null> {
  const store = useAuth.getState();
  if (store.isTokenValid()) return store.accessToken;
  const ok = await refreshAccessToken();
  return ok ? useAuth.getState().accessToken : null;
}

/** Revoke access at Google and clear local session. */
export async function disconnect(): Promise<void> {
  const token = useAuth.getState().accessToken;
  try {
    await fetch(FN.revoke, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: token }),
    });
  } finally {
    useAuth.getState().clear();
  }
}

function cleanUrl() {
  // Strip OAuth params from the address bar without a reload.
  window.history.replaceState({}, document.title, window.location.pathname);
}

/** Convenience hook for components: auth state + bound actions. */
export function useGoogleAuth() {
  const { user, status, error, accessToken } = useAuth();
  const signIn = useCallback(() => beginSignIn(), []);
  const signOut = useCallback(() => disconnect(), []);
  return {
    user,
    status,
    error,
    isAuthenticated: !!accessToken,
    signIn,
    signOut,
  };
}
