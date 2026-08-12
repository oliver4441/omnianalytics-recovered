import {
  isKnownHealthState,
  SAFE_METADATA_KEYS,
  isKnownResourceType,
  isKnownVerificationState,
} from './types.js';
import { getSafeProviderUrl } from './providers/registry.js';
import { credentialShape } from '../security/patterns.js';

const normalizeText = (value) => String(value || '').trim().toLowerCase();
const safeMetadataKeys = new Set(SAFE_METADATA_KEYS);

const safePublicText = (value, fallback = '') => {
  if (!['string', 'number', 'boolean'].includes(typeof value)) return fallback;
  const text = String(value).trim();
  return text && text.length <= 1000 && !credentialShape.test(text) ? text : fallback;
};

const sanitizeMetadataValue = (value) => {
  if (Array.isArray(value)) {
    const items = value.map(sanitizeMetadataValue);
    return items.length === value.length && items.length <= 50 && items.every((item) => item !== undefined)
      ? items
      : undefined;
  }
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'boolean') return value;
  const sanitized = safePublicText(value);
  return sanitized || undefined;
};

export const sanitizeIntegrationMetadata = (metadata = {}) => Object.fromEntries(
  Object.entries(metadata).flatMap(([key, value]) => {
    if (!safeMetadataKeys.has(key) || value === null || value === undefined || typeof value === 'object' && !Array.isArray(value)) return [];
    const sanitized = sanitizeMetadataValue(value);
    return sanitized === undefined ? [] : [[key, sanitized]];
  }),
);

export const sanitizeResourceForExport = (resource) => ({
  id: resource.id,
  provider: resource.provider,
  type: resource.type,
  externalId: resource.externalId,
  name: resource.name,
  accountId: resource.accountId || null,
  status: resource.status,
  verificationState: resource.verificationState,
  source: resource.source,
  updatedAt: resource.updatedAt,
  metadata: sanitizeIntegrationMetadata(resource.metadata),
});

const normalizeResource = (resource) => ({
  id: safePublicText(resource.id),
  provider: safePublicText(resource.provider, 'unknown').toLowerCase(),
  type: isKnownResourceType(resource.type) ? resource.type : 'unknown',
  externalId: safePublicText(resource.externalId),
  name: safePublicText(resource.name, safePublicText(resource.id, 'Unknown resource')),
  accountId: safePublicText(resource.accountId) || null,
  status: isKnownHealthState(resource.status) ? resource.status : 'unknown',
  verificationState: isKnownVerificationState(resource.verificationState)
    ? resource.verificationState
    : 'unknown',
  source: safePublicText(resource.source, 'unknown'),
  updatedAt: safePublicText(resource.updatedAt) || null,
  providerUrl: getSafeProviderUrl(resource.provider, resource.metadata?.url),
  metadata: sanitizeIntegrationMetadata(resource.metadata),
});

const normalizeConnection = (connection) => ({
  id: safePublicText(connection.id),
  sourceResourceId: safePublicText(connection.sourceResourceId),
  targetResourceId: safePublicText(connection.targetResourceId),
  relationshipType: safePublicText(connection.relationshipType, 'unknown'),
  provider: safePublicText(connection.provider, 'unknown').toLowerCase(),
  createdAt: safePublicText(connection.createdAt) || null,
  lastVerifiedAt: safePublicText(connection.lastVerifiedAt) || null,
  updatedAt: safePublicText(connection.updatedAt) || null,
  origin: safePublicText(connection.origin, 'unknown'),
  status: isKnownHealthState(connection.status) ? connection.status : 'unknown',
  verificationState: isKnownVerificationState(connection.verificationState)
    ? connection.verificationState
    : 'unknown',
  source: safePublicText(connection.source, 'unknown'),
  metadata: sanitizeIntegrationMetadata(connection.metadata),
});

const normalizeEvent = (event) => {
  const actorName = safePublicText(event.actor?.name, 'Unknown actor');
  const actorIdentifier = safePublicText(event.actor?.identifier);
  return {
    id: safePublicText(event.id),
    resourceId: safePublicText(event.resourceId),
    provider: safePublicText(event.provider, 'unknown').toLowerCase(),
    eventType: safePublicText(event.eventType, 'unknown'),
    actor: actorIdentifier ? { name: actorName, identifier: actorIdentifier } : { name: actorName },
    accountId: safePublicText(event.accountId) || null,
    projectId: safePublicText(event.projectId) || null,
    userId: safePublicText(event.userId) || null,
    source: safePublicText(event.source, 'unknown'),
    timestamp: safePublicText(event.timestamp) || null,
    status: safePublicText(event.status, 'unknown'),
    verificationState: isKnownVerificationState(event.verificationState)
      ? event.verificationState
      : 'unknown',
    providerUrl: getSafeProviderUrl(event.provider, event.metadata?.url),
    metadata: sanitizeIntegrationMetadata(event.metadata),
  };
};

