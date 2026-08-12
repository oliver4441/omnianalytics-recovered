const parseTime = (value) => {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Every metric is computed from the recorded event stream. When the events
 * needed for a metric do not exist yet, the metric carries `available: false`
 * so the UI can render an honest "connect a data source" hint instead of zeros.
 */

export const computeCommitVelocity = (events, weeks = 8) => {
  const commitEvents = events.filter((event) => event.eventType === 'commit_recorded');
  if (!commitEvents.length) return { available: false, buckets: [], averagePerWeek: 0, total: 0 };

  const now = Date.now();
  const buckets = Array.from({ length: weeks }, (_, index) => ({
    start: now - (weeks - index) * 7 * DAY_MS,
    count: 0,
  }));
  commitEvents.forEach((event) => {
    const ageMs = now - parseTime(event.timestamp);
    const index = weeks - 1 - Math.floor(ageMs / (7 * DAY_MS));
    if (index >= 0 && index < weeks) buckets[index].count += 1;
  });

  const format = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
  const labels = buckets.map((bucket) => format.format(new Date(bucket.start)));
  const activeWeeks = buckets.filter((bucket) => bucket.count > 0).length;
  return {
    available: true,
    labels,
    values: buckets.map((bucket) => bucket.count),
    total: commitEvents.length,
    activeWeeks,
    averagePerWeek: activeWeeks ? commitEvents.length / activeWeeks : 0,
  };
};

export const computeEventTypeBreakdown = (events) => {
  const counts = new Map();
  events.forEach((event) => {
    counts.set(event.eventType, (counts.get(event.eventType) || 0) + 1);
  });
  const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return {
    available: entries.length > 0,
    labels: entries.map(([type]) => type.replace(/_/g, ' ')),
    values: entries.map(([, count]) => count),
  };
};

export const computeContributorBreakdown = (events) => {
  const commitEvents = events.filter((event) => event.eventType === 'commit_recorded');
  if (!commitEvents.length) return { available: false, labels: [], values: [], actorCount: 0 };

  const counts = new Map();
  commitEvents.forEach((event) => {
    const actor = event.actor?.name || 'Unknown contributor';
    counts.set(actor, (counts.get(actor) || 0) + 1);
  });
  const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  return {
    available: true,
    labels: entries.map(([actor]) => actor),
    values: entries.map(([, count]) => count),
    actorCount: counts.size,
  };
};

export const computeReleaseCadence = (events) => {
  const releaseEvents = events
    .filter((event) => event.eventType === 'release_published')
    .sort((a, b) => parseTime(a.timestamp) - parseTime(b.timestamp));
  if (!releaseEvents.length) return { available: false, total: 0, perMonth: 0, lastReleaseAt: null };

  const first = parseTime(releaseEvents[0].timestamp);
  const last = parseTime(releaseEvents[releaseEvents.length - 1].timestamp);
  const months = Math.max(1, Math.ceil((last - first) / (30 * DAY_MS)));
  return {
    available: true,
    total: releaseEvents.length,
    perMonth: releaseEvents.length / months,
    lastReleaseAt: releaseEvents[releaseEvents.length - 1].timestamp,
  };
};

/** PR cycle time and review latency need pull_request/review events. */
export const computeReviewMetrics = (events) => {
  const pullRequestEvents = events.filter((event) => event.eventType.startsWith('pull_request'));
  const reviewEvents = events.filter((event) => event.eventType === 'review_submitted');
  if (!pullRequestEvents.length && !reviewEvents.length) {
    return { available: false, pullRequestCount: 0, reviewCount: 0 };
  }
  return {
    available: true,
    pullRequestCount: pullRequestEvents.length,
    reviewCount: reviewEvents.length,
  };
};

/** Project health combines workspace projects/tasks with event recency. */
export const computeProjectHealth = (projects, events) => {
  const totalTasks = projects.reduce((sum, project) => sum + (project.taskCount || 0), 0);
  const activeProjects = projects.filter((project) => project.status !== 'completed' && project.status !== 'archived');
  const lastEventAt = events.reduce((latest, event) => Math.max(latest, parseTime(event.timestamp)), 0);
  const daysSinceActivity = lastEventAt ? Math.floor((Date.now() - lastEventAt) / DAY_MS) : null;

  return {
    available: projects.length > 0 || events.length > 0,
    projectCount: projects.length,
    activeProjectCount: activeProjects.length,
    totalTasks,
    daysSinceActivity,
  };
};

export const buildAnalyticsOverview = (dataset, projects = []) => ({
  generatedAt: dataset.generatedAt || null,
  eventCount: dataset.events.length,
  commitVelocity: computeCommitVelocity(dataset.events),
  eventTypes: computeEventTypeBreakdown(dataset.events),
  contributors: computeContributorBreakdown(dataset.events),
  releaseCadence: computeReleaseCadence(dataset.events),
  reviewMetrics: computeReviewMetrics(dataset.events),
  projectHealth: computeProjectHealth(projects, dataset.events),
});
