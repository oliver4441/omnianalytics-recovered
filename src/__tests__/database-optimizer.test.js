import { describe, it, expect, vi } from 'vitest'';
import {
  optimizeQuery,
  batchWrite,
  transactionWrite,
  indexData,
  cleanupOldLogs,
} from '../database-optimizer.js';

describe('Database Optimizer Module', () => {
  describe('optimizeQuery', () => {
    it('should optimize query with indexes', () => {
      const mockQuery = {
        collection: 'projects',
        where: [
          { field: 'status', operator: '==', value: 'active' },
          { field: 'priority', operator: '==', value: 'high' }
        ],
        orderBy: [{ field: 'createdAt', direction: 'desc' }],
        limit: 50
      };

      const result = optimizeQuery(mockQuery);

      expect(result).toHaveProperty('indexes');
      expect(result.indexes).toContain('status_priority_createdAt');
    });

    it('should handle simple query', () => {
      const mockQuery = {
        collection: 'projects',
        limit: 10
      };

      const result = optimizeQuery(mockQuery);

      expect(result).toHaveProperty('indexes');
      expect(result.indexes).toContain('projects_all');
    });
  });

  describe('batchWrite', () => {
    it('should perform batch write successfully', async () => {
      const mockOperations = [
        { type: 'set', path: 'users/test-user/projects/project1', data: { name: 'Project 1' } },
        { type: 'update', path: 'users/test-user/projects/project2', data: { status: 'completed' } }
      ];

      vi.mocked(batch).mockReturnValue({ commit: vi.fn().mockResolvedValue(undefined) });

      await batchWrite(mockOperations);

      expect(batch).toHaveBeenCalled();
      expect(commit).toHaveBeenCalled();
    });
  });

  describe('transactionWrite', () => {
    it('should perform transaction write successfully', async () => {
      const mockOperations = [
        { type: 'update', path: 'users/test-user/projects/project1', data: { status: 'active' } },
        { type: 'set', path: 'users/test-user/projects/project1/logs', data: { text: 'Test log' } }
      ];

      vi.mocked(runTransaction).mockImplementation((_, updateFn) => updateFn());

      await transactionWrite(mockOperations);

      expect(runTransaction).toHaveBeenCalled();
    });
  });

  describe('indexData', () => {
    it('should create composite index', async () => {
      const mockData = [
        { userId: 'test-user', projectId: 'project1', status: 'active', priority: 'high' },
        { userId: 'test-user', projectId: 'project2', status: 'completed', priority: 'medium' }
      ];

      vi.mocked(batchWrite).mockResolvedValue(undefined);

      await indexData(mockData);

      expect(batchWrite).toHaveBeenCalled();
    });
  });

  describe('cleanupOldLogs', () => {
    it('should cleanup old logs successfully', async () => {
      const mockUserUid = 'test-user';
      const mockProjectId = 'project1';
      const mockRetentionDays = 90;

      vi.mocked(query).mockReturnValue({});
      vi.mocked(where).mockReturnValue({});
      vi.mocked(getDocs).mockResolvedValue({
        docs: [
          { id: 'log1', data: () => ({ createdAt: new Date(Date.now() - 86400000 * 100) }) },
          { id: 'log2', data: () => ({ createdAt: new Date(Date.now() - 86400000 * 50) }) }
        ]
      });
      vi.mocked(deleteDoc).mockResolvedValue(undefined);

      await cleanupOldLogs(mockUserUid, mockProjectId, mockRetentionDays);

      expect(query).toHaveBeenCalled();
      expect(deleteDoc).toHaveBeenCalled();
    });
  });
});