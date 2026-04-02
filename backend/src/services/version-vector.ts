import type { DurableObjectNamespace } from '@cloudflare/workers-types';
import type { ResourceKey } from '@live-menu/shared';

export class VersionVectorService {
  constructor(private broadcastRoom: DurableObjectNamespace) {}

  /**
   * Notify BroadcastRoom that resources have changed
   * Non-blocking - errors are logged but don't fail the request
   */
  async notifyChange(resources: ResourceKey[]): Promise<void> {
    try {
      // Get singleton BroadcastRoom instance (always use 'global' ID)
      const id = this.broadcastRoom.idFromName('global');
      const stub = this.broadcastRoom.get(id);

      // Send update request to DO
      await stub.fetch('http://internal/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resources }),
      });
    } catch (error) {
      console.error('Failed to notify version vector change:', error);
      // Don't throw - version sync is not critical enough to fail mutations
    }
  }
}
