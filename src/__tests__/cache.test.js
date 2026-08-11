import { describe, it, expect, vi } from 'vitest'';
import {
  getFromCache,
  setToCache,
  clearCache,
  cacheProjectData,
  cacheUserData,
  cacheAnalyticsData,
} from '../cache.js';

describe('Cache Module', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('getFromCache', () => {
    it('should get data from cache successfully', () => {
      const mockKey = 'test-key';
      const mockData = { name: 'Test Data' };
      
      localStorage.setItem(mockKey, JSON.stringify(mockData));

      const result = getFromCache(mockKey);

      expect(result).toEqual(mockData);
    });

    it('should return null when key not found', () => {
      const mockKey = 'non-existent-key';
      
      const result = getFromCache(mockKey);

      expect(result).toBeNull();
    });
  });

  describe('setToCache', () => {
    it('should set data to cache successfully', () => {
      const mockKey = 'test-key';
      const mockData = { name: 'Test Data' };

      setToCache(mockKey, mockData);

      const result = localStorage.getItem(mockKey);
      expect(JSON.parse(result)).toEqual(mockData);
    });

    it('should handle cache size limit', () => {
      const mockKey = 'large-key';
      const mockData = { data: 'a'.repeat(10000) };

      expect(() => setToCache(mockKey, mockData)).not.toThrow();
    });
  });

  describe('clearCache', () => {
    it('should clear cache successfully', () => {
      localStorage.setItem('key1', 'value1');
      localStorage.setItem('key2', 'value2');

      clearCache();

      expect(localStorage.length).toBe(0);
    });
  });

  describe('cacheProjectData', () => {
    it('should cache project data successfully', () => {
      const mockProjectId = 'project1';
      const mockProjectData = {
        name: 'Test Project',
        status: 'active',
        createdAt: new Date().toISOString()
      };

      cacheProjectData(mockProjectId, mockProjectData);

      const result = getFromCache(`project-${mockProjectId}`);
      expect(result).toEqual(mockProjectData);
    });
  });

  describe('cacheUserData', () => {
    it('should cache user data successfully', () => {
      const mockUserId = 'user1';
      const mockUserData = {
        email: 'test@example.com',
        tier: 'premium',
        claimedBadges: []
      };

      cacheUserData(mockUserId, mockUserData);

      const result = getFromCache(`user-${mockUserId}`);
      expect(result).toEqual(mockUserData);
    });
  });

  describe('cacheAnalyticsData', () => {
    it('should cache analytics data successfully', () => {
      const mockAnalyticsData = {
        pageViews: 100,
        activeUsers: 50,
        sessionDuration: 300
      };

      cacheAnalyticsData(mockAnalyticsData);

      const result = getFromCache('analytics-data');
      expect(result).toEqual(mockAnalyticsData);
    });
  });
});