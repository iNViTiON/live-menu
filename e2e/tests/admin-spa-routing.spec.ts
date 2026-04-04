import { test, expect } from '@playwright/test';
import { getTestData } from '../helpers/test-data';

test.describe('Admin SPA Fallback Routing', () => {
  test.beforeEach(async ({ page }) => {
    const { adminToken } = getTestData();
    await page.addInitScript((token: string) => {
      localStorage.setItem('auth_token', token);
    }, adminToken);
  });

  test('direct navigation to /admin/users loads the page', async ({
    page,
  }) => {
    await page.goto('/admin/users');
    await expect(page.locator('h1')).toHaveText('Users', { timeout: 15_000 });
  });

  test('direct navigation to /admin/languages loads the page', async ({
    page,
  }) => {
    await page.goto('/admin/languages');
    await expect(page.locator('h1')).toHaveText('Languages', {
      timeout: 15_000,
    });
  });
});
