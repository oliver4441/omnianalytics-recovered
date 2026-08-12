export const REPOSITORY_EVENT_LABELS = Object.freeze({
  commit_recorded: 'Commit recorded',
  pull_request_opened: 'Pull request opened',
  pull_request_merged: 'Pull request merged',
  review_submitted: 'Review submitted',
  release_published: 'Release published',
  deployment_completed: 'Deployment completed',
});

export const REPOSITORY_SORT_OPTIONS = Object.freeze([
  { id: 'activity', label: 'Recent activity' },
  { id: 'name', label: 'Name' },
  { id: 'commits', label: 'Commit count' },
]);
