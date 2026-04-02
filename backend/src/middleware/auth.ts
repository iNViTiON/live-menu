import { createMiddleware } from 'hono/factory';
import type { HonoEnv } from '../types';

export const authMiddleware = createMiddleware<HonoEnv>(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const authService = c.get('authService');
    const user = await authService.validateSession(token);
    if (user) {
      c.set('user', user);
    }
  }
  await next();
});
