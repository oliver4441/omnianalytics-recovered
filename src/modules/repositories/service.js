import { REPOSITORY_EVENT_LABELS } from './types.js';

const parseTime = (value) => {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
};

const toArray = (value) => (Array.isArray(value) ? value : []);

/**
 * Build the per-repository view model used by the Repositories page. Activity,
 * branch, commit, and contributor data comes from the git-derived integration
 * metadata — never from fabricated samples.
 */
export const buildRepositorySummaries = (dataset) => {
  const repositories = dataset.resources.filter((resource) => resource.type === 'repository');

  return repositories.map((repository) => {
    const events = dataset.events
      .filter((event) => event.resourceId === repository.id)
      .sort((a, b) => parseTime(b.timestamp) - parseTime(a.timestamp));
    const account = dataset.accounts.find((candidate) => candidate.id === repository.accountId) || null;
    const releases = dataset.resources.filter(
      (resource) => resource.type === 'release'
        && resource.externalId
        && dataset.connections.some((connection) => (
          connection.relationshipType === 'publishes'
          && connection.sourceResourceId === repository.id
          && connection.targetResourceId === resource.id
        )),
    );
    const branches = toArray(repository.metadata?.branches);
    const contributors = toArray(repository.metadata?.contributors);
    const lastEvent = events[0] || null;
    const commitEvents = events.filter((event) => event.eventType === 'commit_recorded');

    return {
      id: repository.id,
      name: repository.name,
      fullName: repository.metadata?.fullName || repository.externalId || repository.name,
      provider: repository.provider,
      account,
      providerUrl: repository.providerUrl || null,
      defaultBranch: repository.metadata?.defaultBranch || '',
      latestCommit: repository.metadata?.latestCommit || '',
      commitCount: Number.isFinite(repository.metadata?.commitCount) ? repository.metadata.commitCount : commitEvents.length,
      branches,
      contributors,
      readmePresent: repository.metadata?.readmePresent === true,
      releases,
      lastActivityAt: lastEvent?.timestamp || null,
      lastActivitySummary: lastEvent?.metadata?.summary || '',
      events,
      commitEvents,
      pullRequestEvents: events.filter((event) => event.eventType.startsWith('pull_request')),
      verificationState: repository.verificationState,
    };
  });
};

export const sortRepositories = (repositories, sortId = 'activity') => {
  const sorted = [...repositories];
  if (sortId === 'name') {
    sorted.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortId === 'commits') {
    sorted.sort((a, b) => b.commitCount - a.commitCount || a.name.localeCompare(b.name));
  } else {
    sorted.sort((a, b) => parseTime(b.lastActivityAt) - parseTime(a.lastActivityAt) || a.name.localeCompare(b.name));
  }
  return sorted;
};

export const filterRepositories = (repositories, search = '') => {
  const query = String(search || '').trim().toLowerCase();
  if (!query) return repositories;
  return repositories.filter((repository) => [
    repository.name,
    repository.fullName,
    repository.provider,
    repository.account?.name,
    ...repository.branches,
    ...repository.contributors,
  ].map((value) => String(value || '').toLowerCase()).join(' ').includes(query));
};

/** Weekly commit buckets for the activity chart, oldest → newest. */
export const buildCommitActivitySeries = (events, weeks = 8) => {
  const bucketCount = Math.max(1, Math.min(26, weeks));
  const now = Date.now();
  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const start = now - (bucketCount - index) * 7 * 24 * 60 * 60 * 1000;
    return { start, label: '', count: 0 };
  });

  events.forEach((event) => {
    if (event.eventType !== 'commit_recorded') return;
    const time = parseTime(event.timestamp);
    if (!time) return;
    const ageMs = now - time;
    const index = bucketCount - 1 - Math.floor(ageMs / (7 * 24 * 60 * 60 * 1000));
    if (index >= 0 && index < bucketCount) buckets[index].count += 1;
  });

  const format = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
  buckets.forEach((bucket) => {
    bucket.label = format.format(new Date(bucket.start));
  });
  return buckets;
};

export const eventTypeLabel = (eventType) => REPOSITORY_EVENT_LABELS[eventType] || eventType || 'Unknown event';
