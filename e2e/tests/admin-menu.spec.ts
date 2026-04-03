import { test, expect } from '@playwright/test';
import { getTestData } from '../helpers/test-data';
import { cleanupMenuItems, TEST_PNG } from '../helpers/api';

test.describe('Admin Menu Management', () => {
  test.beforeEach(async ({ page }) => {
    const { adminToken } = getTestData();

    // Clean up any existing items
    await cleanupMenuItems(adminToken);

    // Authenticate and navigate
    await page.addInitScript((token: string) => {
      localStorage.setItem('auth_token', token);
    }, adminToken);
    await page.goto('/admin/');
    await expect(page.locator('h1')).toHaveText('Menu');
    // Wait for items to load (should show empty state)
    await expect(page.locator('.empty')).toBeVisible({ timeout: 10_000 });
    // Let WS-triggered reloads settle before interacting
    await page.waitForLoadState('networkidle');
  });

  test('create menu item and set name', async ({ page }) => {
    // Create a new item
    await page.click('.btn-add');

    // Wait for item to appear
    await expect(page.locator('.item-card')).toHaveCount(1, { timeout: 10_000 });

    // Expand editor
    await page.click('.btn-expand');
    await expect(page.locator('.editor')).toBeVisible();

    // Type name in GB tab and save
    await page.fill('#name-GB', 'Test Dish');
    await page.click('.editor .btn-save');

    // Wait for name to update in the item list
    await expect(page.locator('.item-name')).toHaveText('Test Dish');
  });

  test('upload media for menu item', async ({ page }) => {
    // Create item and expand editor
    await page.click('.btn-add');
    await expect(page.locator('.item-card')).toHaveCount(1, { timeout: 10_000 });
    await page.click('.btn-expand');
    await expect(page.locator('.editor')).toBeVisible();

    // Verify no media initially
    await expect(page.locator('.no-media')).toBeVisible();

    // Upload test image via hidden file input — wait for API response
    const fileInput = page.locator('.file-input');
    const uploadDone = page.waitForResponse(
      (resp) =>
        resp.url().includes('/api/menu-items/') &&
        resp.url().includes('/media/'),
      { timeout: 15_000 },
    );
    await fileInput.setInputFiles({
      name: 'test-image.png',
      mimeType: 'image/png',
      buffer: TEST_PNG,
    });
    await uploadDone;

    // Wait for store refetch + re-render, then re-expand editor
    await expect(page.locator('.item-card')).toHaveCount(1, { timeout: 10_000 });
    await page.click('.btn-expand');
    await expect(page.locator('.media-preview')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.media-type')).toHaveText('image');
  });

  test('toggle visibility', async ({ page }) => {
    // Create item
    await page.click('.btn-add');
    await expect(page.locator('.item-card')).toHaveCount(1, { timeout: 10_000 });

    // Initially visible
    await expect(page.locator('.toggle-label')).toHaveText('Visible');

    // Toggle off
    await page.click('.visibility-toggle input');
    await expect(page.locator('.toggle-label')).toHaveText('Hidden');

    // Toggle back on
    await page.click('.visibility-toggle input');
    await expect(page.locator('.toggle-label')).toHaveText('Visible');
  });

  test('reorder menu items', async ({ page }) => {
    // Create first item with name
    await page.click('.btn-add');
    await page.click('.btn-expand');
    await page.fill('#name-GB', 'Alpha');
    await page.click('.editor .btn-save');
    await expect(page.locator('.item-name').first()).toHaveText('Alpha');
    // Close editor
    await page.locator('.btn-expand').first().click();

    // Create second item
    await page.click('.btn-add');
    await expect(page.locator('.item-card')).toHaveCount(2);

    // Move first item down (click the down arrow ▼ on the first item)
    const firstItem = page.locator('.item-card').first();
    await firstItem.locator('button[title="Move down"]').click();

    // First item in the list should no longer be "Alpha"
    await expect(page.locator('.item-name').first()).not.toHaveText('Alpha');
    // Alpha should now be second
    await expect(page.locator('.item-name').nth(1)).toHaveText('Alpha');
  });

  test('delete menu item', async ({ page }) => {
    // Create item
    await page.click('.btn-add');
    await expect(page.locator('.item-card')).toHaveCount(1, { timeout: 10_000 });

    // Accept the confirm dialog
    page.once('dialog', (dialog) => dialog.accept());

    // Click delete
    await page.locator('.btn-delete').first().click();

    // Item should be removed, empty state should appear
    await expect(page.locator('.item-card')).toHaveCount(0);
    await expect(page.locator('.empty')).toBeVisible();
  });
});
