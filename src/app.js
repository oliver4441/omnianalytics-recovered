import { watchAuth, getCurrentUser, logout } from './auth.js';
import {
  getUserProjects,
  getProjectById,
  addLog,
  startProject,
  claimBadge,
  getProjectLogs,
} from './project.js';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase.js';
import { Chart } from 'chart.js';

let currentProject = null;
let chart = null;
let countdownInterval = null;

function showLandingPage() {
  document.getElementById('loadingScreen').style.display = 'none';
  document.getElementById('landingPage').style.display = 'block';
  document.getElementById('landingFooter').style.display = 'block';
  document.getElementById('dashboardPage').style.display = 'none';
}

function showDashboardPage() {
  document.getElementById('loadingScreen').style.display = 'none';
  document.getElementById('landingPage').style.display = 'none';
  document.getElementById('landingFooter').style.display = 'none';
  document.getElementById('dashboardPage').style.display = 'block';
}

function showMessage(text, type = 'success') {
  const message = document.getElementById('message');
  if (!message) return;

  message.className = `message ${type}`;
  message.textContent = text;

  setTimeout(() => {
    message.className = 'message';
    message.textContent = '';
  }, 5000);
}

function formatDate(timestamp) {
  if (!timestamp) return 'Pending';
  if (timestamp.toDate) {
    return timestamp.toDate().toLocaleDateString();
  }
  return new Date(timestamp).toLocaleDateString();
}

async function showDashboard() {
  const user = getCurrentUser();
  if (!user) return;

  const projectsList = document.getElementById('projectsList');
  const emptyState = document.getElementById('emptyState');
  const logoutBtn = document.getElementById('logoutBtn');
  const tierBadge = document.getElementById('tierBadge');
  const userName = document.getElementById('userName');
  const userAvatar = document.getElementById('userAvatar');
  const welcomeName = document.getElementById('welcomeName');
  const totalProjectsEl = document.getElementById('totalProjects');
  const activeProjectsEl = document.getElementById('activeProjects');
  const totalLogsEl = document.getElementById('totalLogs');
  const badgesEarnedEl = document.getElementById('badgesEarned');

  if (!projectsList || !user) return;

  try {
    const userDoc = await doc(db, 'users', user.uid).get();
    const userData = userDoc.data();

    if (userData) {
      const displayName =
        userData.displayName || user.email?.split('@')[0] || 'User';
      if (userName) userName.textContent = displayName;
      if (welcomeName) welcomeName.textContent = displayName.split(' ')[0];
      if (userAvatar) {
        const initial = displayName.charAt(0).toUpperCase();
        userAvatar.innerHTML = `<span class="avatar-initial">${initial}</span>`;
      }
      if (tierBadge) {
        tierBadge.textContent =
          userData.tier === 'premium' ? 'Premium' : 'Free';
        tierBadge.className = `tier-badge ${userData.tier === 'premium' ? 'tier-premium' : 'tier-free'}`;
      }
      if (badgesEarnedEl && userData.claimedBadges) {
        badgesEarnedEl.textContent = userData.claimedBadges.length;
      }
    }
  } catch (error) {
    console.error('Error fetching user data:', error);
  }

  try {
    const projects = await getUserProjects(user.uid);

    if (projects.length === 0) {
      projectsList.innerHTML = '';
      if (emptyState) emptyState.style.display = 'flex';
    } else {
      if (emptyState) emptyState.style.display = 'none';
      projectsList.innerHTML = projects
        .map(
          (project) => `
            <div class="project-card" data-project-id="${project.id}">
              <div class="project-card-header">
                <h3>${project.name}</h3>
                <span class="status-badge ${project.status === 'completed' ? 'completed' : project.started ? 'active' : 'pending'}">
                  ${project.status === 'completed' ? 'Completed' : project.started ? 'Active' : 'Not Started'}
                </span>
              </div>
              ${project.description ? `<p class="project-description">${project.description}</p>` : ''}
              <div class="project-meta">
                <span class="meta-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  ${formatDate(project.createdAt)}
                </span>
                ${
                  project.targetDate
                    ? `
                <span class="meta-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  ${formatDate(project.targetDate)}
                </span>
                `
                    : ''
                }
              </div>
              <div class="project-stats">
                <div class="project-stat">
                  <span class="stat-number">${project.totalLogs || 0}</span>
                  <span class="stat-label">Logs</span>
                </div>
                <div class="project-stat">
                  <span class="stat-number">${project.consecutiveLogDays || 0}</span>
                  <span class="stat-label">Day Streak</span>
                </div>
                <div class="project-stat">
                  <span class="stat-number">${project.overallScore || 0}%</span>
                  <span class="stat-label">Score</span>
                </div>
              </div>
              <div class="project-progress">
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${project.overallScore || 0}%"></div>
                </div>
              </div>
            </div>
          `
        )
        .join('');
    }

    if (totalProjectsEl) {
      totalProjectsEl.textContent = projects.length;
    }

    if (activeProjectsEl) {
      const activeCount = projects.filter(
        (p) => p.started && p.status !== 'completed'
      ).length;
      activeProjectsEl.textContent = activeCount;
    }

    let allLogsCount = 0;
    for (const project of projects) {
      try {
        const logs = await getProjectLogs(user.uid, project.id);
        allLogsCount += logs.length;
      } catch (error) {
        console.error('Error fetching logs for project:', error);
      }
    }

    if (totalLogsEl) {
      totalLogsEl.textContent = allLogsCount;
    }

    projectsList.querySelectorAll('.project-card').forEach((card) => {
      card.addEventListener('click', () => {
        const projectId = card.dataset.projectId;
        showProjectDetails(user.uid, projectId);
      });
    });

    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        await logout();
        window.location.href = '/login.html';
      });
    }
  } catch (error) {
    console.error('Error loading projects:', error);
    showMessage('Error loading projects', 'error');
  }
}

