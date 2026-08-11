import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase.config';
import { getCurrentUser } from './authService';

const getNormalizedMemberIds = (project) => {
  const ids = new Set(project.memberIds || []);
  if (project.ownerId) ids.add(project.ownerId);

  (project.teamMembers || []).forEach((member) => {
    if (member?.uid && !member.uid.startsWith('invite-') && member.status !== 'pending') {
      ids.add(member.uid);
    }
  });

  return [...ids];
};

const userCanAccessProject = (project, userId) => (
  project.ownerId === userId || getNormalizedMemberIds(project).includes(userId)
);

export const assertProjectAccess = async (projectId, { ownerOnly = false } = {}) => {
  const user = getCurrentUser();
  if (!user) throw new Error('User not authenticated');

  const projectRef = doc(db, 'projects', projectId);
  const projectSnapshot = await getDoc(projectRef);
  if (!projectSnapshot.exists()) throw new Error('Project not found');

  const project = { id: projectSnapshot.id, ...projectSnapshot.data() };
  const allowed = ownerOnly ? project.ownerId === user.uid : userCanAccessProject(project, user.uid);
  if (!allowed) throw new Error('You do not have access to this project');

  return { project, projectRef, user };
};

export const createProject = async (projectData) => {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const now = Timestamp.now();
    const projectRef = await addDoc(collection(db, 'projects'), {
      ...projectData,
      ownerId: user.uid,
      memberIds: [user.uid],
      createdAt: now,
      updatedAt: now,
      status: 'active',
      taskCount: 0,
      teamMembers: [
        {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email,
          role: 'owner',
          joinedAt: now,
        },
      ],
    });

    return projectRef.id;
  } catch (error) {
    throw new Error(error.message);
  }
};

export const getUserProjects = async () => {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const ownedQuery = query(collection(db, 'projects'), where('ownerId', '==', user.uid));
    const querySnapshot = await getDocs(ownedQuery);
    const projects = [];
    const migrations = [];

    querySnapshot.forEach((projectDocument) => {
      const data = projectDocument.data();
      const memberIds = getNormalizedMemberIds(data);
      projects.push({ id: projectDocument.id, ...data, memberIds });

      // Incrementally normalize recovered records without requiring a destructive migration.
      if (!Array.isArray(data.memberIds) || !data.memberIds.includes(user.uid)) {
        migrations.push(updateDoc(projectDocument.ref, { memberIds, updatedAt: Timestamp.now() }));
      }
    });

    if (migrations.length) await Promise.allSettled(migrations);
    return projects;
  } catch (error) {
    throw new Error(error.message);
  }
};

export const getSharedProjects = async () => {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const sharedQuery = query(
      collection(db, 'projects'),
      where('memberIds', 'array-contains', user.uid)
    );
    const querySnapshot = await getDocs(sharedQuery);
    const projects = [];
    querySnapshot.forEach((projectDocument) => {
      const data = projectDocument.data();
      if (data.ownerId !== user.uid) projects.push({ id: projectDocument.id, ...data });
    });
    return projects;
  } catch (error) {
    throw new Error(error.message);
  }
};

export const getAllUserProjects = async () => {
  const [ownedProjects, sharedProjects] = await Promise.all([
    getUserProjects(),
    getSharedProjects(),
  ]);
  const allProjects = [...ownedProjects];
  const existingIds = new Set(allProjects.map((project) => project.id));
  sharedProjects.forEach((project) => {
    if (!existingIds.has(project.id)) allProjects.push(project);
  });
  return allProjects;
};

export const getProject = async (projectId) => {
  try {
    const { project } = await assertProjectAccess(projectId);
    return project;
  } catch (error) {
    if (error.message === 'Project not found') return null;
    throw new Error(error.message);
  }
};

export const updateProject = async (projectId, updateData) => {
  try {
    const { projectRef } = await assertProjectAccess(projectId);
    const protectedFields = ['ownerId', 'memberIds', 'teamMembers', 'pendingInvites'];
    if (protectedFields.some((field) => Object.prototype.hasOwnProperty.call(updateData, field))) {
      throw new Error('Project access fields must be changed through team management');
    }

    await updateDoc(projectRef, { ...updateData, updatedAt: Timestamp.now() });
  } catch (error) {
    throw new Error(error.message);
  }
};

export const deleteProject = async (projectId) => {
  try {
    const { projectRef } = await assertProjectAccess(projectId, { ownerOnly: true });
    const taskSnapshot = await getDocs(
      query(collection(db, 'tasks'), where('projectId', '==', projectId)),
    );
    const taskDocuments = taskSnapshot.docs;

    // Keep each batch below Firestore's 500-operation limit. The project stays in
    // place until its tasks are gone so task-delete authorization can still read it.
    for (let index = 0; index < taskDocuments.length; index += 450) {
      const batch = writeBatch(db);
      taskDocuments.slice(index, index + 450).forEach((taskDocument) => {
        batch.delete(taskDocument.ref);
      });
      await batch.commit();
    }

    await deleteDoc(projectRef);
  } catch (error) {
    throw new Error(error.message);
  }
};

export const addTeamMember = async (projectId, email, role = 'member') => {
  try {
    const { projectRef, user } = await assertProjectAccess(projectId, { ownerOnly: true });
    const normalizedEmail = email.trim().toLowerCase();
    const newMember = {
      uid: `invite-${Date.now()}`,
      email: normalizedEmail,
      displayName: normalizedEmail.split('@')[0],
      role,
      invitedBy: user.uid,
      invitedAt: Timestamp.now(),
      status: 'pending',
    };

    await updateDoc(projectRef, {
      teamMembers: arrayUnion(newMember),
      pendingInvites: arrayUnion(normalizedEmail),
      updatedAt: Timestamp.now(),
    });

    return newMember;
  } catch (error) {
    throw new Error(error.message);
  }
};

export const removeTeamMember = async (projectId, memberEmail) => {
  try {
    const { project, projectRef } = await assertProjectAccess(projectId, { ownerOnly: true });
    const memberToRemove = (project.teamMembers || []).find((member) => member.email === memberEmail);
    if (!memberToRemove || memberToRemove.role === 'owner') return;

    const update = {
      teamMembers: arrayRemove(memberToRemove),
      pendingInvites: arrayRemove(memberEmail),
      updatedAt: Timestamp.now(),
    };
    if (memberToRemove.uid && !memberToRemove.uid.startsWith('invite-')) {
      update.memberIds = arrayRemove(memberToRemove.uid);
    }
    await updateDoc(projectRef, update);
  } catch (error) {
    throw new Error(error.message);
  }
};

export const updateMemberRole = async (projectId, memberEmail, newRole) => {
  try {
    const { project, projectRef } = await assertProjectAccess(projectId, { ownerOnly: true });
    const updatedMembers = (project.teamMembers || []).map((member) => {
      if (member.email === memberEmail && member.role !== 'owner') return { ...member, role: newRole };
      return member;
    });

    await updateDoc(projectRef, { teamMembers: updatedMembers, updatedAt: Timestamp.now() });
  } catch (error) {
    throw new Error(error.message);
  }
};
