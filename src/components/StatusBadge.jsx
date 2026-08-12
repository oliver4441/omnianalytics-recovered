import { normalizeStatus } from '../modules/status/index.js';
import './primitives.css';

/**
 * Global status badge: the same normalized vocabulary everywhere.
 * `rawStatus` is any provider string ("READY", "success", "degraded"…);
 * the original value is preserved in the tooltip and optional suffix.
 */
export default function StatusBadge({ status, showRaw = false, size = 'md' }) {
  const presentation = normalizeStatus(status);
  return (
    <span
      className={`status-badge status-badge--${presentation.token} status-badge--${size}`}
      title={`OmniAnalytics: ${presentation.label} · Provider status: ${presentation.raw}`}
    >
      <i aria-hidden="true">{presentation.symbol}</i>
      <span>{presentation.label}</span>
      {showRaw && presentation.raw !== presentation.label.toLowerCase() && (
        <small>{presentation.raw}</small>
      )}
    </span>
  );
}
