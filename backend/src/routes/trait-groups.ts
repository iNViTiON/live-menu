import { Hono } from 'hono';
import type { HonoEnv } from '../types';
import { TraitGroupService } from '../services/trait-group';
import { reorderSchema, nameWithDescriptionSchema } from '../validation/schemas';

const traitGroups = new Hono<HonoEnv>();

// GET / — list all groups with traits
traitGroups.get('/', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const service = new TraitGroupService(c.env.DB);
  return c.json(await service.list());
});

// POST / — create group
traitGroups.post('/', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const service = new TraitGroupService(c.env.DB);
  const group = await service.create();

  const vvs = c.get('versionVectorService');
  await vvs.notifyChange(['traitGroup']);

  return c.json(group, 201);
});

// PUT /reorder — batch reorder (before /:id)
traitGroups.put('/reorder', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON' }, 400); }

  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? 'Validation error' }, 400);

  const service = new TraitGroupService(c.env.DB);
  await service.reorder(parsed.data.items);

  const vvs = c.get('versionVectorService');
  await vvs.notifyChange(['traitGroup']);

  return c.json({ success: true });
});

// DELETE /:id — delete group
traitGroups.delete('/:id', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400);

  const service = new TraitGroupService(c.env.DB);
  await service.delete(id);

  const vvs = c.get('versionVectorService');
  await vvs.notifyChange(['traitGroup']);

  return c.json({ success: true });
});

// PUT /:id/names/:lang — upsert name
traitGroups.put('/:id/names/:lang', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400);

  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON' }, 400); }

  const parsed = nameWithDescriptionSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? 'Validation error' }, 400);

  const service = new TraitGroupService(c.env.DB);
  const name = await service.setName(id, c.req.param('lang'), parsed.data.name, parsed.data.description ?? null);

  const vvs = c.get('versionVectorService');
  await vvs.notifyChange(['traitGroup']);

  return c.json(name);
});

// DELETE /:id/names/:lang — delete name
traitGroups.delete('/:id/names/:lang', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400);

  const service = new TraitGroupService(c.env.DB);
  await service.deleteName(id, c.req.param('lang'));

  const vvs = c.get('versionVectorService');
  await vvs.notifyChange(['traitGroup']);

  return c.json({ success: true });
});

// PUT /:id/traits/reorder — reorder traits in group (before /:id/traits/:traitId)
traitGroups.put('/:id/traits/reorder', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400);

  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON' }, 400); }

  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? 'Validation error' }, 400);

  const service = new TraitGroupService(c.env.DB);
  await service.reorderTraits(id, parsed.data.items);

  const vvs = c.get('versionVectorService');
  await vvs.notifyChange(['traitGroup']);

  return c.json({ success: true });
});

// PUT /:id/traits/:traitId — add trait to group
traitGroups.put('/:id/traits/:traitId', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = parseInt(c.req.param('id'), 10);
  const traitId = parseInt(c.req.param('traitId'), 10);
  if (isNaN(id) || isNaN(traitId)) return c.json({ error: 'Invalid id' }, 400);

  const service = new TraitGroupService(c.env.DB);
  await service.addTrait(id, traitId);

  const vvs = c.get('versionVectorService');
  await vvs.notifyChange(['traitGroup']);

  return c.json({ success: true });
});

// DELETE /:id/traits/:traitId — remove trait from group
traitGroups.delete('/:id/traits/:traitId', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = parseInt(c.req.param('id'), 10);
  const traitId = parseInt(c.req.param('traitId'), 10);
  if (isNaN(id) || isNaN(traitId)) return c.json({ error: 'Invalid id' }, 400);

  const service = new TraitGroupService(c.env.DB);
  await service.removeTrait(id, traitId);

  const vvs = c.get('versionVectorService');
  await vvs.notifyChange(['traitGroup']);

  return c.json({ success: true });
});

export { traitGroups as traitGroupRoutes };
