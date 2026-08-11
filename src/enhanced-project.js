import { db } from './firebase';
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  getDoc,
  updateDoc,
  increment,
  deleteDoc,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';

// Enhanced project creation with templates
export async function createProjectFromTemplate(
  uid,
  templateId,
  customData = {}
) {
  try {
    const { PROJECT_TEMPLATES } = await import('./templates.js');
    const template = PROJECT_TEMPLATES[templateId];

    if (!template) {
      throw new Error('Template not found');
    }

    const projectsRef = collection(db, 'users', uid, 'projects');
    const snapshot = await getDocs(projectsRef);
    const currentProjectCount = snapshot.size;

    if (currentProjectCount >= 5) {
      throw new Error('FREE_TIER_LIMIT_REACHED');
    }

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + template.defaultDeadline);

    const projectData = {
      name: customData.name || template.name,
      description: customData.description || template.description,
      category: template.category,
      tags: template.tags,
      deadline: deadline,
      template: templateId,
      milestones: template.milestones.map((milestone) => ({
        ...milestone,
        completed: false,
        completedAt: null,
      })),
      createdAt: serverTimestamp(),
      started: false,
      startTime: null,
      isPaused: false,
      consecutiveLogDays: 0,
      totalLogs: 0,
      lastLogDate: null,
      velocityScore: 0,
      consistencyScore: 0,
      overallScore: 0,
      status: 'active',
      archived: false,
      timeTracking: {
        totalTime: 0,
        sessions: [],
      },
    };

    return await addDoc(projectsRef, projectData);
  } catch (error) {
    console.error('Error creating project from template:', error);
    throw error;
  }
}

// Project cloning functionality
export async function cloneProject(uid, projectId, newName) {
  try {
    const originalProject = await getProjectById(uid, projectId);
    if (!originalProject) {
      throw new Error('Original project not found');
    }

    const projectsRef = collection(db, 'users', uid, 'projects');
    const snapshot = await getDocs(projectsRef);
    const currentProjectCount = snapshot.size;

    if (currentProjectCount >= 5) {
      throw new Error('FREE_TIER_LIMIT_REACHED');
    }

    const clonedData = {
      ...originalProject,
      name: newName || `${originalProject.name} (Clone)`,
      clonedFrom: projectId,
      createdAt: serverTimestamp(),
      started: false,
      startTime: null,
      isPaused: false,
      consecutiveLogDays: 0,
      totalLogs: 0,
      lastLogDate: null,
      velocityScore: 0,
      consistencyScore: 0,
      overallScore: 0,
      status: 'active',
      archived: false,
      milestones: originalProject.milestones
        ? originalProject.milestones.map((m) => ({
            ...m,
            completed: false,
            completedAt: null,
          }))
        : [],
      timeTracking: {
        totalTime: 0,
        sessions: [],
      },
    };

    delete clonedData.id;
    delete clonedData.completedAt;

    return await addDoc(projectsRef, clonedData);
  } catch (error) {
    console.error('Error cloning project:', error);
    throw error;
  }
}

// Enhanced log with time tracking
export async function addLogWithTime(uid, projectId, text, timeSpent = 0) {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const logRef = collection(db, 'users', uid, 'projects', projectId, 'logs');
    const logDoc = await addDoc(logRef, {
      text: text,
      timeSpent: timeSpent,
      createdAt: serverTimestamp(),
      date: today,
    });

    const projectRef = doc(db, 'users', uid, 'projects', projectId);
    const projectSnap = await getDoc(projectRef);

    if (projectSnap.exists()) {
      const project = projectSnap.data();
      let consecutiveDays = project.consecutiveLogDays || 0;
      let lastLogDate = project.lastLogDate
        ? new Date(project.lastLogDate)
        : null;

      if (!lastLogDate || today - lastLogDate > 24 * 60 * 60 * 1000) {
        consecutiveDays = 1;
      } else if (today.getTime() !== lastLogDate.getTime()) {
        consecutiveDays++;
      }

      const totalLogs = (project.totalLogs || 0) + 1;
      const daysSinceStart = project.startTime
        ? Math.floor(
            (today - project.startTime.toDate()) / (24 * 60 * 60 * 1000)
          ) + 1
        : 1;
      const velocityScore = Math.round((totalLogs / daysSinceStart) * 100);
      const consistencyScore = Math.round(
        (consecutiveDays / daysSinceStart) * 100
      );
      const overallScore = Math.round((velocityScore + consistencyScore) / 2);

      // Update time tracking
      const currentTimeTracking = project.timeTracking || {
        totalTime: 0,
        sessions: [],
      };
      const newTotalTime = currentTimeTracking.totalTime + timeSpent;
      const newSession = {
        startTime: serverTimestamp(),
        duration: timeSpent,
        logId: logDoc.id,
      };

      await updateDoc(projectRef, {
        totalLogs: totalLogs,
        consecutiveLogDays: consecutiveDays,
        lastLogDate: today,
        velocityScore: velocityScore,
        consistencyScore: consistencyScore,
        overallScore: overallScore,
        'timeTracking.totalTime': newTotalTime,
        'timeTracking.sessions': arrayUnion(newSession),
      });
    }

    return true;
  } catch (error) {
    console.error('Error adding log with time:', error);
    throw error;
  }
}

