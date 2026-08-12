import assert from 'node:assert/strict';
import test from 'node:test';

import {
  filterIssues,
  sortIssues,
  summarizeIssues,
  validateIssueDraft,
} from '../src/modules/issues/service.js';
import {
  buildReadinessChecklist,
  buildReleaseMilestones,
  buildUnreleasedChangelog,
  validateReleaseDraft,
} from '../src/modules/releases/service.js';
import { buildCicdOverview, buildRollbackContext } from '../src/modules/cicd/service.js';
import {
  buildAnalyticsOverview,
  computeCommitVelocity,
  computeReviewMetrics,
} from '../src/modules/analytics/service.js';
import { runBaselineReview } from '../src/modules/security/service.js';
import {
  renderMarkdownLite,
  searchDocuments,
  validateDocumentDraft,
} from '../src/modules/documentation/service.js';
import {
  buildCommitActivitySeries,
  buildRepositorySummaries,
  filterRepositories,
  sortRepositories,
} from '../src/modules/repositories/service.js';

const NOW = Date.now();
const isoDaysAgo = (days) => new Date(NOW - days * 24 * 60 * 60 * 1000).toISOString();

const workspaceSnapshot = {
  generatedAt: isoDaysAgo(0),
  accounts: [
    { id: 'account:gh', name: 'octo', provider: 'github', verificationState: 'recorded' },
  ],
  resources: [
    {
      id: 'repository:one',
      name: 'demo',
      externalId: 'octo/demo',
      accountId: 'account:gh',
      provider: 'github',
      type: 'repository',
      verificationState: 'recorded',
      metadata: {
        fullName: 'octo/demo',
        defaultBranch: 'main',
        latestCommit: 'abc1234',
        commitCount: 42,
        branches: ['main', 'arena/work'],
        contributors: ['octo (30)', 'peer (12)'],
        readmePresent: true,
      },
    },
    {
      id: 'release:v1-0-0',
      name: 'v1.0.0',
      externalId: 'v1.0.0',
      provider: 'github',
      type: 'release',
      verificationState: 'recorded',
      metadata: { version: 'v1.0.0', createdAt: isoDaysAgo(20), commit: 'aaa1111', previousTag: '', changelog: ['aaa1111 first'] },
    },
    {
      id: 'release:v1-1-0',
      name: 'v1.1.0',
      externalId: 'v1.1.0',
      provider: 'github',
      type: 'release',
      verificationState: 'recorded',
      metadata: { version: 'v1.1.0', createdAt: isoDaysAgo(10), commit: 'bbb2222', previousTag: 'v1.0.0', changelog: ['bbb2222 second'] },
    },
  ],
  connections: [
    { id: 'c1', sourceResourceId: 'repository:one', targetResourceId: 'release:v1-0-0', relationshipType: 'publishes', provider: 'github' },
    { id: 'c2', sourceResourceId: 'repository:one', targetResourceId: 'release:v1-1-0', relationshipType: 'publishes', provider: 'github' },
  ],
  events: [
    { id: 'e1', resourceId: 'repository:one', provider: 'github', eventType: 'commit_recorded', status: 'recorded', timestamp: isoDaysAgo(3), actor: { name: 'octo' }, metadata: { summary: 'ship it', shortHash: 'abc1234' } },
    { id: 'e2', resourceId: 'repository:one', provider: 'github', eventType: 'commit_recorded', status: 'recorded', timestamp: isoDaysAgo(9), actor: { name: 'peer' }, metadata: { summary: 'prep', shortHash: 'def5678' } },
    { id: 'e3', resourceId: 'repository:one', provider: 'github', eventType: 'pull_request_opened', status: 'recorded', timestamp: isoDaysAgo(2), actor: { name: 'octo' }, metadata: {} },
    { id: 'e4', resourceId: 'repository:one', provider: 'github', eventType: 'deployment_completed', status: 'success', timestamp: isoDaysAgo(1), actor: { name: 'Deploy Bot' }, metadata: { durationMs: 45000 } },
  ],
  integrations: [],
  workspace: {
    manifests: { 'package.json': true, 'package-lock.json': true },
    rulesPosture: { present: true, file: 'firestore.rules', rulesVersion: '2', openAccess: false, matchBlocks: 7, usesAuthChecks: true },
    environments: [{ id: 'firebase-hosting', label: 'Firebase Hosting', source: 'firebase.json' }],
    documentation: [{ id: 'doc:readme', title: 'Repository README', path: 'README.md', updatedAt: isoDaysAgo(5), content: '# Demo' }],
  },
};

// ------------------------------ Issues ------------------------------

test('issues: draft validation enforces title and known enumerations', () => {
  assert.equal(validateIssueDraft({ title: '' }).valid, false);
  assert.equal(validateIssueDraft({ title: 'x'.repeat(141) }).valid, false);
  assert.equal(validateIssueDraft({ title: 'Fix crash', status: 'weird' }).valid, false);
  assert.equal(validateIssueDraft({ title: 'Fix crash', priority: 'medium', severity: 'major' }).valid, true);
});

