import { useLocation, useNavigate } from 'react-router-dom';
import { getFeatureState } from '../../config/featureFlags';
import Icon from '../../components/Icon';
import { useToast } from '../../components/Toast';
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

export default function FeaturePreviewPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { showInfo } = useToast();
  const module = modules[pathname] || modules['/repositories'];
  const featureState = getFeatureState(module.flag);

  // Preview modules have no live source yet. Every action stays clickable so
  // the user always gets a visible reason instead of a silent dead click.
  const handleUnavailable = (action) => {
    showInfo(
      `${module.title} is in preview`,
      `"${action}" becomes available once this module is connected to a data source.`
    );
  };

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
            <button className="feature-action feature-action--primary" onClick={() => handleUnavailable(module.action)} title="Requires a connected data source" type="button">{module.action} <Icon name="arrowRight" size={15} /></button>
            <button className="feature-action" onClick={() => handleUnavailable(module.secondary)} title="Requires a connected data source" type="button">{module.secondary}</button>
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
            <button className="feature-action feature-action--primary" onClick={() => handleUnavailable(module.action)} title="Requires a connected data source" type="button">{module.action}</button>
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

      <section className="feature-boundary-callout">
        <span><Icon name="cube" size={20} /></span>
        <div><strong>Built as an isolated module</strong><p>This capability is feature-flagged and separated from core project workflows so it can evolve without destabilizing the production baseline.</p></div>
        <button onClick={() => navigate('/dashboard')}>Back to overview</button>
      </section>
    </div>
  );
}