// Milestone management
export async function completeMilestone(uid, projectId, milestoneIndex) {
  try {
    const projectRef = doc(db, 'users', uid, 'projects', projectId);
    const projectSnap = await getDoc(projectRef);

    if (!projectSnap.exists()) {
      throw new Error('Project not found');
    }

    const project = projectSnap.data();
    const milestones = project.milestones || [];

    if (!milestones[milestoneIndex]) {
      throw new Error('Milestone not found');
    }

    milestones[milestoneIndex].completed = true;
    milestones[milestoneIndex].completedAt = serverTimestamp();

    await updateDoc(projectRef, {
      milestones: milestones,
    });

    return true;
  } catch (error) {
    console.error('Error completing milestone:', error);
    throw error;
  }
}

// Project tagging
export async function updateProjectTags(uid, projectId, tags) {
  try {
    const projectRef = doc(db, 'users', uid, 'projects', projectId);
    await updateDoc(projectRef, {
      tags: tags,
    });
    return true;
  } catch (error) {
    console.error('Error updating project tags:', error);
    throw error;
  }
}

// Project categorization
export async function updateProjectCategory(uid, projectId, category) {
  try {
    const projectRef = doc(db, 'users', uid, 'projects', projectId);
    await updateDoc(projectRef, {
      category: category,
    });
    return true;
  } catch (error) {
    console.error('Error updating project category:', error);
    throw error;
  }
}

// Project archiving
export async function archiveProject(uid, projectId) {
  try {
    const projectRef = doc(db, 'users', uid, 'projects', projectId);
    await updateDoc(projectRef, {
      archived: true,
      archivedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Error archiving project:', error);
    throw error;
  }
}

export async function unarchiveProject(uid, projectId) {
  try {
    const projectRef = doc(db, 'users', uid, 'projects', projectId);
    await updateDoc(projectRef, {
      archived: false,
      archivedAt: null,
    });
    return true;
  } catch (error) {
    console.error('Error unarchiving project:', error);
    throw error;
  }
}

// Enhanced project retrieval with filters
export async function getFilteredProjects(uid, filters = {}) {
  try {
    const projectsCol = collection(db, 'users', uid, 'projects');
    let q = query(projectsCol, orderBy('createdAt', 'desc'));

    const snapshot = await getDocs(q);
    let projects = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Apply filters
    if (filters.category) {
      projects = projects.filter((p) => p.category === filters.category);
    }

    if (filters.tags && filters.tags.length > 0) {
      projects = projects.filter((p) =>
        filters.tags.some((tag) => p.tags && p.tags.includes(tag))
      );
    }

    if (filters.status) {
      projects = projects.filter((p) => p.status === filters.status);
    }

    if (filters.archived !== undefined) {
      projects = projects.filter((p) => p.archived === filters.archived);
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      projects = projects.filter(
        (p) =>
          p.name.toLowerCase().includes(searchTerm) ||
          (p.description && p.description.toLowerCase().includes(searchTerm))
      );
    }

    return projects;
  } catch (error) {
    console.error('Error getting filtered projects:', error);
    throw error;
  }
}

// Import existing functions
export {
  createProject,
  addLog,
  startProject,
  pauseProject,
  resumeProject,
  completeProject,
  getUserProjects,
  getProjectLogs,
  getProjectById,
  updateProjectMetrics,
  awardBadge,
  checkBadgeEligibility,
} from './project.js';
