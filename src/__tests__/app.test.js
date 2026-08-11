import { describe, it, expect, vi } from 'vitest';
import { showDashboard, showProjectDetails } from './app.js';

describe('App Module', () => {
  describe('showDashboard', () => {
    it('should display dashboard when user is authenticated', async () => {
      // Mock DOM elements
      document.body.innerHTML = `
        <div id="loadingScreen"></div>
        <div id="landingPage"></div>
        <div id="landingFooter"></div>
        <div id="dashboardPage"></div>
        <div id="projectsList"></div>
        <div id="logoutBtn"></div>
        <div id="userEmail"></div>
        <div id="tierBadge"></div>
        <div id="totalProjects"></div>
        <div id="activeProjects"></div>
        <div id="totalLogs"></div>
        <div id="badgesEarned"></div>
        <div id="message"></div>
      `;

      // Mock Firebase functions
      const mockUser = { uid: 'test-user', email: 'test@example.com' };
      const mockProjects = [
        { id: 'project1', name: 'Test Project', started: true, createdAt: new Date() }
      ];
      const mockLogs = [{ text: 'Test log', createdAt: new Date() }];

      // Mock Firebase functions
      vi.mocked(getCurrentUser).mockReturnValue(mockUser);
      vi.mocked(getUserProjects).mockResolvedValue(mockProjects);
      vi.mocked(getProjectLogs).mockResolvedValue(mockLogs);
      vi.mocked(doc).mockReturnValue({ get: vi.fn().mockResolvedValue({ data: vi.fn().mockReturnValue({ tier: 'free', claimedBadges: [] }) }) });

      // Spy on DOM manipulations
      const showDashboardSpy = vi.spyOn(window, 'showDashboard' as any);

      await showDashboard();

      expect(document.getElementById('loadingScreen').style.display).toBe('none');
      expect(document.getElementById('dashboardPage').style.display).toBe('block');
      expect(document.getElementById('landingPage').style.display).toBe('none');
      expect(document.getElementById('userEmail').textContent).toBe('test@example.com');
      expect(document.getElementById('tierBadge').textContent).toBe('Free Tier');
      expect(document.getElementById('totalProjects').textContent).toBe('1');
      expect(document.getElementById('activeProjects').textContent).toBe('1');
      expect(document.getElementById('totalLogs').textContent).toBe('1');
      expect(document.getElementById('badgesEarned').textContent).toBe('0');
    });

    it('should handle error when loading projects', async () => {
      document.body.innerHTML = `
        <div id="loadingScreen"></div>
        <div id="dashboardPage"></div>
        <div id="message"></div>
      `;

      vi.mocked(getCurrentUser).mockReturnValue({ uid: 'test-user' });
      vi.mocked(getUserProjects).mockRejectedValue(new Error('Network error'));

      await showDashboard();

      expect(document.getElementById('loadingScreen').style.display).toBe('none');
      expect(document.getElementById('dashboardPage').style.display).toBe('block');
      expect(document.getElementById('message').textContent).toContain('Error loading projects');
    });
  });

  describe('showProjectDetails', () => {
    it('should display project details when project exists', async () => {
      document.body.innerHTML = `
        <div id="projectDetails"></div>
        <div id="projectsList"></div>
        <div id="logForm"></div>
        <div id="logInput"></div>
        <div id="projectTitle"></div>
        <div id="startDate"></div>
        <div id="deadline"></div>
        <div id="countdownDisplay"></div>
        <div id="countdownContainer"></div>
        <div id="logsList"></div>
        <div id="startProjectBtn'></div>
      `;

      const mockUser = { uid: 'test-user' };
      const mockProject = {
        id: 'project1',
        name: 'Test Project',
        started: false,
        createdAt: new Date(),
        deadline: new Date(Date.now() + 86400000),
        consecutiveLogDays: 0
      };
      const mockLogs = [];

      vi.mocked(getCurrentUser).mockReturnValue(mockUser);
      vi.mocked(getProjectById).mockResolvedValue(mockProject);
      vi.mocked(getProjectLogs).mockResolvedValue(mockLogs);
      vi.mocked(addLog).mockResolvedValue(undefined);
      vi.mocked(startProject).mockResolvedValue(undefined);
      vi.mocked(claimBadge).mockResolvedValue(undefined);

      await showProjectDetails('test-user', 'project1');

      expect(document.getElementById('projectDetails').style.display).toBe('block');
      expect(document.getElementById('projectsList').style.display).toBe('none');
      expect(document.getElementById('projectTitle').textContent).toBe('Test Project');
      expect(document.getElementById('startProjectBtn').style.display).toBe('block');
    });

    it('should handle error when project not found', async () => {
      document.body.innerHTML = `
        <div id="projectDetails"></div>
        <div id="message"></div>
      `;

      vi.mocked(getCurrentUser).mockReturnValue({ uid: 'test-user' });
      vi.mocked(getProjectById).mockResolvedValue(null);

      await showProjectDetails('test-user', 'project1');

      expect(document.getElementById('message').textContent).toContain('Project not found');
    });
  });
});