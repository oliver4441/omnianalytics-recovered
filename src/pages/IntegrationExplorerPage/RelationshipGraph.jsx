import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../../components/Icon';
import { objectTypeIcon } from '../../modules/objects/index.js';

const NODE_WIDTH = 208;
const NODE_HEIGHT = 82;
const emptyProviderSet = new Set();
const readableLabel = (value) => String(value || 'unknown').replaceAll('_', ' ');

const typeRank = {
  account: 0,
  repository: 1,
  branch: 2,
  commit: 2,
  project: 2,
  environment: 3,
  deployment: 4,
  worker: 4,
  api: 4,
  domain: 5,
  database: 5,
  storage: 5,
  unknown: 6,
};

const healthSymbol = {
  connected: '✓',
  synchronizing: '↻',
  healthy: '✓',
  degraded: '!',
  expired: '!',
  disconnected: '×',
  error: '!',
  unknown: '?',
};

// Node icons come from the canonical object model; the graph only adds its
// provider-group overlay concept.
const typeIcon = { group: 'layers' };

const getAutomaticPositions = (resources) => {
  const rankCounts = new Map();
  return Object.fromEntries(resources.map((resource) => {
    const rank = typeRank[resource.type] ?? (resource.type === 'group' ? 1 : 6);
    const rankIndex = rankCounts.get(rank) || 0;
    rankCounts.set(rank, rankIndex + 1);
    return [resource.id, {
      x: 84 + (rank * 258),
      y: 92 + (rankIndex * 132),
    }];
  }));
};

