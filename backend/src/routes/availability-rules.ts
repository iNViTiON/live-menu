import { Hono } from 'hono';
import type { HonoEnv } from '../types';
import { MenuService } from '../services/menu';
import { availabilityRuleUpdateSchema } from '../validation/schemas';

const availabilityRules = new Hono<HonoEnv>();

// PATCH /:id — update rule
availabilityRules.patch('/:id', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400);

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const parsed = availabilityRuleUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? 'Validation error' }, 400);
  }

  const service = new MenuService(c.env.DB);
  const rule = await service.updateRule(id, parsed.data);
  if (!rule) return c.json({ error: 'Not found' }, 404);

  const versionVectorService = c.get('versionVectorService');
  await versionVectorService.notifyChange(['menuItem']);

  return c.json(rule);
});

// DELETE /:id — delete rule
availabilityRules.delete('/:id', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400);

  const service = new MenuService(c.env.DB);
  const deleted = await service.deleteRule(id);
  if (!deleted) return c.json({ error: 'Not found' }, 404);

  const versionVectorService = c.get('versionVectorService');
  await versionVectorService.notifyChange(['menuItem']);

  return c.json({ success: true });
});

export { availabilityRules as availabilityRuleRoutes };
