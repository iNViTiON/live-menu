import { cors } from 'hono/cors';
import { createMiddleware } from 'hono/factory';
import type { HonoEnv } from '../types';

export const corsMiddleware = createMiddleware<HonoEnv>(async (c, next) => {
  const handler = cors({
    origin: (origin) => {
      const allowed = [c.env.FRONTEND_URL, c.env.ADMIN_URL];
      return allowed.includes(origin) ? origin : c.env.FRONTEND_URL;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });
  return handler(c, next);
});
