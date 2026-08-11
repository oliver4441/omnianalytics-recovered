import {
  collection,
  deleteField,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  increment,
  query,
  runTransaction,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase.config';
import { getCurrentUser } from './authService';
import { assertProjectAccess } from './projectService';

const getAuthorizedTask = async (taskId) => {
  const user = getCurrentUser();
  if (!user) throw new Error('User not authenticated');

  const taskRef = doc(db, 'tasks', taskId);
  const taskSnapshot = await getDoc(taskRef);
  if (!taskSnapshot.exists()) throw new Error('Task not found');

  const task = { id: taskSnapshot.id, ...taskSnapshot.data() };
  if (!task.projectId) throw new Error('Task is not linked to a project');
  const { projectRef } = await assertProjectAccess(task.projectId);
  return { task, taskRef, projectRef, user };
};

export const createTask = async (taskData, projectId) => {
  try {
    const { projectRef, user } = await assertProjectAccess(projectId);
    const now = Timestamp.now();
    const taskRef = doc(collection(db, 'tasks'));
    const batch = writeBatch(db);
    batch.set(taskRef, {
      ...taskData,
      projectId,
      reporterId: user.uid,
      createdAt: now,
      updatedAt: now,
      status: 'to_do',
      progressPercentage: 0,
    });
    batch.update(projectRef, { taskCount: increment(1), updatedAt: now });
    await batch.commit();
    return taskRef.id;
  } catch (error) {
    throw new Error(error.message);
  }
};

export const getProjectTasks = async (projectId) => {
  try {
    await assertProjectAccess(projectId);
    const tasksQuery = query(collection(db, 'tasks'), where('projectId', '==', projectId));
    const querySnapshot = await getDocs(tasksQuery);
    const tasks = [];
    querySnapshot.forEach((taskDocument) => {
      tasks.push({ id: taskDocument.id, ...taskDocument.data() });
    });
    return tasks;
  } catch (error) {
    throw new Error(error.message);
  }
};

export const getProjectTaskCount = async (projectId) => {
  try {
    await assertProjectAccess(projectId);
    const tasksQuery = query(collection(db, 'tasks'), where('projectId', '==', projectId));
    const snapshot = await getCountFromServer(tasksQuery);
    return snapshot.data().count;
  } catch (error) {
    throw new Error(error.message);
  }
};

export const getTask = async (taskId) => {
  try {
    const { task } = await getAuthorizedTask(taskId);
    return task;
  } catch (error) {
    if (error.message === 'Task not found') return null;
    throw new Error(error.message);
  }
};

export const updateTask = async (taskId, updateData) => {
  try {
    const { taskRef } = await getAuthorizedTask(taskId);
    if (['projectId', 'reporterId'].some((field) => Object.prototype.hasOwnProperty.call(updateData, field))) {
      throw new Error('Task ownership fields cannot be changed through a task update');
    }
    await updateDoc(taskRef, { ...updateData, updatedAt: Timestamp.now() });
  } catch (error) {
    throw new Error(error.message);
  }
};

export const updateTaskStatus = async (taskId, status) => {
  try {
    const { taskRef } = await getAuthorizedTask(taskId);
    const updatePayload = { status, updatedAt: Timestamp.now() };
    if (status === 'done') {
      updatePayload.completedAt = Timestamp.now();
      updatePayload.progressPercentage = 100;
    } else {
      updatePayload.completedAt = deleteField();
      updatePayload.progressPercentage = 0;
    }

    await updateDoc(taskRef, updatePayload);
  } catch (error) {
    throw new Error(error.message);
  }
};

export const deleteTask = async (taskId) => {
  try {
    const { projectRef, taskRef } = await getAuthorizedTask(taskId);
    await runTransaction(db, async (transaction) => {
      const projectSnapshot = await transaction.get(projectRef);
      if (!projectSnapshot.exists()) throw new Error('Project not found');
      const taskCount = Math.max(0, Number(projectSnapshot.data().taskCount || 0) - 1);
      transaction.delete(taskRef);
      transaction.update(projectRef, { taskCount, updatedAt: Timestamp.now() });
    });
  } catch (error) {
    throw new Error(error.message);
  }
};
