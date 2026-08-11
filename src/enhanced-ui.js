// Enhanced UI Components for Phase 3 Features

class ProjectTrackerUI {
  constructor() {
    this.shortcuts = new Map();
    this.setupKeyboardShortcuts();
    this.initializeQuickActions();
  }

  // Keyboard shortcuts
  setupKeyboardShortcuts() {
    this.shortcuts.set('ctrl+n', () => this.openNewProjectModal());
    this.shortcuts.set('ctrl+/', () => this.showShortcutsHelp());
    this.shortcuts.set('ctrl+s', () => this.searchProjects());
    this.shortcuts.set('ctrl+f', () => this.filterProjects());
    this.shortcuts.set('ctrl+a', () => this.showAnalytics());
    this.shortcuts.set('ctrl+d', () => this.openDashboard());
    this.shortcuts.set('escape', () => this.closeModals());
    this.shortcuts.set('ctrl+shift+c', () => this.cloneSelectedProject());
    this.shortcuts.set('ctrl+shift+a', () => this.archiveSelectedProject());

    document.addEventListener('keydown', (e) => {
      const key = this.getShortcutKey(e);
      if (this.shortcuts.has(key)) {
        e.preventDefault();
        this.shortcuts.get(key)();
      }
    });
  }

  getShortcutKey(e) {
    const parts = [];
    if (e.ctrlKey) parts.push('ctrl');
    if (e.shiftKey) parts.push('shift');
    if (e.altKey) parts.push('alt');
    if (e.metaKey) parts.push('meta');

    let key = e.key.toLowerCase();
    if (key === ' ') key = 'space';
    if (key === 'escape') key = 'escape';

    parts.push(key);
    return parts.join('+');
  }

  // Project templates modal
  showProjectTemplates() {
    const modal = this.createModal('project-templates-modal');
    modal.innerHTML = `
      <div class="modal-header">
        <h2>Choose Project Template</h2>
        <button class="close-btn" onclick="this.closest('.modal').remove()">×</button>
      </div>
      <div class="templates-grid">
        <div class="template-card" data-template="web-development">
          <div class="template-icon">💻</div>
          <h3>Web Development</h3>
          <p>Complete web development project with frontend and backend</p>
          <div class="template-meta">
            <span class="duration">30 days</span>
            <span class="milestones">4 milestones</span>
          </div>
        </div>
        <div class="template-card" data-template="mobile-app">
          <div class="template-icon">📱</div>
          <h3>Mobile App</h3>
          <p>Mobile application development for iOS and Android</p>
          <div class="template-meta">
            <span class="duration">45 days</span>
            <span class="milestones">4 milestones</span>
          </div>
        </div>
        <div class="template-card" data-template="research">
          <div class="template-icon">🔬</div>
          <h3>Research Project</h3>
          <p>Academic or professional research project</p>
          <div class="template-meta">
            <span class="duration">60 days</span>
            <span class="milestones">4 milestones</span>
          </div>
        </div>
        <div class="template-card" data-template="content-creation">
          <div class="template-icon">🎨</div>
          <h3>Content Creation</h3>
          <p>Content creation project including writing or multimedia</p>
          <div class="template-meta">
            <span class="duration">21 days</span>
            <span class="milestones">4 milestones</span>
          </div>
        </div>
        <div class="template-card" data-template="learning">
          <div class="template-icon">📚</div>
          <h3>Learning Project</h3>
          <p>Structured learning project for new skills</p>
          <div class="template-meta">
            <span class="duration">90 days</span>
            <span class="milestones">4 milestones</span>
          </div>
        </div>
        <div class="template-card" data-template="custom">
          <div class="template-icon">✨</div>
          <h3>Custom Project</h3>
          <p>Create a project with your own specifications</p>
          <div class="template-meta">
            <span class="duration">Flexible</span>
            <span class="milestones">Custom</span>
          </div>
        </div>
      </div>
    `;

    modal.querySelectorAll('.template-card').forEach((card) => {
      card.addEventListener('click', () => {
        const template = card.dataset.template;
        this.selectTemplate(template);
      });
    });
  }