test('issues: filters and sorting respect status, project, search, and priority weight', () => {
  const issues = [
    { id: 'a', title: 'Login regression', status: 'open', priority: 'urgent', projectId: 'p1', updatedAt: isoDaysAgo(1) },
    { id: 'b', title: 'Polish settings drawer', status: 'closed', priority: 'low', projectId: 'p2', updatedAt: isoDaysAgo(0.5) },
    { id: 'c', title: 'Improve login copy', status: 'in_progress', priority: 'high', projectId: 'p1', updatedAt: isoDaysAgo(2) },
  ];

  assert.deepEqual(filterIssues(issues, { status: 'open' }).map((issue) => issue.id), ['a']);
  assert.deepEqual(filterIssues(issues, { projectId: 'p1' }).map((issue) => issue.id), ['a', 'c']);
  assert.deepEqual(filterIssues(issues, { search: 'login' }).map((issue) => issue.id), ['a', 'c']);
  assert.deepEqual(sortIssues(issues, 'priority').map((issue) => issue.id), ['a', 'c', 'b']);

  const summary = summarizeIssues(issues);
  assert.equal(summary.total, 3);
  assert.equal(summary.open, 2);
  assert.equal(summary.closed, 1);
  assert.equal(summary.urgentOpen, 1);
});

// ------------------------------ Releases ------------------------------

test('releases: milestones sort newest first and changelog excludes tagged commits', () => {
  const milestones = buildReleaseMilestones(workspaceSnapshot);
  assert.deepEqual(milestones.map((milestone) => milestone.version), ['v1.1.0', 'v1.0.0']);

  const unreleased = buildUnreleasedChangelog(workspaceSnapshot);
  // Both commit events are newer than the newest tag (10 days ago).
  assert.equal(unreleased.length, 2);
  assert.match(unreleased[0], /ship it$/);
});

test('releases: draft validation enforces semantic versions', () => {
  assert.equal(validateReleaseDraft({ version: '', title: 'x' }).valid, false);
  assert.equal(validateReleaseDraft({ version: 'next', title: 'x' }).valid, false);
  assert.equal(validateReleaseDraft({ version: 'v1.2.0', title: 'Feature drop' }).valid, true);
  assert.equal(validateReleaseDraft({ version: '1.2.0-alpha.1', title: 'Alpha' }).valid, true);
});

test('releases: readiness checklist reads real workspace signals', () => {
  const checklist = buildReadinessChecklist(workspaceSnapshot, { version: 'v1.2.0' });
  const byId = Object.fromEntries(checklist.map((check) => [check.id, check]));

  assert.equal(byId.changelog.passed, true);
  assert.equal(byId.manifests.passed, true);
  assert.equal(byId.rules.passed, true);
  assert.equal(byId.docs.passed, true);
  assert.equal(byId.version.passed, true);

  const withoutVersion = buildReadinessChecklist(workspaceSnapshot, {});
  assert.equal(withoutVersion.find((check) => check.id === 'version').passed, false);

  const openRules = buildReadinessChecklist({
    ...workspaceSnapshot,
    workspace: { ...workspaceSnapshot.workspace, rulesPosture: { present: true, openAccess: true, matchBlocks: 1, usesAuthChecks: false } },
  }, {});
  assert.equal(openRules.find((check) => check.id === 'rules').passed, false);
});

// ------------------------------ CI/CD ------------------------------

test('cicd: overview surfaces deployment events and honest empty state', () => {
  const overview = buildCicdOverview(workspaceSnapshot);
  assert.equal(overview.totals.runs, 1);
  assert.equal(overview.totals.successfulRuns, 1);
  assert.equal(overview.totals.releases, 0);
  assert.equal(overview.environments.length, 1);
  assert.equal(overview.hasAnyPipelineData, true);
  assert.equal(overview.runs[0].durationMs, 45000);

  const empty = buildCicdOverview({ ...workspaceSnapshot, events: [], workspace: { environments: [] } });
  assert.equal(empty.hasAnyPipelineData, false);
  assert.equal(empty.totals.runs, 0);
});

test('cicd: rollback context pairs the two newest tags and reports availability', () => {
  const rollback = buildRollbackContext(workspaceSnapshot);
  assert.equal(rollback.available, true);
  assert.equal(rollback.current.version, 'v1.1.0');
  assert.equal(rollback.previous.version, 'v1.0.0');

  const single = {
    ...workspaceSnapshot,
    resources: workspaceSnapshot.resources.filter((resource) => resource.id !== 'release:v1-1-0'),
  };
  const context = buildRollbackContext(single);
  assert.equal(context.available, false);
  assert.equal(context.current.version, 'v1.0.0');
  assert.equal(context.previous, null);

  const none = buildRollbackContext({ ...workspaceSnapshot, resources: workspaceSnapshot.resources.filter((resource) => resource.type !== 'release') });
  assert.equal(none.available, false);
  assert.equal(none.current, null);
});

