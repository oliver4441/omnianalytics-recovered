import { useMemo, useState } from 'react';
import Icon from '../../components/Icon';
import {
  discoverRelatedResources,
  findConnectionPath,
  RESOURCE_LABELS,
  SOURCE_LABELS,
} from '../../modules/integrations';

const questions = [
  {
    id: 'owner',
    label: 'Which account owns this resource?',
    targetTypes: ['account'],
    terminalRelationshipTypes: ['owns'],
  },
  {
    id: 'deployments',
    label: 'Where is this resource deployed?',
    targetTypes: ['deployment'],
  },
  {
    id: 'projects',
    label: 'Which provider projects use this resource?',
    targetTypes: ['project'],
  },
  {
    id: 'repositories',
    label: 'Which repositories are connected?',
    targetTypes: ['repository'],
  },
  {
    id: 'domains',
    label: 'Which domains are connected?',
    targetTypes: ['domain'],
  },
  {
    id: 'databases',
    label: 'Which databases are connected?',
    targetTypes: ['database'],
  },
  {
    id: 'infrastructure',
    label: 'What infrastructure belongs to this resource?',
    targetTypes: ['project', 'deployment', 'domain', 'environment', 'database', 'storage', 'api', 'worker'],
  },
  {
    id: 'services',
    label: 'Show every connected service',
    targetTypes: [],
  },
  {
    id: 'path',
    label: 'Trace an exact path between two resources',
    exactPath: true,
  },
];

const formatKey = (value) => String(value || 'unknown')
  .replaceAll('_', ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function RelationshipDiscovery({ dataset, onClose, onSelectResource }) {
  const [questionId, setQuestionId] = useState('owner');
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const question = questions.find((candidate) => candidate.id === questionId) || questions[0];
  const resources = useMemo(() => [...dataset.resources].sort((left, right) => (
    left.provider.localeCompare(right.provider)
    || left.name.localeCompare(right.name)
    || left.id.localeCompare(right.id)
  )), [dataset.resources]);
  const resourcesById = useMemo(
    () => new Map(dataset.resources.map((resource) => [resource.id, resource])),
    [dataset.resources],
  );
  const connectionsById = useMemo(
    () => new Map(dataset.connections.map((connection) => [connection.id, connection])),
    [dataset.connections],
  );
  const relatedResults = useMemo(() => (
    !question.exactPath && sourceId
      ? discoverRelatedResources(dataset, sourceId, {
        maxDepth: 6,
        maxResults: 25,
        targetTypes: question.targetTypes,
        terminalRelationshipTypes: question.terminalRelationshipTypes,
      })
      : []
  ), [dataset, question, sourceId]);
  const exactPath = useMemo(() => (
    question.exactPath && sourceId && targetId
      ? findConnectionPath(dataset, sourceId, targetId)
      : null
  ), [dataset, question.exactPath, sourceId, targetId]);
  const queryReady = Boolean(sourceId && (!question.exactPath || targetId));
  const paths = question.exactPath
    ? exactPath ? [{ ...exactPath, resource: resourcesById.get(targetId), depth: exactPath.connections.length }] : []
    : relatedResults;

  const changeQuestion = (nextQuestionId) => {
    setQuestionId(nextQuestionId);
    setTargetId('');
  };

  return (
    <section className="relationship-discovery" aria-labelledby="relationship-discovery-title">
      <div className="relationship-discovery__heading">
        <span><Icon name="route" size={19} /></span>
        <div>
          <h2 id="relationship-discovery-title">Deterministic connection discovery</h2>
          <p>Ask a structured question and inspect the shortest recorded paths. No AI or inferred edges are added.</p>
        </div>
        <button aria-label="Close relationship discovery" onClick={onClose}><Icon name="close" size={17} /></button>
      </div>

      <div className={`relationship-discovery__query ${question.exactPath ? 'has-target' : ''}`}>
        <label>Question
          <select onChange={(event) => changeQuestion(event.target.value)} value={questionId}>
            {questions.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.label}</option>)}
          </select>
        </label>
        <label>For resource
          <select onChange={(event) => setSourceId(event.target.value)} value={sourceId}>
            <option value="">Select a resource</option>
            {resources.map((resource) => (
              <option key={resource.id} value={resource.id}>{resource.provider} / {resource.name}</option>
            ))}
          </select>
        </label>
        {question.exactPath && (
          <label>Target resource
            <select onChange={(event) => setTargetId(event.target.value)} value={targetId}>
              <option value="">Select a target</option>
              {resources.map((resource) => (
                <option key={resource.id} value={resource.id}>{resource.provider} / {resource.name}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      {queryReady && (
        <div className={`relationship-discovery__matches ${paths.length ? '' : 'is-empty'}`} aria-live="polite">
          {paths.length ? (
            <>
              <header>
                <strong>{paths.length} recorded {paths.length === 1 ? 'result' : 'results'}</strong>
                <small>Results use shortest paths up to six relationships deep.</small>
              </header>
              {paths.map((path) => (
                <article className="relationship-discovery__match" key={`${path.resource?.id || targetId}:${path.connections.join(':')}`}>
                  <button className="relationship-discovery__match-title" onClick={() => onSelectResource(path.resource.id)}>
                    <span className={`resource-cell__icon provider-${path.resource.provider}`}><Icon name={path.resource.type === 'repository' ? 'branch' : path.resource.type === 'account' ? 'users' : 'cube'} size={15} /></span>
                    <span><strong>{path.resource.name}</strong><small>{path.resource.provider} · {RESOURCE_LABELS[path.resource.type] || formatKey(path.resource.type)} · {path.depth} {path.depth === 1 ? 'relationship' : 'relationships'} away</small></span>
                    <Icon name="chevronRight" size={14} />
                  </button>
                  <div className="relationship-discovery__path" aria-label={`Recorded path to ${path.resource.name}`}>
                    {path.resources.map((resourceId, index) => {
                      const resource = resourcesById.get(resourceId);
                      const connection = index < path.connections.length ? connectionsById.get(path.connections[index]) : null;
                      return (
                        <span className="discovery-path-segment" key={`${resourceId}:${index}`}>
                          <button onClick={() => onSelectResource(resourceId)}>
                            <strong>{resource?.name || 'Unknown resource'}</strong>
                            <small>{resource?.provider || 'unknown'} · {RESOURCE_LABELS[resource?.type] || formatKey(resource?.type)}</small>
                          </button>
                          {connection && (
                            <i title={`Verification: ${formatKey(connection.verificationState)}; source: ${SOURCE_LABELS[connection.source] || formatKey(connection.source)}; origin: ${formatKey(connection.origin)}`}>
                              <Icon name="arrowRight" size={14} />
                              <span>{formatKey(connection.relationshipType)}<small>{formatKey(connection.verificationState)} · {SOURCE_LABELS[connection.source] || formatKey(connection.source)} · {formatKey(connection.origin)} origin</small></span>
                            </i>
                          )}
                        </span>
                      );
                    })}
                  </div>
                </article>
              ))}
            </>
          ) : (
            <p><Icon name="issue" size={15} /> No recorded relationship path answers this question. OmniAnalytics will not invent one.</p>
          )}
        </div>
      )}
    </section>
  );
}