const collapseDataset = (dataset, collapsedProviders) => {
  if (!collapsedProviders.size) return dataset;
  const mappedResourceId = new Map();
  const groups = new Map();
  const resources = [];

  dataset.resources.forEach((resource) => {
    if (!collapsedProviders.has(resource.provider)) {
      mappedResourceId.set(resource.id, resource.id);
      resources.push(resource);
      return;
    }

    const groupId = `provider-group:${resource.provider}`;
    mappedResourceId.set(resource.id, groupId);
    if (!groups.has(resource.provider)) {
      groups.set(resource.provider, {
        id: groupId,
        provider: resource.provider,
        type: 'group',
        name: `${resource.provider} resources`,
        status: 'unknown',
        verificationState: 'unknown',
        metadata: { count: 0 },
      });
    }
    groups.get(resource.provider).metadata.count += 1;
  });

  resources.push(...groups.values());
  const seen = new Set();
  const connections = dataset.connections.flatMap((connection) => {
    const sourceResourceId = mappedResourceId.get(connection.sourceResourceId);
    const targetResourceId = mappedResourceId.get(connection.targetResourceId);
    if (!sourceResourceId || !targetResourceId || sourceResourceId === targetResourceId) return [];
    const key = `${sourceResourceId}:${targetResourceId}:${connection.relationshipType}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{
      ...connection,
      id: `collapsed:${key}`,
      originalConnectionId: connection.id,
      sourceResourceId,
      targetResourceId,
    }];
  });

  return { ...dataset, resources, connections };
};

export default function RelationshipGraph({
  dataset,
  focusedResourceId,
  groupByProvider,
  onSelectConnection,
  onSelectResource,
  selectedConnectionId,
}) {
  const containerRef = useRef(null);
  const nodeMovedRef = useRef(false);
  const focusedResourceRef = useRef(focusedResourceId);
  focusedResourceRef.current = focusedResourceId;
  const [positions, setPositions] = useState({});
  const [view, setView] = useState({ x: 40, y: 40, scale: 1 });
  const [drag, setDrag] = useState(null);
  const [collapsedProviders, setCollapsedProviders] = useState(new Set());
  const [hiddenProviders, setHiddenProviders] = useState(new Set());
  const [hiddenResourceTypes, setHiddenResourceTypes] = useState(new Set());
  const [visibilityOpen, setVisibilityOpen] = useState(false);
  const availableProviders = useMemo(
    () => [...new Set(dataset.resources.map((resource) => resource.provider))].sort(),
    [dataset.resources],
  );
  const availableResourceTypes = useMemo(
    () => [...new Set(dataset.resources.map((resource) => resource.type))].sort(),
    [dataset.resources],
  );
  const visibleDataset = useMemo(() => {
    const resources = dataset.resources.filter((resource) => (
      !hiddenProviders.has(resource.provider) && !hiddenResourceTypes.has(resource.type)
    ));
    const resourceIds = new Set(resources.map((resource) => resource.id));
    return {
      ...dataset,
      resources,
      connections: dataset.connections.filter((connection) => (
        resourceIds.has(connection.sourceResourceId) && resourceIds.has(connection.targetResourceId)
      )),
    };
  }, [dataset, hiddenProviders, hiddenResourceTypes]);
  const providers = useMemo(
    () => [...new Set(visibleDataset.resources.map((resource) => resource.provider))].sort(),
    [visibleDataset.resources],
  );
  const graphDataset = useMemo(
    () => collapseDataset(visibleDataset, groupByProvider ? collapsedProviders : emptyProviderSet),
    [collapsedProviders, groupByProvider, visibleDataset],
  );

  const fitPositions = (positionSet) => {
    const values = Object.values(positionSet);
    const container = containerRef.current;
    if (!values.length || !container) return;
    const minX = Math.min(...values.map((position) => position.x));
    const minY = Math.min(...values.map((position) => position.y));
    const maxX = Math.max(...values.map((position) => position.x + NODE_WIDTH));
    const maxY = Math.max(...values.map((position) => position.y + NODE_HEIGHT));
    const scale = Math.min(
      1.2,
      Math.max(0.1, Math.min(
        (container.clientWidth - 80) / Math.max(1, maxX - minX),
        (container.clientHeight - 80) / Math.max(1, maxY - minY),
      )),
    );
    setView({
      scale,
      x: ((container.clientWidth - ((maxX - minX) * scale)) / 2) - (minX * scale),
      y: ((container.clientHeight - ((maxY - minY) * scale)) / 2) - (minY * scale),
    });
  };

  const centerResource = (resourceId, positionSet) => {
    if (!resourceId || !positionSet[resourceId] || !containerRef.current) return;
    const position = positionSet[resourceId];
    setView((current) => ({
      ...current,
      x: (containerRef.current.clientWidth / 2) - ((position.x + (NODE_WIDTH / 2)) * current.scale),
      y: (containerRef.current.clientHeight / 2) - ((position.y + (NODE_HEIGHT / 2)) * current.scale),
    }));
  };

  const fitToScreen = () => fitPositions(positions);
  const resetLayout = () => {
    const automaticPositions = getAutomaticPositions(graphDataset.resources);
    setPositions(automaticPositions);
    fitPositions(automaticPositions);
    centerResource(focusedResourceId, automaticPositions);
  };

  useEffect(() => {
    const automaticPositions = getAutomaticPositions(graphDataset.resources);
    setPositions(automaticPositions);
    const timer = window.setTimeout(() => {
      fitPositions(automaticPositions);
      centerResource(focusedResourceRef.current, automaticPositions);
    }, 0);
    return () => window.clearTimeout(timer);
  // Fit when the resource set changes; user-controlled view changes must not retrigger it.
  }, [graphDataset.resources]);

  useEffect(() => {
    centerResource(focusedResourceId, positions);
  // Automatic layout handles later position changes; dragging a selected node must not recenter the canvas.
  }, [focusedResourceId]);

  const toGraphPoint = (clientX, clientY) => {
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left - view.x) / view.scale,
      y: (clientY - rect.top - view.y) / view.scale,
    };
  };

  const startPan = (event) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ kind: 'canvas', startX: event.clientX, startY: event.clientY, view });
  };

  const startNodeDrag = (event, resourceId) => {
    event.stopPropagation();
    if (event.button !== 0) return;
    const point = toGraphPoint(event.clientX, event.clientY);
    const position = positions[resourceId];
    nodeMovedRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({
      kind: 'node',
      resourceId,
      offsetX: point.x - position.x,
      offsetY: point.y - position.y,
      moved: false,
    });
  };

  const handlePointerMove = (event) => {
    if (!drag) return;
    if (drag.kind === 'canvas') {
      setView({
        ...drag.view,
        x: drag.view.x + event.clientX - drag.startX,
        y: drag.view.y + event.clientY - drag.startY,
      });
      return;
    }

    const point = toGraphPoint(event.clientX, event.clientY);
    setPositions((current) => ({
      ...current,
      [drag.resourceId]: {
        x: point.x - drag.offsetX,
        y: point.y - drag.offsetY,
      },
    }));
    if (!drag.moved) {
      nodeMovedRef.current = true;
      setDrag({ ...drag, moved: true });
    }
  };

  const finishPointer = (event) => {
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDrag(null);
  };

  const handleNodeActivate = (resource) => {
    if (resource.type === 'group') {
      setCollapsedProviders((current) => {
        const next = new Set(current);
        next.delete(resource.provider);
        return next;
      });
      return;
    }
    onSelectResource(resource.id);
  };

  const zoom = (factor) => {
    const container = containerRef.current;
    if (!container) return;
    setView((current) => {
      const nextScale = Math.max(0.25, Math.min(2.2, current.scale * factor));
      const centerX = container.clientWidth / 2;
      const centerY = container.clientHeight / 2;
      return {
        scale: nextScale,
        x: centerX - ((centerX - current.x) * (nextScale / current.scale)),
        y: centerY - ((centerY - current.y) * (nextScale / current.scale)),
      };
    });
  };

  const toggleHiddenValue = (setter, value) => setter((current) => {
    const next = new Set(current);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  });

  const showAllResources = () => {
    setHiddenProviders(new Set());
    setHiddenResourceTypes(new Set());
  };

  const expandProviderGroups = () => setCollapsedProviders(new Set());

  const providerBounds = useMemo(() => {
    if (!groupByProvider) return [];
    return providers.flatMap((provider) => {
      const providerResources = graphDataset.resources.filter((resource) => resource.provider === provider);
      const providerPositions = providerResources.map((resource) => positions[resource.id]).filter(Boolean);
      if (!providerPositions.length) return [];
      const minX = Math.min(...providerPositions.map((position) => position.x)) - 24;
      const minY = Math.min(...providerPositions.map((position) => position.y)) - 38;
      const maxX = Math.max(...providerPositions.map((position) => position.x + NODE_WIDTH)) + 24;
      const maxY = Math.max(...providerPositions.map((position) => position.y + NODE_HEIGHT)) + 24;
      return [{ provider, x: minX, y: minY, width: maxX - minX, height: maxY - minY }];
    });
  }, [graphDataset.resources, groupByProvider, positions, providers]);

  if (!graphDataset.resources.length) {
    return (
      <div className="relationship-graph">
        <div className="integration-empty integration-empty--graph">
          <span><Icon name="graph" size={24} /></span>
          <h3>No resources are visible</h3>
          <p>Clear page filters or restore graph visibility to continue exploring.</p>
          {(hiddenProviders.size > 0 || hiddenResourceTypes.size > 0) && (
            <button onClick={showAllResources}><Icon name="refresh" size={14} /> Show all graph resources</button>
          )}
          {collapsedProviders.size > 0 && (
            <button onClick={expandProviderGroups}><Icon name="layers" size={14} /> Expand provider groups</button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relationship-graph" ref={containerRef}>
      <div className="relationship-graph__toolbar" aria-label="Graph controls">
        <button aria-label="Zoom in" onClick={() => zoom(1.2)}><Icon name="plus" size={16} /></button>
        <button aria-label="Zoom out" onClick={() => zoom(0.8)}><span aria-hidden="true">−</span></button>
        <button onClick={fitToScreen}><Icon name="maximize" size={15} /> Fit</button>
        <button onClick={resetLayout}><Icon name="refresh" size={15} /> Reset layout</button>
        <div className="graph-visibility">
          <button aria-controls="graph-visibility-menu" aria-expanded={visibilityOpen} onClick={() => setVisibilityOpen((current) => !current)}>
            <Icon name="layers" size={15} /> Visibility
          </button>
          {visibilityOpen && (
            <div className="graph-visibility__menu" id="graph-visibility-menu">
              <fieldset>
                <legend>Providers</legend>
                {availableProviders.map((provider) => (
                  <label key={provider}>
                    <input
                      checked={!hiddenProviders.has(provider)}
                      onChange={() => toggleHiddenValue(setHiddenProviders, provider)}
                      type="checkbox"
                    />
                    <span>{provider}</span>
                  </label>
                ))}
              </fieldset>
              <fieldset>
                <legend>Resource types</legend>
                {availableResourceTypes.map((resourceType) => (
                  <label key={resourceType}>
                    <input
                      checked={!hiddenResourceTypes.has(resourceType)}
                      onChange={() => toggleHiddenValue(setHiddenResourceTypes, resourceType)}
                      type="checkbox"
                    />
                    <span>{readableLabel(resourceType)}</span>
                  </label>
                ))}
              </fieldset>
              {(hiddenProviders.size > 0 || hiddenResourceTypes.size > 0) && (
                <button className="graph-visibility__reset" onClick={showAllResources}>Show all</button>
              )}
            </div>
          )}
        </div>
      </div>

      {groupByProvider && (
        <div className="relationship-graph__groups" aria-label="Provider groups">
          {providers.map((provider) => (
            <button
              aria-expanded={!collapsedProviders.has(provider)}
              className={collapsedProviders.has(provider) ? 'is-collapsed' : ''}
              key={provider}
              onClick={() => setCollapsedProviders((current) => {
                const next = new Set(current);
                if (next.has(provider)) next.delete(provider);
                else next.add(provider);
                return next;
              })}
            >
              <Icon name={collapsedProviders.has(provider) ? 'plus' : 'chevronDown'} size={13} />
              {provider}
            </button>
          ))}
        </div>
      )}

      <svg
        aria-label="Integration relationship graph"
        className={drag ? 'is-interacting' : ''}
        onPointerDown={startPan}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={finishPointer}
        onWheel={(event) => {
          event.preventDefault();
          zoom(event.deltaY < 0 ? 1.08 : 0.92);
        }}
        role="application"
      >
        <defs>
          <marker id="integration-arrow" markerHeight="7" markerWidth="7" orient="auto" refX="6" refY="3.5">
            <path d="M0,0 L7,3.5 L0,7 Z" />
          </marker>
        </defs>
        <g transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}>
          {providerBounds.map((bounds) => (
            <g className="graph-provider-boundary" key={bounds.provider}>
              <rect height={bounds.height} rx="18" width={bounds.width} x={bounds.x} y={bounds.y} />
              <text x={bounds.x + 14} y={bounds.y + 21}>{bounds.provider}</text>
            </g>
          ))}

          {graphDataset.connections.map((connection) => {
            const source = positions[connection.sourceResourceId];
            const target = positions[connection.targetResourceId];
            if (!source || !target) return null;
            const sourceX = source.x + NODE_WIDTH;
            const sourceY = source.y + (NODE_HEIGHT / 2);
            const targetX = target.x;
            const targetY = target.y + (NODE_HEIGHT / 2);
            const bend = Math.max(60, Math.abs(targetX - sourceX) / 2);
            const path = `M ${sourceX} ${sourceY} C ${sourceX + bend} ${sourceY}, ${targetX - bend} ${targetY}, ${targetX} ${targetY}`;
            return (
              <g
                aria-label={`${readableLabel(connection.relationshipType)} connection, health ${readableLabel(connection.status)}, verification ${readableLabel(connection.verificationState)}, source ${readableLabel(connection.source)}, origin ${readableLabel(connection.origin)}`}
                aria-pressed={selectedConnectionId === (connection.originalConnectionId || connection.id)}
                className={`graph-connection status-${connection.status} ${selectedConnectionId === (connection.originalConnectionId || connection.id) ? 'is-selected' : ''}`}
                key={connection.id}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectConnection(connection.originalConnectionId || connection.id);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelectConnection(connection.originalConnectionId || connection.id);
                  }
                }}
                role="button"
                tabIndex="0"
              >
                <path className="graph-connection__hit" d={path} />
                <path className="graph-connection__line" d={path} markerEnd="url(#integration-arrow)" />
                <text x={(sourceX + targetX) / 2} y={(sourceY + targetY) / 2 - 8}>{connection.relationshipType.replaceAll('_', ' ')}</text>
              </g>
            );
          })}

          {graphDataset.resources.map((resource) => {
            const position = positions[resource.id];
            if (!position) return null;
            const selected = resource.id === focusedResourceId;
            return (
              <g
                aria-label={`${readableLabel(resource.type)} ${resource.name}, health ${readableLabel(resource.status)}, verification ${readableLabel(resource.verificationState)}, source ${readableLabel(resource.source)}`}
                className={`graph-node graph-node--${resource.type} ${selected ? 'is-selected' : ''}`}
                key={resource.id}
                onClick={(event) => {
                  event.stopPropagation();
                  if (!nodeMovedRef.current) handleNodeActivate(resource);
                  nodeMovedRef.current = false;
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleNodeActivate(resource);
                  }
                }}
                onPointerDown={(event) => startNodeDrag(event, resource.id)}
                role="button"
                tabIndex="0"
                transform={`translate(${position.x} ${position.y})`}
              >
                <rect className="graph-node__surface" height={NODE_HEIGHT} rx="14" width={NODE_WIDTH} />
                <foreignObject height="38" width="38" x="14" y="14">
                  <span className={`graph-node__icon provider-${resource.provider}`}>
                    <Icon name={typeIcon[resource.type] || objectTypeIcon(resource.type)} size={18} />
                  </span>
                </foreignObject>
                <text className="graph-node__provider" x="64" y="25">{resource.provider}</text>
                <text className="graph-node__name" x="64" y="46">{resource.name.slice(0, 22)}</text>
                <text className="graph-node__type" x="64" y="65">
                  {resource.type === 'group' ? `${resource.metadata.count} resources · click to expand` : resource.type.replaceAll('_', ' ')}
                </text>
                <circle className={`graph-node__health status-${resource.status}`} cx="193" cy="17" r="8" />
                <text aria-hidden="true" className="graph-node__health-symbol" x="193" y="20">{healthSymbol[resource.status] || '?'}</text>
              </g>
            );
          })}
        </g>
      </svg>
      <div className="relationship-graph__legend">
        <span><i className="status-healthy">✓</i> Healthy</span>
        <span><i className="status-degraded">!</i> Attention</span>
        <span><i className="status-unknown">?</i> Unknown</span>
        <small>Scroll to zoom · drag canvas to pan · drag nodes to arrange</small>
      </div>
    </div>
  );
}
