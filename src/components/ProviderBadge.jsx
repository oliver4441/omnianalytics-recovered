import './primitives.css';

const PROVIDER_LABELS = Object.freeze({
  omnianalytics: 'OmniAnalytics',
  github: 'GitHub',
  gitlab: 'GitLab',
  bitbucket: 'Bitbucket',
  vercel: 'Vercel',
  cloudflare: 'Cloudflare',
  firebase: 'Firebase',
  supabase: 'Supabase',
  neon: 'Neon',
  postgresql: 'PostgreSQL',
  manual: 'Manual',
});

const PROVIDER_MONOGRAMS = Object.freeze({
  omnianalytics: 'OA',
  github: 'GH',
  gitlab: 'GL',
  bitbucket: 'BB',
  vercel: 'V',
  cloudflare: 'CF',
  firebase: 'FB',
  supabase: 'SB',
  neon: 'NE',
  postgresql: 'PG',
  manual: 'M',
});

export const providerLabel = (provider) => PROVIDER_LABELS[String(provider || '').toLowerCase()]
  || String(provider || 'Unknown');

/**
 * Compact provider identity: a small monogram tile + name. Recognizable at a
 * glance without decorative branding or oversized logos.
 */
export default function ProviderBadge({ provider, nameOnly = false, size = 'md' }) {
  const key = String(provider || 'unknown').toLowerCase();
  const monogram = PROVIDER_MONOGRAMS[key] || key.slice(0, 2).toUpperCase() || '?';
  return (
    <span className={`provider-badge provider-badge--${size}`} data-provider={key}>
      {!nameOnly && <span className="provider-badge__mark" aria-hidden="true">{monogram}</span>}
      <span className="provider-badge__name">{providerLabel(provider)}</span>
    </span>
  );
}
