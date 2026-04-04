import { test, expect, type Page } from '@playwright/test';
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getTestData } from '../helpers/test-data';
import {
  authenticatedRequest,
  cleanupMenuItems,
  cleanupLanguages,
} from '../helpers/api';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BACKEND = resolve(__dirname, '..', '..', 'backend');

/**
 * Navigate to /customer via client-side SPA routing.
 * Direct page.goto('/customer') fails because the Worker doesn't have
 * SPA fallback for the menu SPA — only client-side navigation works.
 */
async function gotoCustomer(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForSelector('.customer-mode-btn', { timeout: 10_000 });
  await page.locator('.customer-mode-btn').click();
  await page.waitForURL('**/customer');
  await page.waitForSelector('.scroll-container', { timeout: 10_000 });
}

test.describe('Public Customer Page', () => {
  test.beforeAll(async () => {
    const { adminToken } = getTestData();

    // Clean slate
    await cleanupMenuItems(adminToken);
    await cleanupLanguages(adminToken);

    // Add EE language (seed data has EE translations but the language record isn't in seed.sql)
    await authenticatedRequest('/api/languages', adminToken, {
      method: 'POST',
      body: JSON.stringify({ code: 'EE', displayName: 'Estonian' }),
    });

    // Seed full customer interaction data (traits, trait groups, option groups, menu items, settings)
    execSync(
      'bunx wrangler d1 execute live_menu --local --file=src/db/seed.sql',
      { cwd: BACKEND, stdio: 'pipe' },
    );
  });

  test('page loads with trait groups and items', async ({ page }) => {
    await gotoCustomer(page);

    // Should have trait groups rendered
    const traitGroups = page.locator('.trait-group');
    await expect(traitGroups.first()).toBeVisible();
    const groupCount = await traitGroups.count();
    expect(groupCount).toBeGreaterThanOrEqual(2);

    // Should have items rendered
    const items = page.locator('.item-card');
    await expect(items.first()).toBeVisible();
    const itemCount = await items.count();
    expect(itemCount).toBeGreaterThanOrEqual(5);
  });

  test('click a trait pill filters items', async ({ page }) => {
    await gotoCustomer(page);

    // Get initial item count
    const initialCount = await page.locator('.item-card').count();

    // Click the first trait pill
    await page.locator('.trait-pill').first().click();

    // Items count text should show filtering (e.g. "X of Y drinks")
    await expect(page.locator('.items-count')).toContainText('of');

    // Filtered count should be different from total
    const filteredCount = await page.locator('.item-card').count();
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
  });

  test('single-select: clicking another trait in same group deselects previous', async ({
    page,
  }) => {
    await gotoCustomer(page);

    // Find first trait group with at least 2 pills
    const firstGroup = page.locator('.trait-group').first();
    const pills = firstGroup.locator('.trait-pill');
    const pillCount = await pills.count();
    expect(pillCount).toBeGreaterThanOrEqual(2);

    // Click first pill — should become selected
    await pills.nth(0).click();
    await expect(pills.nth(0)).toHaveClass(/selected/);

    // Click second pill — first should deselect, second should select
    await pills.nth(1).click();
    await expect(pills.nth(0)).not.toHaveClass(/selected/);
    await expect(pills.nth(1)).toHaveClass(/selected/);
  });

  test('click item expands showing option groups with prices', async ({
    page,
  }) => {
    await gotoCustomer(page);

    // Click first item header to expand
    const firstItem = page.locator('.item-card').first();
    await firstItem.locator('.item-header').click();

    // Should show expanded state
    await expect(firstItem.locator('.item-header')).toHaveAttribute(
      'aria-expanded',
      'true',
    );

    // Should show option groups or "no options" message
    const optionGroups = firstItem.locator('.option-group');
    const noOptions = firstItem.locator('.no-options');
    const hasOptions = (await optionGroups.count()) > 0;
    const hasNoOptions = (await noOptions.count()) > 0;
    expect(hasOptions || hasNoOptions).toBeTruthy();
  });

  test('Surprise Me button expands a random item', async ({ page }) => {
    await gotoCustomer(page);

    // No item should be expanded initially
    await expect(
      page.locator('.item-header[aria-expanded="true"]'),
    ).toHaveCount(0);

    // Click Surprise Me
    await page.locator('.surprise-btn').click();

    // An item should now be expanded
    await expect(
      page.locator('.item-header[aria-expanded="true"]'),
    ).toHaveCount(1);
  });

  test('Clear all resets filters and shows all items', async ({ page }) => {
    await gotoCustomer(page);

    const totalCount = await page.locator('.item-card').count();

    // Select a trait to activate filters
    await page.locator('.trait-pill').first().click();

    // The reset bar should appear with "Clear all"
    await expect(page.locator('.reset-btn')).toBeVisible();

    // Click Clear all
    await page.locator('.reset-btn').click();

    // Reset bar should disappear
    await expect(page.locator('.reset-btn')).not.toBeVisible();

    // All items should be shown again
    await expect(page.locator('.item-card')).toHaveCount(totalCount);
  });

  test('currency symbol displays correctly', async ({ page }) => {
    await gotoCustomer(page);

    // First item price should contain €
    const priceText = await page.locator('.item-price').first().textContent();
    expect(priceText).toContain('€');
  });

  test('language switcher works — UI text changes when switching to EE', async ({
    page,
  }) => {
    await gotoCustomer(page);

    // Scope to the customer page container to avoid duplicate .lang-switcher from gallery
    const customerPage = page.locator('.page').filter({ has: page.locator('.page-title') });

    // Should show GB text initially
    await expect(customerPage.locator('.page-title')).toHaveText('Find your drink');

    // Click non-active (EE) language button within customer page
    await customerPage.locator('.lang-btn:not(.active)').click();

    // Title should change to Estonian
    await expect(customerPage.locator('.page-title')).toHaveText('Leia oma jook');

    // Switch back to GB
    await customerPage.locator('.lang-btn:not(.active)').click();
    await expect(customerPage.locator('.page-title')).toHaveText('Find your drink');
  });

  test('back button navigates to gallery (/)', async ({ page }) => {
    await gotoCustomer(page);

    // Click back button
    await page.locator('.back-btn').click();

    // Should navigate to gallery
    await page.waitForURL(/\/$/);

    // Gallery should render
    await page.waitForSelector('.scroll-container', { timeout: 10_000 });
  });
});

test.describe('Page Transitions', () => {
  test('gallery → customer → gallery navigation works', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.customer-mode-btn', { timeout: 10_000 });

    // Click "Find your drink" link to go to /customer
    await page.locator('.customer-mode-btn').click();

    // Should navigate to /customer
    await page.waitForURL('**/customer');
    await page.waitForSelector('.scroll-container', { timeout: 10_000 });

    // Customer page should render trait groups
    await expect(page.locator('.trait-group').first()).toBeVisible();

    // Click back button to return to gallery
    await page.locator('.back-btn').click();

    // Should navigate back to /
    await page.waitForURL(/\/$/);

    // Gallery should render
    await page.waitForSelector('.scroll-container', { timeout: 10_000 });
  });
});
