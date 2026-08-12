import { getIntegrationDataset, normalizeIntegrationDataset } from '../integrations/index.js';

/**
 * Loads the git-derived workspace snapshot for the Repositories module. The
 * dataset is generated at build/dev time from local git metadata, so it is
 * always attributed and credential-sanitized.
 */
export const loadRepositoryDataset = async ({ signal } = {}) => {
  const raw = await getIntegrationDataset({ signal });
  return normalizeIntegrationDataset(raw);
};
