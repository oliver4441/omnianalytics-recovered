import assert from 'node:assert/strict';
import test from 'node:test';

import { isAttentionStatus, normalizeStatus, STATUS_TOKENS } from '../src/modules/status/index.js';
import {
  buildObjectDescriptor,
  describeConnection,
  describeEvent,
  describeResource,
} from '../src/modules/objects/service.js';
import {
  filterTimelineEvents,
  groupEventsByDay,
  kindOfEvent,
  summarizeTimeline,
} from '../src/modules/timeline/service.js';
import {
  buildCommandIndex,
  flattenCommandResults,
  queryCommandIndex,
} from '../src/modules/search/service.js';

const dataset = {
  accounts: [
    { id: 'account:gh', resourceId: 'account:gh', name: 'octo', provider: 'github' },
  ],
  resources: [
    {
      id: 'account:gh',
      name: 'octo',
      provider: 'github',
      type: 'account',
      status: 'connected',
      verificationState: 'verified',
      source: 'repository_metadata',
      metadata: {},
    },
    {
      id: 'repository:one',
      name: 'demo',
      externalId: 'octo/demo',
      accountId: 'account:gh',
      provider: 'github',
      type: 'repository',
      status: 'healthy',
      verificationState: 'imported',
      source: 'repository_metadata',
      providerUrl: 'https://github.com/octo/demo',
      createdAt: '2026-08-01T10:00:00Z',
      updatedAt: '2026-08-11T10:00:00Z',
      metadata: { fullName: 'octo/demo', defaultBranch: 'main' },
    },
    {
      id: 'deployment:prod',
      name: 'Production',
      provider: 'vercel',
      type: 'deployment',
      status: 'degraded',
      verificationState: 'verified',
      source: 'vercel_api',
      metadata: { environment: 'production' },
    },
  ],
  connections: [
    {
      id: 'conn:own',
      sourceResourceId: 'account:gh',
      targetResourceId: 'repository:one',
      relationshipType: 'owns',
      provider: 'github',
      status: 'healthy',
      verificationState: 'verified',
      source: 'github_api',
      origin: 'repository_metadata',
      createdAt: '2026-08-01T10:00:00Z',
      lastVerifiedAt: '2026-08-10T10:00:00Z',
      updatedAt: '2026-08-10T10:00:00Z',
    },
    {
      id: 'conn:deploy',
      sourceResourceId: 'repository:one',
      targetResourceId: 'deployment:prod',
      relationshipType: 'deploys_to',
      provider: 'vercel',
      status: 'degraded',
      verificationState: 'verified',
      source: 'vercel_api',
      origin: 'vercel_api',
      createdAt: '2026-08-02T10:00:00Z',
      lastVerifiedAt: '2026-08-11T09:00:00Z',
      updatedAt: '2026-08-11T09:00:00Z',
    },
  ],
  events: [
    { id: 'e1', resourceId: 'repository:one', provider: 'github', eventType: 'commit_recorded', status: 'recorded', timestamp: '2026-08-11T10:42:00Z', actor: { name: 'octo' }, source: 'repository_metadata', metadata: {} },
    { id: 'e2', resourceId: 'deployment:prod', provider: 'vercel', eventType: 'deployment_completed', status: 'success', timestamp: '2026-08-11T11:46:00Z', actor: { name: 'Deploy Bot' }, source: 'vercel_api', metadata: {} },
    { id: 'e3', resourceId: 'repository:one', provider: 'github', eventType: 'release_published', status: 'recorded', timestamp: '2026-08-10T09:00:00Z', actor: { name: 'octo' }, source: 'repository_metadata', metadata: {} },
  ],
  integrations: [],
  notices: [],
};

// ------------------------------ Status system ------------------------------

test('status: provider-specific statuses normalize onto global tokens', () => {
  assert.equal(normalizeStatus('READY').token, 'healthy');
  assert.equal(normalizeStatus('success').token, 'healthy');
  assert.equal(normalizeStatus('synchronizing').token, 'running');
  assert.equal(normalizeStatus('queued').token, 'pending');
  assert.equal(normalizeStatus('degraded').token, 'warning');
  assert.equal(normalizeStatus('failure').token, 'failed');
  assert.equal(normalizeStatus('revoked').token, 'disconnected');
  assert.equal(normalizeStatus('some-new-provider-state').token, 'unknown');

  const degraded = normalizeStatus('degraded');
  assert.equal(degraded.raw, 'degraded');
  assert.ok(STATUS_TOKENS.some((token) => token.id === degraded.token));
  assert.ok(isAttentionStatus('warning'));
  assert.ok(!isAttentionStatus('healthy'));
});

// ------------------------------ Object model ------------------------------

