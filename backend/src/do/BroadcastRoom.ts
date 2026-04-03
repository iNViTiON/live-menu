import { DurableObject } from 'cloudflare:workers';
import type { VersionVector, VersionVectorMessage, ResourceKey } from '@live-menu/shared';
import type { Env } from '../types';

export class BroadcastRoom extends DurableObject {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  async fetch(request: Request): Promise<Response> {
    // Handle WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      // CRITICAL: Use acceptWebSocket for hibernation
      this.ctx.acceptWebSocket(server);

      const isPublic = request.headers.get('X-Public-Client') === '1';

      if (isPublic) {
        server.serializeAttachment({ authenticated: false, public: true });
        // Send current vector immediately — no auth wait for public clients
        const currentVector = await this.getVersionVector();
        server.send(JSON.stringify({ type: 'version_update', vector: currentVector } as VersionVectorMessage));
      } else {
        // #15: Do NOT send version vector yet — wait for auth message first.
        server.serializeAttachment({ authenticated: false, public: false });
      }

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    // Internal-only endpoint: accessible only via DO stub bindings (env.BROADCAST_ROOM),
    // not via public HTTP routes. Access is enforced by the Cloudflare runtime.
    if (request.method === 'POST' && new URL(request.url).pathname.endsWith('/update')) {
      const { resources } = await request.json() as { resources: ResourceKey[] };
      await this.updateVersionVector(resources);
      return new Response('OK');
    }

    return new Response('Not found', { status: 404 });
  }

  // WebSocket lifecycle handlers (required by Hibernation API)
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    if (typeof message !== 'string') return;
    const attachment = ws.deserializeAttachment() as { authenticated: boolean; public?: boolean } | null;
    if (attachment?.public) return; // Public clients are read-only

    try {
      const data = JSON.parse(message);

      // #15: Handle auth message — validate token from first client message
      if (data.type === 'auth' && data.token) {
        const now = Math.floor(Date.now() / 1000);
        const user = await (this.env as Env).DB.prepare(
          `SELECT u.id FROM sessions s
           JOIN users u ON s.user_id = u.id
           WHERE s.id = ? AND s.expires_at > ? AND u.is_active = 1`
        ).bind(data.token, now).first<{ id: number }>();

        if (!user) {
          ws.close(4001, 'Unauthorized');
          return;
        }

        // Mark socket as authenticated
        ws.serializeAttachment({ authenticated: true });

        // Now send the current version vector to the newly-authenticated client
        const currentVector = await this.getVersionVector();
        ws.send(JSON.stringify({
          type: 'version_update',
          vector: currentVector
        } as VersionVectorMessage));

        return;
      }

      // Ignore any other messages from unauthenticated or authenticated clients
    } catch {
      // Ignore malformed messages
    }
  }

  async webSocketClose(_ws: WebSocket, _code: number, _reason: string, _wasClean: boolean) {
    // no-op
  }

  async webSocketError(ws: WebSocket, error: Error) {
    console.error('WebSocket error:', error);
    ws.close(1011, 'Internal error');
  }

  // Get current version vector from DO storage
  private async getVersionVector(): Promise<VersionVector> {
    const stored = await this.ctx.storage.get<VersionVector>('version_vector');
    return stored || {};
  }

  // Update version vector and broadcast to all authenticated connections
  private async updateVersionVector(resources: ResourceKey[]) {
    const now = Date.now(); // Unix epoch milliseconds
    const currentVector = await this.getVersionVector();

    // Update timestamps for changed resources
    for (const resource of resources) {
      currentVector[resource] = now;
    }

    // Persist to DO storage
    await this.ctx.storage.put('version_vector', currentVector);

    // Broadcast to all authenticated connected WebSockets
    const message = JSON.stringify({
      type: 'version_update',
      vector: currentVector
    } as VersionVectorMessage);

    const connections = this.ctx.getWebSockets();
    for (const ws of connections) {
      const meta = ws.deserializeAttachment() as { authenticated: boolean; public?: boolean } | null;
      if (!meta?.authenticated && !meta?.public) continue;
      try {
        ws.send(message);
      } catch (error) {
        console.error('Failed to send to WebSocket:', error);
      }
    }
  }
}
