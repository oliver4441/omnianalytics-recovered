export const FINDING_SEVERITIES = Object.freeze(['pass', 'info', 'warn', 'fail']);

export const FINDING_SEVERITY_LABELS = Object.freeze({
  pass: 'Pass',
  info: 'Info',
  warn: 'Warning',
  fail: 'Failing',
});

export const REVIEW_AREAS = Object.freeze([
  { id: 'credentials', label: 'Credential exposure' },
  { id: 'manifests', label: 'Dependency manifests' },
  { id: 'rules', label: 'Firestore rules posture' },
  { id: 'environments', label: 'Environment inventory' },
]);
