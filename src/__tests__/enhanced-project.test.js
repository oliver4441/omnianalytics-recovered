import { describe, it, expect, vi } from 'vitest'';
import {
  calculateVelocityScore,
  calculateConsistencyScore,
  calculateOverallScore,
  updateProjectMetrics,
} from '../enhanced-project.js';

describe('Enhanced Project Module', () => {
  describe('calculateVelocityScore', () => {
    it('should calculate velocity score based on logs and deadline', () => {
      const mockProject = {
        logs: [
          { createdAt: new Date(Date.now() - 86400000) }, // 1 day ago
          { createdAt: new Date(Date.now() - 86400000 * 2) }, // 2 days ago
          { createdAt: new Date(Date.now() - 86400000 * 3) } // 3 days ago
        ],
        deadline: new Date(Date.now() + 86400000 * 7) // 7 days from now
      };

      const result = calculateVelocityScore(mockProject);

      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(100);
    });

    it('should return 0 when no logs', () => {
      const mockProject = {
        logs: [],
        deadline: new Date(Date.now() + 86400000 * 7)
      };

      const result = calculateVelocityScore(mockProject);

      expect(result).toBe(0);
    });
  });

  describe('calculateConsistencyScore', () => {
    it('should calculate consistency score based on consecutive days', () => {
      const mockProject = {
        consecutiveLogDays: 5,
        totalLogs: 10,
        startedAt: new Date(Date.now() - 86400000 * 10) // 10 days ago
      };

      const result = calculateConsistencyScore(mockProject);

      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(100);
    });

    it('should return 0 when no consecutive days', () => {
      const mockProject = {
        consecutiveLogDays: 0,
        totalLogs: 0,
        startedAt: new Date()
      };

      const result = calculateConsistencyScore(mockProject);

      expect(result).toBe(0);
    });
  });

  describe('calculateOverallScore', () => {
    it('should calculate overall score as weighted average', () => {
      const mockProject = {
        velocityScore: 80,
        consistencyScore: 90,
        deadlineProgress: 70
      };

      const result = calculateOverallScore(mockProject);

      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(100);
    });
  });

  describe('updateProjectMetrics', () => {
    it('should update project metrics successfully', async () => {
      const mockUserUid = 'test-user';
      const mockProjectId = 'project1';
      const mockProject = {
        velocityScore: 80,
        consistencyScore: 90,
        overallScore: 85,
        consecutiveLogDays: 5
      };

      vi.mocked(doc).mockReturnValue({ update: vi.fn().mockResolvedValue(undefined) });

      await updateProjectMetrics(mockUserUid, mockProjectId, mockProject);

      expect(updateDoc).toHaveBeenCalledWith(
        doc(db, 'users/test-user/projects', mockProjectId),
        {
          velocityScore: 80,
          consistencyScore: 90,
          overallScore: 85,
          consecutiveLogDays: 5
        }
      );
    });
  });
});