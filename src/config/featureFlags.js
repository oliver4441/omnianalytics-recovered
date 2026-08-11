export const FEATURE_STATES = Object.freeze({
  DISABLED: 'disabled',
  INTERNAL: 'internal',
  PREVIEW: 'preview',
  ENABLED: 'enabled',
});

export const FEATURE_FLAGS = Object.freeze({
  githubIntegration: FEATURE_STATES.PREVIEW,
  issueManagement: FEATURE_STATES.PREVIEW,
  cicdDashboard: FEATURE_STATES.INTERNAL,
  releaseManagement: FEATURE_STATES.PREVIEW,
  developerAnalytics: FEATURE_STATES.PREVIEW,
  mobileV2: FEATURE_STATES.ENABLED,
  databaseIntegrations: FEATURE_STATES.DISABLED,
  securityCenter: FEATURE_STATES.PREVIEW,
  documentationWorkspace: FEATURE_STATES.INTERNAL,
});

const STORAGE_KEY = 'omni-feature-overrides';

const canUseStorage = () => typeof window !== 'undefined' && window.localStorage;

export const getFeatureOverrides = () => {
  if (!canUseStorage()) return {};

  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
};

export const getFeatureState = (featureName) => {
  const override = getFeatureOverrides()[featureName];
  const validStates = Object.values(FEATURE_STATES);

  if (validStates.includes(override)) return override;
  return FEATURE_FLAGS[featureName] || FEATURE_STATES.DISABLED;
};

export const isFeatureAvailable = (featureName, options = {}) => {
  const { allowPreview = true, allowInternal = import.meta.env.DEV } = options;
  const state = getFeatureState(featureName);

  if (state === FEATURE_STATES.ENABLED) return true;
  if (state === FEATURE_STATES.PREVIEW) return allowPreview;
  if (state === FEATURE_STATES.INTERNAL) return allowInternal;
  return false;
};

export const setFeatureOverride = (featureName, state) => {
  if (!canUseStorage()) return false;
  if (!(featureName in FEATURE_FLAGS)) return false;
  if (!Object.values(FEATURE_STATES).includes(state)) return false;

  const overrides = getFeatureOverrides();
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...overrides, [featureName]: state })
  );
  return true;
};

export const clearFeatureOverrides = () => {
  if (canUseStorage()) window.localStorage.removeItem(STORAGE_KEY);
};
