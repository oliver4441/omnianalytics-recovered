import { db } from './firebase';
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';

// Enhanced Analytics Features
export class AnalyticsEngine {
  constructor(uid) {
    this.uid = uid;
  }

  // Productivity insights and trends
  async getProductivityInsights() {
    try {
      const projectsCol = collection(db, 'users', this.uid, 'projects');
      const snapshot = await getDocs(projectsCol);
      const projects = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const insights = {
        totalProjects: projects.length,
        activeProjects: projects.filter(
          (p) => p.started && !p.archived && p.status !== 'completed'
        ).length,
        completedProjects: projects.filter((p) => p.status === 'completed')
          .length,
        averageVelocity: 0,
        averageConsistency: 0,
        totalLogs: 0,
        totalTrackedTime: 0,
        mostProductiveDay: '',
        streakStats: {
          longestStreak: 0,
          currentStreak: 0,
        },
        categoryPerformance: {},
        monthlyTrends: [],
      };

      if (projects.length === 0) return insights;

      let totalVelocity = 0;
      let totalConsistency = 0;
      let longestStreak = 0;
      let currentStreak = 0;

      // Analyze each project
      for (const project of projects) {
        if (project.velocityScore) totalVelocity += project.velocityScore;
        if (project.consistencyScore)
          totalConsistency += project.consistencyScore;

        const logs = await this.getProjectLogs(project.id);
        insights.totalLogs += logs.length;

        if (project.timeTracking && project.timeTracking.totalTime) {
          insights.totalTrackedTime += project.timeTracking.totalTime;
        }

        if (project.consecutiveLogDays > longestStreak) {
          longestStreak = project.consecutiveLogDays;
        }

        if (project.status === 'active' && !project.archived) {
          currentStreak = Math.max(
            currentStreak,
            project.consecutiveLogDays || 0
          );
        }

        // Category performance
        if (project.category) {
          if (!insights.categoryPerformance[project.category]) {
            insights.categoryPerformance[project.category] = {
              count: 0,
              avgVelocity: 0,
              avgConsistency: 0,
              completionRate: 0,
            };
          }
          insights.categoryPerformance[project.category].count++;
          insights.categoryPerformance[project.category].avgVelocity +=
            project.velocityScore || 0;
          insights.categoryPerformance[project.category].avgConsistency +=
            project.consistencyScore || 0;
        }
      }

      insights.averageVelocity = Math.round(totalVelocity / projects.length);
      insights.averageConsistency = Math.round(
        totalConsistency / projects.length
      );
      insights.streakStats.longestStreak = longestStreak;
      insights.streakStats.currentStreak = currentStreak;

      // Calculate category averages
      Object.keys(insights.categoryPerformance).forEach((category) => {
        const cat = insights.categoryPerformance[category];
        cat.avgVelocity = Math.round(cat.avgVelocity / cat.count);
        cat.avgConsistency = Math.round(cat.avgConsistency / cat.count);

        const completedInCategory = projects.filter(
          (p) => p.category === category && p.status === 'completed'
        ).length;
        cat.completionRate = Math.round(
          (completedInCategory / cat.count) * 100
        );
      });

      // Monthly trends
      insights.monthlyTrends = await this.getMonthlyTrends(projects);

      // Most productive day
      insights.mostProductiveDay = await this.getMostProductiveDay();

      return insights;
    } catch (error) {
      console.error('Error getting productivity insights:', error);
      throw error;
    }
  }

  async getProjectLogs(projectId) {
    try {
      const logsCol = collection(
        db,
        'users',
        this.uid,
        'projects',
        projectId,
        'logs'
      );
      const snapshot = await getDocs(logsCol);
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting project logs:', error);
      return [];
    }
  }

