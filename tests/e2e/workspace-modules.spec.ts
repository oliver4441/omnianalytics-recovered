import { expect, test } from '@playwright/test';

test.describe('workspace module routes', () => {
  test('keeps every workspace module behind authentication', async ({ page }) => {
    for (const path of ['/repositories', '/issues', '/cicd', '/releases', '/analytics', '/security', '/docs']) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    }
  });

  test('integration metadata powers repositories and releases honestly', async ({ request }) => {
    const response = await request.get('/integration-metadata.json');
    expect(response.ok()).toBeTruthy();
    const dataset = await response.json();

    const repositories = dataset.resources.filter((resource: Record<string, unknown>) => resource.type === 'repository');
    expect(repositories.length).toBeGreaterThan(0);
    for (const repository of repositories) {
      const metadata = repository.metadata as Record<string, unknown>;
      expect(Array.isArray(metadata.branches)).toBeTruthy();
      expect(Array.isArray(metadata.contributors)).toBeTruthy();
      expect(typeof metadata.commitCount).toBe('number');
      expect(typeof metadata.readmePresent).toBe('boolean');
      expect(typeof metadata.defaultBranch).toBe('string');
    }

    // Release milestones only exist when real git tags do.
    const releases = dataset.resources.filter((resource: Record<string, unknown>) => resource.type === 'release');
    for (const release of releases) {
      const metadata = release.metadata as Record<string, unknown>;
      expect(typeof metadata.version).toBe('string');
      expect(typeof metadata.createdAt).toBe('string');
      expect(Array.isArray(metadata.changelog)).toBeTruthy();
      const publishesLinks = dataset.connections.filter((connection: Record<string, unknown>) => (
        connection.relationshipType === 'publishes' && connection.targetResourceId === release.id
      ));
      expect(publishesLinks.length).toBeGreaterThan(0);
    }

    const commitEvents = dataset.events.filter((event: Record<string, unknown>) => event.eventType === 'commit_recorded');
    expect(commitEvents.length).toBeGreaterThan(0);
    for (const event of commitEvents) {
      expect(Boolean(event.timestamp)).toBeTruthy();
      expect(Boolean(event.actor)).toBeTruthy();
    }
  });

  test('workspace profile inventories manifests, rules posture, environments, and docs', async ({ request }) => {
    const response = await request.get('/integration-metadata.json');
    expect(response.ok()).toBeTruthy();
    const dataset = await response.json();

    const workspace = dataset.workspace;
    expect(workspace).toBeTruthy();
    expect(workspace.manifests['package.json']).toBe(true);

    expect(workspace.rulesPosture.present).toBe(true);
    expect(workspace.rulesPosture).toHaveProperty('openAccess');
    expect(workspace.rulesPosture).toHaveProperty('rulesVersion');

    expect(Array.isArray(workspace.environments)).toBeTruthy();
    for (const environment of workspace.environments) {
      expect(Boolean(environment.id)).toBeTruthy();
      expect(Boolean(environment.label)).toBeTruthy();
      expect(Boolean(environment.source)).toBeTruthy();
    }

    expect(Array.isArray(workspace.documentation)).toBeTruthy();
    const readme = workspace.documentation.find((entry: Record<string, unknown>) => entry.path === 'README.md');
    expect(readme).toBeTruthy();
    expect(typeof readme.content).toBe('string');
    expect(readme.content.length).toBeGreaterThan(0);
  });

  test('workspace profile and documentation remain credential-free', async ({ request }) => {
    const response = await request.get('/integration-metadata.json');
    expect(response.ok()).toBeTruthy();
    const dataset = await response.json();

    const serialized = JSON.stringify(dataset.workspace);
    expect(serialized).not.toMatch(/(?:gh[pousr]_|github_pat_|glpat-|xox[baprs]-|sk_(?:live|test)_)[A-Za-z0-9_-]{12,}/i);
    expect(serialized).not.toMatch(/(?:password|secret|token|api[_-]?key|private[_-]?key)\s*[:=]\s*\S+/i);
    expect(serialized).not.toContain('BEGIN');
  });
});
