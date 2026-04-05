import { Hono } from 'hono';
import type { HonoEnv } from '../types';
import { SettingsService } from '../services/settings';
import { settingValueSchema } from '../validation/schemas';

const settings = new Hono<HonoEnv>();

// GET / — get all settings
settings.get('/', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const service = new SettingsService(c.env.DB);
  return c.json(await service.getAll());
});

// PUT /:key — set a setting value
settings.put('/:key', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const key = c.req.param('key');
  if (!/^[a-zA-Z0-9:_-]{1,100}$/.test(key)) {
    return c.json({ error: 'Invalid settings key' }, 400);
  }

  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON' }, 400); }

  const parsed = settingValueSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? 'Validation error' }, 400);

  const service = new SettingsService(c.env.DB);
  const setting = await service.set(key, parsed.data.value);

  const vvs = c.get('versionVectorService');
  await vvs.notifyChange(['setting']);

  return c.json(setting);
});

export { settings as settingRoutes };
