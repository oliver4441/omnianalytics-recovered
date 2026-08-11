import { expect, test } from '@playwright/test';

test.describe('integration explorer boundaries', () => {
  test('serves attributed relationship metadata without credential fields', async ({ request }) => {
    const response = await request.get('/integration-metadata.json');
    expect(response.ok()).toBeTruthy();
    const dataset = await response.json();

    expect(dataset.schemaVersion).toBe(1);
    expect(dataset.resources.length).toBeGreaterThan(0);
    expect(dataset.connections.length).toBeGreaterThan(0);
    expect(dataset.events.length).toBeGreaterThan(0);
    const accountIds = new Set(dataset.accounts.map((account: Record<string, unknown>) => account.id));
    const resourceIds = new Set(dataset.resources.map((resource: Record<string, unknown>) => resource.id));
    expect(dataset.resources.every((resource: Record<string, unknown>) => (
      !resource.accountId || accountIds.has(resource.accountId)
    ))).toBeTruthy();
    expect(dataset.connections.every((connection: Record<string, unknown>) => (
      resourceIds.has(connection.sourceResourceId)
      && resourceIds.has(connection.targetResourceId)
      && Boolean(connection.relationshipType)
      && Boolean(connection.provider)
      && Object.hasOwn(connection, 'createdAt')
      && Object.hasOwn(connection, 'lastVerifiedAt')
      && Boolean(connection.updatedAt)
      && Boolean(connection.status)
      && Boolean(connection.verificationState)
      && Boolean(connection.source)
      && Boolean(connection.origin)
    ))).toBeTruthy();

    const serialized = JSON.stringify(dataset);
    expect(serialized).not.toContain('remote.origin.url');
    expect(serialized).not.toMatch(/https?:\/\/[^/\s]+@/);
    expect(serialized).not.toMatch(/(?:gh[pousr]_|github_pat_|glpat-|xox[baprs]-|sk_(?:live|test)_)[A-Za-z0-9_-]{12,}/i);
  });

  test('keeps project-focused explorer links behind authentication', async ({ page }) => {
    await page.goto('/integrations/graph?project=project-123');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  });
});
