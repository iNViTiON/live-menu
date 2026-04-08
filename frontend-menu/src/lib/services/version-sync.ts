import type { VersionVector, VersionVectorMessage, ResourceKey } from '@live-menu/shared';

const GALLERY_RESOURCES: ResourceKey[] = ['gallery', 'setting'];
const MENU_RESOURCES: ResourceKey[] = ['menuItem', 'media', 'language', 'setting'];
const CUSTOMER_RESOURCES: ResourceKey[] = ['trait', 'traitGroup', 'option', 'optionGroup', 'setting'];

class MenuVersionSync {
  private ws: WebSocket | null = null;
  private localVector: VersionVector = {};
  private reconnectDelay = 1000;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private pongTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly PING_INTERVAL_MS = 30_000;
  private readonly PONG_TIMEOUT_MS = 5_000;

  connected = false;
  appVersionChanged = false;
  onAppVersionChange: (() => void) | null = null;
  onConnectionChange: ((connected: boolean) => void) | null = null;

  connect() {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/public/sync-ws`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[MenuSync] Connected');
        this.reconnectDelay = 1000; // Reset backoff
        this.connected = true;
        if (this.onConnectionChange) this.onConnectionChange(true);
        this.startPingInterval();
        // Trigger app version check (fire-and-forget backup for deploy:notify)
        fetch('/api/public/check-app-update').catch(() => {});
      };

      this.ws.onmessage = (event) => {
        if (event.data === 'pong') {
          this.onPong();
          return;
        }
        try {
          const msg: VersionVectorMessage = JSON.parse(event.data);
          if (msg.type === 'version_update') {
            const staleGallery = GALLERY_RESOURCES.some(
              (key) => (msg.vector[key] || 0) > (this.localVector[key] || 0)
            );
            const staleMenu = MENU_RESOURCES.some(
              (key) => (msg.vector[key] || 0) > (this.localVector[key] || 0)
            );
            const staleCustomer = CUSTOMER_RESOURCES.some(
              (key) => (msg.vector[key] || 0) > (this.localVector[key] || 0)
            );

            // Check for app version update (new frontend deploy)
            const staleApp = !!this.localVector['appVersion'] && (msg.vector['appVersion'] || 0) > (this.localVector['appVersion'] || 0);

            this.localVector = { ...msg.vector };

            if (staleApp) {
              console.log('[MenuSync] App version changed, pending reload...');
              this.appVersionChanged = true;
              if (this.onAppVersionChange) this.onAppVersionChange();
            }

            // Fire-and-forget fetches — SW cache-then-network handles the update,
            // then notifies clients via postMessage → onDataUpdated → store.load()
            if (staleGallery) {
              console.log('[MenuSync] Gallery data changed, refreshing...');
              fetch('/api/public/gallery').catch(() => {});
            }
            if (staleMenu || staleCustomer) {
              console.log('[MenuSync] Menu/customer data changed, refreshing...');
              fetch('/api/public/menu').catch(() => {});
            }
          }
        } catch {}
      };

      this.ws.onclose = () => {
        this.stopPingInterval();
        this.connected = false;
        if (this.onConnectionChange) this.onConnectionChange(false);
        if (this.ws) this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        // onclose will fire after onerror
      };
    } catch {
      this.connected = false;
      this.scheduleReconnect();
    }
  }

  reconnectNow() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = null;
    this.reconnectDelay = 1000;
    this.connect();
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    // Don't waste resources reconnecting while offline
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    const jitter = this.reconnectDelay * (0.75 + Math.random() * 0.5);
    this.reconnectTimeout = setTimeout(() => this.connect(), jitter);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
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
    console.warn('[MenuSync] Pong timeout — closing zombie connection');
    this.stopPingInterval();
    const zombie = this.ws;
    this.ws = null; // Null first so onclose doesn't double-reconnect
    this.connected = false;
    if (this.onConnectionChange) this.onConnectionChange(false);
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
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = null;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const menuSync = new MenuVersionSync();
