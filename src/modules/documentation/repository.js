import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../../firebase.config';
import { getCurrentUser } from '../../services/authService';
import { getIntegrationDataset, normalizeIntegrationDataset } from '../integrations/index.js';

const toIso = (value) => {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export const listRepositoryDocuments = async ({ signal } = {}) => {
  const dataset = normalizeIntegrationDataset(await getIntegrationDataset({ signal }));
  return (dataset.workspace?.documentation || []).map((entry) => ({
    id: entry.id,
    title: entry.title,
    path: entry.path,
    origin: 'repository',
    updatedAt: entry.updatedAt,
    content: entry.content,
  }));
};

export const normalizeWorkspaceDocument = (snapshot) => {
  const data = snapshot.data ? snapshot.data() : snapshot;
  return {
    id: snapshot.id,
    title: data.title || 'Untitled document',
    content: data.content || '',
    origin: 'workspace',
    ownerId: data.ownerId,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
};

export const listWorkspaceDocuments = async (ownerId) => {
  const snapshot = await getDocs(query(collection(db, 'documents'), where('ownerId', '==', ownerId)));
  return snapshot.docs
    .map(normalizeWorkspaceDocument)
    .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
};

export const createWorkspaceDocument = async (documentData) => {
  const user = getCurrentUser();
  if (!user) throw new Error('User not authenticated');

  const now = Timestamp.now();
  const documentRef = await addDoc(collection(db, 'documents'), {
    title: documentData.title,
    content: documentData.content,
    ownerId: user.uid,
    createdAt: now,
    updatedAt: now,
  });
  return documentRef.id;
};

const getOwnedDocument = async (documentId) => {
  const user = getCurrentUser();
  if (!user) throw new Error('User not authenticated');
  const documentRef = doc(db, 'documents', documentId);
  const snapshot = await getDoc(documentRef);
  if (!snapshot.exists()) throw new Error('Document not found');
  const record = normalizeWorkspaceDocument(snapshot);
  if (record.ownerId !== user.uid) throw new Error('You do not have access to this document');
  return { documentRef, record };
};

export const updateWorkspaceDocument = async (documentId, updates) => {
  const { documentRef } = await getOwnedDocument(documentId);
  const allowed = {};
  if ('title' in updates) allowed.title = updates.title;
  if ('content' in updates) allowed.content = updates.content;
  allowed.updatedAt = Timestamp.now();
  await updateDoc(documentRef, allowed);
};

export const deleteWorkspaceDocument = async (documentId) => {
  const { documentRef } = await getOwnedDocument(documentId);
  await deleteDoc(documentRef);
};