  // Enhanced search and filtering
  showSearchAndFilter() {
    const modal = this.createModal('search-filter-modal');
    modal.innerHTML = `
      <div class="modal-header">
        <h2>Search & Filter Projects</h2>
        <button class="close-btn" onclick="this.closest('.modal').remove()">×</button>
      </div>
      <div class="search-filter-content">
        <div class="search-section">
          <input type="text" id="projectSearch" placeholder="Search projects by name or description...">
          <div class="search-suggestions" id="searchSuggestions"></div>
        </div>
        
        <div class="filter-section">
          <h3>Categories</h3>
          <div class="filter-tags" id="categoryFilters">
            <button class="filter-tag" data-filter="category" data-value="development">💻 Development</button>
            <button class="filter-tag" data-filter="category" data-value="research">🔬 Research</button>
            <button class="filter-tag" data-filter="category" data-value="creative">🎨 Creative</button>
            <button class="filter-tag" data-filter="category" data-value="education">📚 Education</button>
            <button class="filter-tag" data-filter="category" data-value="business">💼 Business</button>
            <button class="filter-tag" data-filter="category" data-value="personal">👤 Personal</button>
          </div>
          
          <h3>Tags</h3>
          <div class="filter-tags" id="tagFilters">
            <button class="filter-tag" data-filter="tag" data-value="urgent">🔥 Urgent</button>
            <button class="filter-tag" data-filter="tag" data-value="team">👥 Team</button>
            <button class="filter-tag" data-filter="tag" data-value="learning">📖 Learning</button>
            <button class="filter-tag" data-filter="tag" data-value="client">💼 Client</button>
          </div>
          
          <h3>Status</h3>
          <div class="filter-tags" id="statusFilters">
            <button class="filter-tag" data-filter="status" data-value="active">Active</button>
            <button class="filter-tag" data-filter="status" data-value="completed">Completed</button>
            <button class="filter-tag" data-filter="status" data-value="paused">Paused</button>
            <button class="filter-tag" data-filter="archived" data-value="false">Not Archived</button>
          </div>
        </div>
        
        <div class="filter-actions">
          <button class="btn btn-secondary" onclick="this.closest('.modal').querySelectorAll('.filter-tag').forEach(tag => tag.classList.remove('active'))">Clear Filters</button>
          <button class="btn btn-primary" onclick="this.applyFilters()">Apply Filters</button>
        </div>
      </div>
    `;

    this.setupSearchFunctionality();
    this.setupFilterFunctionality();
  }

  // Analytics dashboard
  showAnalyticsDashboard() {
    const modal = this.createModal('analytics-modal', 'large');
    modal.innerHTML = `
      <div class="modal-header">
        <h2>Analytics Dashboard</h2>
        <div class="export-controls">
          <button class="btn btn-secondary" onclick="this.exportAnalytics('csv')">📊 Export CSV</button>
          <button class="btn btn-secondary" onclick="this.exportAnalytics('pdf')">📄 Export PDF</button>
        </div>
        <button class="close-btn" onclick="this.closest('.modal').remove()">×</button>
      </div>
      <div class="analytics-content">
        <div class="analytics-overview">
          <div class="stat-card">
            <h3>Productivity Score</h3>
            <div class="stat-value" id="productivityScore">--</div>
            <div class="stat-trend" id="productivityTrend">↑</div>
          </div>
          <div class="stat-card">
            <h3>Current Streak</h3>
            <div class="stat-value" id="currentStreak">--</div>
            <div class="stat-label">days</div>
          </div>
          <div class="stat-card">
            <h3>Total Projects</h3>
            <div class="stat-value" id="totalProjects">--</div>
            <div class="stat-label">projects</div>
          </div>
          <div class="stat-card">
            <h3>Completion Rate</h3>
            <div class="stat-value" id="completionRate">--</div>
            <div class="stat-label">%</div>
          </div>
        </div>
        
        <div class="analytics-charts">
          <div class="chart-container">
            <h3>Productivity Trends</h3>
            <canvas id="productivityChart"></canvas>
          </div>
          <div class="chart-container">
            <h3>Category Distribution</h3>
            <canvas id="categoryChart"></canvas>
          </div>
        </div>
        
        <div class="achievements-section">
          <h3>Recent Achievements</h3>
          <div class="achievements-grid" id="achievementsGrid"></div>
        </div>
        
        <div class="challenges-section">
          <h3>Active Challenges</h3>
          <div class="challenges-list" id="challengesList"></div>
        </div>
      </div>
    `;

    this.loadAnalyticsData();
  }

