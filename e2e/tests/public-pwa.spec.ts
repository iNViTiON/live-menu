import { test, expect } from '@playwright/test';
import { getTestData } from '../helpers/test-data';
import {
  authenticatedRequest,
  authenticatedJson,
  cleanupMenuItems,
  cleanupLanguages,
  TEST_PNG,
} from '../helpers/api';

test.describe('Public Menu — PWA & Offline', () => {
  test.beforeAll(async () => {
    const { adminToken } = getTestData();

    // Clean slate and create test data
    await cleanupMenuItems(adminToken);
    await cleanupLanguages(adminToken);

    // Create a visible menu item with media
    const item = await authenticatedJson<{ id: number }>(
      '/api/menu-items',
      adminToken,
      { method: 'POST' },
    );

    await authenticatedRequest(
      `/api/menu-items/${item.id}/names/GB`,
      adminToken,
      {
        method: 'PUT',
        body: JSON.stringify({ name: 'Offline Burger' }),
      },
    );

    const formData = new FormData();
    formData.append(
      'file',
      new Blob([TEST_PNG], { type: 'image/png' }),
      'burger.png',
    );
    await fetch(`http://localhost:8787/api/menu-items/${item.id}/media/GB`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData,
    });

    // Add FR for idle timer test
    await authenticatedRequest('/api/languages', adminToken, {
      method: 'POST',
      body: JSON.stringify({ code: 'FR', displayName: 'French' }),
    });
    await authenticatedRequest(
      `/api/menu-items/${item.id}/names/FR`,
      adminToken,
      {
        method: 'PUT',
        body: JSON.stringify({ name: 'Burger Hors Ligne' }),
      },
    );
  });

  test('service worker registers', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.scroll-container', { timeout: 10_000 });

    // Wait for service worker to be ready
    const swActive = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      return reg.active !== null;
    });
    expect(swActive).toBe(true);
  });

  test('service worker caches menu data and media', async ({ page }) => {
    // First load registers the SW
    await page.goto('/');
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });

    // Reload so SW intercepts the fetch and caches data
    await page.reload();
    await page.waitForSelector('.media-item', { timeout: 10_000 });
    await page.waitForTimeout(2000); // Allow SW to finish caching

    // Verify menu data is cached
    const menuCached = await page.evaluate(async () => {
      const cache = await caches.open('menu-manifest-v1');
      const keys = await cache.keys();
      return keys.some((r) => r.url.includes('/api/public/menu'));
    });
    expect(menuCached).toBe(true);

    // Verify media is cached
    const mediaCached = await page.evaluate(async () => {
      const cache = await caches.open('menu-media-v1');
      const keys = await cache.keys();
      return keys.length > 0;
    });
    expect(mediaCached).toBe(true);
  });

  test('idle timer resets language', async ({ page }) => {
    // Patch setTimeout to reduce idle timer from 60s to 1s
    await page.addInitScript(() => {
      const origSetTimeout = globalThis.setTimeout;
      (globalThis as unknown as Record<string, unknown>).setTimeout = function (
        fn: TimerHandler,
        delay?: number,
        ...args: unknown[]
      ) {
        if (delay === 60_000) delay = 1_000;
        return origSetTimeout(fn as (...a: unknown[]) => void, delay, ...args);
      };
    });

    await page.goto('/');
    await page.waitForSelector('.lang-switcher', { timeout: 10_000 });

    // Switch to FR
    await page.locator('.lang-btn:not(.active)').click();
    await expect(page.locator('.thumb-name').first()).toHaveText(
      'Burger Hors Ligne',
    );

    // Wait for idle timer to fire (1s + buffer)
    await page.waitForTimeout(2_000);

    // Language should reset to GB
    await expect(page.locator('.thumb-name').first()).toHaveText(
      'Offline Burger',
    );
  });
});
