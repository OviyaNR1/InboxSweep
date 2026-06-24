import type { Handler } from "@netlify/functions";

// Simple liveness probe to confirm Functions are deployed and reachable.
// Visit /.netlify/functions/health after deploy. Replaced/expanded in M2.
export const handler: Handler = async () => ({
  statusCode: 200,
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ ok: true, service: "inboxsweep", ts: Date.now() }),
});
