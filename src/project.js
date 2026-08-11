import { db } from './firebase.js';
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
  deleteDoc,
  increment,
} from 'firebase/firestore';

const FREE_TIER_LIMIT = 5;

export async function createProject(userId, data) {
  try {
    const projectsRef = collection(db, 'projects');
    const q = query(projectsRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const currentProjectCount = snapshot.size;

    if (currentProjectCount >= FREE_TIER_LIMIT) {
      throw new Error('FREE_TIER_LIMIT_REACHED');
    }

    const projectData = {
      userId: userId,
      name: data.name,
      description: data.description || null,
      targetDate: data.targetDate ? new Date(data.targetDate) : null,
      isCompleted: false,
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
    };

    const docRef = await addDoc(projectsRef, projectData);
    return { id: docRef.id, ...projectData };
  } catch (error) {
    console.error('Error creating project:', error);
    throw error;
  }
}

export async function addLog(userId, projectId, text) {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const logRef = collection(db, 'logs');
    await addDoc(logRef, {
      userId: userId,
      projectId: projectId,
      text: text,
      loggedAt: serverTimestamp(),
      date: today,
    });

    const projectRef = doc(db, 'projects', projectId);
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
            (today - new Date(project.startTime)) / (24 * 60 * 60 * 1000)
          ) + 1
        : 1;
      const velocityScore = Math.round((totalLogs / daysSinceStart) * 100);
      const consistencyScore = Math.round(
        (consecutiveDays / daysSinceStart) * 100
      );
      const overallScore = Math.round((velocityScore + consistencyScore) / 2);

      await updateDoc(projectRef, {
        totalLogs: totalLogs,
        consecutiveLogDays: consecutiveDays,
        lastLogDate: today,
        velocityScore: velocityScore,
        consistencyScore: consistencyScore,
        overallScore: overallScore,
      });
    }

    return true;
  } catch (error) {
    console.error('Error adding log:', error);
    throw error;
  }
}