  // Time tracking interface
  showTimeTracking(logId = null) {
    const modal = this.createModal('time-tracking-modal');
    modal.innerHTML = `
      <div class="modal-header">
        <h2>Time Tracking</h2>
        <button class="close-btn" onclick="this.closest('.modal').remove()">×</button>
      </div>
      <div class="time-tracking-content">
        <div class="timer-display">
          <div class="timer-circle">
            <div class="timer-time" id="timerDisplay">00:00:00</div>
            <div class="timer-label">Time Spent</div>
          </div>
        </div>
        
        <div class="timer-controls">
          <button class="btn btn-success" id="startTimer">▶️ Start</button>
          <button class="btn btn-warning" id="pauseTimer" style="display: none;">⏸️ Pause</button>
          <button class="btn btn-danger" id="stopTimer" style="display: none;">⏹️ Stop</button>
          <button class="btn btn-secondary" id="resetTimer">🔄 Reset</button>
        </div>
        
        <div class="time-input-section">
          <label>Manual Time Entry</label>
          <div class="time-input-group">
            <input type="number" id="hoursInput" placeholder="Hours" min="0" max="23">
            <input type="number" id="minutesInput" placeholder="Minutes" min="0" max="59">
            <button class="btn btn-primary" id="addManualTime">Add Time</button>
          </div>
        </div>
        
        <div class="recent-sessions">
          <h3>Recent Sessions</h3>
          <div class="sessions-list" id="sessionsList"></div>
        </div>
      </div>
    `;

    this.initializeTimeTracking();
  }

  // Milestone tracking
  showMilestones(project) {
    const modal = this.createModal('milestones-modal');
    const milestones = project.milestones || [];

    modal.innerHTML = `
      <div class="modal-header">
        <h2>Milestones - ${project.name}</h2>
        <button class="close-btn" onclick="this.closest('.modal').remove()">×</button>
      </div>
      <div class="milestones-content">
        <div class="milestone-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${this.calculateMilestoneProgress(milestones)}%"></div>
          </div>
          <div class="progress-text">${milestones.filter((m) => m.completed).length} / ${milestones.length} completed</div>
        </div>
        
        <div class="milestones-list">
          ${milestones
            .map(
              (milestone, index) => `
            <div class="milestone-item ${milestone.completed ? 'completed' : ''}" data-index="${index}">
              <div class="milestone-checkbox">
                <input type="checkbox" ${milestone.completed ? 'checked' : ''} 
                       onchange="this.toggleMilestone(${index}, this.checked)">
              </div>
              <div class="milestone-content">
                <h4>${milestone.name}</h4>
                <p>Estimated: ${milestone.estimatedDays} days</p>
                ${milestone.completed ? `<small>Completed: ${new Date(milestone.completedAt.toDate()).toLocaleDateString()}</small>` : ''}
              </div>
              <div class="milestone-status">
                ${milestone.completed ? '✅' : '⏳'}
              </div>
            </div>
          `
            )
            .join('')}
        </div>
        
        <div class="milestone-actions">
          <button class="btn btn-secondary" onclick="this.addMilestone()">+ Add Milestone</button>
        </div>
      </div>
    `;
  }

