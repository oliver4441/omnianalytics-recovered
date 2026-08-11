import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildRelationshipIndex,
  filterIntegrationDataset,
  filterIntegrationEvents,
  findConnectionPath,
  getTimelineFilterOptions,
  isTimestampWithinLocalDateRange,
  normalizeIntegrationDataset,
  sanitizeIntegrationMetadata,
  sanitizeResourceForExport,
} from '../src/modules/integrations/service.js';
import {
  getProviderCapabilities,
  getSafeProviderUrl,
  supportsProviderAction,
} from '../src/modules/integrations/providers/registry.js';

const dataset = {
  accounts: [],
  integrations: [],
  notices: [],
  resources: [
    { id: 'account:a', name: 'Team A', externalId: 'a', provider: 'github', type: 'account', status: 'connected', verificationState: 'verified', metadata: {} },
    { id: 'repository:a', name: 'API repository', externalId: 'team/api', accountId: 'account:a', provider: 'github', type: 'repository', status: 'healthy', verificationState: 'imported', metadata: { language: 'JavaScript' } },
    { id: 'deployment:a', name: 'Production', externalId: 'production', provider: 'vercel', type: 'deployment', status: 'degraded', verificationState: 'verified', metadata: {} },
  ],
  connections: [
    { id: 'owns', sourceResourceId: 'account:a', targetResourceId: 'repository:a', relationshipType: 'owns', provider: 'github', status: 'healthy', verificationState: 'verified', metadata: {} },
    { id: 'deploys', sourceResourceId: 'repository:a', targetResourceId: 'deployment:a', relationshipType: 'deploys_to', provider: 'vercel', status: 'degraded', verificationState: 'verified', metadata: {} },
  ],
  events: [
    { id: 'event:old', resourceId: 'repository:a', provider: 'github', eventType: 'commit_recorded', status: 'recorded', timestamp: '2026-08-01T12:00:00Z' },
    { id: 'event:new', resourceId: 'deployment:a', accountId: 'account:a', projectId: 'project:a', userId: 'user:deploy', actor: { name: 'Deploy Bot' }, provider: 'vercel', source: 'vercel_api', eventType: 'deployment_completed', status: 'success', timestamp: '2026-08-10T12:00:00Z' },
  ],
};

test('normalization preserves attributed records and excludes orphan relationships', () => {
  const normalized = normalizeIntegrationDataset({
    ...dataset,
    resources: [
      ...dataset.resources.map((resource) => resource.id === 'repository:a' ? {
        ...resource,
        rawCredential: 'must-not-cross-the-domain-boundary',
        metadata: {
          ...resource.metadata,
          owner: 'team-a',
          summary: 'token=must-not-cross-the-domain-boundary',
          url: 'https://github.com/team/api',
        },
      } : resource),
      { id: 'unknown', name: 'Unknown', provider: 'manual', type: 'unsupported', status: 'unsupported', verificationState: 'unsupported' },
    ],
    connections: [...dataset.connections, { id: 'orphan', sourceResourceId: 'repository:a', targetResourceId: 'missing', status: 'healthy', verificationState: 'inferred' }],
    events: [...dataset.events, { id: 'orphan-event', resourceId: 'missing', timestamp: '2026-08-11T00:00:00Z' }],
  });

  assert.equal(normalized.resources.at(-1).type, 'unknown');
  assert.equal(normalized.resources.at(-1).status, 'unknown');
  assert.equal(normalized.resources.at(-1).verificationState, 'unknown');
  assert.equal('rawCredential' in normalized.resources[1], false);
  assert.equal(normalized.resources[1].accountId, 'account:a');
  assert.deepEqual(normalized.resources[1].metadata, { language: 'JavaScript', owner: 'team-a' });
  assert.equal(normalized.resources[1].providerUrl, 'https://github.com/team/api');
  assert.equal(normalized.connections.some(({ id }) => id === 'orphan'), false);
  assert.equal(normalized.connections[0].origin, 'unknown');
  assert.equal(normalized.events.some(({ id }) => id === 'orphan-event'), false);
  assert.deepEqual(normalized.events.map(({ id }) => id), ['event:new', 'event:old']);
});

test('relationship index and traversal return the deterministic shortest recorded path', () => {
  const index = buildRelationshipIndex(dataset);
  assert.equal(index.adjacency.get('repository:a').length, 2);

  assert.deepEqual(findConnectionPath(dataset, 'account:a', 'deployment:a'), {
    resources: ['account:a', 'repository:a', 'deployment:a'],
    connections: ['owns', 'deploys'],
  });
  assert.equal(findConnectionPath(dataset, 'account:a', 'missing'), null);
  assert.equal(findConnectionPath(dataset, 'missing', 'missing'), null);
});

test('resource filters keep only relationships and events inside the visible resource set', () => {
  const filtered = filterIntegrationDataset(dataset, { provider: 'github', search: 'api', resourceType: 'repository' });
  assert.deepEqual(filtered.resources.map(({ id }) => id), ['repository:a']);
  assert.deepEqual(filtered.connections, []);
  assert.deepEqual(filtered.events.map(({ id }) => id), ['event:old']);
});