export async function startProject(userId, projectId) {
  try {
    const projectRef = doc(db, 'projects', projectId);
    await updateDoc(projectRef, {
      started: true,
      startTime: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Error starting project:', error);
    throw error;
  }
}

export async function pauseProject(userId, projectId) {
  try {
    const projectRef = doc(db, 'projects', projectId);
    await updateDoc(projectRef, {
      isPaused: true,
    });
    return true;
  } catch (error) {
    console.error('Error pausing project:', error);
    throw error;
  }
}

export async function resumeProject(userId, projectId) {
  try {
    const projectRef = doc(db, 'projects', projectId);
    await updateDoc(projectRef, {
      isPaused: false,
    });
    return true;
  } catch (error) {
    console.error('Error resuming project:', error);
    throw error;
  }
}

export async function completeProject(userId, projectId) {
  try {
    const projectRef = doc(db, 'projects', projectId);
    await updateDoc(projectRef, {
      status: 'completed',
      isCompleted: true,
      completedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Error completing project:', error);
    throw error;
  }
}

export async function deleteProject(userId, projectId) {
  try {
    const projectRef = doc(db, 'projects', projectId);
    const projectSnap = await getDoc(projectRef);

    if (projectSnap.exists() && projectSnap.data().userId === userId) {
      await deleteDoc(projectRef);

      const logsRef = collection(db, 'logs');
      const logsQuery = query(logsRef, where('projectId', '==', projectId));
      const logsSnap = await getDocs(logsQuery);

      const deletePromises = logsSnap.docs.map((logDoc) =>
        deleteDoc(doc(db, 'logs', logDoc.id))
      );
      await Promise.all(deletePromises);

      return true;
    }
    throw new Error('Project not found or unauthorized');
  } catch (error) {
    console.error('Error deleting project:', error);
    throw error;
  }
}

export async function getUserProjects(userId) {
  try {
    const projectsRef = collection(db, 'projects');
    const q = query(
      projectsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error getting user projects:', error);
    throw error;
  }
}

export async function getProjectLogs(userId, projectId) {
  try {
    const logsRef = collection(db, 'logs');
    const q = query(
      logsRef,
      where('projectId', '==', projectId),
      orderBy('loggedAt', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error getting project logs:', error);
    throw error;
  }
}

export async function getProjectById(projectId) {
  try {
    const docRef = doc(db, 'projects', projectId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting project by ID:', error);
    throw error;
  }
}

export async function updateProjectMetrics(userId, projectId) {
  try {
    const projectRef = doc(db, 'projects', projectId);
    const projectSnap = await getDoc(projectRef);

    if (projectSnap.exists()) {
      const project = projectSnap.data();
      const logsRef = collection(db, 'logs');
      const logsQuery = query(logsRef, where('projectId', '==', projectId));
      const logsSnap = await getDocs(logsQuery);
      const logs = logsSnap.docs.map((doc) => doc.data());

      const totalLogs = logs.length;
      const uniqueDates = [
        ...new Set(logs.map((log) => new Date(log.date).toDateString())),
      ];
      const consecutiveDays = calculateConsecutiveDays(uniqueDates);

      const now = new Date();
      const startDate = project.startTime
        ? new Date(project.startTime)
        : project.createdAt.toDate();
      const daysSinceStart =
        Math.floor((now - startDate) / (24 * 60 * 60 * 1000)) + 1;

      const velocityScore = Math.round((totalLogs / daysSinceStart) * 100);
      const consistencyScore = Math.round(
        (consecutiveDays / daysSinceStart) * 100
      );
      const overallScore = Math.round((velocityScore + consistencyScore) / 2);

      await updateDoc(projectRef, {
        totalLogs: totalLogs,
        consecutiveLogDays: consecutiveDays,
        velocityScore: velocityScore,
        consistencyScore: consistencyScore,
        overallScore: overallScore,
      });

      return {
        velocityScore,
        consistencyScore,
        overallScore,
        consecutiveDays,
      };
    }
    return null;
  } catch (error) {
    console.error('Error updating project metrics:', error);
    throw error;
  }
}

function calculateConsecutiveDays(dates) {
  if (dates.length === 0) return 0;

  const sortedDates = dates.map((d) => new Date(d)).sort((a, b) => a - b);
  let maxStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    const diffTime = Math.abs(sortedDates[i] - sortedDates[i - 1]);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else if (diffDays > 1) {
      currentStreak = 1;
    }
  }

  return maxStreak;
}

export async function claimBadge(userId, projectId) {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.data() || {};

    const claimedBadges = userData.claimedBadges || [];

    const hasBadge = claimedBadges.some(
      (badge) => badge.projectId === projectId
    );

    if (!hasBadge) {
      const badge = {
        projectId: projectId,
        earnedAt: serverTimestamp(),
        rewardExpires: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
        type: 'consistency_badge',
      };

      claimedBadges.push(badge);
      const currentBonus = userData.bonusProjects || 0;

      await updateDoc(userRef, {
        claimedBadges: claimedBadges,
        bonusProjects: currentBonus + 1,
        tier: 'premium',
      });

      return badge;
    }

    return null;
  } catch (error) {
    console.error('Error awarding badge:', error);
    throw error;
  }
}

export async function checkBadgeEligibility(userId, projectId) {
  try {
    const project = await getProjectById(projectId);
    if (!project) return false;

    return project.consecutiveLogDays >= 15;
  } catch (error) {
    console.error('Error checking badge eligibility:', error);
    throw error;
  }
}

export async function getAllBadges() {
  try {
    const badgesRef = collection(db, 'badges');
    const snapshot = await getDocs(badgesRef);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error getting badges:', error);
    throw error;
  }
}

export async function getUserBadges(userId) {
  try {
    const userBadgesRef = collection(db, 'userBadges');
    const q = query(userBadgesRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error getting user badges:', error);
    throw error;
  }
}

export async function awardBadge(userId, badgeId) {
  try {
    const userBadgeRef = await addDoc(collection(db, 'userBadges'), {
      userId: userId,
      badgeId: badgeId,
      earnedAt: serverTimestamp(),
    });

    const userRef = doc(db, 'users', userId);
    await updateDoc(
      userRef,
      {
        tier: 'premium',
      },
      { merge: true }
    );

    return { id: userBadgeRef.id };
  } catch (error) {
    console.error('Error awarding badge:', error);
    throw error;
  }
}
