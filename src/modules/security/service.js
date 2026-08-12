import { containsCredentialShape } from './patterns.js';

/**
 * The baseline review inspects only recorded workspace evidence: the generated
 * integration metadata snapshot, the workspace manifest inventory, Firestore
 * rules posture, and the environment list. Findings are deterministic — the
 * same snapshot always yields the same review.
 */
export const runBaselineReview = (dataset, { reviewedAt = new Date().toISOString() } = {}) => {
  const workspace = dataset.workspace || {};
  const findings = [];

  // 1. Credential exposure: scan the serialized snapshot with the exact regex
  // the metadata generator screens with. Any hit means sanitization failed.
  const serialized = JSON.stringify({
    accounts: dataset.accounts,
    resources: dataset.resources,
    connections: dataset.connections,
    events: dataset.events,
    integrations: dataset.integrations,
  });
  const credentialHit = containsCredentialShape(serialized);
  findings.push({
    id: 'credentials-snapshot',
    area: 'credentials',
    severity: credentialHit ? 'fail' : 'pass',
    title: 'Integration snapshot is credential-free',
    detail: credentialHit
      ? 'Credential-shaped content detected in the integration snapshot. Regenerate metadata and investigate the source.'
      : 'No credential-shaped strings were found in account, resource, connection, or event records.',
  });

  // 2. Dependency manifests: a shippable workspace needs a manifest + lockfile.
  const manifests = workspace.manifests || {};
  const hasManifest = manifests['package.json'] === true;
  const hasLockfile = manifests['package-lock.json'] === true
    || manifests['yarn.lock'] === true
    || manifests['pnpm-lock.yaml'] === true;
  const presentManifests = Object.entries(manifests).filter(([, present]) => present).map(([name]) => name);
  findings.push({
    id: 'manifests-pinned',
    area: 'manifests',
    severity: hasManifest && hasLockfile ? 'pass' : hasManifest ? 'warn' : 'fail',
    title: hasLockfile ? 'Dependencies are pinned by a lockfile' : 'No dependency lockfile detected',
    detail: hasManifest && hasLockfile
      ? `Detected: ${presentManifests.join(', ')}. Installs are reproducible.`
      : hasManifest
        ? 'package.json exists but no lockfile was found; installs are not reproducible.'
        : 'No dependency manifest detected for this workspace.',
  });

  // 3. Firestore rules posture from the committed rules file.
  const rules = workspace.rulesPosture || null;
  findings.push({
    id: 'rules-access',
    area: 'rules',
    severity: !rules?.present ? 'warn' : rules.openAccess ? 'fail' : rules.usesAuthChecks ? 'pass' : 'warn',
    title: !rules?.present
      ? 'No Firestore rules file detected'
      : rules.openAccess
        ? 'Firestore rules allow unauthenticated access'
        : 'Firestore rules gate access on authentication',
    detail: !rules?.present
      ? 'firestore.rules was not found, so database access cannot be assessed.'
      : rules.openAccess
        ? 'An allow-if-true rule is present. Restrict access before shipping.'
        : `Rules v${rules.rulesVersion || '?'} across ${rules.matchBlocks || 0} match blocks${rules.usesAuthChecks ? ' with request.auth checks' : ''}.`,
  });

  // 4. Environment inventory: every deployment target must be enumerated.
  const environments = workspace.environments || [];
  findings.push({
    id: 'environments-inventory',
    area: 'environments',
    severity: environments.length ? 'info' : 'warn',
    title: environments.length
      ? `${environments.length} deployment environment${environments.length === 1 ? '' : 's'} enumerated`
      : 'No deployment environments detected',
    detail: environments.length
      ? environments.map((environment) => environment.label).join('; ')
      : 'No hosting or build targets were parsed from committed configuration.',
  });

  const severityRank = { fail: 0, warn: 1, info: 2, pass: 3 };
  const sorted = [...findings].sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);

  return {
    reviewedAt,
    generatedAt: dataset.generatedAt || null,
    findings: sorted,
    summary: {
      pass: findings.filter((finding) => finding.severity === 'pass').length,
      info: findings.filter((finding) => finding.severity === 'info').length,
      warn: findings.filter((finding) => finding.severity === 'warn').length,
      fail: findings.filter((finding) => finding.severity === 'fail').length,
    },
  };
};
