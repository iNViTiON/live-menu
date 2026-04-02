import { Hono } from 'hono';
import type { HonoEnv } from '../types';
import { MenuService } from '../services/menu';
import { LanguageService } from '../services/language';

const publicRoutes = new Hono<HonoEnv>();

// GET /menu — public, returns visible items + languages + version timestamp
publicRoutes.get('/menu', async (c) => {
  const menuService = new MenuService(c.env.DB);
  const languageService = new LanguageService(c.env.DB, c.env.MEDIA_BUCKET);

  const [visibleItems, languages] = await Promise.all([
    menuService.listVisible(),
    languageService.list(),
  ]);

  return c.json({
    items: visibleItems,
    languages,
    version: Math.floor(Date.now() / 1000),
  });
});

export { publicRoutes };
