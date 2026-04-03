import { createMiddleware } from 'hono/factory';
import type { HonoEnv } from '../types';

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 10;

// Map of IP → array of request timestamps (ms)
const store = new Map<string, number[]>();
let requestCount = 0;

function cleanup() {
  const cutoff = Date.now() - WINDOW_MS;
  for (const [ip, timestamps] of store) {
    const filtered = timestamps.filter((t) => t > cutoff);
    if (filtered.length === 0) {
      store.delete(ip);
    } else {
      store.set(ip, filtered);
    }
  }
}

export const authRateLimit = createMiddleware<HonoEnv>(async (c, next) => {
  const ip =
    c.req.header('CF-Connecting-IP') ??
    c.req.header('x-forwarded-for')?.split(',')[0].trim() ??
    'unknown';

  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  const timestamps = (store.get(ip) ?? []).filter((t) => t > cutoff);
  timestamps.push(now);
  store.set(ip, timestamps);

  // Periodic cleanup to prevent unbounded memory growth
  requestCount++;
  if (requestCount % 100 === 0) {
    cleanup();
  }

  if (timestamps.length > MAX_REQUESTS) {
    return c.json({ error: 'Too many requests, please try again later' }, 429);
  }

  await next();
});
