import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
// Shared with the browser-side security baseline review module; do not let the
// two copies drift apart.
import { credentialShape } from '../src/modules/security/patterns.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = resolve(root, 'public/integration-metadata.json');

const runGit = (args, fallback = '') => {
  try {
    return execFileSync('git', args, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return fallback;
  }
};

const sanitizeText = (value, fallback = 'unknown') => {
  const text = String(value || '').replace(/[\p{Cc}]/gu, ' ').trim();
  return text && text.length <= 1000 && !credentialShape.test(text) ? text : fallback;
};
const sanitizeLongText = (value, maxLength = 8000) => {
  const text = String(value || '').replace(/[\p{Cc}\p{Cs}]/gu, ' ').trim();
  if (!text || credentialShape.test(text)) return 'unknown';
  return text.slice(0, maxLength);
};
const slug = (value) => sanitizeText(value, 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const parseRemote = (rawRemote) => {
  const remote = rawRemote.trim();
  const sshMatch = remote.match(/^git@([^:]+):([^/]+)\/(.+?)(?:\.git)?$/);
  const httpsMatch = remote.match(/^https?:\/\/(?:[^@/]+@)?([^/]+)\/([^/]+)\/(.+?)(?:\.git)?$/);
  const match = sshMatch || httpsMatch;
  if (!match) return null;

  const [, rawHost, rawOwner, rawRepository] = match;
  const host = rawHost.toLowerCase();
  const providers = {
    'github.com': 'github',
    'gitlab.com': 'gitlab',
    'bitbucket.org': 'bitbucket',
  };
  const provider = providers[host];
  if (!provider) return null;

  const owner = sanitizeText(rawOwner, '');
  const repository = sanitizeText(rawRepository, '');
  if (!owner || !repository) return null;
  const safePath = [owner, ...repository.split('/')].map(encodeURIComponent).join('/');
  return { host, owner, provider, repository, safeUrl: `https://${host}/${safePath}` };
};

const readCommits = (range) => {
  const args = ['log', '-40', '--date=iso-strict', '--pretty=format:%H%x1f%h%x1f%aI%x1f%an%x1f%s'];
  if (range) args.splice(1, 0, range);
  const rows = runGit(args);
  if (!rows) return [];
  return rows.split('\n').filter(Boolean).map((row) => {
    const [hash, shortHash, timestamp, actorName, summary] = row.split('\x1f');
    if (!/^[a-f0-9]{40}$/i.test(hash) || !/^[a-f0-9]{7,40}$/i.test(shortHash) || Number.isNaN(new Date(timestamp).getTime())) return null;
    return {
      hash,
      shortHash,
      timestamp,
      actor: sanitizeText(actorName, 'Unknown contributor'),
      summary: sanitizeText(summary, 'Sensitive commit subject redacted'),
    };
  }).filter(Boolean);
};

const packageMetadata = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const packageName = sanitizeText(packageMetadata.name, 'omnianalytics');
const packageVersion = sanitizeText(packageMetadata.version, 'unknown');
const packageDescription = sanitizeText(packageMetadata.description, 'Description unavailable');
const remote = parseRemote(runGit(['config', '--get', 'remote.origin.url']));
const generatedAt = new Date().toISOString();
const resources = [];
const accounts = [];
const connections = [];
const events = [];
const applicationId = `project:omnianalytics:${slug(packageName)}`;

resources.push({
  id: applicationId,
  provider: 'omnianalytics',
  type: 'project',
  externalId: packageName,
  name: 'OmniAnalytics',
  status: 'healthy',
  verificationState: 'imported',
  source: 'package_metadata',
  updatedAt: generatedAt,
  metadata: {
    packageName,
    version: packageVersion,
    description: packageDescription,
  },
});

if (remote) {
  const accountId = `account:${remote.provider}:${slug(remote.owner)}`;
  const repositoryId = `repository:${remote.provider}:${slug(remote.owner)}:${slug(remote.repository)}`;
  const defaultBranch = sanitizeText(runGit(['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'], '').replace('origin/', ''), 'unknown');
  const latestCommitCandidate = runGit(['rev-parse', '--short', 'HEAD'], 'unknown');
  const latestCommit = /^[a-f0-9]{7,40}$/i.test(latestCommitCandidate) ? latestCommitCandidate : 'unknown';
  const commitCountCandidate = runGit(['rev-list', '--count', 'HEAD'], '0');
  const commitCount = /^\d+$/.test(commitCountCandidate) ? Number(commitCountCandidate) : 0;
  const branches = runGit(['branch', '--format=%(refname:short)'])
    .split('\n')
    .map((branch) => sanitizeText(branch, ''))
    .filter(Boolean)
    .slice(0, 40);
  const contributors = runGit(['shortlog', '-sn', 'HEAD'])
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\d+)\s+(.+)$/);
      return match ? `${sanitizeText(match[2], 'Unknown contributor')} (${match[1]})` : sanitizeText(line, '');
    })
    .filter(Boolean)
    .slice(0, 20);
  const commits = readCommits();

  resources.push({
    id: accountId,
    provider: remote.provider,
    type: 'account',
    externalId: remote.owner,
    name: remote.owner,
    accountId,
    status: 'unknown',
    verificationState: 'imported',
    source: 'repository_metadata',
    updatedAt: generatedAt,
    metadata: {
      host: remote.host,
      accountScope: 'unknown',
      permissions: 'not_collected',
    },
  });
  accounts.push({
    id: accountId,
    resourceId: accountId,
    provider: remote.provider,
    name: remote.owner,
    userId: null,
    permissions: [],
    createdAt: null,
    lastVerifiedAt: null,
    source: 'repository_metadata',
  });
  resources.push({
    id: repositoryId,
    provider: remote.provider,
    type: 'repository',
    externalId: `${remote.owner}/${remote.repository}`,
    name: remote.repository,
    accountId,
    status: 'unknown',
    verificationState: 'imported',
    source: 'repository_metadata',
    updatedAt: generatedAt,
    metadata: {
      owner: remote.owner,
      fullName: `${remote.owner}/${remote.repository}`,
      visibility: 'unknown',
      defaultBranch,
      url: remote.safeUrl,
      latestCommit,
      commitCount,
      branches,
      contributors,
      readmePresent: existsSync(resolve(root, 'README.md')),
    },
  });
  connections.push({
    id: `connection:${slug(accountId)}:${slug(repositoryId)}`,
    sourceResourceId: accountId,
    targetResourceId: repositoryId,
    relationshipType: 'owns',
    provider: remote.provider,
    createdAt: null,
    lastVerifiedAt: null,
    updatedAt: generatedAt,
    status: 'unknown',
    verificationState: 'imported',
    source: 'repository_metadata',
    origin: 'git_remote_origin',
    metadata: {
      evidence: 'Parsed from the sanitized origin remote path',
    },
  });

  connections.push({
    id: `connection:${slug(repositoryId)}:${slug(applicationId)}`,
    sourceResourceId: repositoryId,
    targetResourceId: applicationId,
    relationshipType: 'contains',
    provider: 'omnianalytics',
    createdAt: null,
    lastVerifiedAt: null,
    updatedAt: generatedAt,
    status: 'healthy',
    verificationState: 'imported',
    source: 'package_metadata',
    origin: 'package_json',
    metadata: {
      evidence: 'Application identity read from package.json in this repository',
    },
  });

  commits.slice(0, 12).forEach((commit) => {
    events.push({
      id: `event:commit:${commit.hash}`,
      resourceId: repositoryId,
      provider: remote.provider,
      eventType: 'commit_recorded',
      actor: {
        name: commit.actor,
      },
      accountId,
      projectId: applicationId,
      userId: null,
      source: 'repository_metadata',
      timestamp: commit.timestamp,
      status: 'recorded',
      verificationState: 'imported',
      metadata: {
        hash: commit.hash,
        shortHash: commit.shortHash,
        summary: commit.summary,
        url: remote.safeUrl ? `${remote.safeUrl}/commit/${commit.hash}` : null,
      },
    });
  });

  // Release milestones are derived from annotated/lightweight git tags. No tag
  // list is fabricated: an empty tag set simply yields no release resources.
  const tags = runGit(['tag', '--sort=-creatordate', '--format=%(refname:short)%1f%(creatordate:iso-strict)%1f%(objectname:short)'])
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, createdAtRow, objectRef] = line.split('\x1f');
      const safeName = sanitizeText(name, '');
      const timestamp = new Date(createdAtRow).getTime();
      if (!safeName || Number.isNaN(timestamp)) return null;
      return { name: safeName, createdAt: new Date(timestamp).toISOString(), objectRef: /^[a-f0-9]{7,40}$/i.test(objectRef || '') ? objectRef : null };
    })
    .filter(Boolean)
    .slice(0, 20);

  tags.forEach((tag, index) => {
    const releaseId = `release:${remote.provider}:${slug(remote.owner)}:${slug(remote.repository)}:${slug(tag.name)}`;
    const previousTag = tags[index + 1]?.name || '';
    const changelogRange = previousTag ? `${previousTag}..${tag.name}` : tag.name;
    const changelog = readCommits(changelogRange)
      .slice(0, 40)
      .map((commit) => `${commit.shortHash} ${commit.summary}`);

    resources.push({
      id: releaseId,
      provider: remote.provider,
      type: 'release',
      externalId: tag.name,
      name: tag.name,
      accountId: null,
      status: 'unknown',
      verificationState: 'imported',
      source: 'repository_metadata',
      updatedAt: tag.createdAt,
      metadata: {
        version: tag.name,
        createdAt: tag.createdAt,
        commit: tag.objectRef || 'unknown',
        previousTag: previousTag || '',
        changelog,
      },
    });
    connections.push({
      id: `connection:${slug(repositoryId)}:${slug(releaseId)}`,
      sourceResourceId: repositoryId,
      targetResourceId: releaseId,
      relationshipType: 'publishes',
      provider: remote.provider,
      createdAt: tag.createdAt,
      lastVerifiedAt: null,
      updatedAt: tag.createdAt,
      status: 'unknown',
      verificationState: 'imported',
      source: 'repository_metadata',
      origin: 'git_tag',
      metadata: {
        evidence: 'Derived from the repository tag list',
      },
    });
    events.push({
      id: `event:release:${slug(tag.name)}`,
      resourceId: repositoryId,
      provider: remote.provider,
      eventType: 'release_published',
      actor: {
        name: 'Repository history',
      },
      accountId,
      projectId: applicationId,
      userId: null,
      source: 'repository_metadata',
      timestamp: tag.createdAt,
      status: 'recorded',
      verificationState: 'imported',
      metadata: {
        version: tag.name,
        url: remote.safeUrl ? `${remote.safeUrl}/releases/tag/${encodeURIComponent(tag.name)}` : null,
      },
    });
  });
}

