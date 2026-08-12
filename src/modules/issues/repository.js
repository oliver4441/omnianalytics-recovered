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

const toIso = (value) => {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export const normalizeIssueRecord = (snapshot) => {
  const data = snapshot.data ? snapshot.data() : snapshot;
  return {
    id: snapshot.id,
    projectId: data.projectId || null,
    projectName: data.projectName || '',
    title: data.title || '',
    description: data.description || '',
    status: ['open', 'in_progress', 'closed'].includes(data.status) ? data.status : 'open',
    priority: ['low', 'medium', 'high', 'urgent'].includes(data.priority) ? data.priority : 'medium',
    severity: ['none', 'minor', 'major', 'critical'].includes(data.severity) ? data.severity : 'none',
    assignee: data.assignee || '',
    reporterId: data.reporterId,
    ownerId: data.ownerId,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
    closedAt: toIso(data.closedAt),
  };
};

const issuesRef = () => collection(db, 'issues');

export const listWorkspaceIssues = async (ownerId) => {
  const snapshot = await getDocs(query(issuesRef(), where('ownerId', '==', ownerId)));
  return snapshot.docs
    .map(normalizeIssueRecord)
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
};

export const createIssueRecord = async (issueData) => {
  const user = getCurrentUser();
  if (!user) throw new Error('User not authenticated');

  const now = Timestamp.now();
  const record = {
    title: issueData.title,
    description: issueData.description || '',
    status: 'open',
    priority: issueData.priority || 'medium',
    severity: issueData.severity || 'none',
    assignee: issueData.assignee || '',
    projectId: issueData.projectId || null,
    projectName: issueData.projectName || '',
    reporterId: user.uid,
    ownerId: user.uid,
    createdAt: now,
    updatedAt: now,
    closedAt: null,
  };
  const documentRef = await addDoc(issuesRef(), record);
  return documentRef.id;
};

const getOwnedIssue = async (issueId) => {
  const user = getCurrentUser();
  if (!user) throw new Error('User not authenticated');

  const issueRef = doc(db, 'issues', issueId);
  const snapshot = await getDoc(issueRef);
  if (!snapshot.exists()) throw new Error('Issue not found');
  const issue = normalizeIssueRecord(snapshot);
  if (issue.ownerId !== user.uid) throw new Error('You do not have access to this issue');
  return { issueRef, issue };
};

export const updateIssueRecord = async (issueId, updates) => {
  const { issueRef } = await getOwnedIssue(issueId);
  const allowed = {};
  ['title', 'description', 'priority', 'severity', 'assignee', 'projectId', 'projectName', 'status'].forEach((key) => {
    if (key in updates) allowed[key] = updates[key];
  });

  if (updates.status === 'closed') allowed.closedAt = Timestamp.now();
  if (updates.status && updates.status !== 'closed') allowed.closedAt = null;
  allowed.updatedAt = Timestamp.now();

  await updateDoc(issueRef, allowed);
};

export const deleteIssueRecord = async (issueId) => {
  const { issueRef } = await getOwnedIssue(issueId);
  await deleteDoc(issueRef);
};
