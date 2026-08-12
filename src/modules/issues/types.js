export const ISSUE_STATUSES = Object.freeze([
  { id: 'open', label: 'Open' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'closed', label: 'Closed' },
]);

export const ISSUE_PRIORITIES = Object.freeze([
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
  { id: 'urgent', label: 'Urgent' },
]);

export const ISSUE_SEVERITIES = Object.freeze([
  { id: 'none', label: 'None' },
  { id: 'minor', label: 'Minor' },
  { id: 'major', label: 'Major' },
  { id: 'critical', label: 'Critical' },
]);

export const ISSUE_STATUS_LABELS = Object.freeze(
  Object.fromEntries(ISSUE_STATUSES.map((status) => [status.id, status.label])),
);
export const ISSUE_PRIORITY_LABELS = Object.freeze(
  Object.fromEntries(ISSUE_PRIORITIES.map((priority) => [priority.id, priority.label])),
);
export const ISSUE_SEVERITY_LABELS = Object.freeze(
  Object.fromEntries(ISSUE_SEVERITIES.map((severity) => [severity.id, severity.label])),
);

export const isIssueStatus = (value) => ISSUE_STATUSES.some((status) => status.id === value);
export const isIssuePriority = (value) => ISSUE_PRIORITIES.some((priority) => priority.id === value);
export const isIssueSeverity = (value) => ISSUE_SEVERITIES.some((severity) => severity.id === value);
