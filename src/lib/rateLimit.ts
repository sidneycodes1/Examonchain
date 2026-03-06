/**
 * In-memory rate limiter for auth endpoints.
 * For production at scale, use Redis (e.g. @upstash/ratelimit).
 */
const store = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 10;

function cleanup() {
  const now = Date.now();
  Array.from(store.entries()).forEach(([key, val]) => {
    if (val.resetAt < now) store.delete(key);
  });
}

export function checkRateLimit(identifier: string): { ok: boolean; retryAfter?: number } {
  cleanup();
  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry) {
    store.set(identifier, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true };
  }

  if (entry.resetAt < now) {
    store.set(identifier, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true };
  }

  if (entry.count >= MAX_REQUESTS) {
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count++;
  return { ok: true };
}

export function getClientIdentifier(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0]?.trim() : "unknown";
  return ip;
}