  // Achievement notifications
  showAchievementNotification(achievement) {
    const notification = document.createElement('div');
    notification.className = 'achievement-notification';
    notification.innerHTML = `
      <div class="achievement-content">
        <div class="achievement-icon">${achievement.icon}</div>
        <div class="achievement-details">
          <h3>Achievement Unlocked!</h3>
          <h4>${achievement.name}</h4>
          <p>${achievement.description}</p>
          <div class="achievement-level">${achievement.levelName}</div>
        </div>
      </div>
      <button class="close-btn" onclick="this.parentElement.remove()">×</button>
    `;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => notification.classList.add('show'), 100);

    // Auto remove after 5 seconds
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 5000);
  }

  // Quick actions bar
  initializeQuickActions() {
    const quickActions = document.createElement('div');
    quickActions.className = 'quick-actions-bar';
    quickActions.innerHTML = `
      <button class="quick-action" onclick="this.showProjectTemplates()" title="New Project (Ctrl+N)">
        <span class="icon">➕</span>
        <span class="label">New Project</span>
      </button>
      <button class="quick-action" onclick="this.showSearchAndFilter()" title="Search (Ctrl+S)">
        <span class="icon">🔍</span>
        <span class="label">Search</span>
      </button>
      <button class="quick-action" onclick="this.showAnalyticsDashboard()" title="Analytics (Ctrl+A)">
        <span class="icon">📊</span>
        <span class="label">Analytics</span>
      </button>
      <button class="quick-action" onclick="this.showShortcutsHelp()" title="Help (Ctrl+/)">
        <span class="icon">⌨️</span>
        <span class="label">Shortcuts</span>
      </button>
    `;

    document.body.appendChild(quickActions);
  }

  // Utility methods
  createModal(id, size = 'medium') {
    const existing = document.getElementById(id);
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = id;
    modal.className = `modal ${size}`;
    modal.innerHTML = '<div class="modal-content"></div>';
    document.body.appendChild(modal);

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    return modal.querySelector('.modal-content');
  }

  calculateMilestoneProgress(milestones) {
    if (milestones.length === 0) return 0;
    return Math.round(
      (milestones.filter((m) => m.completed).length / milestones.length) * 100
    );
  }

  // Placeholder methods for functionality
  openNewProjectModal() {
    this.showProjectTemplates();
  }
  showShortcutsHelp() {
    console.log('Show shortcuts help');
  }
  searchProjects() {
    this.showSearchAndFilter();
  }
  filterProjects() {
    this.showSearchAndFilter();
  }
  showAnalytics() {
    this.showAnalyticsDashboard();
  }
  openDashboard() {
    window.location.href = '/';
  }
  closeModals() {
    document.querySelectorAll('.modal').forEach((m) => m.remove());
  }
  cloneSelectedProject() {
    console.log('Clone selected project');
  }
  archiveSelectedProject() {
    console.log('Archive selected project');
  }
  selectTemplate(template) {
    console.log('Selected template:', template);
  }
  setupSearchFunctionality() {
    console.log('Setup search functionality');
  }
  setupFilterFunctionality() {
    console.log('Setup filter functionality');
  }
  loadAnalyticsData() {
    console.log('Load analytics data');
  }
  initializeTimeTracking() {
    console.log('Initialize time tracking');
  }
  toggleMilestone(index, checked) {
    console.log('Toggle milestone:', index, checked);
  }
  addMilestone() {
    console.log('Add milestone');
  }
  exportAnalytics(format) {
    console.log('Export analytics:', format);
  }
}

// Initialize the enhanced UI
const enhancedUI = new ProjectTrackerUI();
window.enhancedUI = enhancedUI;
