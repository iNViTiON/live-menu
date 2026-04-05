import { Hono } from 'hono';
import type { HonoEnv } from '../types';
import { MenuService } from '../services/menu';
import { GalleryService } from '../services/gallery';

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

// GET /gallery — public, returns visible gallery pages + languages + version
publicRoutes.get('/gallery', async (c) => {
  const galleryService = new GalleryService(c.env.DB, c.env.MEDIA_BUCKET);
  const { pages, languages } = await galleryService.listPublicGallery();

  return c.json({
    pages,
    languages,
    version: Math.floor(Date.now() / 1000),
  });
});

export { publicRoutes };
