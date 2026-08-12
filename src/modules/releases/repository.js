import {
  addDoc,
  collection,
  getDocs,
  query,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db } from '../../firebase.config';
import { getCurrentUser } from '../../services/authService';
import { getIntegrationDataset, normalizeIntegrationDataset } from '../integrations/index.js';

export const loadReleaseDataset = async ({ signal } = {}) => {
  const raw = await getIntegrationDataset({ signal });
  return normalizeIntegrationDataset(raw);
};

const toIso = (value) => {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export const normalizeReleaseRecord = (snapshot) => {
  const data = snapshot.data ? snapshot.data() : snapshot;
  return {
    id: snapshot.id,
    version: data.version || '',
    title: data.title || '',
    notes: data.notes || '',
    status: ['draft', 'ready', 'published'].includes(data.status) ? data.status : 'draft',
    changelog: Array.isArray(data.changelog) ? data.changelog : [],
    ownerId: data.ownerId,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
};

/** Workspace-planned releases persisted in Firestore (separate from git tags). */
export const listPlannedReleases = async (ownerId) => {
  const snapshot = await getDocs(query(collection(db, 'releases'), where('ownerId', '==', ownerId)));
  return snapshot.docs
    .map(normalizeReleaseRecord)
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
};

export const createReleaseRecord = async (releaseData) => {
  const user = getCurrentUser();
  if (!user) throw new Error('User not authenticated');

  const now = Timestamp.now();
  const documentRef = await addDoc(collection(db, 'releases'), {
    version: releaseData.version,
    title: releaseData.title,
    notes: releaseData.notes || '',
    status: 'draft',
    changelog: Array.isArray(releaseData.changelog) ? releaseData.changelog.slice(0, 100) : [],
    ownerId: user.uid,
    createdAt: now,
    updatedAt: now,
  });
  return documentRef.id;
};
