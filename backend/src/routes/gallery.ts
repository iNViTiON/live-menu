import { Hono } from 'hono';
import type { HonoEnv } from '../types';
import { GalleryService } from '../services/gallery';
import { galleryPageUpdateSchema, reorderSchema, menuItemNameSchema, availabilityRuleSchema, availabilityRuleUpdateSchema } from '../validation/schemas';

const gallery = new Hono<HonoEnv>();

// GET / — list all gallery pages with details
gallery.get('/', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const service = new GalleryService(c.env.DB, c.env.MEDIA_BUCKET);
  const pages = await service.list();
  return c.json(pages);
});

// POST / — create gallery page
gallery.post('/', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const service = new GalleryService(c.env.DB, c.env.MEDIA_BUCKET);
  const page = await service.create();

  const versionVectorService = c.get('versionVectorService');
  await versionVectorService.notifyChange(['gallery']);

  return c.json(page, 201);
});

// PUT /reorder — batch reorder (before /:id to avoid param capture)
gallery.put('/reorder', async (c) => {
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

  const service = new GalleryService(c.env.DB, c.env.MEDIA_BUCKET);
  await service.reorder(parsed.data.items);

  const versionVectorService = c.get('versionVectorService');
  await versionVectorService.notifyChange(['gallery']);

  return c.json({ success: true });
});

// PATCH /availability-rules/:id — update rule (before /:id to avoid param capture)
gallery.patch('/availability-rules/:id', async (c) => {
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

  const service = new GalleryService(c.env.DB, c.env.MEDIA_BUCKET);
  const rule = await service.updateRule(id, parsed.data);
  if (!rule) return c.json({ error: 'Not found' }, 404);

  const versionVectorService = c.get('versionVectorService');
  await versionVectorService.notifyChange(['gallery']);

  return c.json(rule);
});

// DELETE /availability-rules/:id — delete rule (before /:id to avoid param capture)
gallery.delete('/availability-rules/:id', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400);

  const service = new GalleryService(c.env.DB, c.env.MEDIA_BUCKET);
  const deleted = await service.deleteRule(id);
  if (!deleted) return c.json({ error: 'Not found' }, 404);

  const versionVectorService = c.get('versionVectorService');
  await versionVectorService.notifyChange(['gallery']);

  return c.json({ success: true });
});

// GET /:id — get page with details
gallery.get('/:id', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400);

  const service = new GalleryService(c.env.DB, c.env.MEDIA_BUCKET);
  const page = await service.getById(id);
  if (!page) return c.json({ error: 'Not found' }, 404);

  return c.json(page);
});

// PATCH /:id — update is_visible, schedule_start, schedule_end
gallery.patch('/:id', async (c) => {
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

  const parsed = galleryPageUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? 'Validation error' }, 400);
  }

  const service = new GalleryService(c.env.DB, c.env.MEDIA_BUCKET);
  const page = await service.update(id, parsed.data);
  if (!page) return c.json({ error: 'Not found' }, 404);

  const versionVectorService = c.get('versionVectorService');
  await versionVectorService.notifyChange(['gallery']);

  return c.json(page);
});

// DELETE /:id — delete page + R2 cleanup
gallery.delete('/:id', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400);

  const service = new GalleryService(c.env.DB, c.env.MEDIA_BUCKET);
  const r2Keys = await service.delete(id);

  await Promise.all(r2Keys.map((key) => c.env.MEDIA_BUCKET.delete(key)));

  const versionVectorService = c.get('versionVectorService');
  await versionVectorService.notifyChange(['gallery']);

  return c.json({ success: true });
});

// PUT /:id/names/:lang — upsert name
gallery.put('/:id/names/:lang', async (c) => {
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

  const service = new GalleryService(c.env.DB, c.env.MEDIA_BUCKET);
  const name = await service.setName(id, c.req.param('lang'), parsed.data.name, parsed.data.description ?? null);

  const versionVectorService = c.get('versionVectorService');
  await versionVectorService.notifyChange(['gallery']);

  return c.json(name);
});

// DELETE /:id/names/:lang — delete name
gallery.delete('/:id/names/:lang', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400);

  const service = new GalleryService(c.env.DB, c.env.MEDIA_BUCKET);
  await service.deleteName(id, c.req.param('lang'));

  const versionVectorService = c.get('versionVectorService');
  await versionVectorService.notifyChange(['gallery']);

  return c.json({ success: true });
});

// POST /:id/media/:lang — multipart upload
gallery.post('/:id/media/:lang', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400);

  const formData = await c.req.parseBody();
  const file = formData['file'];

  if (!file || !(file instanceof File)) {
    return c.json({ error: 'Missing file field in multipart body' }, 400);
  }

  const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
  const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
  const contentType = file.type;
  const maxSize = contentType.startsWith('video/') ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
  if (file.size > maxSize) return c.json({ error: 'File too large' }, 413);

  const service = new GalleryService(c.env.DB, c.env.MEDIA_BUCKET);

  try {
    const media = await service.uploadMedia(id, c.req.param('lang'), file);
    const versionVectorService = c.get('versionVectorService');
    await versionVectorService.notifyChange(['gallery']);
    return c.json(media, 201);
  } catch (error: unknown) {
    console.error('Gallery media upload error:', error);
    return c.json({ error: 'Upload failed' }, 400);
  }
});

// DELETE /:id/media/:lang — delete media
gallery.delete('/:id/media/:lang', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400);

  const service = new GalleryService(c.env.DB, c.env.MEDIA_BUCKET);
  await service.deleteMedia(id, c.req.param('lang'));

  const versionVectorService = c.get('versionVectorService');
  await versionVectorService.notifyChange(['gallery']);

  return c.json({ success: true });
});

// GET /:id/availability-rules — list rules
gallery.get('/:id/availability-rules', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400);

  const service = new GalleryService(c.env.DB, c.env.MEDIA_BUCKET);
  const rules = await service.listRules(id);
  return c.json(rules);
});

// POST /:id/availability-rules — create rule
gallery.post('/:id/availability-rules', async (c) => {
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

  const parsed = availabilityRuleSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? 'Validation error' }, 400);
  }

  const service = new GalleryService(c.env.DB, c.env.MEDIA_BUCKET);
  const rule = await service.createRule(id, parsed.data);

  const versionVectorService = c.get('versionVectorService');
  await versionVectorService.notifyChange(['gallery']);

  return c.json(rule, 201);
});

export { gallery as galleryRoutes };
