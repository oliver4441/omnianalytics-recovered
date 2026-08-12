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

export const loadSecurityDataset = async ({ signal } = {}) => {
  const raw = await getIntegrationDataset({ signal });
  return normalizeIntegrationDataset(raw);
};

const toIso = (value) => {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export const normalizeReviewRecord = (snapshot) => {
  const data = snapshot.data ? snapshot.data() : snapshot;
  return {
    id: snapshot.id,
    reviewedAt: toIso(data.reviewedAt),
    generatedAt: toIso(data.generatedAt),
    ownerId: data.ownerId,
    summary: data.summary || { pass: 0, info: 0, warn: 0, fail: 0 },
    findings: Array.isArray(data.findings) ? data.findings : [],
    createdAt: toIso(data.createdAt),
  };
};

export const listSecurityReviews = async (ownerId) => {
  const snapshot = await getDocs(query(collection(db, 'securityReviews'), where('ownerId', '==', ownerId)));
  return snapshot.docs
    .map(normalizeReviewRecord)
    .sort((a, b) => new Date(b.reviewedAt || b.createdAt || 0) - new Date(a.reviewedAt || a.createdAt || 0));
};

/** Persist a completed baseline review so posture history is auditable. */
export const saveSecurityReview = async (review) => {
  const user = getCurrentUser();
  if (!user) throw new Error('User not authenticated');

  const documentRef = await addDoc(collection(db, 'securityReviews'), {
    reviewedAt: Timestamp.fromDate(new Date(review.reviewedAt)),
    generatedAt: review.generatedAt ? Timestamp.fromDate(new Date(review.generatedAt)) : null,
    ownerId: user.uid,
    summary: review.summary,
    findings: review.findings.slice(0, 50),
    createdAt: Timestamp.now(),
  });
  return documentRef.id;
};
