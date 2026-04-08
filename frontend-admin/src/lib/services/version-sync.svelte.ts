import type { VersionVector, VersionVectorMessage, ResourceKey } from '@live-menu/shared';
import { browser } from '$app/environment';

const STORAGE_KEY = 'version_vector';

type ChangeCallback = (staleResources: ResourceKey[]) => void;

class VersionSyncService {
  private ws = $state<WebSocket | null>(null);
  private localVector = $state<VersionVector>({});
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private callbacks = new Set<ChangeCallback>();

  private debounceTimeout: ReturnType<typeof setTimeout> | null = null;
  private pendingStaleResources = new Set<ResourceKey>();

  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private pongTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly PING_INTERVAL_MS = 30_000;
  private readonly PONG_TIMEOUT_MS = 5_000;

  private reconnectDelay = 1000;

  isConnected = $derived(this.ws?.readyState === WebSocket.OPEN);

  constructor() {
    if (browser) {
      this.loadLocalVector();
      this.connect();
    }
  }

  onChange(callback: ChangeCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  getLocalVector(): VersionVector {
    return { ...this.localVector };
  }

  private connect() {
    if (!browser) return;

    const token = localStorage.getItem('auth_token');
    if (!token) return; // Can't connect without auth

    try {
      const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const wsUrl = `${proto}://${window.location.host}/api/sync-ws?token=${encodeURIComponent(token)}`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[VersionSync] Connected');
        this.clearReconnectTimeout();
        this.reconnectDelay = 1000;
        // Send auth message for BroadcastRoom DO to mark socket as authenticated
        if (this.ws) {
          this.ws.send(JSON.stringify({ type: 'auth', token }));
        }
        this.startPingInterval();
      };

      this.ws.onmessage = (event) => {
        if (event.data === 'pong') {
          this.onPong();
          return;
        }
        this.handleMessage(event.data as string);
      };

      this.ws.onerror = (error) => {
        console.error('[VersionSync] WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('[VersionSync] Disconnected, reconnecting...');
        this.stopPingInterval();
        if (this.ws) this.scheduleReconnect();
      };
    } catch (error) {
      console.error('[VersionSync] Failed to connect:', error);
      this.scheduleReconnect();
    }
  }

  private handleMessage(data: string) {
    try {
      const message = JSON.parse(data) as VersionVectorMessage;

      if (message.type === 'version_update') {
        const staleResources = this.compareVectors(message.vector);
        this.localVector = { ...message.vector };
        this.saveLocalVector();

        if (staleResources.length > 0) {
          for (const key of staleResources) {
            this.pendingStaleResources.add(key);
          }
          this.scheduleDebouncedDispatch();
        }
      }
    } catch (error) {
      console.error('[VersionSync] Failed to parse message:', error);
    }
  }

  private scheduleDebouncedDispatch() {
    if (this.debounceTimeout) clearTimeout(this.debounceTimeout);
    this.debounceTimeout = setTimeout(() => {
      const stale = Array.from(this.pendingStaleResources) as ResourceKey[];
      this.pendingStaleResources.clear();
      this.debounceTimeout = null;
      if (stale.length > 0) {
        console.log('[VersionSync] Stale resources:', stale);
        this.callbacks.forEach(cb => cb(stale));
      }
    }, 150);
  }

  private compareVectors(receivedVector: VersionVector): ResourceKey[] {
    const staleResources: ResourceKey[] = [];
    const keys: ResourceKey[] = ['menuItem', 'media', 'language', 'user', 'trait', 'traitGroup', 'option', 'optionGroup', 'setting', 'gallery'];

    for (const key of keys) {
      const receivedTime = receivedVector[key] || 0;
      const localTime = this.localVector[key] || 0;

      if (receivedTime > localTime) {
        staleResources.push(key);
      }
    }

    return staleResources;
  }

  private loadLocalVector() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.localVector = JSON.parse(stored) as VersionVector;
      }
    } catch (error) {
      console.error('[VersionSync] Failed to load local vector:', error);
      this.localVector = {};
    }
  }

  private saveLocalVector() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.localVector));
    } catch (error) {
      console.error('[VersionSync] Failed to save local vector:', error);
    }
  }

  private scheduleReconnect() {
    this.clearReconnectTimeout();
    const jitter = this.reconnectDelay * (0.75 + Math.random() * 0.5);
    this.reconnectTimeout = setTimeout(() => {
      console.log('[VersionSync] Reconnecting...');
      this.connect();
    }, jitter);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
  }

  private clearReconnectTimeout() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  private startPingInterval() {
    this.stopPingInterval();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send('ping');
        this.pongTimeout = setTimeout(() => this.handlePongTimeout(), this.PONG_TIMEOUT_MS);
      }
    }, this.PING_INTERVAL_MS);
  }

  private onPong() {
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }
  }

  private handlePongTimeout() {
    console.warn('[VersionSync] Pong timeout — closing zombie connection');
    this.stopPingInterval();
    const zombie = this.ws;
    this.ws = null; // Null first so onclose doesn't double-reconnect ($derived handles isConnected)
    try { zombie?.close(); } catch {}
    this.scheduleReconnect();
  }

  private stopPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }
  }

  disconnect() {
    this.stopPingInterval();
    this.clearReconnectTimeout();
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const versionSync = new VersionSyncService();
