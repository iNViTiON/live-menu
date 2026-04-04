import type { VersionVector, VersionVectorMessage, ResourceKey } from '@live-menu/shared';
import { menuStore } from '$lib/stores/menu.svelte';
import { customerStore } from '$lib/stores/customer.svelte';

const MENU_RESOURCES: ResourceKey[] = ['menuItem', 'media', 'language'];
const CUSTOMER_RESOURCES: ResourceKey[] = ['trait', 'traitGroup', 'option', 'optionGroup', 'setting'];

class MenuVersionSync {
  private ws: WebSocket | null = null;
  private localVector: VersionVector = {};
  private reconnectDelay = 1000;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  connect() {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = import.meta.env.DEV ? 'localhost:8787' : window.location.host;
      const wsUrl = `${protocol}//${host}/api/public/sync-ws`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[MenuSync] Connected');
        this.reconnectDelay = 1000; // Reset backoff
      };

      this.ws.onmessage = (event) => {
        try {
          const msg: VersionVectorMessage = JSON.parse(event.data);
          if (msg.type === 'version_update') {
            const staleMenu = MENU_RESOURCES.some(
              (key) => (msg.vector[key] || 0) > (this.localVector[key] || 0)
            );
            const staleCustomer = CUSTOMER_RESOURCES.some(
              (key) => (msg.vector[key] || 0) > (this.localVector[key] || 0)
            );
            this.localVector = { ...msg.vector };
            if (staleMenu) {
              console.log('[MenuSync] Menu data changed, refreshing...');
              menuStore.load();
            }
            if ((staleMenu || staleCustomer) && customerStore.data) {
              console.log('[MenuSync] Customer data changed, refreshing...');
              customerStore.load();
            }
          }
        } catch {}
      };

      this.ws.onclose = () => {
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        // onclose will fire after onerror
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    const jitter = this.reconnectDelay * (0.75 + Math.random() * 0.5);
    this.reconnectTimeout = setTimeout(() => this.connect(), jitter);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
  }

  disconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = null;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const menuSync = new MenuVersionSync();
