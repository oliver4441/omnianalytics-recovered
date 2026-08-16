import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getFeatureState } from '../../config/featureFlags';
import Icon from '../../components/Icon';
import {
  getIntegrationDataset,
  getRepositoryInsights,
  normalizeIntegrationDataset,
  SOURCE_LABELS,
} from '../../modules/integrations';
import './FeaturePreviewPage.css';

const modules = {
  '/issues': {
    flag: 'issueManagement',
    icon: 'issue',
    eyebrow: 'Plan',
    title: 'Issues',
    description: 'Track developer issues with the context needed to move from analysis to implementation.',
    action: 'Create issue',
    secondary: 'Import from GitHub',
    fields: ['Priority & severity', 'Assignees & milestones', 'Linked tasks', 'Commit and PR traceability'],
  },
  '/repositories': {
    flag: 'githubIntegration',
    icon: 'branch',
    eyebrow: 'Build',
    title: 'Repositories',
    description: 'Connect source control to bring branches, commits, pull requests, and repository activity into your workspace.',
    action: 'Connect GitHub',
    secondary: 'View integration guide',
    fields: ['Repository activity', 'Pull request reviews', 'Branches & commits', 'Contributors'],
  },
  '/cicd': {
    flag: 'cicdDashboard',
    icon: 'pipeline',
    eyebrow: 'Ship',
    title: 'CI/CD',
    description: 'Monitor build, test, security, and deployment checks without switching between delivery providers.',
    action: 'Add provider',
    secondary: 'Configure webhook',
    fields: ['Workflow runs', 'Test & lint checks', 'Deployment history', 'Rollback context'],
  },
  '/releases': {
    flag: 'releaseManagement',
    icon: 'rocket',
    eyebrow: 'Ship',
    title: 'Release center',
    description: 'Coordinate versions, milestones, release notes, development records, and deployment readiness.',
    action: 'Create release',
    secondary: 'View release workflow',
    fields: ['Versions & milestones', 'Associated issues', 'Pull requests & commits', 'Changelog'],
  },
  '/analytics': {
    flag: 'developerAnalytics',
    icon: 'chart',
    eyebrow: 'Operate',
    title: 'Engineering analytics',
    description: 'Find delivery bottlenecks using actionable velocity, review, reliability, and project-health signals.',
    action: 'Connect data source',
    secondary: 'Metric definitions',
    fields: ['PR cycle time', 'Review latency', 'Release frequency', 'Recovery time'],
  },
  '/security': {
    flag: 'securityCenter',
    icon: 'shield',
    eyebrow: 'Operate',
    title: 'Security center',
    description: 'Understand security posture across dependencies, access rules, environments, actions, and deployments.',
    action: 'Start baseline review',
    secondary: 'View security model',
    fields: ['Dependency findings', 'Access boundaries', 'Firebase rules', 'Environment posture'],
  },
  '/docs': {
    flag: 'documentationWorkspace',
    icon: 'book',
    eyebrow: 'Knowledge',
    title: 'Documentation',
    description: 'Keep architecture, APIs, environments, deployments, and runbooks close to the work they explain.',
    action: 'Create document',
    secondary: 'Connect repository docs',
    fields: ['README & architecture', 'API references', 'Environment guides', 'Runbooks'],
  },
};

