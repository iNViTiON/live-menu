import { test, expect } from '@playwright/test';
import { getTestData } from '../helpers/test-data';

test.describe('Admin User Management', () => {
  test.beforeEach(async ({ page }) => {
    const { adminToken } = getTestData();
    await page.addInitScript((token: string) => {
      localStorage.setItem('auth_token', token);
    }, adminToken);
    await page.goto('/admin/users');
    await expect(page.locator('h1')).toHaveText('Users', { timeout: 15_000 });
  });

  test('test admin is listed', async ({ page }) => {
    await expect(page.locator('.users-table')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.users-table')).toContainText('Test Admin');
  });

  test('generate registration link for new staff', async ({ page }) => {
    await page.fill('#reg-name', 'New Waiter');
    await expect(page.locator('#reg-role')).toHaveValue('staff');

    await page.click('button:has-text("Generate Link")');

    await expect(page.locator('.alert-success')).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator('.alert-success')).toContainText(
      'Registration link generated',
    );

    const linkInput = page.locator('.copy-row input');
    const linkValue = await linkInput.inputValue();
    expect(linkValue).toContain('/admin/register/');

    // Reload page to refresh the token list
    await page.reload();
    await expect(page.locator('h1')).toHaveText('Users', { timeout: 15_000 });
    await expect(page.locator('.tokens-table')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.tokens-table')).toContainText('New Waiter');
  });

  test('revoke registration token', async ({ page }) => {
    // Generate a fresh token
    await page.fill('#reg-name', 'Temp User');
    await page.click('button:has-text("Generate Link")');
    await expect(page.locator('.alert-success')).toBeVisible({
      timeout: 10_000,
    });

    // Reload to see token in list
    await page.reload();
    await expect(page.locator('h1')).toHaveText('Users', { timeout: 15_000 });
    await expect(page.locator('.tokens-table')).toBeVisible({ timeout: 10_000 });

    const countBefore = await page.locator('.tokens-table tbody tr').count();
    expect(countBefore).toBeGreaterThanOrEqual(1);

    // Revoke the last token
    page.once('dialog', (dialog) => dialog.accept());
    await page.locator('.btn-revoke').last().click();

    // Token count should decrease
    await expect(page.locator('.tokens-table tbody tr')).toHaveCount(
      countBefore - 1,
      { timeout: 5_000 },
    );
  });
});
