import { Hono } from 'hono';
import type { HonoEnv } from '../types';
import { MenuService } from '../services/menu';

const publicRoutes = new Hono<HonoEnv>();

// GET /menu — public, returns visible items + languages + trait groups + option groups + settings + version
publicRoutes.get('/menu', async (c) => {
  const menuService = new MenuService(c.env.DB);
  const { items, traitGroups, optionGroups, languages, settings } = await menuService.listPublicMenu();

  return c.json({
    items,
    languages,
    traitGroups,
    optionGroups,
    settings,
    version: Math.floor(Date.now() / 1000),
  });
});

export { publicRoutes };
