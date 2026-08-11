import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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

const credentialShape = /(?:-----BEGIN [A-Z ]*PRIVATE KEY-----|\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|glpat-[A-Za-z0-9_-]{12,}|xox[baprs]-\S+|sk_(?:live|test)_[A-Za-z0-9_-]{12,})|\b(?:password|secret|token|api[_-]?key|private[_-]?key)\s*[:=]\s*\S+|https?:\/\/[^/\s:@]+:[^/\s@]+@)/i;
const sanitizeText = (value, fallback = 'unknown') => {
  const text = String(value || '').replace(/[\p{Cc}]/gu, ' ').trim();
  return text && text.length <= 1000 && !credentialShape.test(text) ? text : fallback;
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

  const commitRows = runGit([
    'log',
    '-12',
    '--date=iso-strict',
    '--pretty=format:%H%x1f%h%x1f%aI%x1f%an%x1f%s',
  ]);
  commitRows.split('\n').filter(Boolean).forEach((row) => {
    const [hash, shortHash, timestamp, actorName, summary] = row.split('\x1f');
    if (!/^[a-f0-9]{40}$/i.test(hash) || !/^[a-f0-9]{7,40}$/i.test(shortHash) || Number.isNaN(new Date(timestamp).getTime())) return;
    const safeActorName = sanitizeText(actorName, 'Unknown contributor');
    const safeSummary = sanitizeText(summary, 'Sensitive commit subject redacted');
    events.push({
      id: `event:commit:${hash}`,
      resourceId: repositoryId,
      provider: remote.provider,
      eventType: 'commit_recorded',
      actor: {
        name: safeActorName,
      },
      accountId,
      projectId: applicationId,
      userId: null,
      source: 'repository_metadata',
      timestamp,
      status: 'recorded',
      verificationState: 'imported',
      metadata: {
        hash,
        shortHash,
        summary: safeSummary,
        url: remote.safeUrl ? `${remote.safeUrl}/commit/${hash}` : null,
      },
    });
  });
}

const output = {
  schemaVersion: 1,
  generatedAt,
  source: 'repository_metadata',
  accounts,
  resources,
  connections,
  events,
  integrations: [],
  notices: [
    'This dataset is generated from local repository and package metadata.',
    'Imported relationships are not provider-verified and must not be treated as live integration state.',
  ],
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Generated ${resources.length} resources, ${connections.length} connections, and ${events.length} events.`);
