import { test, expect } from '@playwright/test';
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getTestData } from '../helpers/test-data';
import { authenticatedRequest, cleanupMenuItems, cleanupLanguages } from '../helpers/api';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BACKEND = resolve(__dirname, '..', '..', 'backend');

test.describe('Admin Customer Menu', () => {
  test.beforeAll(async () => {
    const { adminToken } = getTestData();

    // Clean slate
    await cleanupMenuItems(adminToken);
    await cleanupLanguages(adminToken);

    // Add EE language
    await authenticatedRequest('/api/languages', adminToken, {
      method: 'POST',
      body: JSON.stringify({ code: 'EE', displayName: 'Estonian' }),
    });

    // Seed full customer interaction data
    execSync(
      'bunx wrangler d1 execute live_menu --local --file=src/db/seed.sql',
      { cwd: BACKEND, stdio: 'pipe' },
    );
  });

  test.beforeEach(async ({ page }) => {
    const { adminToken } = getTestData();

    // Authenticate
    await page.addInitScript((token: string) => {
      localStorage.setItem('auth_token', token);
    }, adminToken);

    await page.goto('/admin/customer-menu');
    await expect(page.locator('h1')).toHaveText('Customer Menu');
  });

  test('page loads with tabs', async ({ page }) => {
    // All 5 tabs should be visible
    const tabs = page.locator('.tab-btn');
    await expect(tabs).toHaveCount(5);
    await expect(tabs.nth(0)).toHaveText('Settings');
    await expect(tabs.nth(1)).toHaveText('Traits');
    await expect(tabs.nth(2)).toHaveText('Trait Groups');
    await expect(tabs.nth(3)).toHaveText('Option Groups');
    await expect(tabs.nth(4)).toHaveText('Assignments');
  });

  test('Traits tab shows existing traits', async ({ page }) => {
    // Navigate to Traits tab
    await page.locator('.tab-btn:has-text("Traits")').click();

    // Wait for trait list to load
    await page.waitForSelector('.item-list', { timeout: 10_000 });

    // Should show multiple traits from seed data
    const traitCards = page.locator('.item-list > .item-card');
    const count = await traitCards.count();
    expect(count).toBeGreaterThanOrEqual(5);

    // Count label should reflect the number of traits
    await expect(page.locator('.count')).toContainText('trait');
  });

  test('Option Groups tab shows existing option groups with options', async ({
    page,
  }) => {
    // Navigate to Option Groups tab
    await page.locator('.tab-btn:has-text("Option Groups")').click();

    // Wait for option group list to load
    await page.waitForSelector('.item-list', { timeout: 10_000 });

    // Should show multiple option groups from seed data
    const ogCards = page.locator('.item-list > .item-card');
    const count = await ogCards.count();
    expect(count).toBeGreaterThanOrEqual(3);

    // Count label should reflect the number of groups
    await expect(page.locator('.count')).toContainText('group');

    // First option group should show option count
    const firstCard = ogCards.first();
    await expect(firstCard.locator('.item-id')).toContainText('option');
  });
});