const normalizeAccount = (account) => ({
  id: safePublicText(account.id),
  resourceId: safePublicText(account.resourceId),
  provider: safePublicText(account.provider, 'unknown').toLowerCase(),
  name: safePublicText(account.name, 'Unknown account'),
  userId: safePublicText(account.userId) || null,
  permissions: Array.isArray(account.permissions)
    ? account.permissions.map((permission) => safePublicText(permission)).filter(Boolean)
    : [],
  createdAt: safePublicText(account.createdAt) || null,
  lastVerifiedAt: safePublicText(account.lastVerifiedAt) || null,
  source: safePublicText(account.source, 'unknown'),
});

const normalizeIntegration = (integration) => ({
  id: safePublicText(integration.id),
  provider: safePublicText(integration.provider, 'unknown').toLowerCase(),
  accountId: safePublicText(integration.accountId) || null,
  name: safePublicText(integration.name, 'Unnamed integration'),
  status: isKnownHealthState(integration.status) ? integration.status : 'unknown',
  verificationState: isKnownVerificationState(integration.verificationState)
    ? integration.verificationState
    : 'unknown',
  source: safePublicText(integration.source, 'unknown'),
  createdAt: safePublicText(integration.createdAt) || null,
  updatedAt: safePublicText(integration.updatedAt) || null,
  metadata: sanitizeIntegrationMetadata(integration.metadata),
});

const normalizeWorkspaceProfile = (workspace = {}) => ({
  manifests: Object.fromEntries(
    Object.entries(workspace.manifests || {}).map(([name, present]) => [safePublicText(name, 'unknown'), Boolean(present)]),
  ),
  rulesPosture: workspace.rulesPosture && typeof workspace.rulesPosture === 'object'
    ? Object.fromEntries(
      Object.entries(workspace.rulesPosture).map(([key, value]) => [
        safePublicText(key, 'unknown'),
        ['boolean', 'number'].includes(typeof value) ? value : safePublicText(value),
      ]),
    )
    : null,
  environments: Array.isArray(workspace.environments)
    ? workspace.environments.map((environment) => ({
      id: safePublicText(environment?.id, 'unknown'),
      label: safePublicText(environment?.label, 'unknown'),
      source: safePublicText(environment?.source, 'unknown'),
    })).filter((environment) => environment.id !== 'unknown')
    : [],
  documentation: Array.isArray(workspace.documentation)
    ? workspace.documentation.map((entry) => {
      const rawContent = ['string', 'number'].includes(typeof entry?.content) ? String(entry.content) : '';
      return {
        id: safePublicText(entry?.id),
        title: safePublicText(entry?.title, 'Untitled document'),
        path: safePublicText(entry?.path),
        source: safePublicText(entry?.source, 'unknown'),
        updatedAt: safePublicText(entry?.updatedAt) || null,
        content: rawContent.length <= 16000 && !credentialShape.test(rawContent) ? rawContent : '',
      };
    }).filter((entry) => entry.id)
    : [],
});

export const normalizeIntegrationDataset = (dataset) => {
  const resources = dataset.resources.map(normalizeResource).filter((resource) => resource.id);
  const resourceIds = new Set(resources.map((resource) => resource.id));
  const connections = dataset.connections
    .map(normalizeConnection)
    .filter((connection) => (
      connection.id
      && resourceIds.has(connection.sourceResourceId)
      && resourceIds.has(connection.targetResourceId)
    ));
  const events = dataset.events
    .map(normalizeEvent)
    .filter((event) => event.id && resourceIds.has(event.resourceId))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return {
    schemaVersion: Number.isFinite(Number(dataset.schemaVersion)) ? Number(dataset.schemaVersion) : 1,
    generatedAt: safePublicText(dataset.generatedAt) || null,
    source: safePublicText(dataset.source, 'unknown'),
    accounts: dataset.accounts.map(normalizeAccount).filter((account) => account.id),
    resources,
    connections,
    events,
    integrations: dataset.integrations.map(normalizeIntegration).filter((integration) => integration.id),
    notices: Array.isArray(dataset.notices) ? dataset.notices.map((notice) => safePublicText(notice)).filter(Boolean) : [],
    workspace: normalizeWorkspaceProfile(dataset.workspace),
  };
};

