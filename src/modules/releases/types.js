export const RELEASE_STATUSES = Object.freeze([
  { id: 'draft', label: 'Draft' },
  { id: 'ready', label: 'Ready to ship' },
  { id: 'published', label: 'Published' },
]);

export const RELEASE_STATUS_LABELS = Object.freeze(
  Object.fromEntries(RELEASE_STATUSES.map((status) => [status.id, status.label])),
);

export const READINESS_CHECK_IDS = Object.freeze([
  'changelog',
  'metadata',
  'manifests',
  'rules',
  'docs',
]);
