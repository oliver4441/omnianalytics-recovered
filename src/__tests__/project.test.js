import { describe, it, expect, vi } from 'vitest'';
import {
  getUserProjects,
  getProjectById,
  addLog,
  startProject,
  claimBadge,
  getProjectLogs,
} from '../project.js';

describe('Project Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserProjects', () => {
    it('should fetch user projects successfully', async () => {
      const mockUserUid = 'test-user';
      const mockProjects = [
        { id: 'project1', name: 'Project 1', userId: 'test-user' },
        { id: 'project2', name: 'Project 2', userId: 'test-user' }
      ];

      vi.mocked(query).mockReturnValue({});
      vi.mocked(where).mockReturnValue({});
      vi.mocked(limit).mockReturnValue({});
      vi.mocked(getDocs).mockResolvedValue({
        docs: mockProjects.map(project => ({
          id: project.id,
          data: () => project
        }))
      });

      const result = await getUserProjects(mockUserUid);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('project1');
      expect(result[1].id).toBe('project2');
      expect(query).toHaveBeenCalled();
      expect(where).toHaveBeenCalledWith('userId', '==', mockUserUid);
      expect(limit).toHaveBeenCalledWith(50);
    });

    it('should handle error when fetching projects', async () => {
      vi.mocked(query).mockReturnValue({});
      vi.mocked(where).mockReturnValue({});
      vi.mocked(limit).mockReturnValue({});
      vi.mocked(getDocs).mockRejectedValue(new Error('Network error'));

      await expect(getUserProjects('test-user')).rejects.toThrow('Network error');
    });
  });

  describe('getProjectById', () => {
    it('should fetch project by ID successfully', async () => {
      const mockUserUid = 'test-user';
      const mockProject = { id: 'project1', name: 'Test Project', userId: 'test-user' };

      vi.mocked(doc).mockReturnValue({ get: vi.fn().mockResolvedValue({ data: vi.fn().mockReturnValue(mockProject) }) });

      const result = await getProjectById(mockUserUid, 'project1');

      expect(result).toEqual(mockProject);
      expect(doc).toHaveBeenCalledWith(db, 'projects', 'project1');
      expect(getDoc).toHaveBeenCalledWith(doc(db, 'projects', 'project1'));
    });

    it('should return null when project not found', async () => {
      vi.mocked(doc).mockReturnValue({ get: vi.fn().mockResolvedValue({ exists: false }) });

      const result = await getProjectById('test-user', 'project1');

      expect(result).toBeNull();
    });
  });

  describe('addLog', () => {
    it('should add log successfully', async () => {
      const mockUserUid = 'test-user';
      const mockProjectId = 'project1';
      const mockText = 'Test log';

      vi.mocked(collection).mockReturnValue({ add: vi.fn().mockResolvedValue({ id: 'log1' }) });

      await addLog(mockUserUid, mockProjectId, mockText);

      expect(collection).toHaveBeenCalledWith(db, 'users/test-user/projects/project1/logs');
      expect(addDoc).toHaveBeenCalledWith(collection(db, 'users/test-user/projects/project1/logs'), {
        text: mockText,
        createdAt: vi.anything(),
      });
    });
  });

  describe('startProject', () => {
    it('should start project successfully', async () => {
      const mockUserUid = 'test-user';
      const mockProjectId = 'project1';

      vi.mocked(doc).mockReturnValue({ update: vi.fn().mockResolvedValue(undefined) });

      await startProject(mockUserUid, mockProjectId);

      expect(updateDoc).toHaveBeenCalledWith(doc(db, 'users/test-user/projects', mockProjectId), {
        started: true,
        startedAt: vi.anything(),
      });
    });
  });

  describe('claimBadge', () => {
    it('should claim badge successfully', async () => {
      const mockUserUid = 'test-user';
      const mockProjectId = 'project1';

      vi.mocked(doc).mockReturnValue({ update: vi.fn().mockResolvedValue(undefined) });

      await claimBadge(mockUserUid, mockProjectId);

      expect(updateDoc).toHaveBeenCalledWith(doc(db, 'users/test-user', mockUserUid), {
        claimedBadges: vi.arrayContaining([vi.anything()]),
      });
      expect(updateDoc).toHaveBeenCalledWith(doc(db, 'users/test-user/projects', mockProjectId), {
        badgeClaimed: true,
      });
    });
  });

  describe('getProjectLogs', () => {
    it('should fetch project logs successfully', async () => {
      const mockUserUid = 'test-user';
      const mockProjectId = 'project1';
      const mockLogs = [
        { id: 'log1', text: 'Log 1', createdAt: new Date() },
        { id: 'log2', text: 'Log 2', createdAt: new Date() }
      ];

      vi.mocked(query).mockReturnValue({});
      vi.mocked(where).mockReturnValue({});
      vi.mocked(orderBy).mockReturnValue({});
      vi.mocked(limit).mockReturnValue({});
      vi.mocked(getDocs).mockResolvedValue({
        docs: mockLogs.map(log => ({
          id: log.id,
          data: () => log
        }))
      });

      const result = await getProjectLogs(mockUserUid, mockProjectId);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('log1');
      expect(result[1].id).toBe('log2');
      expect(query).toHaveBeenCalled();
      expect(where).toHaveBeenCalledWith('userId', '==', mockUserUid);
      expect(orderBy).toHaveBeenCalledWith('createdAt', 'desc');
      expect(limit).toHaveBeenCalledWith(100);
    });
  });
});