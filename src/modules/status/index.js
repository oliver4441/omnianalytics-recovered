/**
 * Global OmniAnalytics status system.
 *
 * Provider status strings (Vercel READY, GitHub success, Firestore healthy…)
 * are normalized onto a single token vocabulary so every surface — graph,
 * table, timeline, detail panel, badge — speaks the same language. The raw
 * provider value is always preserved for display alongside the token.
 */

export const STATUS_TOKENS = Object.freeze([
  { id: 'healthy', symbol: '✓', label: 'Healthy' },
  { id: 'running', symbol: '●', label: 'Running' },
  { id: 'pending', symbol: '◐', label: 'Pending' },
  { id: 'warning', symbol: '⚠', label: 'Warning' },
  { id: 'failed', symbol: '✕', label: 'Failed' },
  { id: 'disconnected', symbol: '○', label: 'Disconnected' },
  { id: 'unknown', symbol: '?', label: 'Unknown' },
]);

export const STATUS_TOKEN_LABELS = Object.freeze(
  Object.fromEntries(STATUS_TOKENS.map((token) => [token.id, token.label])),
);

const TOKEN_BY_STATUS = Object.freeze({
  // Healthy
  active: 'healthy',
  connected: 'healthy',
  healthy: 'healthy',
  operational: 'healthy',
  ready: 'healthy',
  success: 'healthy',
  successful: 'healthy',
  verified: 'healthy',
  // Running
  building: 'running',
  deploying: 'running',
  in_progress: 'running',
  running: 'running',
  started: 'running',
  syncing: 'running',
  synchronizing: 'running',
  // Pending
  draft: 'pending',
  pending: 'pending',
  planned: 'pending',
  queued: 'pending',
  recorded: 'pending',
  scheduled: 'pending',
  // Warning
  attention: 'warning',
  degraded: 'warning',
  expired: 'warning',
  stale: 'warning',
  warning: 'warning',
  // Failed
  broken: 'failed',
  error: 'failed',
  errored: 'failed',
  failed: 'failed',
  failure: 'failed',
  // Disconnected
  disconnected: 'disconnected',
  offline: 'disconnected',
  removed: 'disconnected',
  revoked: 'disconnected',
});

/**
 * Normalize any provider-specific status string onto a global token while
 * keeping the original value for attribution ("Provider: Vercel READY").
 */
export const normalizeStatus = (rawStatus) => {
  const raw = String(rawStatus || '').trim();
  const token = TOKEN_BY_STATUS[raw.toLowerCase()] || 'unknown';
  return {
    token,
    symbol: STATUS_TOKENS.find((entry) => entry.id === token)?.symbol || '?',
    label: STATUS_TOKEN_LABELS[token],
    raw: raw || 'unknown',
  };
};

/** True when a token represents a state that needs operator attention. */
export const isAttentionStatus = (token) => ['warning', 'failed', 'disconnected'].includes(token);
