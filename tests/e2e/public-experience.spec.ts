import { expect, test } from '@playwright/test';

test.describe('public OmniAnalytics experience', () => {
  test('presents the sign-in experience and product lifecycle', async ({ page }) => {
    await page.goto('/login');

    await expect(page).toHaveTitle(/OmniAnalytics/);
    await expect(page.getByRole('heading', { name: /Build with context/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Sign in' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByLabel('Software delivery lifecycle')).toContainText('Plan');
    await expect(page.getByLabel('Software delivery lifecycle')).toContainText('Improve');
  });

  test('switches between sign-in and account creation without leaving the page', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('tab', { name: 'Create account' }).click();

    await expect(page).toHaveURL(/\/signup$/);
    await expect(page.getByRole('heading', { name: 'Create your workspace' })).toBeVisible();
    await expect(page.getByPlaceholder('Alex Morgan')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create account', exact: true })).toBeVisible();
  });

  test('redirects protected routes to sign in when no authenticated session exists', async ({ page }) => {
    for (const path of ['/dashboard', '/integrations/graph']) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    }
  });

  test('fits the 320px mobile viewport without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto('/login');

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  });

  test('serves install metadata with the OmniAnalytics identity', async ({ request }) => {
    const response = await request.get('/manifest.json');
    expect(response.ok()).toBeTruthy();
    const manifest = await response.json();

    expect(manifest.name).toBe('OmniAnalytics Engineering Workspace');
    expect(manifest.short_name).toBe('OmniAnalytics');
    expect(manifest.start_url).toBe('/');
  });
});
