/**
 * First-class engineering timeline. Events are classified into product-level
 * kinds (commits, deployments, issues, releases, connections, security) so the
 * Activity timeline filters by meaning, not by provider-specific event names.
 * Every event still references the same underlying record the graph uses.
 */

export const TIMELINE_KINDS = Object.freeze([
  { id: 'all', label: 'All', icon: 'activity' },
  { id: 'commits', label: 'Commits', icon: 'gitCommit' },
  { id: 'deployments', label: 'Deployments', icon: 'rocket' },
  { id: 'issues', label: 'Issues', icon: 'issue' },
  { id: 'releases', label: 'Releases', icon: 'calendar' },
  { id: 'connections', label: 'Connections', icon: 'link' },
  { id: 'security', label: 'Security', icon: 'shield' },
]);

const KIND_BY_EVENT_TYPE = Object.freeze({
  commit_recorded: 'commits',
  pull_request_opened: 'commits',
  pull_request_merged: 'commits',
  review_submitted: 'commits',
  issue_updated: 'issues',
  issue_created: 'issues',
  issue_closed: 'issues',
  release_published: 'releases',
  deployment_started: 'deployments',
  deployment_completed: 'deployments',
  deployment_failed: 'deployments',
  workflow_run: 'deployments',
  check_completed: 'deployments',
  domain_updated: 'deployments',
  connection_created: 'connections',
  connection_verified: 'connections',
  connection_revoked: 'connections',
  security_scan: 'security',
  security_review: 'security',
  credential_rotated: 'security',
});

export const kindOfEvent = (eventType) => KIND_BY_EVENT_TYPE[eventType] || 'all';

export const filterTimelineEvents = (events, kind = 'all') => {
  if (!kind || kind === 'all') return events;
  return events.filter((event) => kindOfEvent(event.eventType) === kind);
};

const parseTime = (value) => {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
};

const dayFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

/** Day-grouped, newest day first; events within a day newest first. */
export const groupEventsByDay = (events) => {
  const byDay = new Map();
  [...events]
    .sort((a, b) => parseTime(b.timestamp) - parseTime(a.timestamp))
    .forEach((event) => {
      const time = parseTime(event.timestamp);
      const dayKey = time ? new Date(time).toISOString().slice(0, 10) : 'unknown';
      if (!byDay.has(dayKey)) {
        byDay.set(dayKey, {
          day: dayKey,
          label: time ? dayFormat.format(new Date(time)) : 'Undated',
          events: [],
        });
      }
      byDay.get(dayKey).events.push(event);
    });
  return [...byDay.values()];
};

export const summarizeTimeline = (events) => {
  const counts = { all: events.length };
  TIMELINE_KINDS.forEach((kind) => {
    if (kind.id !== 'all') counts[kind.id] = 0;
  });
  events.forEach((event) => {
    const kind = kindOfEvent(event.eventType);
    if (kind !== 'all' && kind in counts) counts[kind] += 1;
  });
  return counts;
};
