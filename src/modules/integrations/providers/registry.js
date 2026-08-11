const freezeList = (values) => Object.freeze([...values]);

const sharedSourceControlResources = freezeList([
  'account',
  'repository',
  'branch',
  'commit',
  'issue',
  'pull_request',
  'release',
]);

const defineCapabilities = ({ actions, eventTypes, resourceTypes }) => Object.freeze({
  resourceTypes: freezeList(resourceTypes),
  eventTypes: freezeList(eventTypes),
  actions: freezeList(actions),
});

const capabilities = {
  github: defineCapabilities({
    resourceTypes: sharedSourceControlResources,
    eventTypes: ['commit_recorded', 'pull_request_opened', 'pull_request_merged', 'issue_updated', 'release_published'],
    actions: ['open_provider'],
  }),
  gitlab: defineCapabilities({
    resourceTypes: sharedSourceControlResources,
    eventTypes: ['commit_recorded', 'pull_request_opened', 'pull_request_merged', 'issue_updated', 'release_published'],
    actions: ['open_provider'],
  }),
  bitbucket: defineCapabilities({
    resourceTypes: sharedSourceControlResources,
    eventTypes: ['commit_recorded', 'pull_request_opened', 'pull_request_merged'],
    actions: ['open_provider'],
  }),
  vercel: defineCapabilities({
    resourceTypes: ['account', 'project', 'deployment', 'domain', 'environment'],
    eventTypes: ['deployment_started', 'deployment_completed', 'deployment_failed', 'domain_updated'],
    actions: ['open_provider'],
  }),
  cloudflare: defineCapabilities({
    resourceTypes: ['account', 'project', 'deployment', 'domain', 'worker'],
    eventTypes: ['deployment_completed', 'deployment_failed', 'domain_updated'],
    actions: ['open_provider'],
  }),
  firebase: defineCapabilities({
    resourceTypes: ['account', 'project', 'deployment', 'domain', 'database', 'storage'],
    eventTypes: ['deployment_completed', 'deployment_failed'],
    actions: ['open_provider'],
  }),
  supabase: defineCapabilities({
    resourceTypes: ['account', 'project', 'database', 'storage', 'api', 'environment'],
    eventTypes: ['deployment_completed', 'database_updated'],
    actions: ['open_provider'],
  }),
  neon: defineCapabilities({
    resourceTypes: ['account', 'project', 'branch', 'database', 'environment'],
    eventTypes: ['branch_created', 'database_updated'],
    actions: ['open_provider'],
  }),
  postgresql: defineCapabilities({
    resourceTypes: ['database'],
    eventTypes: ['database_updated'],
    actions: [],
  }),
  omnianalytics: defineCapabilities({
    resourceTypes: ['project'],
    eventTypes: [],
    actions: [],
  }),
};

const providerHosts = Object.freeze({
  github: freezeList(['github.com']),
  gitlab: freezeList(['gitlab.com']),
  bitbucket: freezeList(['bitbucket.org']),
  vercel: freezeList(['vercel.com']),
  cloudflare: freezeList(['dash.cloudflare.com']),
  firebase: freezeList(['console.firebase.google.com']),
  supabase: freezeList(['supabase.com']),
  neon: freezeList(['console.neon.tech']),
});

const unknownCapabilities = defineCapabilities({
  resourceTypes: [],
  eventTypes: [],
  actions: [],
});

export const PROVIDER_CAPABILITIES = Object.freeze(capabilities);

export const getProviderCapabilities = (provider) => (
  PROVIDER_CAPABILITIES[String(provider || '').toLowerCase()] || unknownCapabilities
);

export const supportsProviderAction = (provider, action) => (
  getProviderCapabilities(provider).actions.includes(action)
);

export const getSafeProviderUrl = (provider, candidate) => {
  const normalizedProvider = String(provider || '').toLowerCase();
  if (!supportsProviderAction(normalizedProvider, 'open_provider') || typeof candidate !== 'string') return null;

  try {
    const url = new URL(candidate);
    const allowedHosts = providerHosts[normalizedProvider] || [];
    const containsCredentialShape = /(?:gh[pousr]_|github_pat_|glpat-|xox[baprs]-|sk_(?:live|test)_)/i.test(decodeURIComponent(url.pathname));
    if (
      url.protocol !== 'https:'
      || url.username
      || url.password
      || url.search
      || url.hash
      || containsCredentialShape
      || !allowedHosts.includes(url.hostname.toLowerCase())
    ) return null;
    return url.href;
  } catch {
    return null;
  }
};
