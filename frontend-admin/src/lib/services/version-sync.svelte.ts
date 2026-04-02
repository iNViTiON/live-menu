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

    try {
      const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const wsUrl = `${proto}://${window.location.host}/api/sync-ws`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[VersionSync] Connected');
        this.clearReconnectTimeout();
        this.reconnectDelay = 1000;
        const token = localStorage.getItem('auth_token');
        if (token && this.ws) {
          this.ws.send(JSON.stringify({ type: 'auth', token }));
        }
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data as string);
      };

      this.ws.onerror = (error) => {
        console.error('[VersionSync] WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('[VersionSync] Disconnected, reconnecting...');
        this.scheduleReconnect();
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
    const keys: ResourceKey[] = ['menuItem', 'media', 'language', 'user'];

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

  disconnect() {
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