  async getMonthlyTrends(projects) {
    const trends = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      let logsCount = 0;
      let projectsCompleted = 0;

      for (const project of projects) {
        const logs = await this.getProjectLogs(project.id);
        const monthLogs = logs.filter((log) => {
          if (!log.createdAt) return false;
          const logDate = log.createdAt.toDate();
          return logDate >= month && logDate < nextMonth;
        });
        logsCount += monthLogs.length;

        if (project.completedAt) {
          const completedDate = project.completedAt.toDate();
          if (completedDate >= month && completedDate < nextMonth) {
            projectsCompleted++;
          }
        }
      }

      trends.push({
        month: month.toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
        }),
        logs: logsCount,
        completed: projectsCompleted,
      });
    }

    return trends;
  }

  async getMostProductiveDay() {
    try {
      const projectsCol = collection(db, 'users', this.uid, 'projects');
      const snapshot = await getDocs(projectsCol);
      const projects = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const dayCounts = {
        Sunday: 0,
        Monday: 0,
        Tuesday: 0,
        Wednesday: 0,
        Thursday: 0,
        Friday: 0,
        Saturday: 0,
      };

      for (const project of projects) {
        const logs = await this.getProjectLogs(project.id);
        logs.forEach((log) => {
          if (log.createdAt) {
            const dayName = log.createdAt
              .toDate()
              .toLocaleDateString('en-US', { weekday: 'long' });
            dayCounts[dayName]++;
          }
        });
      }

      return Object.keys(dayCounts).reduce((a, b) =>
        dayCounts[a] > dayCounts[b] ? a : b
      );
    } catch (error) {
      console.error('Error getting most productive day:', error);
      return 'Monday';
    }
  }

  // Project comparison tools
  async compareProjects(projectIds) {
    try {
      const projects = [];
      for (const id of projectIds) {
        const docRef = doc(db, 'users', this.uid, 'projects', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const project = { id: docSnap.id, ...docSnap.data() };
          project.logs = await this.getProjectLogs(id);
          projects.push(project);
        }
      }

      return projects.map((project) => ({
        id: project.id,
        name: project.name,
        category: project.category,
        velocity: project.velocityScore || 0,
        consistency: project.consistencyScore || 0,
        overall: project.overallScore || 0,
        totalLogs: project.logs.length,
        milestones: project.milestones || [],
        completedMilestones: (project.milestones || []).filter(
          (m) => m.completed
        ).length,
        timeTracked: project.timeTracking?.totalTime || 0,
        status: project.status,
        streak: project.consecutiveLogDays || 0,
      }));
    } catch (error) {
      console.error('Error comparing projects:', error);
      throw error;
    }
  }

  // Export functionality
  async exportAnalytics(format = 'csv') {
    try {
      const insights = await this.getProductivityInsights();

      if (format === 'csv') {
        return this.generateCSV(insights);
      } else if (format === 'pdf') {
        return this.generatePDF(insights);
      }

      throw new Error('Unsupported format');
    } catch (error) {
      console.error('Error exporting analytics:', error);
      throw error;
    }
  }

  generateCSV(insights) {
    const csvContent = [
      'Metric,Value',
      `Total Projects,${insights.totalProjects}`,
      `Active Projects,${insights.activeProjects}`,
      `Completed Projects,${insights.completedProjects}`,
      `Average Velocity,${insights.averageVelocity}%`,
      `Average Consistency,${insights.averageConsistency}%`,
      `Total Logs,${insights.totalLogs}`,
      `Total Tracked Time,${Math.round(insights.totalTrackedTime / 60)} hours`,
      `Longest Streak,${insights.streakStats.longestStreak} days`,
      `Current Streak,${insights.streakStats.currentStreak} days`,
      `Most Productive Day,${insights.mostProductiveDay}`,
      '',
      'Monthly Trends',
      'Month,Logs,Completed Projects',
      ...insights.monthlyTrends.map(
        (trend) => `${trend.month},${trend.logs},${trend.completed}`
      ),
      '',
      'Category Performance',
      'Category,Count,Avg Velocity,Avg Consistency,Completion Rate',
      ...Object.entries(insights.categoryPerformance).map(
        ([cat, perf]) =>
          `${cat},${perf.count},${perf.avgVelocity}%,${perf.avgConsistency}%,${perf.completionRate}%`
      ),
    ].join('\n');

    return csvContent;
  }

  generatePDF(insights) {
    // This would typically use a PDF library like jsPDF
    // For now, return formatted text that can be converted to PDF
    return `
PROJECT TRACKER ANALYTICS REPORT
Generated on: ${new Date().toLocaleDateString()}

OVERVIEW
---------
Total Projects: ${insights.totalProjects}
Active Projects: ${insights.activeProjects}
Completed Projects: ${insights.completedProjects}
Average Velocity: ${insights.averageVelocity}%
Average Consistency: ${insights.averageConsistency}%
Total Logs: ${insights.totalLogs}
Total Tracked Time: ${Math.round(insights.totalTrackedTime / 60)} hours

STREAK STATISTICS
------------------
Longest Streak: ${insights.streakStats.longestStreak} days
Current Streak: ${insights.streakStats.currentStreak} days
Most Productive Day: ${insights.mostProductiveDay}

MONTHLY TRENDS
--------------
${insights.monthlyTrends
  .map(
    (trend) =>
      `${trend.month}: ${trend.logs} logs, ${trend.completed} completed`
  )
  .join('\n')}

CATEGORY PERFORMANCE
-------------------
${Object.entries(insights.categoryPerformance)
  .map(
    ([cat, perf]) =>
      `${cat}: ${perf.count} projects, ${perf.avgVelocity}% avg velocity, ${perf.completionRate}% completion`
  )
  .join('\n')}
    `;
  }
}

