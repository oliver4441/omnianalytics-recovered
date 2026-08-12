/**
 * Canonical OmniAnalytics object model. Every primary concept in the product —
 * Workspace, Project, Provider, Account, Repository, Connection, Environment,
 * Pipeline, Deployment, Release, Issue, Domain, Resource, Event — resolves to
 * ONE descriptor shape so the same object can appear in the graph, a table,
 * the timeline, or the detail panel without competing representations.
 */

export const OBJECT_KINDS = Object.freeze(['resource', 'connection', 'event']);

/** Shared icon vocabulary for object types (graph nodes, rows, panel header). */
export const OBJECT_TYPE_ICONS = Object.freeze({
  account: 'users',
  api: 'code',
  branch: 'branch',
  commit: 'gitCommit',
  database: 'database',
  deployment: 'rocket',
  domain: 'globe',
  environment: 'server',
  issue: 'issue',
  project: 'cube',
  pull_request: 'pullRequest',
  release: 'rocket',
  repository: 'branch',
  storage: 'server',
  worker: 'zap',
});

export const objectTypeIcon = (type) => OBJECT_TYPE_ICONS[type] || 'cube';

/**
 * How a connection came to exist — the "method" the detail panel surfaces
 * instead of a generic "connected" label. Falls back to the recorded source
 * label from the integrations vocabulary when no override applies.
 */
export const CONNECTION_METHOD_LABELS = Object.freeze({
  native_git: 'Native git integration',
  github_actions: 'GitHub Actions',
  github_api: 'GitHub API',
  gitlab_api: 'GitLab API',
  bitbucket_api: 'Bitbucket API',
  vercel_api: 'Vercel API',
  cloudflare_api: 'Cloudflare API',
  firebase_api: 'Firebase API',
  supabase_api: 'Supabase API',
  neon_api: 'Neon API',
  webhook: 'Webhook',
  oauth_integration: 'OAuth integration',
  manual_connection: 'Manual',
  user_connected: 'User connected',
  discovered: 'Discovered',
  imported_metadata: 'Imported metadata',
  repository_metadata: 'Repository metadata',
  package_metadata: 'Package metadata',
  inferred: 'Discovered',
});
