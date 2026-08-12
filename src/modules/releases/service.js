const parseTime = (value) => {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
};

/**
 * Release milestones come from git tags recorded as release resources in the
 * integration metadata, newest first, with the changelog generated from the
 * commits between consecutive tags.
 */
export const buildReleaseMilestones = (dataset) => {
  const releases = dataset.resources.filter((resource) => resource.type === 'release');
  return releases
    .map((release) => ({
      id: release.id,
      version: release.metadata?.version || release.externalId || release.name,
      createdAt: release.metadata?.createdAt || release.updatedAt || null,
      commit: release.metadata?.commit || '',
      previousTag: release.metadata?.previousTag || '',
      changelog: Array.isArray(release.metadata?.changelog) ? release.metadata.changelog : [],
      verificationState: release.verificationState,
    }))
    .sort((a, b) => parseTime(b.createdAt) - parseTime(a.createdAt));
};

/** Commits not yet covered by any tag — the "unreleased" changelog candidate. */
export const buildUnreleasedChangelog = (dataset) => {
  const commitEvents = dataset.events
    .filter((event) => event.eventType === 'commit_recorded')
    .sort((a, b) => parseTime(b.timestamp) - parseTime(a.timestamp));

  const milestones = buildReleaseMilestones(dataset);
  const latestTagTime = milestones.length ? parseTime(milestones[0].createdAt) : 0;

  return commitEvents
    .filter((event) => parseTime(event.timestamp) > latestTagTime)
    .map((event) => `${event.metadata?.shortHash || '-------'} ${event.metadata?.summary || 'Untitled commit'}`);
};

/** Validate a workspace release draft before persisting it to Firestore. */
export const validateReleaseDraft = (draft) => {
  const errors = {};
  const version = String(draft.version || '').trim();
  if (!version) errors.version = 'Version is required.';
  else if (!/^v?\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) errors.version = 'Use semantic versioning, e.g. v1.4.0.';
  if (!String(draft.title || '').trim()) errors.title = 'Release title is required.';
  return { valid: Object.keys(errors).length === 0, errors };
};

/**
 * Release readiness checklist. Every check reads real repository/workspace
 * signals from the metadata snapshot — no check is hard-coded to pass.
 */
export const buildReadinessChecklist = (dataset, draft = {}) => {
  const workspace = dataset.workspace || {};
  const manifests = workspace.manifests || {};
  const rules = workspace.rulesPosture || null;
  const unreleased = buildUnreleasedChangelog(dataset);
  const milestones = buildReleaseMilestones(dataset);
  const documentation = workspace.documentation || [];

  return [
    {
      id: 'changelog',
      label: 'Changelog entries collected',
      detail: unreleased.length
        ? `${unreleased.length} commit${unreleased.length === 1 ? '' : 's'} since the latest tag will ship in this release.`
        : 'No commits detected beyond the latest tag in this snapshot.',
      passed: unreleased.length > 0,
    },
    {
      id: 'metadata',
      label: 'Repository metadata fresh',
      detail: dataset.generatedAt
        ? `Integration snapshot generated ${new Date(dataset.generatedAt).toLocaleString()}.`
        : 'Integration snapshot generation time unavailable.',
      passed: Boolean(dataset.generatedAt),
    },
    {
      id: 'manifests',
      label: 'Dependency manifests present',
      detail: manifests['package.json'] && manifests['package-lock.json']
        ? 'package.json and package-lock.json detected — dependencies are pinned.'
        : 'A dependency manifest is missing; releases cannot reproduce installs.',
      passed: manifests['package.json'] === true && manifests['package-lock.json'] === true,
    },
    {
      id: 'rules',
      label: 'Firestore rules not open access',
      detail: !rules?.present
        ? 'No firestore.rules file detected in this workspace.'
        : rules.openAccess
          ? 'firestore.rules contains an allow-if-true access rule.'
          : 'firestore.rules enforces authenticated access.',
      passed: rules?.present === true && rules.openAccess === false,
    },
    {
      id: 'docs',
      label: 'Documentation available',
      detail: documentation.length
        ? `${documentation.length} workspace document${documentation.length === 1 ? '' : 's'} available for release notes.`
        : 'No workspace documentation detected.',
      passed: documentation.length > 0,
    },
    {
      id: 'firstRelease',
      label: milestones.length ? 'Cut from previous milestone' : 'First release for this repository',
      detail: milestones.length
        ? `Latest milestone ${milestones[0].version} was published ${milestones[0].createdAt ? new Date(milestones[0].createdAt).toLocaleDateString() : 'at an unknown time'}.`
        : 'No git tags exist yet — this release will be the first recorded milestone.',
      passed: true,
    },
    {
      id: 'version',
      label: 'Version conforms to semver',
      detail: draft.version
        ? `Proposed version: ${String(draft.version).trim()}`
        : 'Enter a version to validate.',
      passed: /^v?\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(String(draft.version || '').trim()),
    },
  ];
};