test('objects: resource descriptor answers identity, ownership, deployment, and history', () => {
  const descriptor = describeResource(dataset, 'repository:one');
  assert.equal(descriptor.title, 'demo');
  assert.equal(descriptor.typeLabel, 'Repository');
  assert.equal(descriptor.provider, 'github');
  assert.equal(descriptor.owner.name, 'octo');
  assert.equal(descriptor.status.token, 'healthy');
  assert.equal(descriptor.connections.length, 2);
  assert.equal(descriptor.eventCount, 2);
  assert.equal(descriptor.lastEventActor, 'octo');

  // deploys_to edge produces the impact/blast-radius list.
  assert.deepEqual(descriptor.impact.map((resource) => resource.id), ['deployment:prod']);

  // Capability-gated action: github supports open_provider and has a safe URL.
  assert.equal(descriptor.actions.length, 1);
  assert.equal(descriptor.actions[0].id, 'open_provider');
  assert.ok(descriptor.actions[0].url.startsWith('https://github.com/'));
});

test('objects: connection descriptor carries method instead of a generic label', () => {
  const descriptor = describeConnection(dataset, 'conn:deploy');
  assert.equal(descriptor.title, 'Deploys To');
  assert.equal(descriptor.method, 'Vercel API');
  assert.equal(descriptor.provider, 'vercel');
  assert.equal(descriptor.source.name, 'demo');
  assert.equal(descriptor.target.name, 'Production');
  assert.equal(descriptor.status.token, 'warning');
  assert.equal(descriptor.createdAt, '2026-08-02T10:00:00Z');
  assert.equal(descriptor.lastVerifiedAt, '2026-08-11T09:00:00Z');
});

test('objects: event descriptor links actor, resource, and status', () => {
  const descriptor = describeEvent(dataset, 'e2');
  assert.equal(descriptor.title, 'Deployment Completed');
  assert.equal(descriptor.actor, 'Deploy Bot');
  assert.equal(descriptor.resource.id, 'deployment:prod');
  assert.equal(descriptor.status.token, 'healthy');

  // Selection entry point dispatches by kind.
  assert.equal(buildObjectDescriptor(dataset, { kind: 'event', id: 'e1' }).kind, 'event');
  assert.equal(buildObjectDescriptor(dataset, { kind: 'connection', id: 'conn:own' }).kind, 'connection');
  assert.equal(buildObjectDescriptor(dataset, { kind: 'resource', id: 'repository:one' }).kind, 'resource');
  assert.equal(buildObjectDescriptor(dataset, { kind: ' resource ', id: '' }), null);
});

// ------------------------------ Engineering timeline ------------------------------

test('timeline: events classify into product kinds and group by day', () => {
  assert.equal(kindOfEvent('commit_recorded'), 'commits');
  assert.equal(kindOfEvent('deployment_failed'), 'deployments');
  assert.equal(kindOfEvent('release_published'), 'releases');
  assert.equal(kindOfEvent('connection_verified'), 'connections');
  assert.equal(kindOfEvent('brand_new_event'), 'all');

  const deployments = filterTimelineEvents(dataset.events, 'deployments');
  assert.deepEqual(deployments.map((event) => event.id), ['e2']);

  const days = groupEventsByDay(dataset.events);
  assert.equal(days.length, 2);
  assert.deepEqual(days[0].events.map((event) => event.id), ['e2', 'e1']); // newest first
  assert.match(days[0].label, /^Aug 1[01], 2026$/);

  const summary = summarizeTimeline(dataset.events);
  assert.equal(summary.all, 3);
  assert.equal(summary.commits, 1);
  assert.equal(summary.deployments, 1);
  assert.equal(summary.releases, 1);
  assert.equal(summary.issues, 0);
});

// ------------------------------ Command search ------------------------------

test('search: index groups workspace objects and answers queries', () => {
  const index = buildCommandIndex({
    navigation: [{ label: 'Security', to: '/security', icon: 'shield', group: 'Operate' }],
    projects: [{ id: 'p1', name: 'Omni Store', description: 'Storefront' }],
    dataset,
    actions: [{ id: 'action:new-issue', label: 'Create issue', path: '/issues?create=1', icon: 'issue', keywords: ['new'] }],
  });

  const sectionIds = index.map((section) => section.id);
  assert.deepEqual(sectionIds, ['actions', 'projects', 'repositories', 'accounts', 'navigation']);

  const results = queryCommandIndex(index, 'omni');
  assert.equal(results.length, 1);
  assert.equal(results[0].items[0].label, 'Omni Store');

  const flat = flattenCommandResults(queryCommandIndex(index, ''));
  assert.ok(flat.length > 0);
  // Keyboard navigation order matches display order.
  assert.equal(flat[0].id, 'action:new-issue');

  assert.equal(queryCommandIndex(index, 'zzz-no-match').length, 0);
});
