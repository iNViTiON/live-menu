import { Hono } from 'hono';
import type { HonoEnv } from '../types';
import { MenuService } from '../services/menu';
import { LanguageService } from '../services/language';
import { SettingsService } from '../services/settings';

const publicRoutes = new Hono<HonoEnv>();

// GET /menu — public, returns visible items + languages + trait groups + option groups + settings + version
publicRoutes.get('/menu', async (c) => {
  const menuService = new MenuService(c.env.DB);
  const languageService = new LanguageService(c.env.DB, c.env.MEDIA_BUCKET);
  const settingsService = new SettingsService(c.env.DB);

  const [menuData, languages, settings] = await Promise.all([
    menuService.listPublicMenu(),
    languageService.list(),
    settingsService.getAll(),
  ]);

  return c.json({
    items: menuData.items,
    languages,
    traitGroups: menuData.traitGroups,
    optionGroups: menuData.optionGroups,
    settings,
    version: Math.floor(Date.now() / 1000),
  });
});

export { publicRoutes };
