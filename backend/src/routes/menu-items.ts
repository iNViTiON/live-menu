import { Hono } from 'hono';
import type { HonoEnv } from '../types';
import { MenuService } from '../services/menu';
import { MediaService } from '../services/media';
import { menuItemUpdateSchema, reorderSchema, menuItemNameSchema } from '../validation/schemas';

const menuItems = new Hono<HonoEnv>();

// All menu-item routes require authentication (staff+)
function requireAuth(c: Parameters<Parameters<typeof menuItems.use>[1]>[0]) {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  return null;
}

// GET / — list all items (including hidden)
menuItems.get('/', async (c) => {
  const authError = requireAuth(c);
  if (authError) return authError;

  const service = new MenuService(c.env.DB);
  const items = await service.list();
  return c.json(items);
});

// POST / — create item
menuItems.post('/', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const service = new MenuService(c.env.DB);
  const item = await service.create();

  const versionVectorService = c.get('versionVectorService');
  await versionVectorService.notifyChange(['menuItem']);

  return c.json(item, 201);
});

// PUT /reorder — batch reorder (must be before /:id to avoid param capture)
menuItems.put('/reorder', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? 'Validation error' }, 400);
  }

  const service = new MenuService(c.env.DB);
  await service.reorder(parsed.data.items);

  const versionVectorService = c.get('versionVectorService');
  await versionVectorService.notifyChange(['menuItem']);

  return c.json({ success: true });
});

// GET /:id — get item with details
menuItems.get('/:id', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400);

  const service = new MenuService(c.env.DB);
  const item = await service.getById(id);
  if (!item) return c.json({ error: 'Not found' }, 404);

  return c.json(item);
});

// PATCH /:id — update is_visible
menuItems.patch('/:id', async (c) => {
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

  const parsed = menuItemUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? 'Validation error' }, 400);
  }

  const service = new MenuService(c.env.DB);
  const item = await service.update(id, parsed.data);

  const versionVectorService = c.get('versionVectorService');
  await versionVectorService.notifyChange(['menuItem']);

  return c.json(item);
});

// DELETE /:id — delete item + R2 cleanup
menuItems.delete('/:id', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400);

  const service = new MenuService(c.env.DB);
  const r2Keys = await service.delete(id);

  // Clean up R2 objects
  await Promise.all(r2Keys.map((key) => c.env.MEDIA_BUCKET.delete(key)));

  const versionVectorService = c.get('versionVectorService');
  await versionVectorService.notifyChange(['menuItem', 'media']);

  return c.json({ success: true });
});

// PUT /:id/names/:lang — set name
menuItems.put('/:id/names/:lang', async (c) => {
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

  const parsed = menuItemNameSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? 'Validation error' }, 400);
  }

  const service = new MenuService(c.env.DB);
  const name = await service.setName(id, c.req.param('lang'), parsed.data.name);

  const versionVectorService = c.get('versionVectorService');
  await versionVectorService.notifyChange(['menuItem']);

  return c.json(name);
});

// DELETE /:id/names/:lang — delete name
menuItems.delete('/:id/names/:lang', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400);

  const service = new MenuService(c.env.DB);
  await service.deleteName(id, c.req.param('lang'));

  const versionVectorService = c.get('versionVectorService');
  await versionVectorService.notifyChange(['menuItem']);

  return c.json({ success: true });
});

// POST /:id/media/:lang — multipart upload
menuItems.post('/:id/media/:lang', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400);

  const formData = await c.req.parseBody();
  const file = formData['file'];

  if (!file || !(file instanceof File)) {
    return c.json({ error: 'Missing file field in multipart body' }, 400);
  }

  const service = new MediaService(c.env.DB, c.env.MEDIA_BUCKET);

  try {
    const variant = await service.upload(id, c.req.param('lang'), file);
    const versionVectorService = c.get('versionVectorService');
    await versionVectorService.notifyChange(['media']);
    return c.json(variant, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error';
    return c.json({ error: message }, 400);
  }
});

// DELETE /:id/media/:lang — delete media variant
menuItems.delete('/:id/media/:lang', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400);

  const service = new MediaService(c.env.DB, c.env.MEDIA_BUCKET);
  await service.delete(id, c.req.param('lang'));

  const versionVectorService = c.get('versionVectorService');
  await versionVectorService.notifyChange(['media']);

  return c.json({ success: true });
});

export { menuItems as menuItemRoutes };
