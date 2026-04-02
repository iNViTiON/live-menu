import { test, expect } from '@playwright/test';
import { getTestData } from '../helpers/test-data';
import {
  authenticatedRequest,
  authenticatedJson,
  cleanupMenuItems,
  cleanupLanguages,
  TEST_PNG,
} from '../helpers/api';

test.describe('Public Menu', () => {
  let itemId: number;

  test.beforeAll(async () => {
    const { adminToken } = getTestData();

    // Clean slate
    await cleanupMenuItems(adminToken);
    await cleanupLanguages(adminToken);

    // Create a visible menu item
    const item = await authenticatedJson<{ id: number }>(
      '/api/menu-items',
      adminToken,
      { method: 'POST' },
    );
    itemId = item.id;

    // Set GB name
    await authenticatedRequest(
      `/api/menu-items/${itemId}/names/GB`,
      adminToken,
      {
        method: 'PUT',
        body: JSON.stringify({ name: 'Test Burger' }),
      },
    );

    // Upload media for GB
    const formData = new FormData();
    formData.append(
      'file',
      new Blob([TEST_PNG], { type: 'image/png' }),
      'burger.png',
    );
    await fetch(`http://localhost:8787/api/menu-items/${itemId}/media/GB`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData,
    });

    // Add French language
    await authenticatedRequest('/api/languages', adminToken, {
      method: 'POST',
      body: JSON.stringify({ code: 'FR', displayName: 'French' }),
    });

    // Set FR name
    await authenticatedRequest(
      `/api/menu-items/${itemId}/names/FR`,
      adminToken,
      {
        method: 'PUT',
        body: JSON.stringify({ name: 'Hamburger' }),
      },
    );
  });

  test('displays menu items', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.scroll-container', { timeout: 10_000 });
    await expect(page.locator('.media-item')).toHaveCount(1);
  });

  test('loads media images', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.media-content', { timeout: 10_000 });
    const img = page.locator('.media-content');
    await expect(img).toBeVisible();
  });

  test('language switcher appears with multiple languages', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForSelector('.lang-switcher', { timeout: 10_000 });
    const buttons = page.locator('.lang-btn');
    await expect(buttons).toHaveCount(2); // GB + FR
  });

  test('language switch updates gallery names', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.gallery-bar', { timeout: 10_000 });

    // Should show GB name initially
    await expect(page.locator('.thumb-name').first()).toHaveText('Test Burger');

    // Click the non-active (FR) language button
    await page.locator('.lang-btn:not(.active)').click();

    // Should show FR name
    await expect(page.locator('.thumb-name').first()).toHaveText('Hamburger');

    // Click back to GB
    await page.locator('.lang-btn:not(.active)').click();
    await expect(page.locator('.thumb-name').first()).toHaveText('Test Burger');
  });

  test('gallery bar shows thumbnails', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.gallery-bar', { timeout: 10_000 });

    // Should have a thumbnail button for each item
    await expect(page.locator('.thumb-btn')).toHaveCount(1);

    // Thumbnail should show item name
    await expect(page.locator('.thumb-name').first()).toHaveText('Test Burger');

    // Thumbnail should have media content
    await expect(page.locator('.thumb-media img, .thumb-media video')).toHaveCount(1);
  });

  test('gallery bar scroll to item on click', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.gallery-bar', { timeout: 10_000 });

    // Click the thumbnail
    await page.locator('.thumb-btn').first().click();

    // The corresponding media item should be in viewport
    await expect(page.locator('.media-item').first()).toBeInViewport();
  });
});
