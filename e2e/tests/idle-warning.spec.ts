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

// ---------------------------------------------------------------------------
// Idle warning overlay — e2e tests
// ---------------------------------------------------------------------------
// Exercises the Phase 4c feature: after ~55s of inactivity on `/` or
// `/customer`, an overlay appears counting down 5 → 0 before the existing
// idle behavior fires (reset language on `/`, navigate to `/` on /customer).
//
// These tests rely on Playwright's Clock API (available in 1.45+; this
// project uses 1.58.2 — see e2e/package.json) to fast-forward time instead
// of wall-clock waits, which would make the suite several minutes slower.
//
// The overlay is a Svelte component the Frontend agent is adding in Phase 4b
// and will be merged in Phase 5 — these tests will fail on main until that
// merge lands. The tests look up the overlay by its visible text because
// the Frontend spec pins those strings ("Are you still there?", "Tap anywhere
// to continue") regardless of the final CSS class naming.
// ---------------------------------------------------------------------------

/**
 * Navigate to /customer via client-side SPA routing.
 * Direct page.goto('/customer') doesn't hit SPA fallback for the menu SPA.
 */
async function gotoCustomer(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForSelector('.customer-mode-btn', { timeout: 10_000 });
  await page.locator('.customer-mode-btn').click();
  await page.waitForURL('**/customer');
  await page.waitForSelector('.scroll-container', { timeout: 10_000 });
}

test.describe('Idle Warning Overlay', () => {
  test.beforeAll(async () => {
    const { adminToken } = getTestData();

    // Clean slate
    await cleanupMenuItems(adminToken);
    await cleanupLanguages(adminToken);

    // Add EE so the customer page has languages and UI strings available
    await authenticatedRequest('/api/languages', adminToken, {
      method: 'POST',
      body: JSON.stringify({ code: 'EE', displayName: 'Estonian' }),
    });

    // Seed customer interaction data so /customer renders something
    execSync(
      'bunx wrangler d1 execute live_menu --local --file=src/db/seed.sql',
      { cwd: BACKEND, stdio: 'pipe' },
    );
  });

  // -------------------------------------------------------------------------
  // /customer — warning + dismiss + timeout
  // -------------------------------------------------------------------------

  test('warning overlay appears after 55s on /customer', async ({ page }) => {
    await page.clock.install();
    await gotoCustomer(page);

    // No overlay yet
    await expect(
      page.getByText('Are you still there?'),
    ).not.toBeVisible();

    // Advance to just before the warning threshold (55s into a 60s window)
    await page.clock.fastForward('00:55');

    // Overlay title and hint should both be visible
    await expect(
      page.getByText('Are you still there?'),
    ).toBeVisible({ timeout: 2_000 });
    await expect(
      page.getByText('Tap anywhere to continue'),
    ).toBeVisible();
  });

  test('tapping during warning dismisses the overlay on /customer', async ({
    page,
  }) => {
    await page.clock.install();
    await gotoCustomer(page);

    await page.clock.fastForward('00:55');
    await expect(page.getByText('Are you still there?')).toBeVisible();

    // Tap anywhere — center of viewport
    await page.mouse.click(200, 300);

    // Overlay should disappear almost immediately
    await expect(
      page.getByText('Are you still there?'),
    ).not.toBeVisible({ timeout: 1_000 });

    // And we're still on /customer (not auto-navigated)
    expect(page.url()).toContain('/customer');
  });

  test('countdown reaching 0 navigates /customer back to /', async ({ page }) => {
    await page.clock.install();
    await gotoCustomer(page);

    // Advance past the full idle window without interacting
    // 55s warning + 5s countdown + a small buffer for the navigation to settle
    await page.clock.fastForward('01:00');

    // Existing idle behavior: navigate back to gallery
    await page.waitForURL(/\/$/, { timeout: 5_000 });
    await page.waitForSelector('.scroll-container', { timeout: 10_000 });
  });

  // -------------------------------------------------------------------------
  // / (gallery) — warning also appears
  // -------------------------------------------------------------------------

  test('warning overlay also appears on / (gallery page) after 55s', async ({
    page,
  }) => {
    await page.clock.install();
    await page.goto('/');
    await page.waitForSelector('.scroll-container', { timeout: 10_000 });

    // No overlay yet
    await expect(
      page.getByText('Are you still there?'),
    ).not.toBeVisible();

    // Fast-forward into the warning phase
    await page.clock.fastForward('00:55');

    await expect(
      page.getByText('Are you still there?'),
    ).toBeVisible({ timeout: 2_000 });
  });

  test('tapping during warning on / dismisses and keeps user on gallery', async ({
    page,
  }) => {
    await page.clock.install();
    await page.goto('/');
    await page.waitForSelector('.scroll-container', { timeout: 10_000 });

    await page.clock.fastForward('00:55');
    await expect(page.getByText('Are you still there?')).toBeVisible();

    await page.mouse.click(200, 300);

    await expect(
      page.getByText('Are you still there?'),
    ).not.toBeVisible({ timeout: 1_000 });

    // Still on gallery
    expect(page.url()).toMatch(/\/$/);
  });
});