// Achievement System
export class AchievementSystem {
  constructor(uid) {
    this.uid = uid;
    this.achievements = {
      speed_demon: {
        name: 'Speed Demon',
        description: 'Maintain 90%+ velocity for 7 days',
        icon: '⚡',
        levels: ['Bronze', 'Silver', 'Gold', 'Platinum'],
      },
      consistency_king: {
        name: 'Consistency King',
        description: 'Log daily for 30+ consecutive days',
        icon: '👑',
        levels: ['Bronze', 'Silver', 'Gold', 'Platinum'],
      },
      project_finisher: {
        name: 'Project Finisher',
        description: 'Complete 5+ projects',
        icon: '🏁',
        levels: ['Bronze', 'Silver', 'Gold', 'Platinum'],
      },
      time_master: {
        name: 'Time Master',
        description: 'Track 100+ hours across all projects',
        icon: '⏰',
        levels: ['Bronze', 'Silver', 'Gold', 'Platinum'],
      },
      milestone_master: {
        name: 'Milestone Master',
        description: 'Complete 20+ milestones',
        icon: '🎯',
        levels: ['Bronze', 'Silver', 'Gold', 'Platinum'],
      },
      category_explorer: {
        name: 'Category Explorer',
        description: 'Work in 4+ different project categories',
        icon: '🗺️',
        levels: ['Bronze', 'Silver', 'Gold', 'Platinum'],
      },
    };
  }

  async checkAchievements() {
    try {
      const analytics = new AnalyticsEngine(this.uid);
      const insights = await analytics.getProductivityInsights();
      const projectsCol = collection(db, 'users', this.uid, 'projects');
      const snapshot = await getDocs(projectsCol);
      const projects = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const newAchievements = [];

      // Check each achievement type
      for (const [achievementId, achievement] of Object.entries(
        this.achievements
      )) {
        const level = await this.calculateAchievementLevel(
          achievementId,
          insights,
          projects
        );
        if (level > 0) {
          newAchievements.push({
            id: achievementId,
            name: achievement.name,
            description: achievement.description,
            icon: achievement.icon,
            level: level,
            levelName: achievement.levels[level - 1],
            earnedAt: serverTimestamp(),
          });
        }
      }

      return newAchievements;
    } catch (error) {
      console.error('Error checking achievements:', error);
      throw error;
    }
  }

