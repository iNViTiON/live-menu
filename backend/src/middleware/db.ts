import { createMiddleware } from 'hono/factory';
import type { HonoEnv } from '../types';

export const dbMiddleware = createMiddleware<HonoEnv>(async (c, next) => {
  await c.env.DB.exec('PRAGMA foreign_keys = ON');
  await next();
});