export const buildRelationshipIndex = (dataset) => {
  const resourcesById = new Map(dataset.resources.map((resource) => [resource.id, resource]));
  const connectionsById = new Map(dataset.connections.map((connection) => [connection.id, connection]));
  const adjacency = new Map(dataset.resources.map((resource) => [resource.id, []]));

  dataset.connections.forEach((connection) => {
    adjacency.get(connection.sourceResourceId)?.push({
      connection,
      resource: resourcesById.get(connection.targetResourceId),
      direction: 'outgoing',
    });
    adjacency.get(connection.targetResourceId)?.push({
      connection,
      resource: resourcesById.get(connection.sourceResourceId),
      direction: 'incoming',
    });
  });

  return { adjacency, connectionsById, resourcesById };
};

export const getConnectedResources = (dataset, resourceId) => {
  const { adjacency } = buildRelationshipIndex(dataset);
  return adjacency.get(resourceId) || [];
};

export const findConnectionPath = (dataset, sourceId, targetId) => {
  const { adjacency } = buildRelationshipIndex(dataset);
  if (!adjacency.has(sourceId) || !adjacency.has(targetId)) return null;
  if (sourceId === targetId) return { resources: [sourceId], connections: [] };
  const queue = [{ resourceId: sourceId, resources: [sourceId], connections: [] }];
  const visited = new Set([sourceId]);

  while (queue.length) {
    const current = queue.shift();
    const edges = [...(adjacency.get(current.resourceId) || [])]
      .sort((left, right) => (
        String(left.resource?.id || '').localeCompare(String(right.resource?.id || ''))
        || String(left.connection?.id || '').localeCompare(String(right.connection?.id || ''))
      ));
    for (const edge of edges) {
      if (!edge.resource || visited.has(edge.resource.id)) continue;
      const next = {
        resourceId: edge.resource.id,
        resources: [...current.resources, edge.resource.id],
        connections: [...current.connections, edge.connection.id],
      };
      if (edge.resource.id === targetId) {
        return { resources: next.resources, connections: next.connections };
      }
      visited.add(edge.resource.id);
      queue.push(next);
    }
  }

  return null;
};

export const discoverRelatedResources = (dataset, sourceId, options = {}) => {
  const { adjacency } = buildRelationshipIndex(dataset);
  if (!adjacency.has(sourceId)) return [];

  const targetTypes = new Set(Array.isArray(options.targetTypes) ? options.targetTypes : []);
  const terminalRelationshipTypes = new Set(
    Array.isArray(options.terminalRelationshipTypes) ? options.terminalRelationshipTypes : [],
  );
  const maximumDepth = Math.min(8, Math.max(1, Number(options.maxDepth) || 4));
  const maximumResults = Math.min(100, Math.max(1, Number(options.maxResults) || 25));
  const queue = [{ resourceId: sourceId, resources: [sourceId], connections: [], depth: 0 }];
  const visited = new Set([sourceId]);
  const matched = new Set();
  const results = [];

  while (queue.length && results.length < maximumResults) {
    const current = queue.shift();
    if (current.depth >= maximumDepth) continue;
    const edges = [...(adjacency.get(current.resourceId) || [])]
      .sort((left, right) => (
        String(left.resource?.id || '').localeCompare(String(right.resource?.id || ''))
        || String(left.connection?.id || '').localeCompare(String(right.connection?.id || ''))
      ));

    edges.forEach((edge) => {
      if (!edge.resource || current.resources.includes(edge.resource.id)) return;
      const next = {
        resourceId: edge.resource.id,
        resources: [...current.resources, edge.resource.id],
        connections: [...current.connections, edge.connection.id],
        depth: current.depth + 1,
      };
      const resourceTypeMatches = !targetTypes.size || targetTypes.has(edge.resource.type);
      const terminalRelationshipMatches = !terminalRelationshipTypes.size
        || terminalRelationshipTypes.has(edge.connection.relationshipType);
      if (resourceTypeMatches && terminalRelationshipMatches && !matched.has(edge.resource.id)) {
        matched.add(edge.resource.id);
        results.push({
          resource: edge.resource,
          resources: next.resources,
          connections: next.connections,
          depth: next.depth,
        });
      }
      if (visited.has(edge.resource.id)) return;
      visited.add(edge.resource.id);
      if (next.depth < maximumDepth) queue.push(next);
    });
  }

  return results
    .slice(0, maximumResults)
    .sort((left, right) => (
      left.depth - right.depth
      || left.resource.provider.localeCompare(right.resource.provider)
      || left.resource.name.localeCompare(right.resource.name)
      || left.resource.id.localeCompare(right.resource.id)
    ));
};

