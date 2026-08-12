import {
  getSafeProviderUrl,
  RESOURCE_LABELS,
  sanitizeIntegrationMetadata,
  SOURCE_LABELS,
  supportsProviderAction,
} from '../integrations/index.js';
import { normalizeStatus } from '../status/index.js';
import { CONNECTION_METHOD_LABELS, objectTypeIcon } from './types.js';

/** Descriptor builders turn graph/timeline/table records into one panel model. */

export const formatKey = (value) => String(value || '')
  .replace(/([a-z])([A-Z])/g, '$1 $2')
  .replaceAll('_', ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const indexById = (records) => new Map((records || []).map((record) => [record.id, record]));

const compactRef = (resource) => (resource ? {
  id: resource.id,
  name: resource.name,
  type: resource.type,
  typeLabel: RESOURCE_LABELS[resource.type] || formatKey(resource.type || 'resource'),
  provider: resource.provider,
  status: normalizeStatus(resource.status),
} : null);

const connectionMethod = (connection) => (
  CONNECTION_METHOD_LABELS[connection.origin]
  || CONNECTION_METHOD_LABELS[connection.source]
  || SOURCE_LABELS[connection.origin]
  || SOURCE_LABELS[connection.source]
  || formatKey(connection.origin || connection.source || 'unknown')
);

/** Relationship descriptor — every field the edge drawer must answer. */
export const describeConnection = (dataset, connectionId) => {
  const connection = indexById(dataset.connections).get(connectionId);
  if (!connection) return null;
  const resources = indexById(dataset.resources);

  return {
    kind: 'connection',
    id: connection.id,
    icon: 'link',
    title: formatKey(connection.relationshipType || 'connection'),
    subtitle: SOURCE_LABELS[connection.source] || formatKey(connection.source || ''),
    relationshipType: connection.relationshipType || 'related_to',
    relationshipLabel: formatKey(connection.relationshipType || 'related to'),
    method: connectionMethod(connection),
    provider: connection.provider || 'unknown',
    source: compactRef(resources.get(connection.sourceResourceId)),
    target: compactRef(resources.get(connection.targetResourceId)),
    status: normalizeStatus(connection.status),
    verificationState: connection.verificationState || 'unknown',
    discoveredVia: SOURCE_LABELS[connection.source] || formatKey(connection.source || 'unknown'),
    createdAt: connection.createdAt || null,
    lastVerifiedAt: connection.lastVerifiedAt || null,
    updatedAt: connection.updatedAt || null,
    metadata: sanitizeIntegrationMetadata(connection.metadata),
  };
};

/**
 * Resource descriptor — answers the eleven product questions (what it is, who
 * owns it, provider, connections, deployment history, events, change actor,
 * environment, associated deployments, available actions, blast radius).
 */
export const describeResource = (dataset, resourceId) => {
  const resource = indexById(dataset.resources).get(resourceId);
  if (!resource) return null;
  const resources = indexById(dataset.resources);
  const account = dataset.accounts.find((candidate) => candidate.id === resource.accountId) || null;

  const connections = dataset.connections
    .filter((connection) => connection.sourceResourceId === resource.id
      || connection.targetResourceId === resource.id)
    .map((connection) => ({
      id: connection.id,
      direction: connection.sourceResourceId === resource.id ? 'outgoing' : 'incoming',
      relationshipLabel: formatKey(connection.relationshipType || 'related to'),
      relationshipType: connection.relationshipType || 'related_to',
      method: connectionMethod(connection),
      provider: connection.provider || 'unknown',
      status: normalizeStatus(connection.status),
      verificationState: connection.verificationState || 'unknown',
      counterpart: compactRef(resources.get(
        connection.sourceResourceId === resource.id
          ? connection.targetResourceId
          : connection.sourceResourceId,
      )),
    }));

  const events = dataset.events
    .filter((event) => event.resourceId === resource.id)
    .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

  // Anything reachable through publishes/deploys_to/hosts edges tells the
  // operator what a change here may affect.
  const impact = connections
    .filter((connection) => connection.direction === 'outgoing'
      && ['deploys_to', 'publishes', 'hosts', 'serves', 'routes_to'].includes(connection.relationshipType))
    .map((connection) => connection.counterpart)
    .filter(Boolean);

  const providerUrl = getSafeProviderUrl(resource.provider, resource.providerUrl || resource.metadata?.url);

  const actions = [];
  if (supportsProviderAction(resource.provider, 'open_provider') && providerUrl) {
    actions.push({ id: 'open_provider', label: `Open in ${formatKey(resource.provider)}`, url: providerUrl, kind: 'external' });
  } else if (supportsProviderAction(resource.provider, 'open_provider')) {
    actions.push({
      id: 'open_provider_unavailable',
      label: `Open in ${formatKey(resource.provider)}`,
      available: false,
      reason: 'No verified provider URL is recorded for this resource yet.',
    });
  }

  return {
    kind: 'resource',
    id: resource.id,
    icon: objectTypeIcon(resource.type),
    title: resource.name,
    subtitle: RESOURCE_LABELS[resource.type] || formatKey(resource.type || 'resource'),
    type: resource.type,
    typeLabel: RESOURCE_LABELS[resource.type] || formatKey(resource.type || 'resource'),
    externalId: resource.externalId || '',
    provider: resource.provider || 'unknown',
    status: normalizeStatus(resource.status),
    verificationState: resource.verificationState || 'unknown',
    discoveredVia: SOURCE_LABELS[resource.source] || formatKey(resource.source || 'unknown'),
    owner: account ? { id: account.id, name: account.name, provider: account.provider } : null,
    environment: resource.metadata?.environment || null,
    createdAt: resource.createdAt || null,
    updatedAt: resource.updatedAt || null,
    lastVerifiedAt: resource.lastVerifiedAt || null,
    lastEventAt: events[0]?.timestamp || null,
    lastEventActor: events[0]?.actor?.name || null,
    metadata: sanitizeIntegrationMetadata(resource.metadata),
    connections,
    events: events.slice(0, 8).map((event) => ({
      id: event.id,
      eventType: event.eventType,
      label: formatKey(event.eventType),
      timestamp: event.timestamp,
      actor: event.actor?.name || 'Recorded activity',
      status: normalizeStatus(event.status),
    })),
    eventCount: events.length,
    impact,
    actions,
    projectId: resource.metadata?.projectId || resource.projectId || null,
  };
};

/** Event descriptor — the timeline's detail contract. */
export const describeEvent = (dataset, eventId) => {
  const event = indexById(dataset.events).get(eventId);
  if (!event) return null;
  const resource = indexById(dataset.resources).get(event.resourceId) || null;
  const account = dataset.accounts.find((candidate) => candidate.id === event.accountId) || null;

  return {
    kind: 'event',
    id: event.id,
    icon: 'activity',
    title: formatKey(event.eventType || 'event'),
    subtitle: event.timestamp || '',
    eventType: event.eventType || 'unknown',
    resource: compactRef(resource),
    provider: event.provider || resource?.provider || 'unknown',
    status: normalizeStatus(event.status),
    verificationState: event.verificationState || 'unknown',
    actor: event.actor?.name || 'Recorded activity',
    account: account ? { id: account.id, name: account.name, provider: account.provider } : null,
    projectId: event.projectId || null,
    timestamp: event.timestamp || null,
    discoveredVia: SOURCE_LABELS[event.source] || formatKey(event.source || 'unknown'),
    metadata: sanitizeIntegrationMetadata(event.metadata),
  };
};

/** Single entry point: any selection from graph/table/timeline → descriptor. */
export const buildObjectDescriptor = (dataset, selection) => {
  if (!dataset || !selection?.id) return null;
  if (selection.kind === 'connection') return describeConnection(dataset, selection.id);
  if (selection.kind === 'event') return describeEvent(dataset, selection.id);
  return describeResource(dataset, selection.id);
};