async function showProjectDetails(userId, projectId) {
  const projectDetails = document.getElementById('projectDetails');
  const projectsList = document.getElementById('projectsList');
  const logForm = document.getElementById('logForm');
  const logInput = document.getElementById('logInput');

  if (!projectDetails || !projectsList) return;

  try {
    const project = await getProjectById(projectId);
    if (!project) {
      showMessage('Project not found', 'error');
      return;
    }

    if (project.userId !== userId) {
      showMessage('Unauthorized access', 'error');
      return;
    }

    currentProject = { userId, projectId };

    projectsList.style.display = 'none';
    projectDetails.style.display = 'block';

    document.getElementById('projectTitle').textContent = project.name;
    document.getElementById('startDate').textContent = formatDate(
      project.createdAt
    );
    document.getElementById('deadline').textContent = project.targetDate
      ? formatDate(project.targetDate)
      : 'Not set';
    document.getElementById('projectStatus').textContent =
      project.status === 'completed' ? 'Completed' : 'Active';

    const statusBadge = document.getElementById('projectStatusBadge');
    if (statusBadge) {
      statusBadge.textContent =
        project.status === 'completed' ? 'Completed' : 'Active';
      statusBadge.className = `status-badge ${project.status === 'completed' ? 'completed' : 'active'}`;
    }

    updateCountdown(project);
    updateMetrics(project);

    const logs = await getProjectLogs(userId, projectId);
    displayLogs(logs);

    if (logForm && logInput) {
      logForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = logInput.value.trim();
        if (text) {
          await addLog(userId, projectId, text);
          logInput.value = '';
          const updatedLogs = await getProjectLogs(userId, projectId);
          const updatedProject = await getProjectById(projectId);
          displayLogs(updatedLogs);
          updateChart(updatedLogs);
          updateMetrics(updatedProject);

          if (updatedProject.consecutiveLogDays >= 15) {
            showBadgeNotification(userId, projectId);
          }
        }
      });
    }

    updateChart(logs);

    const startBtn = document.getElementById('startProjectBtn');
    if (startBtn && !project.started) {
      startBtn.addEventListener('click', async () => {
        await startProject(userId, projectId);
        showMessage('Project started! Countdown begins.', 'success');
        const updatedProject = await getProjectById(projectId);
        updateCountdown(updatedProject);
      });
      startBtn.style.display = 'block';
    } else if (startBtn && project.started) {
      startBtn.style.display = 'none';
    }
  } catch (error) {
    console.error('Error loading project details:', error);
    showMessage('Error loading project details', 'error');
  }
}

