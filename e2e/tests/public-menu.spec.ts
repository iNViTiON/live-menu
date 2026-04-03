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

  test('gallery bar auto-hides after inactivity', async ({ page }) => {
    await page.goto('/');
    const bar = page.locator('.gallery-bar');
    await bar.waitFor({ timeout: 10_000 });

    // Gallery bar should be visible initially (no .hidden class)
    await expect(bar).not.toHaveClass(/\bhidden\b/);

    // Wait 4 seconds — the hide timer fires at 3s with no interaction
    await page.waitForTimeout(4000);

    // Bar should now carry the .hidden class (translateY(100%))
    await expect(bar).toHaveClass(/\bhidden\b/);

    // Interact with the page to bring the bar back
    await page.click('body');

    // Bar should reappear (hidden class removed)
    await expect(bar).not.toHaveClass(/\bhidden\b/);
  });

  test('gallery bar shows readable names next to thumbnails', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForSelector('.gallery-bar', { timeout: 10_000 });

    const thumbBtn = page.locator('.thumb-btn').first();
    const thumbMedia = thumbBtn.locator('.thumb-media');
    const thumbName = thumbBtn.locator('.thumb-name');

    // Both thumbnail image and name should be present
    await expect(thumbMedia).toBeVisible();
    await expect(thumbName).toBeVisible();
    await expect(thumbName).toHaveText('Test Burger');

    // Verify horizontal layout — thumb-btn should use flex-direction: row
    const flexDir = await thumbBtn.evaluate(
      (el) => getComputedStyle(el).flexDirection,
    );
    expect(flexDir).toBe('row');

    // Font size should be readable (>= 12px)
    const fontSize = await thumbName.evaluate((el) =>
      parseFloat(getComputedStyle(el).fontSize),
    );
    expect(fontSize).toBeGreaterThanOrEqual(12);

    // Name should not be truncated with ellipsis
    const textOverflow = await thumbName.evaluate(
      (el) => getComputedStyle(el).textOverflow,
    );
    expect(textOverflow).not.toBe('ellipsis');
  });

  test('language switcher is horizontal', async ({ page }) => {
    await page.goto('/');
    const switcher = page.locator('.lang-switcher');
    await switcher.waitFor({ timeout: 10_000 });

    // Flex-direction should be row (horizontal layout)
    const flexDir = await switcher.evaluate(
      (el) => getComputedStyle(el).flexDirection,
    );
    expect(flexDir).toBe('row');

    // All lang buttons should share the same Y coordinate (horizontal row)
    const buttons = page.locator('.lang-btn');
    const count = await buttons.count();
    expect(count).toBeGreaterThanOrEqual(2); // GB + FR

    const rects = await Promise.all(
      Array.from({ length: count }, (_, i) =>
        buttons.nth(i).boundingBox(),
      ),
    );

    // Every button should have a bounding box
    for (const rect of rects) {
      expect(rect).not.toBeNull();
    }

    // All Y values should be similar (within 5px tolerance)
    const yValues = rects.map((r) => r!.y);
    const minY = Math.min(...yValues);
    const maxY = Math.max(...yValues);
    expect(maxY - minY).toBeLessThan(5);

    // X values should be strictly increasing (left-to-right order)
    for (let i = 1; i < rects.length; i++) {
      expect(rects[i]!.x).toBeGreaterThan(rects[i - 1]!.x);
    }
  });

  test('free scroll — no snap behavior', async ({ page }) => {
    const { adminToken } = getTestData();

    // We need at least 2 items so the page can scroll to a mid-point
    const item2 = await authenticatedJson<{ id: number }>(
      '/api/menu-items',
      adminToken,
      { method: 'POST' },
    );
    await authenticatedRequest(
      `/api/menu-items/${item2.id}/names/GB`,
      adminToken,
      {
        method: 'PUT',
        body: JSON.stringify({ name: 'Test Fries' }),
      },
    );

    await page.goto('/');
    await page.waitForSelector('.scroll-container', { timeout: 10_000 });

    // Wait for both items to render
    await expect(page.locator('.media-item')).toHaveCount(2, {
      timeout: 10_000,
    });

    const container = page.locator('.scroll-container');

    // scroll-snap-type should be "none" or absent (free scroll)
    const snapType = await container.evaluate(
      (el) => getComputedStyle(el).scrollSnapType,
    );
    expect(snapType === 'none' || snapType === '').toBeTruthy();

    // Scroll to a deliberate mid-point between items
    const targetScroll = await container.evaluate((el) => {
      const midPoint = Math.floor(el.scrollHeight / 3);
      el.scrollTop = midPoint;
      return midPoint;
    });

    // Wait briefly for any snap animation that might fire
    await page.waitForTimeout(500);

    // Scroll position should stay where we put it (within 2px tolerance)
    const actualScroll = await container.evaluate((el) => el.scrollTop);
    expect(Math.abs(actualScroll - targetScroll)).toBeLessThan(2);

    // Clean up the extra item
    await authenticatedRequest(
      `/api/menu-items/${item2.id}`,
      adminToken,
      { method: 'DELETE' },
    );
  });

});