const formatDateTime = (value) => {
  if (!value) return 'Time unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Time unavailable';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

const formatEventName = (value) => value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

function RepositoryInsights({ dataset, navigate }) {
  const { repositories, providers, totalCommits } = useMemo(() => getRepositoryInsights(dataset), [dataset]);
  const generatedAt = dataset.generatedAt ? new Date(dataset.generatedAt).toLocaleString() : 'time unavailable';

  if (!repositories.length) {
    return (
      <div className="feature-preview-empty">
        <span><Icon name="branch" size={25} /></span>
        <h3>No repository records yet</h3>
        <p>OmniAnalytics shows repositories only from attributed metadata or a connected source control provider. Sample data is never used.</p>
        <button className="feature-action feature-action--primary" disabled title="Connect a provider to import repositories">Connect GitHub</button>
      </div>
    );
  }

  return (
    <div className="repo-insights">
      <div className="repo-insights__summary">
        <div><Icon name="branch" size={17} /><p><strong>{repositories.length}</strong><small>{repositories.length === 1 ? 'Repository' : 'Repositories'}</small></p></div>
        <div><Icon name="gitCommit" size={17} /><p><strong>{totalCommits}</strong><small>{totalCommits === 1 ? 'Commit record' : 'Commit records'}</small></p></div>
        <div><Icon name="users" size={17} /><p><strong>{providers.length}</strong><small>{providers.length === 1 ? 'Provider' : 'Providers'}</small></p></div>
        <div className="repo-insights__source"><Icon name="download" size={15} /><p><strong>{SOURCE_LABELS[dataset.source] || dataset.source || 'Imported metadata'}</strong><small>Generated {generatedAt}</small></p></div>
      </div>

      {repositories.map(({ repository, account, events }) => {
        const metadata = repository.metadata || {};
        return (
          <article className="repo-card" key={repository.id}>
            <header className="repo-card__header">
              <div className="repo-card__title">
                <span className="repo-card__icon"><Icon name="branch" size={18} /></span>
                <div>
                  <strong>{metadata.fullName || repository.name}</strong>
                  <small>{account ? `${account.provider} · ${account.name}` : repository.provider}</small>
                </div>
              </div>
              <span className={`repo-card__verify repo-card__verify--${repository.verificationState}`}>
                <i /> {SOURCE_LABELS[repository.source] || 'Imported'}
              </span>
            </header>

            <dl className="repo-card__meta">
              <div><dt>Default branch</dt><dd>{metadata.defaultBranch || 'Unavailable'}</dd></div>
              <div><dt>Latest commit</dt><dd>{metadata.latestCommit || 'Unavailable'}</dd></div>
              <div><dt>Visibility</dt><dd>{metadata.visibility || 'Unknown'}</dd></div>
              <div><dt>Health</dt><dd className={`repo-card__health repo-card__health--${repository.status}`}>{repository.status}</dd></div>
            </dl>

            {repository.providerUrl && (
              <a className="repo-card__link" href={repository.providerUrl} rel="noreferrer noopener" target="_blank">
                <Icon name="arrowUpRight" size={14} /> View repository
              </a>
            )}

            <div className="repo-card__activity">
              <div className="repo-card__activity-header">
                <h4>Commit activity</h4>
                <button className="repo-card__graph-link" type="button" onClick={() => navigate(`/integrations/graph?resource=${encodeURIComponent(repository.id)}`)}>
                  <Icon name="graph" size={14} /> Open in graph
                </button>
              </div>
              {events.length ? (
                <ul className="repo-commit-list">
                  {events.slice(0, 5).map((event) => (
                    <li key={event.id}>
                      <span className="repo-commit-list__hash">{event.metadata?.shortHash || '—'}</span>
                      <span className="repo-commit-list__summary">{event.metadata?.summary || formatEventName(event.eventType)}</span>
                      <span className="repo-commit-list__meta">
                        <small>{event.actor?.name || 'Unknown contributor'}</small>
                        <small>{formatDateTime(event.timestamp)}</small>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="repo-card__activity-empty">No commit records are attributed to this repository yet.</p>
              )}
            </div>
          </article>
        );
      })}

      <p className="repo-insights__provenance">
        <Icon name="shield" size={15} />
        These records are imported from local repository metadata, not live provider state. Provider-verified activity requires connecting a source control account.
      </p>
    </div>
  );
}

export default function FeaturePreviewPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const module = modules[pathname] || modules['/repositories'];
  const featureState = getFeatureState(module.flag);

  const [dataset, setDataset] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  const isRepositories = pathname === '/repositories';

  useEffect(() => {
    if (!isRepositories) return undefined;
    const controller = new AbortController();
    setLoading(true);
    setLoadError('');
    getIntegrationDataset({ signal: controller.signal })
      .then((result) => setDataset(normalizeIntegrationDataset(result)))
      .catch((error) => {
        if (error.name !== 'AbortError') setLoadError(error.message || 'Repository metadata could not be loaded.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [isRepositories]);

  return (
    <div className="feature-preview-page">
      <section className="feature-preview-hero">
        <div className="feature-preview-hero__copy">
          <span className="feature-preview-hero__eyebrow"><Icon name={module.icon} size={14} /> {module.eyebrow}</span>
          <div className="feature-preview-hero__title">
            <h1>{module.title}</h1>
            <span>{featureState === 'internal' ? 'Internal' : 'Preview'}</span>
          </div>
          <p>{module.description}</p>
          <div className="feature-preview-hero__actions">
            <button className="feature-action feature-action--primary" disabled title="Setup actions are not available in this preview">{module.action} <Icon name="arrowRight" size={15} /></button>
            <button className="feature-action" disabled title="Guidance is not available in this preview">{module.secondary}</button>
          </div>
        </div>
        <div className="feature-preview-hero__graphic" aria-hidden="true">
          <span className="feature-graphic__orbit feature-graphic__orbit--one" />
          <span className="feature-graphic__orbit feature-graphic__orbit--two" />
          <span className="feature-graphic__core"><Icon name={module.icon} size={30} /></span>
          <span className="feature-graphic__node feature-graphic__node--one"><Icon name="check" size={14} /></span>
          <span className="feature-graphic__node feature-graphic__node--two"><Icon name="gitCommit" size={14} /></span>
          <span className="feature-graphic__node feature-graphic__node--three"><Icon name="zap" size={14} /></span>
        </div>
      </section>

      {isRepositories ? (
        <div className="feature-preview-grid">
          <section className="feature-preview-card feature-preview-card--main">
            <div className="feature-preview-card__header">
              <div><h2>Repository records</h2><p>Attributed source control data for this workspace</p></div>
              <span className="feature-empty-status"><i /> {loadError ? 'Unavailable' : 'Imported metadata'}</span>
            </div>
            {loading ? (
              <div className="repo-insights repo-insights--loading" role="status">
                <span className="repo-insights__spinner" />
                <p>Loading repository metadata…</p>
              </div>
            ) : loadError ? (
              <div className="feature-preview-empty">
                <span><Icon name="issue" size={25} /></span>
                <h3>Repository metadata unavailable</h3>
                <p>{loadError}</p>
              </div>
            ) : dataset ? (
              <RepositoryInsights dataset={dataset} navigate={navigate} />
            ) : null}
          </section>

          <aside className="feature-preview-card feature-scope-card">
            <div className="feature-preview-card__header"><div><h2>Module scope</h2><p>Included in this product area</p></div></div>
            <ul>
              {module.fields.map((field) => <li key={field}><span><Icon name="check" size={13} /></span>{field}</li>)}
            </ul>
            <div className="feature-scope-card__note"><Icon name="shield" size={16} /><p><strong>Permission-aware by design</strong>Data is limited by explicit workspace and project access.</p></div>
          </aside>
        </div>
      ) : (
        <div className="feature-preview-grid">
          <section className="feature-preview-card feature-preview-card--main">
            <div className="feature-preview-card__header">
              <div><h2>Workspace not configured</h2><p>Connect the required source to start collecting trustworthy data.</p></div>
              <span className="feature-empty-status"><i /> Awaiting data</span>
            </div>
            <div className="feature-preview-empty">
              <span><Icon name={module.icon} size={25} /></span>
              <h3>No {module.title.toLowerCase()} data yet</h3>
              <p>OmniAnalytics only shows records received from your projects and connected systems. Sample data is never mixed with workspace metrics.</p>
              <button className="feature-action feature-action--primary" disabled title="Setup actions are not available in this preview">{module.action}</button>
            </div>
          </section>

          <aside className="feature-preview-card feature-scope-card">
            <div className="feature-preview-card__header"><div><h2>Module scope</h2><p>Included in this product area</p></div></div>
            <ul>
              {module.fields.map((field) => <li key={field}><span><Icon name="check" size={13} /></span>{field}</li>)}
            </ul>
            <div className="feature-scope-card__note"><Icon name="shield" size={16} /><p><strong>Permission-aware by design</strong>Data is limited by explicit workspace and project access.</p></div>
          </aside>
        </div>
      )}

      <section className="feature-boundary-callout">
        <span><Icon name="cube" size={20} /></span>
        <div><strong>Built as an isolated module</strong><p>This capability is feature-flagged and separated from core project workflows so it can evolve without destabilizing the production baseline.</p></div>
        <button onClick={() => navigate('/dashboard')}>Back to overview</button>
      </section>
    </div>
  );
}