function updateCountdown(project) {
  const countdownDisplay = document.getElementById('countdownDisplay');
  const countdownContainer = document.getElementById('countdownContainer');
  const deadlineEl = document.getElementById('deadline');

  if (!countdownContainer || !project.targetDate) return;

  countdownContainer.style.display = 'block';
  if (deadlineEl && project.targetDate) {
    deadlineEl.textContent = formatDate(project.targetDate);
  }

  if (countdownInterval) {
    clearInterval(countdownInterval);
  }

  const deadline = new Date(project.targetDate);

  function update() {
    const now = new Date();
    const diff = deadline - now;

    if (diff <= 0) {
      countdownDisplay.innerHTML =
        '<span class="countdown-ended">Project Deadline Reached!</span>';
      clearInterval(countdownInterval);
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    countdownDisplay.innerHTML = `
            <div class="countdown-timer">
                <div class="countdown-unit"><span class="countdown-value">${String(days).padStart(2, '0')}</span><span class="countdown-label">Days</span></div>
                <div class="countdown-separator">:</div>
                <div class="countdown-unit"><span class="countdown-value">${String(hours).padStart(2, '0')}</span><span class="countdown-label">Hours</span></div>
                <div class="countdown-separator">:</div>
                <div class="countdown-unit"><span class="countdown-value">${String(minutes).padStart(2, '0')}</span><span class="countdown-label">Minutes</span></div>
                <div class="countdown-separator">:</div>
                <div class="countdown-unit"><span class="countdown-value">${String(seconds).padStart(2, '0')}</span><span class="countdown-label">Seconds</span></div>
            </div>
        `;
  }

  update();
  countdownInterval = setInterval(update, 1000);
}

function updateMetrics(project) {
  updateVelocitySpeedometer(project);
  updateConsistencyTracker(project);
  updateOverallScore(project);
}

function updateVelocitySpeedometer(project) {
  const velocityValue = document.getElementById('velocityValue');
  const velocityFill = document.getElementById('velocityFill');
  const velocityNeedle = document.getElementById('velocityNeedle');

  if (!velocityValue) return;

  const velocity = project.velocityScore || 0;
  velocityValue.textContent = velocity + '%';

  if (velocityFill) {
    velocityFill.style.height = velocity + '%';
  }

  if (velocityNeedle) {
    const rotation = (velocity / 100) * 180 - 90;
    velocityNeedle.style.transform = `rotate(${rotation}deg)`;
  }
}

function updateConsistencyTracker(project) {
  const consistencyValue = document.getElementById('consistencyValue');
  const consistencyStreak = document.getElementById('consistencyStreak');

  if (!consistencyValue || !consistencyStreak) return;

  const consistency = project.consistencyScore || 0;
  const streak = project.consecutiveLogDays || 0;

  consistencyValue.textContent = consistency + '%';
  consistencyStreak.textContent = streak + ' days';

  if (streak >= 15) {
    consistencyStreak.className = 'streak-badge gold';
    consistencyStreak.innerHTML = '🔥 ' + streak + ' days';
  } else if (streak >= 7) {
    consistencyStreak.className = 'streak-badge silver';
    consistencyStreak.innerHTML = '⭐ ' + streak + ' days';
  } else if (streak >= 3) {
    consistencyStreak.className = 'streak-badge bronze';
    consistencyStreak.innerHTML = '🌟 ' + streak + ' days';
  } else {
    consistencyStreak.className = 'streak-badge';
  }
}

function updateOverallScore(project) {
  const overallScoreValue = document.getElementById('overallScoreValue');
  const overallScoreCircle = document.getElementById('overallScoreCircle');

  if (!overallScoreValue) return;

  const score = project.overallScore || 0;
  overallScoreValue.textContent = score;

  if (overallScoreCircle) {
    if (score >= 80) {
      overallScoreCircle.style.borderColor = '#27ae60';
    } else if (score >= 50) {
      overallScoreCircle.style.borderColor = '#f39c12';
    } else {
      overallScoreCircle.style.borderColor = '#e74c3c';
    }
  }
}

function showBadgeNotification(userId, projectId) {
  const notification = document.createElement('div');
  notification.className = 'badge-notification';
  notification.innerHTML = `
        <div class="badge-icon">🏆</div>
        <div class="badge-content">
            <h4>Badge Earned!</h4>
            <p>You've achieved 15 consecutive days of logging!</p>
            <p>Claim your free 6-month project slot!</p>
            <button class="claim-badge-btn" onclick="handleClaimBadge('${userId}', '${projectId}')">Claim Reward</button>
        </div>
        <button class="close-notification" onclick="this.parentElement.remove()">×</button>
    `;
  document.body.appendChild(notification);

  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 15000);
}

