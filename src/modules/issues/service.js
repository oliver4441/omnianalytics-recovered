import { isIssuePriority, isIssueSeverity, isIssueStatus } from './types.js';

/** Pure issue-domain helpers (kept Firestore-free for unit testing). */

export const validateIssueDraft = (draft) => {
  const errors = {};
  if (!draft.title || !String(draft.title).trim()) errors.title = 'Issue title is required.';
  if (draft.title && String(draft.title).trim().length > 140) errors.title = 'Keep the title under 140 characters.';
  if (draft.status && !isIssueStatus(draft.status)) errors.status = 'Unknown issue status.';
  if (draft.priority && !isIssuePriority(draft.priority)) errors.priority = 'Unknown priority.';
  if (draft.severity && !isIssueSeverity(draft.severity)) errors.severity = 'Unknown severity.';
  return { valid: Object.keys(errors).length === 0, errors };
};

export const filterIssues = (issues, filters = {}) => {
  const status = filters.status || '';
  const priority = filters.priority || '';
  const projectId = filters.projectId || '';
  const query = String(filters.search || '').trim().toLowerCase();

  return issues.filter((issue) => {
    if (status && issue.status !== status) return false;
    if (priority && issue.priority !== priority) return false;
    if (projectId && issue.projectId !== projectId) return false;
    if (!query) return true;
    const haystack = [issue.title, issue.description, issue.assignee, issue.projectName]
      .map((value) => String(value || '').toLowerCase())
      .join(' ');
    return haystack.includes(query);
  });
};

export const sortIssues = (issues, sortId = 'updated') => {
  const priorityWeight = { urgent: 0, high: 1, medium: 2, low: 3 };
  const sorted = [...issues];
  if (sortId === 'priority') {
    sorted.sort((a, b) => (priorityWeight[a.priority] ?? 4) - (priorityWeight[b.priority] ?? 4)
      || new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
  } else if (sortId === 'created') {
    sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  } else {
    sorted.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
  }
  return sorted;
};

export const summarizeIssues = (issues) => ({
  total: issues.length,
  open: issues.filter((issue) => issue.status !== 'closed').length,
  closed: issues.filter((issue) => issue.status === 'closed').length,
  urgentOpen: issues.filter((issue) => issue.status !== 'closed' && issue.priority === 'urgent').length,
});
