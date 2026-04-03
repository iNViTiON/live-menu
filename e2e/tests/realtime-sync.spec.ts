import { test, expect } from '@playwright/test';
import { getTestData } from '../helpers/test-data';
import {
  authenticatedRequest,
  authenticatedJson,
  cleanupMenuItems,
  cleanupLanguages,
  TEST_PNG,
} from '../helpers/api';

test.describe('Realtime Sync — WebSocket updates', () => {
  let baseItemId: number;

  test.beforeAll(async () => {
    const { adminToken } = getTestData();

    // Clean slate
    await cleanupMenuItems(adminToken);
    await cleanupLanguages(adminToken);

    // Create one base menu item with GB name and media
    const item = await authenticatedJson<{ id: number }>(
      '/api/menu-items',
      adminToken,
      { method: 'POST' },
    );
    baseItemId = item.id;

    // Set GB name
    await authenticatedRequest(
      `/api/menu-items/${baseItemId}/names/GB`,
      adminToken,
      {
        method: 'PUT',
        body: JSON.stringify({ name: 'Sync Burger' }),
      },
    );

    // Upload media for GB
    const formData = new FormData();
    formData.append(
      'file',
      new Blob([TEST_PNG], { type: 'image/png' }),
      'sync-burger.png',
    );
    await fetch(`http://localhost:8787/api/menu-items/${baseItemId}/media/GB`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData,
    });
  });

  test('new menu item appears on public menu', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.scroll-container', { timeout: 10_000 });

    // Record the current number of items on the page
    const initialCount = await page.locator('.media-item').count();

    const { adminToken } = getTestData();

    // Create a new menu item via the API (triggers version vector bump)
    const newItem = await authenticatedJson<{ id: number }>(
      '/api/menu-items',
      adminToken,
      { method: 'POST' },
    );

    // Set a name on the new item so it is identifiable
    await authenticatedRequest(
      `/api/menu-items/${newItem.id}/names/GB`,
      adminToken,
      {
        method: 'PUT',
        body: JSON.stringify({ name: 'Realtime Salad' }),
      },
    );

    // The WebSocket should push a version_update, causing the menu to reload.
    await expect(page.locator('.media-item')).toHaveCount(initialCount + 1, {
      timeout: 5000,
    });

    // Verify the new item's name appears in the gallery bar
    await expect(
      page.locator('.thumb-name', { hasText: 'Realtime Salad' }),
    ).toBeVisible({ timeout: 5000 });

    // Clean up: delete the item we created
    await authenticatedRequest(
      `/api/menu-items/${newItem.id}`,
      adminToken,
      { method: 'DELETE' },
    );
  });

  test('deleted menu item disappears from public menu', async ({ page }) => {
    const { adminToken } = getTestData();

    // Create a temporary item before opening the page
    const tempItem = await authenticatedJson<{ id: number }>(
      '/api/menu-items',
      adminToken,
      { method: 'POST' },
    );
    await authenticatedRequest(
      `/api/menu-items/${tempItem.id}/names/GB`,
      adminToken,
      {
        method: 'PUT',
        body: JSON.stringify({ name: 'Temp Fries' }),
      },
    );

    await page.goto('/');
    await page.waitForSelector('.scroll-container', { timeout: 10_000 });

    // Wait for both items to be visible (base + temp)
    await expect(page.locator('.media-item')).toHaveCount(2, {
      timeout: 10_000,
    });

    // Delete the temporary item via API
    await authenticatedRequest(
      `/api/menu-items/${tempItem.id}`,
      adminToken,
      { method: 'DELETE' },
    );

    // The WebSocket should push a version_update, causing the menu to reload.
    await expect(page.locator('.media-item')).toHaveCount(1, {
      timeout: 5000,
    });

    // Verify the deleted item's name is gone from the gallery bar
    await expect(
      page.locator('.thumb-name', { hasText: 'Temp Fries' }),
    ).toHaveCount(0, { timeout: 5000 });
  });

  test('renamed menu item updates on public menu', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.scroll-container', { timeout: 10_000 });

    // Verify the base item shows its original name
    await expect(
      page.locator('.thumb-name', { hasText: 'Sync Burger' }),
    ).toBeVisible({ timeout: 5000 });

    const { adminToken } = getTestData();

    // Rename the base item via API
    await authenticatedRequest(
      `/api/menu-items/${baseItemId}/names/GB`,
      adminToken,
      {
        method: 'PUT',
        body: JSON.stringify({ name: 'Renamed Burger' }),
      },
    );

    // The WebSocket should push a version_update, causing the menu to reload.
    await expect(
      page.locator('.thumb-name', { hasText: 'Renamed Burger' }),
    ).toBeVisible({ timeout: 5000 });

    // The old name should be gone
    await expect(
      page.locator('.thumb-name', { hasText: 'Sync Burger' }),
    ).toHaveCount(0, { timeout: 5000 });

    // Cleanup: rename back to original
    await authenticatedRequest(
      `/api/menu-items/${baseItemId}/names/GB`,
      adminToken,
      {
        method: 'PUT',
        body: JSON.stringify({ name: 'Sync Burger' }),
      },
    );
  });

  test('new language appears in public menu switcher', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.scroll-container', { timeout: 10_000 });

    // With only GB, the language switcher is hidden entirely
    await expect(page.locator('.lang-switcher')).toHaveCount(0);

    const { adminToken } = getTestData();

    // Add FR language
    await authenticatedRequest('/api/languages', adminToken, {
      method: 'POST',
      body: JSON.stringify({ code: 'FR', displayName: 'French' }),
    });

    // Set FR name on the base item
    await authenticatedRequest(
      `/api/menu-items/${baseItemId}/names/FR`,
      adminToken,
      {
        method: 'PUT',
        body: JSON.stringify({ name: 'Burger Sync' }),
      },
    );

    // The WebSocket should push a version_update, causing the menu to reload.
    // Switcher should now appear with 2 language buttons (GB + FR).
    await expect(page.locator('.lang-btn')).toHaveCount(2, {
      timeout: 5000,
    });

    // Cleanup: delete FR language
    await authenticatedRequest('/api/languages/FR', adminToken, {
      method: 'DELETE',
    });
  });

  test('removed language disappears from public menu switcher', async ({
    page,
  }) => {
    const { adminToken } = getTestData();

    // Add FR language and set a name before opening the page
    await authenticatedRequest('/api/languages', adminToken, {
      method: 'POST',
      body: JSON.stringify({ code: 'FR', displayName: 'French' }),
    });
    await authenticatedRequest(
      `/api/menu-items/${baseItemId}/names/FR`,
      adminToken,
      {
        method: 'PUT',
        body: JSON.stringify({ name: 'Burger Sync' }),
      },
    );

    await page.goto('/');
    await page.waitForSelector('.scroll-container', { timeout: 10_000 });

    // Verify both languages are present
    await expect(page.locator('.lang-btn')).toHaveCount(2, {
      timeout: 10_000,
    });

    // Delete FR language via API
    await authenticatedRequest('/api/languages/FR', adminToken, {
      method: 'DELETE',
    });

    // The WebSocket should push a version_update, causing the menu to reload.
    // With only GB remaining, the language switcher hides entirely.
    await expect(page.locator('.lang-switcher')).toHaveCount(0, {
      timeout: 5000,
    });
  });

  test('media upload updates public menu', async ({ page }) => {
    const { adminToken } = getTestData();

    // Add FR language so we can upload a media variant for it
    await authenticatedRequest('/api/languages', adminToken, {
      method: 'POST',
      body: JSON.stringify({ code: 'FR', displayName: 'French' }),
    });

    // Set FR name on the base item
    await authenticatedRequest(
      `/api/menu-items/${baseItemId}/names/FR`,
      adminToken,
      {
        method: 'PUT',
        body: JSON.stringify({ name: 'Burger FR' }),
      },
    );

    await page.goto('/');
    await page.waitForSelector('.scroll-container', { timeout: 10_000 });

    // Wait for FR language button to appear
    await expect(page.locator('.lang-btn')).toHaveCount(2, {
      timeout: 10_000,
    });

    // Upload media for FR variant
    const formData = new FormData();
    formData.append(
      'file',
      new Blob([TEST_PNG], { type: 'image/png' }),
      'burger-fr.png',
    );
    await fetch(`http://localhost:8787/api/menu-items/${baseItemId}/media/FR`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData,
    });

    // Switch to FR language to see the newly uploaded media
    await page.locator('.lang-btn:not(.active)').click();

    // The media content should be visible for the FR variant
    await expect(page.locator('.media-content')).toBeVisible({ timeout: 5000 });

    // Cleanup: delete FR language (cascades media cleanup)
    await authenticatedRequest('/api/languages/FR', adminToken, {
      method: 'DELETE',
    });
  });
});
