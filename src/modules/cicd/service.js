import { RUN_EVENT_TYPES } from './types.js';

const parseTime = (value) => {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
};

/**
 * Deployment-environment truth comes from the workspace profile parsed out of
 * committed hosting/build configuration. Runs and checks come from recorded
 * deployment events; no pipeline data is synthesized for the dashboard.
 */
export const buildCicdOverview = (dataset) => {
  const workspace = dataset.workspace || { environments: [] };
  const deploymentEvents = dataset.events
    .filter((event) => RUN_EVENT_TYPES.includes(event.eventType))
    .sort((a, b) => parseTime(b.timestamp) - parseTime(a.timestamp));
  const releaseEvents = dataset.events
    .filter((event) => event.eventType === 'release_published')
    .sort((a, b) => parseTime(b.timestamp) - parseTime(a.timestamp));
  const commitEvents = dataset.events
    .filter((event) => event.eventType === 'commit_recorded')
    .sort((a, b) => parseTime(b.timestamp) - parseTime(a.timestamp));

  const resourcesById = new Map(dataset.resources.map((resource) => [resource.id, resource]));

  return {
    environments: workspace.environments || [],
    runs: deploymentEvents.map((event) => ({
      id: event.id,
      resource: resourcesById.get(event.resourceId)?.name || event.resourceId,
      eventType: event.eventType,
      status: event.status,
      timestamp: event.timestamp,
      actor: event.actor?.name || 'Unknown actor',
      provider: event.provider,
      providerUrl: event.providerUrl || null,
      durationMs: Number.isFinite(event.metadata?.durationMs) ? event.metadata.durationMs : null,
    })),
    releases: releaseEvents,
    latestCommit: commitEvents[0] || null,
    totals: {
      runs: deploymentEvents.length,
      successfulRuns: deploymentEvents.filter((event) => event.status === 'success').length,
      releases: releaseEvents.length,
      environments: (workspace.environments || []).length,
    },
    hasAnyPipelineData: deploymentEvents.length > 0,
  };
};

/**
 * Rollback context pairs the latest release with the release immediately
 * before it, so an operator can see what a rollback would restore. Both sides
 * come from real tag events; an absent predecessor is reported honestly.
 */
export const buildRollbackContext = (dataset) => {
  const milestones = dataset.resources
    .filter((resource) => resource.type === 'release')
    .map((release) => ({
      version: release.metadata?.version || release.name,
      createdAt: release.metadata?.createdAt || release.updatedAt || null,
      commit: release.metadata?.commit || '',
    }))
    .sort((a, b) => parseTime(b.createdAt) - parseTime(a.createdAt));

  return {
    current: milestones[0] || null,
    previous: milestones[1] || null,
    available: milestones.length >= 2,
  };
};
