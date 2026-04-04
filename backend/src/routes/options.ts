import { Hono } from 'hono';
import type { HonoEnv } from '../types';
import { OptionService } from '../services/option';
import { reorderSchema, nameWithDescriptionSchema, optionCreateSchema, optionUpdateSchema } from '../validation/schemas';

const options = new Hono<HonoEnv>();

// POST / — create option (requires option_group_id in body)
options.post('/', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON' }, 400); }

  const parsed = optionCreateSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? 'Validation error' }, 400);

  const service = new OptionService(c.env.DB);
  const option = await service.create(parsed.data.option_group_id);

  const vvs = c.get('versionVectorService');
  await vvs.notifyChange(['option', 'optionGroup']);

  return c.json(option, 201);
});

// PUT /reorder — batch reorder (before /:id)
options.put('/reorder', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON' }, 400); }

  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? 'Validation error' }, 400);

  const service = new OptionService(c.env.DB);
  await service.reorder(parsed.data.items);

  const vvs = c.get('versionVectorService');
  await vvs.notifyChange(['option']);

  return c.json({ success: true });
});

// PATCH /:id — update price_delta
options.patch('/:id', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400);

  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON' }, 400); }

  const parsed = optionUpdateSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? 'Validation error' }, 400);

  const service = new OptionService(c.env.DB);
  const option = await service.update(id, parsed.data);

  const vvs = c.get('versionVectorService');
  await vvs.notifyChange(['option']);

  return c.json(option);
});

// DELETE /:id — delete option
options.delete('/:id', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400);

  const service = new OptionService(c.env.DB);
  await service.delete(id);

  const vvs = c.get('versionVectorService');
  await vvs.notifyChange(['option', 'optionGroup']);

  return c.json({ success: true });
});

// PUT /:id/names/:lang — upsert name
options.put('/:id/names/:lang', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400);

  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON' }, 400); }

  const parsed = nameWithDescriptionSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? 'Validation error' }, 400);

  const service = new OptionService(c.env.DB);
  const name = await service.setName(id, c.req.param('lang'), parsed.data.name, parsed.data.description ?? null);

  const vvs = c.get('versionVectorService');
  await vvs.notifyChange(['option']);

  return c.json(name);
});

// DELETE /:id/names/:lang — delete name
options.delete('/:id/names/:lang', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400);

  const service = new OptionService(c.env.DB);
  await service.deleteName(id, c.req.param('lang'));

  const vvs = c.get('versionVectorService');
  await vvs.notifyChange(['option']);

  return c.json({ success: true });
});

export { options as optionRoutes };
