import { Hono } from 'hono';
import type { HonoEnv } from '../types';
import { MenuService } from '../services/menu';
import { GalleryService } from '../services/gallery';

const publicRoutes = new Hono<HonoEnv>();

// Module-level in-memory cache for the Worker isolate
let cachedAppVersion: string | null = null;

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

// GET /gallery — public, returns visible gallery pages + languages + settings + version
publicRoutes.get('/gallery', async (c) => {
  const galleryService = new GalleryService(c.env.DB, c.env.MEDIA_BUCKET);
  const { pages, languages, settings } = await galleryService.listPublicGallery();

  return c.json({
    pages,
    languages,
    settings,
    version: Math.floor(Date.now() / 1000),
  });
});

// GET /check-app-update — public, compares ASSETS build version against D1; broadcasts appVersion on new deploy
publicRoutes.get('/check-app-update', async (c) => {
  const versionRes = await c.env.ASSETS.fetch(
    new Request(new URL('/_app/version.json', c.req.url))
  );
  if (!versionRes.ok) return c.json({ version: null });
  const { version } = (await versionRes.json()) as { version: string };

  // On cold start, read stored version from D1
  if (cachedAppVersion === null) {
    const row = await c.env.DB.prepare(
      "SELECT value FROM settings WHERE key = 'app:build_version'"
    ).first<{ value: string }>();
    cachedAppVersion = row?.value ?? null;
  }

  // If version differs, new build detected — persist and broadcast
  if (cachedAppVersion !== version) {
    const now = Math.floor(Date.now() / 1000);
    await c.env.DB.prepare(
      `INSERT INTO settings (key, value, updated_at)
       VALUES ('app:build_version', ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    ).bind(version, now).run();
    cachedAppVersion = version;

    const vvs = c.get('versionVectorService');
    await vvs.notifyChange(['appVersion']);
  }

  return c.json({ version });
});

export { publicRoutes };
