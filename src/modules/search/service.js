/**
 * Global command-palette search. Builds a grouped index over workspace objects
 * (navigation destinations, projects, repositories, provider accounts) plus
 * real actions, then answers queries with ordered, capped groups. Pure and
 * unit-testable — the palette component only renders what this returns.
 */

const SECTION_LIMITS = Object.freeze({
  actions: 4,
  navigation: 6,
  projects: 5,
  repositories: 5,
  accounts: 4,
});

const entry = (id, label, path, { hint = '', icon = '', keywords = [] } = {}) => ({
  id,
  label,
  path,
  hint,
  icon,
  keywords: [label, hint, ...keywords].map((value) => String(value || '').toLowerCase()),
});

export const buildCommandIndex = ({ navigation = [], projects = [], dataset = null, actions = [] } = {}) => {
  const sections = [];

  if (actions.length) {
    sections.push({
      id: 'actions',
      label: 'Actions',
      items: actions.map((action) => entry(action.id, action.label, action.path, action)),
    });
  }

  if (projects.length) {
    sections.push({
      id: 'projects',
      label: 'Projects',
      items: projects.map((project) => entry(`project:${project.id}`, project.name, `/projects/${project.id}`, {
        icon: 'projects',
        hint: project.description || 'Project workspace',
        keywords: [project.status, ...(project.memberIds || [])],
      })),
    });
  }

  const repositories = dataset?.resources?.filter((resource) => resource.type === 'repository') || [];
  if (repositories.length) {
    sections.push({
      id: 'repositories',
      label: 'Repositories',
      items: repositories.map((resource) => entry(resource.id, resource.name, `/integrations/graph?resource=${encodeURIComponent(resource.id)}`, {
        icon: 'branch',
        hint: `${resource.provider} · ${resource.externalId || resource.metadata?.fullName || ''}`.trim(),
        keywords: [resource.provider, resource.externalId, resource.metadata?.defaultBranch],
      })),
    });
  }

  const accounts = dataset?.accounts || [];
  if (accounts.length) {
    sections.push({
      id: 'accounts',
      label: 'Accounts',
      items: accounts.map((account) => entry(account.id, account.name, `/integrations/graph?resource=${encodeURIComponent(account.resourceId || account.id)}`, {
        icon: 'users',
        hint: `${account.provider} account`,
        keywords: [account.provider],
      })),
    });
  }

  sections.push({
    id: 'navigation',
    label: 'Navigation',
    items: navigation.map((item) => entry(`nav:${item.to}`, item.label, item.to, {
      icon: item.icon,
      hint: item.group || 'Page',
    })),
  });

  return sections;
};

export const queryCommandIndex = (index, query = '') => {
  const normalized = String(query || '').trim().toLowerCase();
  return index
    .map((section) => {
      const limit = SECTION_LIMITS[section.id] ?? 5;
      const items = normalized
        ? section.items.filter((item) => item.keywords.some((keyword) => keyword.includes(normalized)))
        : section.items;
      return { ...section, items: items.slice(0, limit) };
    })
    .filter((section) => section.items.length > 0);
};

/** Flattened, ordered result list for keyboard navigation. */
export const flattenCommandResults = (sections) => sections.flatMap((section) => section.items);
