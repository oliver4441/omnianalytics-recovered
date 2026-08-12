export const RUN_EVENT_TYPES = Object.freeze([
  'deployment_completed',
  'deployment_started',
  'workflow_run',
  'check_completed',
]);

export const RUN_STATUS_LABELS = Object.freeze({
  success: 'Success',
  failure: 'Failure',
  error: 'Error',
  degraded: 'Degraded',
  recorded: 'Recorded',
  unknown: 'Unknown',
});
