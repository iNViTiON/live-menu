import { createMiddleware } from 'hono/factory';
import type { HonoEnv } from '../types';
import { AuthService } from '../services/auth';
import { VersionVectorService } from '../services/version-vector';

export const servicesMiddleware = createMiddleware<HonoEnv>(async (c, next) => {
  // Skip service creation for non-API routes (media proxy, assets)
  const path = new URL(c.req.url).pathname;
  if (!path.startsWith('/api/')) {
    return next();
  }
  const authService = new AuthService(
    c.env.DB,
    c.env.WEBAUTHN_RP_NAME,
    c.env.WEBAUTHN_RP_ID,
    c.env.WEBAUTHN_ORIGIN
  );
  const versionVectorService = new VersionVectorService(c.env.BROADCAST_ROOM);
  c.set('authService', authService);
  c.set('versionVectorService', versionVectorService);
  await next();
});
