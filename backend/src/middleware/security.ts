import { createMiddleware } from 'hono/factory';
import type { HonoEnv } from '../types';

export const securityHeaders = createMiddleware<HonoEnv>(async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
});
