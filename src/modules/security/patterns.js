// Single source of truth for credential-shaped content detection. This pattern
// originated in scripts/generate-integration-metadata.mjs and is shared with the
// Node metadata generator (which imports it) so the security baseline review and
// the sanitizer never drift apart. Keep this file free of Node or browser APIs.
export const credentialShape = /(?:-----BEGIN [A-Z ]*PRIVATE KEY-----|\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|glpat-[A-Za-z0-9_-]{12,}|xox[baprs]-\S+|sk_(?:live|test)_[A-Za-z0-9_-]{12,})|\b(?:password|secret|token|api[_-]?key|private[_-]?key)\s*[:=]\s*\S+|https?:\/\/[^/\s:@]+:[^/\s@]+@)/i;

export const containsCredentialShape = (value) => credentialShape.test(String(value ?? ''));
