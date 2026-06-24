# InboxSweep

Free up your Gmail storage. Find what's eating space, bulk-delete safely (Trash by default), empty large attachments, and unsubscribe from senders — all from a clean web app, no code required.

> **Status:** Milestone 1 of 7 complete — project scaffold, landing page, theming, and Netlify config. Sign-in and the dashboard arrive in later milestones.

## Architecture (why it's built this way)

Netlify hosts **static** frontends, but a Gmail app needs a tiny backend to keep the Google **client secret** off the browser during the OAuth token exchange. So:

- **Frontend** — React 18 + Vite + TypeScript + Tailwind. Builds to `/dist` and deploys as a static site.
- **Backend** — Netlify Functions (Node 20) handle only the secret-bearing steps: OAuth code→token exchange, token refresh, revoke, and a CORS proxy for one-click unsubscribe.
- **Everything else** — Gmail API reads/edits run **directly in the browser** with a short-lived access token (Gmail's REST API supports CORS). Your email never passes through a server we control.

No database. Tokens live in memory; the refresh token (if used) is stored only in an httpOnly, Secure cookie set by the function — never in `localStorage`.

## Tech stack

React 18 · Vite · TypeScript · Tailwind CSS · TanStack Query · Zustand · lucide-react · Google Identity Services (Auth Code + PKCE) · Netlify Functions.

## Project structure

```
/src
  /components   UI building blocks (Logo, ThemeToggle, …)
  /pages        Landing, App, Privacy
  /store        Zustand stores (theme, …)
  main.tsx      Router + Query client
/netlify/functions
  health.ts     Liveness probe (auth functions added in M2)
netlify.toml    Build + SPA redirect config
.env.example    Required environment variables
```

## Run it locally

You'll wire up Google credentials in Milestone 2. For now you can run the frontend:

```bash
npm install
npm run dev          # http://localhost:5173  (frontend only)
```

Once the auth functions exist, use the Netlify CLI so Functions run too:

```bash
npm install -g netlify-cli
netlify dev          # http://localhost:8888  (frontend + functions)
```

## Environment variables

Copy `.env.example` to `.env` and fill in the values (full Google Cloud setup steps land with Milestone 2):

| Variable | Where | Notes |
| --- | --- | --- |
| `GOOGLE_CLIENT_ID` / `VITE_GOOGLE_CLIENT_ID` | client + server | Safe to expose. |
| `GOOGLE_CLIENT_SECRET` | **server only** | Never prefix with `VITE_`. Stays out of the bundle. |
| `OAUTH_REDIRECT_URI` / `VITE_OAUTH_REDIRECT_URI` | client + server | Must match the URI registered in Google Cloud. |
| `ALLOWED_ORIGIN` | server | Origin allowed to call the functions (CORS + CSRF check). |

## Deploy to Netlify (high level)

1. Push this repo to GitHub and "Add new site → Import" in Netlify.
2. Build command `npm run build`, publish directory `dist`, functions directory `netlify/functions` (already set in `netlify.toml`).
3. Add the environment variables above in Site settings.
4. Set your OAuth redirect URI to `https://<your-site>.netlify.app/app`.

> **Heads-up on Google verification:** Gmail delete/modify use *restricted* scopes. The app works immediately for you and up to 100 test users, but launching to the general public requires Google's OAuth verification (and possibly a paid annual CASA security assessment). This is documented in detail in the final README at Milestone 7.

## Roadmap

1. ✅ Scaffold + landing + Netlify config
2. OAuth (GIS + PKCE) + auth functions
3. Gmail client (search, metadata, batching, backoff)
4. Storage scan + dashboard
5. Cleanup recipes + bulk trash + undo
6. Unsubscribe center
7. Polish (dark mode, states, privacy page, README)
