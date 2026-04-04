import { Hono } from 'hono';
import type { HonoEnv } from '../types';
import { TraitService } from '../services/trait';
import { reorderSchema, nameWithDescriptionSchema } from '../validation/schemas';

const traits = new Hono<HonoEnv>();

// GET / — list all traits
traits.get('/', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const service = new TraitService(c.env.DB);
  return c.json(await service.list());
});

// POST / — create trait
traits.post('/', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const service = new TraitService(c.env.DB);
  const trait = await service.create();

  const vvs = c.get('versionVectorService');
  await vvs.notifyChange(['trait']);

  return c.json(trait, 201);
});

// PUT /reorder — batch reorder (before /:id)
traits.put('/reorder', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON' }, 400); }

  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? 'Validation error' }, 400);

  const service = new TraitService(c.env.DB);
  await service.reorder(parsed.data.items);

  const vvs = c.get('versionVectorService');
  await vvs.notifyChange(['trait']);

  return c.json({ success: true });
});

// DELETE /:id — delete trait
traits.delete('/:id', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400);

  const service = new TraitService(c.env.DB);
  await service.delete(id);

  const vvs = c.get('versionVectorService');
  await vvs.notifyChange(['trait', 'traitGroup']);

  return c.json({ success: true });
});

// PUT /:id/names/:lang — upsert name
traits.put('/:id/names/:lang', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400);

  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON' }, 400); }

  const parsed = nameWithDescriptionSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? 'Validation error' }, 400);

  const service = new TraitService(c.env.DB);
  const name = await service.setName(id, c.req.param('lang'), parsed.data.name, parsed.data.description ?? null);

  const vvs = c.get('versionVectorService');
  await vvs.notifyChange(['trait']);

  return c.json(name);
});

// DELETE /:id/names/:lang — delete name
traits.delete('/:id/names/:lang', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400);

  const service = new TraitService(c.env.DB);
  await service.deleteName(id, c.req.param('lang'));

  const vvs = c.get('versionVectorService');
  await vvs.notifyChange(['trait']);

  return c.json({ success: true });
});

export { traits as traitRoutes };
