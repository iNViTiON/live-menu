import { Hono } from 'hono';
import type { HonoEnv } from '../types';
import { OptionGroupService } from '../services/option-group';
import { reorderSchema, nameWithDescriptionSchema, optionGroupUpdateSchema } from '../validation/schemas';

const optionGroups = new Hono<HonoEnv>();

// GET / — list all option groups with options
optionGroups.get('/', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const service = new OptionGroupService(c.env.DB);
  return c.json(await service.list());
});

// POST / — create option group
optionGroups.post('/', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const service = new OptionGroupService(c.env.DB);
  const group = await service.create();

  const vvs = c.get('versionVectorService');
  await vvs.notifyChange(['optionGroup']);

  return c.json(group, 201);
});

// PUT /reorder — batch reorder (before /:id)
optionGroups.put('/reorder', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON' }, 400); }

  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? 'Validation error' }, 400);

  const service = new OptionGroupService(c.env.DB);
  await service.reorder(parsed.data.items);

  const vvs = c.get('versionVectorService');
  await vvs.notifyChange(['optionGroup']);

  return c.json({ success: true });
});

// PATCH /:id — update flags
optionGroups.patch('/:id', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400);

  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON' }, 400); }

  const parsed = optionGroupUpdateSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? 'Validation error' }, 400);

  const service = new OptionGroupService(c.env.DB);
  const group = await service.update(id, parsed.data);

  const vvs = c.get('versionVectorService');
  await vvs.notifyChange(['optionGroup']);

  return c.json(group);
});

// DELETE /:id — delete option group
optionGroups.delete('/:id', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400);

  const service = new OptionGroupService(c.env.DB);
  await service.delete(id);

  const vvs = c.get('versionVectorService');
  await vvs.notifyChange(['optionGroup', 'option']);

  return c.json({ success: true });
});

// PUT /:id/names/:lang — upsert name
optionGroups.put('/:id/names/:lang', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400);

  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON' }, 400); }

  const parsed = nameWithDescriptionSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? 'Validation error' }, 400);

  const service = new OptionGroupService(c.env.DB);
  const name = await service.setName(id, c.req.param('lang'), parsed.data.name, parsed.data.description ?? null);

  const vvs = c.get('versionVectorService');
  await vvs.notifyChange(['optionGroup']);

  return c.json(name);
});

// DELETE /:id/names/:lang — delete name
optionGroups.delete('/:id/names/:lang', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400);

  const service = new OptionGroupService(c.env.DB);
  await service.deleteName(id, c.req.param('lang'));

  const vvs = c.get('versionVectorService');
  await vvs.notifyChange(['optionGroup']);

  return c.json({ success: true });
});

export { optionGroups as optionGroupRoutes };