  async calculateAchievementLevel(achievementId, insights, projects) {
    switch (achievementId) {
      case 'speed_demon':
        const highVelocityProjects = projects.filter(
          (p) => (p.velocityScore || 0) >= 90
        ).length;
        if (highVelocityProjects >= 10) return 4;
        if (highVelocityProjects >= 5) return 3;
        if (highVelocityProjects >= 3) return 2;
        if (highVelocityProjects >= 1) return 1;
        return 0;

      case 'consistency_king':
        const maxStreak = Math.max(
          ...projects.map((p) => p.consecutiveLogDays || 0)
        );
        if (maxStreak >= 90) return 4;
        if (maxStreak >= 60) return 3;
        if (maxStreak >= 30) return 2;
        if (maxStreak >= 15) return 1;
        return 0;

      case 'project_finisher':
        const completedCount = projects.filter(
          (p) => p.status === 'completed'
        ).length;
        if (completedCount >= 20) return 4;
        if (completedCount >= 10) return 3;
        if (completedCount >= 5) return 2;
        if (completedCount >= 2) return 1;
        return 0;

      case 'time_master':
        const totalHours = insights.totalTrackedTime / 60;
        if (totalHours >= 500) return 4;
        if (totalHours >= 200) return 3;
        if (totalHours >= 100) return 2;
        if (totalHours >= 50) return 1;
        return 0;

      case 'milestone_master':
        const completedMilestones = projects.reduce((total, project) => {
          return (
            total + (project.milestones || []).filter((m) => m.completed).length
          );
        }, 0);
        if (completedMilestones >= 50) return 4;
        if (completedMilestones >= 30) return 3;
        if (completedMilestones >= 20) return 2;
        if (completedMilestones >= 10) return 1;
        return 0;

      case 'category_explorer':
        const categories = new Set(
          projects.map((p) => p.category).filter(Boolean)
        );
        if (categories.size >= 6) return 4;
        if (categories.size >= 5) return 3;
        if (categories.size >= 4) return 2;
        if (categories.size >= 2) return 1;
        return 0;

      default:
        return 0;
    }
  }

  async saveAchievements(achievements) {
    try {
      const userRef = doc(db, 'users', this.uid);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data() || {};
      const existingAchievements = userData.achievements || [];

      achievements.forEach((newAchievement) => {
        const existingIndex = existingAchievements.findIndex(
          (a) => a.id === newAchievement.id
        );
        if (existingIndex >= 0) {
          if (
            newAchievement.level > existingAchievements[existingIndex].level
          ) {
            existingAchievements[existingIndex] = newAchievement;
          }
        } else {
          existingAchievements.push(newAchievement);
        }
      });

      await updateDoc(userRef, {
        achievements: existingAchievements,
      });

      return achievements;
    } catch (error) {
      console.error('Error saving achievements:', error);
      throw error;
    }
  }
}

// Challenge System
export class ChallengeSystem {
  constructor(uid) {
    this.uid = uid;
    this.challenges = {
      weekly_logger: {
        name: 'Weekly Logger',
        description: 'Log progress every day for a week',
        duration: 7,
        requirement: 'daily_logs',
      },
      month_sprint: {
        name: 'Monthly Sprint',
        description: 'Complete a project within 30 days',
        duration: 30,
        requirement: 'complete_project',
      },
      velocity_boost: {
        name: 'Velocity Boost',
        description: 'Reach 80% velocity in 3 projects',
        duration: 14,
        requirement: 'high_velocity',
      },
    };
  }

  async startChallenge(challengeId) {
    try {
      const userRef = doc(db, 'users', this.uid);
      const challenge = {
        id: challengeId,
        ...this.challenges[challengeId],
        startedAt: serverTimestamp(),
        completed: false,
        progress: 0,
      };

      await updateDoc(userRef, {
        activeChallenges: arrayUnion(challenge),
      });

      return challenge;
    } catch (error) {
      console.error('Error starting challenge:', error);
      throw error;
    }
  }

  async updateChallengeProgress(challengeId, progress) {
    try {
      const userRef = doc(db, 'users', this.uid);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data() || {};
      const activeChallenges = userData.activeChallenges || [];

      const challengeIndex = activeChallenges.findIndex(
        (c) => c.id === challengeId
      );
      if (challengeIndex >= 0) {
        activeChallenges[challengeIndex].progress = progress;
        if (progress >= 100) {
          activeChallenges[challengeIndex].completed = true;
          activeChallenges[challengeIndex].completedAt = serverTimestamp();
        }

        await updateDoc(userRef, {
          activeChallenges: activeChallenges,
        });
      }

      return activeChallenges[challengeIndex];
    } catch (error) {
      console.error('Error updating challenge progress:', error);
      throw error;
    }
  }
}
