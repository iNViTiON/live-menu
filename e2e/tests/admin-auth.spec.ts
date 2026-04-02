import { test, expect } from '@playwright/test';
import {
  setupVirtualAuthenticator,
  removeVirtualAuthenticator,
} from '../helpers/auth';
import { getTestData } from '../helpers/test-data';

test.describe('Admin Authentication', () => {
  test('register with passkey and then login', async ({ page }) => {
    const { registrationToken, registrationUserName } = getTestData();
    const { cdpSession, authenticatorId } =
      await setupVirtualAuthenticator(page);

    // --- Registration ---
    await page.goto(`/admin/register/${registrationToken}`);

    // Wait for token validation and form to appear
    await expect(page.locator('h2')).toHaveText('Register with Passkey');

    // Verify pre-filled name
    await expect(page.locator('#name')).toHaveValue(registrationUserName);
    await expect(page.locator('#name')).toBeDisabled();

    // Click register — virtual authenticator handles WebAuthn ceremony
    await page.click('button[type="submit"]');

    // Should redirect to admin dashboard after successful registration
    await page.waitForURL('**/admin/', { timeout: 15_000 });

    // Verify user name is shown in sidebar
    await expect(page.locator('.user-name')).toHaveText(registrationUserName);

    // --- Logout ---
    await page.click('.logout-btn');
    await page.waitForURL('**/admin/login');

    // --- Login with the same passkey ---
    await page.click('text=Sign In with Passkey');

    // Should redirect back to admin dashboard
    await page.waitForURL('**/admin/', { timeout: 15_000 });
    await expect(page.locator('.user-name')).toHaveText(registrationUserName);

    await removeVirtualAuthenticator(cdpSession, authenticatorId);
  });

  test('invalid registration token shows error', async ({ page }) => {
    await page.goto('/admin/register/invalid-token-does-not-exist');

    // Should show error alert
    await expect(page.locator('.alert-error')).toBeVisible();

    // Should show link to login page
    await expect(page.locator('text=Go to Login')).toBeVisible();
  });

  test('unauthenticated access redirects to login', async ({ page }) => {
    await page.goto('/admin/');
    await page.waitForURL('**/admin/login');
    await expect(page.locator('h1')).toHaveText('Live Menu Admin');
  });
});
