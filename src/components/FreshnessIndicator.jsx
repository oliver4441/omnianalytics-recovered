import { useEffect, useState } from 'react';
import './primitives.css';

const describeFreshness = (timestamp) => {
  const time = new Date(timestamp).getTime();
  if (!Number.isFinite(time)) return { tone: 'unknown', text: 'Sync time unknown' };
  const ageSeconds = Math.max(0, Math.floor((Date.now() - time) / 1000));
  if (ageSeconds < 10) return { tone: 'fresh', text: 'Synced just now' };
  if (ageSeconds < 60) return { tone: 'fresh', text: `Synced ${ageSeconds} seconds ago` };
  const minutes = Math.floor(ageSeconds / 60);
  if (minutes < 60) return { tone: 'fresh', text: `Synced ${minutes} minute${minutes === 1 ? '' : 's'} ago` };
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { tone: 'stale', text: `Synced ${hours} hour${hours === 1 ? '' : 's'} ago` };
  const days = Math.floor(hours / 24);
  return { tone: 'stale', text: `Synced ${days} day${days === 1 ? '' : 's'} ago` };
};

/**
 * Data freshness indicator. Cached snapshots are never presented as live —
 * the label always says when the data was last recorded.
 */
export default function FreshnessIndicator({ timestamp, failed = false }) {
  const [, forceTick] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => forceTick((tick) => tick + 1), 30000);
    return () => window.clearInterval(interval);
  }, []);

  if (failed) {
    return <span className="freshness freshness--failed" role="status">Sync failed — showing last recorded data</span>;
  }

  const freshness = describeFreshness(timestamp);
  const absolute = new Date(timestamp);
  return (
    <span
      className={`freshness freshness--${freshness.tone}`}
      role="status"
      title={Number.isFinite(absolute.getTime()) ? absolute.toLocaleString() : undefined}
    >
      {freshness.text}
    </span>
  );
}
