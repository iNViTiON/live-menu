import { Hono } from 'hono';
import type { HonoEnv } from '../types';
import { MenuService } from '../services/menu';
import { LanguageService } from '../services/language';
import { TraitGroupService } from '../services/trait-group';
import { OptionGroupService } from '../services/option-group';
import { SettingsService } from '../services/settings';

const publicRoutes = new Hono<HonoEnv>();

// GET /menu — public, returns visible items + languages + trait groups + option groups + settings + version
publicRoutes.get('/menu', async (c) => {
  const menuService = new MenuService(c.env.DB);
  const languageService = new LanguageService(c.env.DB, c.env.MEDIA_BUCKET);
  const traitGroupService = new TraitGroupService(c.env.DB);
  const optionGroupService = new OptionGroupService(c.env.DB);
  const settingsService = new SettingsService(c.env.DB);

  const [visibleItems, languages, traitGroups, optionGroups, settings] = await Promise.all([
    menuService.listVisible(),
    languageService.list(),
    traitGroupService.list(),
    optionGroupService.list(),
    settingsService.getAll(),
  ]);

  return c.json({
    items: visibleItems,
    languages,
    traitGroups,
    optionGroups,
    settings,
    version: Math.floor(Date.now() / 1000),
  });
});

export { publicRoutes };
