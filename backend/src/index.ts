import { Hono } from 'hono';
import { csrf } from 'hono/csrf';
import type { HonoEnv } from './types';
import { securityHeaders } from './middleware/security';
import { corsMiddleware } from './middleware/cors';
import { dbMiddleware } from './middleware/db';
import { servicesMiddleware } from './middleware/services';
import { authMiddleware } from './middleware/auth';
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/users';
import { languageRoutes } from './routes/languages';
import { menuItemRoutes } from './routes/menu-items';
import { galleryRoutes } from './routes/gallery';
import { traitRoutes } from './routes/traits';
import { traitGroupRoutes } from './routes/trait-groups';
import { optionGroupRoutes } from './routes/option-groups';
import { optionRoutes } from './routes/options';
import { settingRoutes } from './routes/settings';
import { publicRoutes } from './routes/public';
import { BroadcastRoom } from './do/BroadcastRoom';
import { AuthService } from './services/auth';

const app = new Hono<HonoEnv>();

// Middleware — order matters: security → cors → csrf → db → services → auth
app.use('*', securityHeaders);
app.use('*', corsMiddleware);
app.use('/api/*', csrf({
  origin: (origin, c) => {
    const env = c.env as HonoEnv['Bindings'];
    return origin === env.FRONTEND_URL || origin === env.ADMIN_URL || origin === new URL(c.req.url).origin;
  },
}));
app.use('/api/*', dbMiddleware);
app.use('*', servicesMiddleware);
app.use('*', authMiddleware);

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok' }));

// API routes
app.route('/api/auth', authRoutes);
app.route('/api/users', userRoutes);
app.route('/api/languages', languageRoutes);
app.route('/api/menu-items', menuItemRoutes);
app.route('/api/gallery', galleryRoutes);
app.route('/api/traits', traitRoutes);
app.route('/api/trait-groups', traitGroupRoutes);
app.route('/api/option-groups', optionGroupRoutes);
app.route('/api/options', optionRoutes);
app.route('/api/settings', settingRoutes);
app.route('/api/public', publicRoutes);

// Default export — handles WS upgrade, media proxy, Hono API routes, and scheduled cleanup
export default {
  async fetch(request: Request, env: HonoEnv['Bindings'], ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Public WebSocket for menu clients (no auth required)
    if (url.pathname === '/api/public/sync-ws' && request.headers.get('Upgrade') === 'websocket') {
      const id = env.BROADCAST_ROOM.idFromName('global');
      const stub = env.BROADCAST_ROOM.get(id);
      const publicReq = new Request(request.url, request);
      publicReq.headers.set('X-Public-Client', '1');
      return stub.fetch(publicReq);
    }

    // Admin WebSocket — forward to BroadcastRoom DO; auth handled via {type:"auth",token} message
    if (url.pathname === '/api/sync-ws' && request.headers.get('Upgrade') === 'websocket') {
      const origin = request.headers.get('Origin');
      const allowedOrigins = [env.FRONTEND_URL, env.ADMIN_URL];
      if (origin && !allowedOrigins.includes(origin)) {
        return new Response('Forbidden', { status: 403 });
      }
      const id = env.BROADCAST_ROOM.idFromName('global');
      const stub = env.BROADCAST_ROOM.get(id);
      const wsHeaders = new Headers(request.headers);
      wsHeaders.delete('X-Public-Client');
      const cleanRequest = new Request(request.url, { ...request, headers: wsHeaders });
      return stub.fetch(cleanRequest);
    }

    // Media proxy → serve from R2 with cache headers
    if (url.pathname.startsWith('/media/')) {
      const key = url.pathname.slice('/media/'.length);
      if (key.includes('..') || key.startsWith('/') || !key) {
        return new Response('Forbidden', { status: 403 });
      }
      const object = await env.MEDIA_BUCKET.get(key);
      if (!object) {
        return new Response('Not Found', { status: 404 });
      }
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      headers.set('X-Content-Type-Options', 'nosniff');
      headers.set('X-Frame-Options', 'DENY');
      return new Response(object.body, { headers });
    }

    if (url.pathname.startsWith('/api/')) {
      return app.fetch(request, env, ctx);
    }

    return new Response('Not Found', { status: 404 });
  },

  // Runs weekly — cron: "0 0 * * 0" (Sunday midnight UTC)
  async scheduled(_event: ScheduledEvent, env: HonoEnv['Bindings'], _ctx: ExecutionContext): Promise<void> {
    const authService = new AuthService(env.DB, '', '', '');
    await authService.deleteExpiredSessions();
    const now = Math.floor(Date.now() / 1000);
    await env.DB.prepare('DELETE FROM webauthn_challenges WHERE expires_at <= ?').bind(now).run();
  },
};

export { BroadcastRoom };
