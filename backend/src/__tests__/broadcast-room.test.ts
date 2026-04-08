import { describe, it, expect, beforeAll } from 'vitest';
import { SELF, env } from 'cloudflare:test';
import { setupTestEnv } from './setup';

/** Wait for the next WebSocket message (resolves with the string payload). */
function waitForMessage(ws: WebSocket, timeoutMs = 2000): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('WebSocket message timeout')), timeoutMs);
    ws.addEventListener('message', (event) => {
      clearTimeout(timer);
      resolve(typeof event.data === 'string' ? event.data : '');
    }, { once: true });
  });
}

/** Wait for the WebSocket to close. */
function waitForClose(ws: WebSocket, timeoutMs = 2000): Promise<CloseEvent> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('WebSocket close timeout')), timeoutMs);
    ws.addEventListener('close', (event) => {
      clearTimeout(timer);
      resolve(event);
    }, { once: true });
  });
}

describe('BroadcastRoom DO', () => {
  let adminToken: string;

  beforeAll(async () => {
    const tokens = await setupTestEnv();
    adminToken = tokens.adminToken;
  });

  it('public client receives version vector immediately on connect', async () => {
    const res = await SELF.fetch('http://localhost/api/public/sync-ws', {
      headers: { Upgrade: 'websocket' },
    });
    expect(res.status).toBe(101);
    expect(res.webSocket).toBeDefined();

    const ws = res.webSocket!;
    ws.accept();

    const msg = await waitForMessage(ws);
    const data = JSON.parse(msg);
    expect(data.type).toBe('version_update');
    expect(data.vector).toBeDefined();
    expect(typeof data.vector).toBe('object');

    ws.close();
  });

  it('admin client does NOT receive version vector until auth message sent', async () => {
    const res = await SELF.fetch('http://localhost/api/sync-ws', {
      headers: { Upgrade: 'websocket' },
    });
    expect(res.status).toBe(101);

    const ws = res.webSocket!;
    ws.accept();

    // Wait a bit and verify no message was received without auth
    let received = false;
    ws.addEventListener('message', () => { received = true; }, { once: true });
    await new Promise((r) => setTimeout(r, 300));
    expect(received).toBe(false);

    ws.close();
  });

  it('admin client sends valid auth → receives version vector', async () => {
    const res = await SELF.fetch('http://localhost/api/sync-ws', {
      headers: { Upgrade: 'websocket' },
    });
    const ws = res.webSocket!;
    ws.accept();

    ws.send(JSON.stringify({ type: 'auth', token: adminToken }));

    const msg = await waitForMessage(ws);
    const data = JSON.parse(msg);
    expect(data.type).toBe('version_update');
    expect(data.vector).toBeDefined();

    ws.close();
  });

  it('admin client sends invalid auth → ws.close(4001)', async () => {
    const res = await SELF.fetch('http://localhost/api/sync-ws', {
      headers: { Upgrade: 'websocket' },
    });
    const ws = res.webSocket!;
    ws.accept();

    const closePromise = waitForClose(ws);
    ws.send(JSON.stringify({ type: 'auth', token: 'invalid-token-xxx' }));

    const closeEvent = await closePromise;
    expect(closeEvent.code).toBe(4001);
  });

  it('POST /update broadcasts updated vector to authenticated clients', async () => {
    // Connect and authenticate an admin client
    const res = await SELF.fetch('http://localhost/api/sync-ws', {
      headers: { Upgrade: 'websocket' },
    });
    const ws = res.webSocket!;
    ws.accept();

    ws.send(JSON.stringify({ type: 'auth', token: adminToken }));
    const authMsg = await waitForMessage(ws);
    expect(JSON.parse(authMsg).type).toBe('version_update');

    // Set up listener BEFORE the POST so we don't miss the broadcast
    const broadcastPromise = waitForMessage(ws);

    // POST /update directly to the DO stub
    const doId = env.BROADCAST_ROOM.idFromName('global');
    const stub = env.BROADCAST_ROOM.get(doId);
    const updateRes = await stub.fetch('http://do/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resources: ['menuItem'] }),
    });
    expect(updateRes.status).toBe(200);

    // Authenticated client should receive the broadcast
    const broadcastMsg = await broadcastPromise;
    const data = JSON.parse(broadcastMsg);
    expect(data.type).toBe('version_update');
    expect(data.vector.menuItem).toBeTypeOf('number');

    ws.close();
  });

  it('auto-responds "pong" to "ping" text message', async () => {
    const res = await SELF.fetch('http://localhost/api/public/sync-ws', {
      headers: { Upgrade: 'websocket' },
    });
    const ws = res.webSocket!;
    ws.accept();

    // Consume the initial version_update
    await waitForMessage(ws);

    ws.send('ping');
    const pong = await waitForMessage(ws);
    expect(pong).toBe('pong');

    ws.close();
  });

  it('ping messages do not interfere with admin auth flow', async () => {
    const res = await SELF.fetch('http://localhost/api/sync-ws', {
      headers: { Upgrade: 'websocket' },
    });
    const ws = res.webSocket!;
    ws.accept();

    // Send ping before auth — should get pong
    ws.send('ping');
    const pong = await waitForMessage(ws);
    expect(pong).toBe('pong');

    // Auth should still work normally
    ws.send(JSON.stringify({ type: 'auth', token: adminToken }));
    const msg = await waitForMessage(ws);
    const data = JSON.parse(msg);
    expect(data.type).toBe('version_update');
    expect(data.vector).toBeDefined();

    ws.close();
  });

  it('responds to multiple consecutive pings', async () => {
    const res = await SELF.fetch('http://localhost/api/public/sync-ws', {
      headers: { Upgrade: 'websocket' },
    });
    const ws = res.webSocket!;
    ws.accept();

    await waitForMessage(ws); // consume initial version_update

    ws.send('ping');
    expect(await waitForMessage(ws)).toBe('pong');

    ws.send('ping');
    expect(await waitForMessage(ws)).toBe('pong');

    ws.close();
  });

  it('malformed JSON message does not crash the DO', async () => {
    const res = await SELF.fetch('http://localhost/api/sync-ws', {
      headers: { Upgrade: 'websocket' },
    });
    const ws = res.webSocket!;
    ws.accept();

    // Send garbage — the DO should swallow the error
    ws.send('not valid json {{{');

    // DO is still alive: authenticate and get a version vector
    ws.send(JSON.stringify({ type: 'auth', token: adminToken }));

    const msg = await waitForMessage(ws);
    const data = JSON.parse(msg);
    expect(data.type).toBe('version_update');

    ws.close();
  });
});
