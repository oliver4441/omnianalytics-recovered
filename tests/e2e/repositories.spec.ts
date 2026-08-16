import { expect, test } from '@playwright/test';

test.describe('repositories module', () => {
  test('attributed repository metadata powers the functional module', async ({ request }) => {
    const response = await request.get('/integration-metadata.json');
    expect(response.ok()).toBeTruthy();
    const dataset = await response.json();

    const repositories = dataset.resources.filter(
      (resource: Record<string, unknown>) => resource.type === 'repository',
    );
    expect(repositories.length).toBeGreaterThan(0);

    const repository = repositories[0] as Record<string, unknown>;
    const metadata = (repository.metadata ?? {}) as Record<string, unknown>;
    expect(metadata.fullName).toBeTruthy();
    expect(metadata.defaultBranch).toBeTruthy();
    expect(metadata.url).toMatch(/^https:\/\//);

    const accountIds = new Set(dataset.accounts.map((account: Record<string, unknown>) => account.id));
    expect(accountIds.has(repository.accountId as string)).toBeTruthy();

    const commitEvents = dataset.events.filter(
      (event: Record<string, unknown>) => event.resourceId === repository.id,
    );
    expect(commitEvents.length).toBeGreaterThan(0);
    const eventMetadata = (commitEvents[0].metadata ?? {}) as Record<string, unknown>;
    expect(eventMetadata.shortHash).toBeTruthy();
    expect(eventMetadata.summary).toBeTruthy();
  });

  test('keeps the repositories workspace behind authentication', async ({ page }) => {
    await page.goto('/repositories');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  });
});