// ------------------------------ Analytics ------------------------------

test('analytics: commit velocity buckets recent commits and flags missing data', () => {
  const velocity = computeCommitVelocity(workspaceSnapshot.events, 8);
  assert.equal(velocity.available, true);
  assert.equal(velocity.total, 2);
  assert.equal(velocity.values.reduce((sum, value) => sum + value, 0), 2);

  const empty = computeCommitVelocity([], 8);
  assert.equal(empty.available, false);
});

test('analytics: review metrics activate only with PR or review events', () => {
  const metrics = computeReviewMetrics(workspaceSnapshot.events);
  assert.equal(metrics.available, true);
  assert.equal(metrics.pullRequestCount, 1);

  const none = computeReviewMetrics(workspaceSnapshot.events.filter((event) => !event.eventType.startsWith('pull_request')));
  assert.equal(none.available, false);

  const overview = buildAnalyticsOverview(workspaceSnapshot, [{ id: 'p1', status: 'active', taskCount: 4 }]);
  assert.equal(overview.eventCount, 4);
  assert.equal(overview.projectHealth.projectCount, 1);
  assert.equal(overview.projectHealth.totalTasks, 4);
  assert.equal(typeof overview.projectHealth.daysSinceActivity, 'number');
});

// ------------------------------ Security ------------------------------

test('security: baseline review grades clean snapshots and sorts failures first', () => {
  const review = runBaselineReview(workspaceSnapshot, { reviewedAt: '2026-08-12T00:00:00Z' });
  assert.equal(review.reviewedAt, '2026-08-12T00:00:00Z');
  assert.equal(review.findings.length, 4);
  assert.equal(review.summary.fail, 0);
  assert.equal(review.summary.pass >= 2, true);

  const risky = runBaselineReview({
    ...workspaceSnapshot,
    resources: [...workspaceSnapshot.resources, {
      id: 'leaky', name: 'leaky resource', provider: 'manual', type: 'configuration',
      verificationState: 'recorded', metadata: { note: 'token=abc123secret' },
    }],
    workspace: {
      manifests: { 'package.json': true },
      rulesPosture: { present: true, openAccess: true, matchBlocks: 1, usesAuthChecks: false },
      environments: [],
      documentation: [],
    },
  });
  assert.equal(risky.summary.fail >= 2, true); // credentials + rules
  assert.equal(risky.findings[0].severity, 'fail');
});

// ------------------------------ Documentation ------------------------------

test('documentation: markdown renderer escapes HTML and builds structure', () => {
  const html = renderMarkdownLite('# Title\n\n<script>alert(1)</script>\n\n- one\n- two\n\n```\ncode <here>\n```\n\n**bold** and `inline` and [link](https://example.com)');
  assert.match(html, /<h3>Title<\/h3>/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /<ul><li>one<\/li><li>two<\/li><\/ul>/);
  assert.match(html, /<pre><code>code &lt;here&gt;<\/code><\/pre>/);
  assert.match(html, /<strong>bold<\/strong>/);
  assert.match(html, /<a href="https:\/\/example\.com"/);
});

test('documentation: validation requires title and content; search scans both', () => {
  assert.equal(validateDocumentDraft({ title: '', content: 'x' }).valid, false);
  assert.equal(validateDocumentDraft({ title: 'Runbook', content: 'steps' }).valid, true);

  const docs = [
    { id: '1', title: 'Onboarding', content: 'set up the dev environment', path: 'README.md' },
    { id: '2', title: 'Runbook', content: 'restart procedure', path: 'docs/runbook.md' },
  ];
  assert.deepEqual(searchDocuments(docs, 'dev').map((doc) => doc.id), ['1']);
  assert.deepEqual(searchDocuments(docs, 'runbook').map((doc) => doc.id), ['2']);
  assert.equal(searchDocuments(docs, '').length, 2);
});

// ------------------------------ Repositories ------------------------------

test('repositories: summaries aggregate recorded activity, releases, and PR events', () => {
  const [summary] = buildRepositorySummaries(workspaceSnapshot);
  assert.equal(summary.fullName, 'octo/demo');
  assert.equal(summary.commitCount, 42);
  assert.deepEqual(summary.branches, ['main', 'arena/work']);
  assert.equal(summary.releases.length, 2);
  assert.equal(summary.pullRequestEvents.length, 1);
  assert.equal(summary.readmePresent, true);
  assert.ok(summary.lastActivityAt);

  const series = buildCommitActivitySeries(workspaceSnapshot.events, 8);
  assert.equal(series.reduce((sum, bucket) => sum + bucket.count, 0), 2);

  assert.equal(filterRepositories([summary], 'peer').length, 1);
  assert.equal(filterRepositories([summary], 'missing').length, 0);
  assert.deepEqual(sortRepositories([summary], 'name')[0].id, 'repository:one');
});
