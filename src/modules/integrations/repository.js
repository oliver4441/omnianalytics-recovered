const DATASET_URL = '/integration-metadata.json';

const assertDatasetShape = (dataset) => {
  if (!dataset || typeof dataset !== 'object') throw new Error('Integration metadata is unavailable.');
  if (dataset.schemaVersion !== 1) throw new Error('Integration metadata uses an unsupported schema version.');

  ['accounts', 'resources', 'connections', 'events', 'integrations'].forEach((collectionName) => {
    if (!Array.isArray(dataset[collectionName])) {
      throw new Error(`Integration metadata is missing ${collectionName}.`);
    }
  });

  return dataset;
};

export const getIntegrationDataset = async ({ signal } = {}) => {
  const response = await fetch(DATASET_URL, {
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    throw new Error('Integration metadata has not been generated for this preview.');
  }

  return assertDatasetShape(await response.json());
};
