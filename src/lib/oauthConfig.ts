// Central OAuth configuration. Values come from build-time env vars (VITE_*).

export const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";

export const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";
export const REDIRECT_URI =
  import.meta.env.VITE_OAUTH_REDIRECT_URI ?? `${window.location.origin}/app`;

// Minimum scopes. gmail.modify covers read + trash + label/archive (everything
// except permanent batchDelete). openid/email/profile are just for showing who
// is signed in. We intentionally do NOT request the broad mail.google.com scope.
export const SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.modify",
  // Drive scope: needed to move files between folders and trash them.
  "https://www.googleapis.com/auth/drive",
].join(" ");

// Serverless endpoints (same origin as the app).
export const FN = {
  exchange: "/.netlify/functions/oauth-exchange",
  refresh: "/.netlify/functions/oauth-refresh",
  revoke: "/.netlify/functions/oauth-revoke",
};

// sessionStorage keys for the in-flight PKCE values (cleared after exchange).
export const PKCE_VERIFIER_KEY = "inboxsweep:pkce_verifier";
export const OAUTH_STATE_KEY = "inboxsweep:oauth_state";