export const filterIntegrationDataset = (dataset, filters = {}) => {
  const search = normalizeText(filters.search);
  const provider = normalizeText(filters.provider);
  const resourceType = normalizeText(filters.resourceType);
  const status = normalizeText(filters.status);
  const attentionStatuses = new Set(['degraded', 'expired', 'disconnected', 'error']);

  const resources = dataset.resources.filter((resource) => {
    const searchable = [
      resource.name,
      resource.externalId,
      resource.provider,
      resource.type,
      ...Object.values(sanitizeIntegrationMetadata(resource.metadata)).flatMap((value) => (
        Array.isArray(value) ? value : [value]
      )),
    ].map(normalizeText).join(' ');

    return (!search || searchable.includes(search))
      && (!provider || resource.provider === provider)
      && (!resourceType || resource.type === resourceType)
      && (!status || (status === 'attention' ? attentionStatuses.has(resource.status) : resource.status === status));
  });

  const visibleIds = new Set(resources.map((resource) => resource.id));
  return {
    ...dataset,
    resources,
    connections: dataset.connections.filter((connection) => (
      visibleIds.has(connection.sourceResourceId)
      && visibleIds.has(connection.targetResourceId)
    )),
    events: dataset.events.filter((event) => visibleIds.has(event.resourceId)),
  };
};

export const isTimestampWithinLocalDateRange = (timestamp, from = '', to = '') => {
  if (!from && !to) return true;
  const value = new Date(timestamp).getTime();
  if (!Number.isFinite(value)) return false;
  const fromTime = from ? new Date(`${from}T00:00:00`).getTime() : null;
  const toTime = to ? new Date(`${to}T23:59:59.999`).getTime() : null;
  return (!Number.isFinite(fromTime) || value >= fromTime)
    && (!Number.isFinite(toTime) || value <= toTime);
};

export const filterIntegrationEvents = (events, filters = {}) => {
  const provider = normalizeText(filters.provider);
  const resourceId = filters.resourceId || '';
  const accountId = filters.accountId || '';
  const projectId = filters.projectId || '';
  const userId = normalizeText(filters.userId);
  const actor = normalizeText(filters.actor);
  const eventType = normalizeText(filters.eventType);
  const status = normalizeText(filters.status);
  const source = normalizeText(filters.source);

  return events.filter((event) => {
    const actorText = normalizeText([event.actor?.name, event.actor?.identifier].filter(Boolean).join(' '));
    const eventUser = normalizeText(event.userId);
    return (!provider || event.provider === provider)
      && (!resourceId || event.resourceId === resourceId)
      && (!accountId || event.accountId === accountId)
      && (!projectId || event.projectId === projectId)
      && (!userId || eventUser === userId)
      && (!actor || actorText.includes(actor))
      && (!eventType || event.eventType === eventType)
      && (!status || event.status === status)
      && (!source || event.source === source)
      && isTimestampWithinLocalDateRange(event.timestamp, filters.from, filters.to);
  });
};

export const getDatasetFacets = (dataset) => ({
  providers: [...new Set(dataset.resources.map((resource) => resource.provider))].sort(),
  resourceTypes: [...new Set(dataset.resources.map((resource) => resource.type))].sort(),
  statuses: [...new Set(dataset.resources.map((resource) => resource.status))].sort(),
  eventTypes: [...new Set(dataset.events.map((event) => event.eventType))].sort(),
});

const sortedUniqueValues = (values) => [...new Set(values.filter(Boolean))].sort();
const sortedOptions = (options) => [...options.entries()]
  .map(([id, label]) => ({ id, label }))
  .sort((a, b) => a.label.localeCompare(b.label) || a.id.localeCompare(b.id));

export const getTimelineFilterOptions = (dataset) => {
  const accounts = new Map();
  dataset.accounts.forEach((account) => {
    accounts.set(account.id, `${account.provider} / ${account.name}`);
  });
  dataset.resources.filter((resource) => resource.type === 'account').forEach((account) => {
    accounts.set(account.id, `${account.provider} / ${account.name}`);
  });

  const projects = new Map(dataset.resources
    .filter((resource) => resource.type === 'project')
    .map((project) => [project.id, project.name]));

  dataset.events.forEach((event) => {
    if (event.accountId && !accounts.has(event.accountId)) accounts.set(event.accountId, event.accountId);
    if (event.projectId && !projects.has(event.projectId)) projects.set(event.projectId, event.projectId);
  });

  return {
    providers: sortedUniqueValues(dataset.events.map((event) => event.provider)),
    eventTypes: sortedUniqueValues(dataset.events.map((event) => event.eventType)),
    statuses: sortedUniqueValues(dataset.events.map((event) => event.status)),
    sources: sortedUniqueValues(dataset.events.map((event) => event.source)),
    users: sortedUniqueValues(dataset.events.map((event) => event.userId)),
    accounts: sortedOptions(accounts),
    projects: sortedOptions(projects),
  };
};
