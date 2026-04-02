import { test, expect } from '@playwright/test';
import { getTestData } from '../helpers/test-data';
import { cleanupLanguages } from '../helpers/api';

test.describe('Admin Language Management', () => {
  test.beforeEach(async ({ page }) => {
    const { adminToken } = getTestData();

    // Clean up non-base languages
    await cleanupLanguages(adminToken);

    // Authenticate and navigate
    await page.addInitScript((token: string) => {
      localStorage.setItem('auth_token', token);
    }, adminToken);
    await page.goto('/admin/languages');
    await expect(page.locator('h1')).toHaveText('Languages');
  });

  test('GB base language is listed and cannot be deleted', async ({ page }) => {
    // GB should be visible with base badge
    await expect(page.locator('.lang-code')).toHaveText('GB');
    await expect(page.locator('.lang-name')).toHaveText('English (UK)');
    await expect(page.locator('.base-badge')).toHaveText('base');

    // Delete button should be disabled for base language
    await expect(page.locator('.btn-delete')).toBeDisabled();
  });

  test('add and delete a language', async ({ page }) => {
    // Fill in the add language form
    await page.fill('#lang-code', 'FR');
    await page.fill('#lang-name', 'French');
    await page.click('button:has-text("Add Language")');

    // Wait for FR to appear in the list
    await expect(page.locator('.lang-row')).toHaveCount(2);

    const frRow = page.locator('.lang-row').nth(1);
    await expect(frRow.locator('.lang-code')).toHaveText('FR');
    await expect(frRow.locator('.lang-name')).toHaveText('French');

    // FR should have an enabled delete button (not base)
    const deleteBtn = frRow.locator('.btn-delete');
    await expect(deleteBtn).toBeEnabled();

    // Delete FR — handle confirm dialog
    page.once('dialog', (dialog) => dialog.accept());
    await deleteBtn.click();

    // FR should be removed
    await expect(page.locator('.lang-row')).toHaveCount(1);
    await expect(page.locator('.lang-code')).toHaveText('GB');
  });
});
