/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Google OAuth client ID — safe to expose in the client bundle. */
  readonly VITE_GOOGLE_CLIENT_ID: string;
  /** Redirect URI registered in Google Cloud (e.g. https://your-site.netlify.app/app). */
  readonly VITE_OAUTH_REDIRECT_URI: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