test('detail and export sanitization allowlists metadata and excludes credential-shaped fields', () => {
  const metadata = sanitizeIntegrationMetadata({
    owner: 'team-a',
    visibility: 'private',
    token: 'must-not-leave-the-boundary',
    arbitraryValue: 'must-not-leave-the-boundary',
    summary: 'password=must-not-leave-the-boundary',
    permissions: ['read'],
    nested: { password: 'must-not-leave-the-boundary' },
  });
  assert.deepEqual(metadata, { owner: 'team-a', visibility: 'private', permissions: ['read'] });

  const exported = sanitizeResourceForExport({
    ...dataset.resources[1],
    metadata: { ...metadata, secret: 'hidden' },
  });
  assert.equal(exported.accountId, 'account:a');
  assert.deepEqual(exported.metadata, metadata);
  assert.equal('raw' in exported, false);
});

test('provider-specific capabilities stay behind the integration provider boundary', () => {
  assert.equal(getProviderCapabilities('github').resourceTypes.includes('repository'), true);
  assert.equal(Object.isFrozen(getProviderCapabilities('github').actions), true);
  assert.equal(supportsProviderAction('github', 'open_provider'), true);
  assert.equal(supportsProviderAction('unknown-provider', 'open_provider'), false);
  assert.equal(getSafeProviderUrl('github', 'https://github.com/team/api'), 'https://github.com/team/api');
  assert.equal(getSafeProviderUrl('github', 'https://attacker.example/team/api'), null);
  assert.equal(getSafeProviderUrl('github', 'https://user:password@github.com/team/api'), null);
  assert.equal(getSafeProviderUrl('github', 'https://github.com/team/api?token=secret'), null);
  assert.equal(getSafeProviderUrl('github', 'https://github.com/team/api#token'), null);
  assert.equal(getSafeProviderUrl('unknown-provider', 'https://github.com/team/api'), null);
});

test('timeline filters combine provider, resource, event, status, attribution, and inclusive dates', () => {
  const filtered = filterIntegrationEvents(dataset.events, {
    provider: 'vercel',
    resourceId: 'deployment:a',
    accountId: 'account:a',
    projectId: 'project:a',
    userId: 'user:deploy',
    actor: 'deploy',
    eventType: 'deployment_completed',
    status: 'success',
    source: 'vercel_api',
    from: '2026-08-10',
    to: '2026-08-10',
  });
  assert.deepEqual(filtered.map(({ id }) => id), ['event:new']);

  const localDateEvents = [
    { id: 'local-end', timestamp: new Date(2026, 7, 10, 23, 59, 59, 999).toISOString() },
    { id: 'next-local-day', timestamp: new Date(2026, 7, 11, 0, 0, 0, 0).toISOString() },
  ];
  assert.deepEqual(
    filterIntegrationEvents(localDateEvents, { from: '2026-08-10', to: '2026-08-10' }).map(({ id }) => id),
    ['local-end'],
  );
  assert.equal(isTimestampWithinLocalDateRange(localDateEvents[0].timestamp, '2026-08-10', '2026-08-10'), true);
  assert.equal(isTimestampWithinLocalDateRange(localDateEvents[1].timestamp, '2026-08-10', '2026-08-10'), false);
  assert.equal(isTimestampWithinLocalDateRange(null, '2026-08-10', '2026-08-10'), false);
});

test('timeline user attribution never falls back to actor identity', () => {
  const actorOnlyEvent = {
    ...dataset.events[1],
    id: 'event:actor-only',
    userId: null,
    actor: { identifier: 'user:deploy', name: 'Deploy Bot' },
  };
  const events = [...dataset.events, actorOnlyEvent];

  assert.deepEqual(
    filterIntegrationEvents(events, { userId: 'user:deploy' }).map(({ id }) => id),
    ['event:new'],
  );
  assert.deepEqual(
    filterIntegrationEvents(events, { actor: 'deploy' }).map(({ id }) => id),
    ['event:new', 'event:actor-only'],
  );
});

test('timeline options include event-only account and project identifiers without inventing users', () => {
  const options = getTimelineFilterOptions({
    ...dataset,
    events: [
      ...dataset.events,
      {
        id: 'event:external-context',
        accountId: 'account:event-only',
        projectId: 'project:event-only',
        userId: null,
        actor: { identifier: 'actor-is-not-a-user' },
        provider: 'github',
        eventType: 'issue_opened',
        status: 'recorded',
        source: 'github_api',
        timestamp: '2026-08-11T08:00:00Z',
      },
    ],
  });

  assert.deepEqual(options.accounts.find(({ id }) => id === 'account:event-only'), {
    id: 'account:event-only',
    label: 'account:event-only',
  });
  assert.deepEqual(options.projects.find(({ id }) => id === 'project:event-only'), {
    id: 'project:event-only',
    label: 'project:event-only',
  });
  assert.deepEqual(options.users, ['user:deploy']);
});