// Workspace posture profile consumed by the security, CI/CD, and documentation
// modules. Every entry is derived from committed configuration files and is
// credential-screened before serialization.
const manifestFiles = [
  'package.json',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'requirements.txt',
  'Pipfile',
  'pyproject.toml',
  'Cargo.toml',
  'go.mod',
  'pom.xml',
  'build.gradle',
  'composer.json',
  'Gemfile',
  'pubspec.yaml',
  'Dockerfile',
];
const manifests = Object.fromEntries(
  manifestFiles.map((file) => [file, existsSync(resolve(root, file))]),
);

const readRulesPosture = () => {
  const rulesPath = resolve(root, 'firestore.rules');
  if (!existsSync(rulesPath)) return { present: false, file: 'firestore.rules', openAccess: 'unknown', matchBlocks: 0, usesAuthChecks: false };
  const content = readFileSync(rulesPath, 'utf8');
  const matchBlocks = (content.match(/match\s+\//g) || []).length;
  return {
    present: true,
    file: 'firestore.rules',
    rulesVersion: (content.match(/rules_version\s*=\s*'(\d+)'/) || [null, 'unknown'])[1],
    openAccess: /allow\s+(read|write|read,\s*write)\s*:\s*if\s+true\s*;/.test(content),
    matchBlocks,
    usesAuthChecks: content.includes('request.auth != null'),
  };
};

const readEnvironments = () => {
  const environments = [];
  const firebaseJsonPath = resolve(root, 'firebase.json');
  if (existsSync(firebaseJsonPath)) {
    try {
      const config = JSON.parse(readFileSync(firebaseJsonPath, 'utf8'));
      if (config.hosting) environments.push({ id: 'firebase-hosting', label: 'Firebase Hosting', source: 'firebase.json' });
      if (config.firestore) environments.push({ id: 'firestore', label: 'Cloud Firestore', source: 'firebase.json' });
    } catch {
      environments.push({ id: 'firebase', label: 'Firebase (config unreadable)', source: 'firebase.json' });
    }
  }
  const firebasercPath = resolve(root, '.firebaserc');
  if (existsSync(firebasercPath)) {
    try {
      const rc = JSON.parse(readFileSync(firebasercPath, 'utf8'));
      const projectId = sanitizeText(rc?.projects?.default, '');
      if (projectId) environments.push({ id: `firebase-project:${slug(projectId)}`, label: `Default project alias: ${projectId}`, source: '.firebaserc' });
    } catch {
      environments.push({ id: 'firebaserc', label: '.firebaserc (unreadable)', source: '.firebaserc' });
    }
  }
  const builderPath = resolve(root, 'electron-builder.json');
  if (existsSync(builderPath)) {
    try {
      const builder = JSON.parse(readFileSync(builderPath, 'utf8'));
      const targets = [builder.win && 'Windows', builder.mac && 'macOS', builder.linux && 'Linux'].filter(Boolean);
      if (targets.length) environments.push({ id: 'desktop-targets', label: `Desktop build targets: ${targets.join(', ')}`, source: 'electron-builder.json' });
    } catch {
      environments.push({ id: 'desktop', label: 'Desktop build configuration (unreadable)', source: 'electron-builder.json' });
    }
  }
  environments.push({ id: 'local-development', label: 'Local development (Vite dev server)', source: 'vite.config.js' });
  return environments.map((environment) => ({
    id: sanitizeText(environment.id, 'unknown'),
    label: sanitizeText(environment.label, 'unknown'),
    source: sanitizeText(environment.source, 'unknown'),
  }));
};

const docCandidates = [
  { path: 'README.md', title: 'Repository README' },
  { path: 'AGENTS.md', title: 'Agent development guide' },
];
const documentation = docCandidates
  .filter((candidate) => existsSync(resolve(root, candidate.path)))
  .map((candidate) => {
    const updatedAtCandidate = runGit(['log', '-1', '--format=%aI', '--', candidate.path]);
    const updatedAt = Number.isNaN(new Date(updatedAtCandidate).getTime()) ? generatedAt : new Date(updatedAtCandidate).toISOString();
    return {
      id: `doc:${slug(candidate.path)}`,
      title: candidate.title,
      path: candidate.path,
      source: 'repository_metadata',
      updatedAt,
      content: sanitizeLongText(readFileSync(resolve(root, candidate.path), 'utf8'), 12000),
    };
  });

const workspace = {
  manifests,
  rulesPosture: readRulesPosture(),
  environments: readEnvironments(),
  documentation,
};

const output = {
  schemaVersion: 1,
  generatedAt,
  source: 'repository_metadata',
  accounts,
  resources,
  connections,
  events,
  integrations: [],
  workspace,
  notices: [
    'This dataset is generated from local repository and package metadata.',
    'Imported relationships are not provider-verified and must not be treated as live integration state.',
  ],
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Generated ${resources.length} resources, ${connections.length} connections, and ${events.length} events.`);
