import { Hono } from 'hono';
import type { HonoEnv } from './types';
import { securityHeaders } from './middleware/security';
import { corsMiddleware } from './middleware/cors';
import { servicesMiddleware } from './middleware/services';
import { authMiddleware } from './middleware/auth';
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/users';
import { languageRoutes } from './routes/languages';
import { menuItemRoutes } from './routes/menu-items';
import { publicRoutes } from './routes/public';
import { BroadcastRoom } from './do/BroadcastRoom';

const app = new Hono<HonoEnv>();

// Middleware — order matters: security → cors → services → auth
app.use('*', securityHeaders);
app.use('*', corsMiddleware);
app.use('*', servicesMiddleware);
app.use('*', authMiddleware);

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok' }));

// API routes
app.route('/api/auth', authRoutes);
app.route('/api/users', userRoutes);
app.route('/api/languages', languageRoutes);
app.route('/api/menu-items', menuItemRoutes);
app.route('/api/public', publicRoutes);

// Default export — handles WS upgrade, media proxy, and Hono API routes
export default {
  async fetch(request: Request, env: HonoEnv['Bindings'], ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // WebSocket upgrade → forward to BroadcastRoom Durable Object
    if (url.pathname === '/api/sync-ws') {
      const id = env.BROADCAST_ROOM.idFromName('global');
      const stub = env.BROADCAST_ROOM.get(id);
      return stub.fetch(request);
    }

    // Media proxy → serve from R2 with cache headers
    if (url.pathname.startsWith('/media/')) {
      const key = url.pathname.replace('/media/', '');
      const object = await env.MEDIA_BUCKET.get(key);
      if (!object) {
        return new Response('Not Found', { status: 404 });
      }
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      return new Response(object.body, { headers });
    }

    // All /api/* routes handled by Hono; everything else → ASSETS (SvelteKit SPA)
    if (url.pathname.startsWith('/api/')) {
      return app.fetch(request, env, ctx);
    }

    return env.ASSETS.fetch(request);
  },
};

export { BroadcastRoom };
