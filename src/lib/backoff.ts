// Exponential backoff with jitter for Gmail API calls.
// Gmail allows ~250 quota units/user/sec; bursts return HTTP 429 or 403 with a
// rateLimitExceeded reason. We retry those (and transient 5xx) with growing
// delays so the app never crashes on a rate-limit and recovers automatically.

export class GmailApiError extends Error {
  constructor(
    public status: number,
    public reason: string | undefined,
    message: string
  ) {
    super(message);
    this.name = "GmailApiError";
  }
}

const RETRYABLE_REASONS = new Set([
  "rateLimitExceeded",
  "userRateLimitExceeded",
  "quotaExceeded",
  "dailyLimitExceeded",
  "backendError",
  "internalError",
]);

function isRetryable(err: unknown): boolean {
  if (err instanceof GmailApiError) {
    if (err.status === 429) return true;
    if (err.status >= 500) return true;
    if (err.status === 403 && err.reason && RETRYABLE_REASONS.has(err.reason))
      return true;
    // Some quota errors arrive as 403/400 with the limit described only in the
    // message — retry those too rather than crashing the scan.
    if (/quota exceeded|rate limit|rateLimit/i.test(err.message)) return true;
  }
  // Network blips (fetch throws TypeError) are worth one retry too.
  if (err instanceof TypeError) return true;
  return false;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface BackoffOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

/** Run `fn`, retrying retryable failures with exponential backoff + jitter. */
export async function withBackoff<T>(
  fn: () => Promise<T>,
  opts: BackoffOptions = {}
): Promise<T> {
  const { maxRetries = 8, baseDelayMs = 600, maxDelayMs = 32_000 } = opts;
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn();
    } catch (err) {
      if (!isRetryable(err) || attempt >= maxRetries) throw err;
      const backoff = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
      const jitter = Math.random() * backoff * 0.3; // up to +30%
      await sleep(backoff + jitter);
      attempt++;
    }
  }
}

/**
 * Run async `worker` over `items` with bounded concurrency. Keeps a fixed
 * number of requests in flight — fast, but well under Gmail's rate ceiling.
 */
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
  onProgress?: (done: number) => void
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  let done = 0;

  async function run(): Promise<void> {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i], i);
      done++;
      onProgress?.(done);
    }
  }

  const runners = Array.from({ length: Math.min(limit, items.length) }, run);
  await Promise.all(runners);
  return results;
}