window.handleClaimBadge = async function (userId, projectId) {
  try {
    await claimBadge(userId, projectId);
    showMessage(
      'Reward claimed! You now have an extra project slot for 6 months.',
      'success'
    );
    const notification = document.querySelector('.badge-notification');
    if (notification) {
      notification.remove();
    }
  } catch (error) {
    showMessage('Error claiming reward: ' + error.message, 'error');
  }
};

function displayLogs(logs) {
  const logsList = document.getElementById('logsList');

  if (!logsList) return;

  if (logs.length === 0) {
    logsList.innerHTML = `
            <li class="log-item">
                <p>No progress logs yet. Start tracking your progress!</p>
            </li>
        `;
    return;
  }

  logsList.innerHTML = logs
    .map(
      (log) => `
        <li class="log-item">
            <p>${log.text}</p>
            <time>${formatDate(log.loggedAt)}</time>
        </li>
    `
    )
    .join('');
}

function updateChart(logs) {
  const ctx = document.getElementById('progressChart');
  const chartContainer = document.querySelector('.chart-container');

  if (!ctx || !chartContainer) return;

  if (chart) {
    chart.destroy();
    chart = null;
  }

  if (logs.length === 0) {
    chartContainer.innerHTML = `
            <p style="text-align: center; color: #7f8c8d;" class="no-chart-message">
                Start adding progress logs to see your project timeline!
            </p>
        `;
    return;
  }

  const dates = logs.map((log) =>
    log.loggedAt && log.loggedAt.toDate
      ? log.loggedAt.toDate()
      : new Date(log.loggedAt)
  );
  const labels = dates.map((date) => date.toLocaleDateString());
  const cumulativeProgress = Array(logs.length)
    .fill(1)
    .map((_, i) => i + 1);

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Progress Over Time',
          data: cumulativeProgress,
          borderColor: '#3498db',
          backgroundColor: 'rgba(52, 152, 219, 0.1)',
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Project Progress Timeline',
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Progress Count',
          },
        },
        x: {
          title: {
            display: true,
            text: 'Date',
          },
        },
      },
    },
  });
}

window.addEventListener('load', function () {
  setTimeout(function () {
    const user = getCurrentUser();
    if (user) {
      showDashboardPage();
      showDashboard();
    } else {
      showLandingPage();
    }

    watchAuth(function (user) {
      if (user) {
        showDashboardPage();
        showDashboard();
      } else {
        showLandingPage();
      }
    });
  }, 500);
});

window.addEventListener('popstate', () => {
  const projectDetails = document.getElementById('projectDetails');
  const projectsList = document.getElementById('projectsList');

  if (projectDetails && projectDetails.style.display !== 'none') {
    projectDetails.style.display = 'none';
    projectsList.style.display = 'block';
    currentProject = null;
  }
});

window.addEventListener('beforeunload', () => {
  if (currentProject) {
    history.pushState(null, document.title, window.location.pathname);
  }
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }
});

export { showDashboard, showProjectDetails };
