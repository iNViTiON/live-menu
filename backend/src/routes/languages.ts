import { Hono } from 'hono';
import type { HonoEnv } from '../types';
import { LanguageService } from '../services/language';
import { languageCreateSchema } from '../validation/schemas';

const languages = new Hono<HonoEnv>();

// GET / — public, returns all languages
languages.get('/', async (c) => {
  const service = new LanguageService(c.env.DB, c.env.MEDIA_BUCKET);
  const langs = await service.list();
  return c.json(langs);
});

// POST / — admin only, add a new language
languages.post('/', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  if (user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const parsed = languageCreateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? 'Validation error' }, 400);
  }

  const service = new LanguageService(c.env.DB, c.env.MEDIA_BUCKET);

  try {
    const lang = await service.add(parsed.data.code, parsed.data.displayName);
    const versionVectorService = c.get('versionVectorService');
    await versionVectorService.notifyChange(['language']);
    return c.json(lang, 201);
  } catch (error: unknown) {
    console.error('Language add error:', error);
    return c.json({ error: 'Language operation failed' }, 400);
  }
});

// DELETE /:code — admin only, clean up R2 + delete
languages.delete('/:code', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  if (user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);

  const code = c.req.param('code');
  const service = new LanguageService(c.env.DB, c.env.MEDIA_BUCKET);

  try {
    await service.delete(code);
    const versionVectorService = c.get('versionVectorService');
    await versionVectorService.notifyChange(['language', 'menuItem', 'media']);
    return c.json({ success: true });
  } catch (error: unknown) {
    console.error('Language delete error:', error);
    return c.json({ error: 'Language operation failed' }, 400);
  }
});

export { languages as languageRoutes };
