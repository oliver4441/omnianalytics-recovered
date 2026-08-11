import { describe, it, expect, vi } from 'vitest'';
import {
  trackError,
  getErrorStats,
  sendErrorReport,
  monitorPerformance,
} from '../error-tracker.js';

describe('Error Tracker Module', () => {
  describe('trackError', () => {
    it('should track error successfully', async () => {
      const mockError = new Error('Test error');
      const mockContext = {
        component: 'Dashboard',
        userAction: 'click button',
        timestamp: new Date().toISOString()
      };

      vi.mocked(addDoc).mockResolvedValue({ id: 'error1' });

      await trackError(mockError, mockContext);

      expect(addDoc).toHaveBeenCalledWith(
        collection(db, 'errors'),
        {
          message: mockError.message,
          stack: mockError.stack,
          context: mockContext,
          timestamp: vi.anything(),
          userId: vi.anything(),
          component: 'Dashboard',
          userAction: 'click button'
        }
      );
    });
  });

  describe('getErrorStats', () => {
    it('should get error statistics successfully', async () => {
      const mockErrorStats = {
        totalErrors: 10,
        uniqueErrors: 5,
        errorRate: 0.05,
        mostCommonError: 'NetworkError',
        errorTrends: {
          today: 2,
          week: 10,
          month: 30
        }
      };

      vi.mocked(query).mockReturnValue({});
      vi.mocked(getDocs).mockResolvedValue({
        docs: Array(10).fill({ data: () => ({ message: 'NetworkError' }) })
      });

      const result = await getErrorStats();

      expect(result.totalErrors).toBeGreaterThan(0);
      expect(result.mostCommonError).toBeDefined();
    });
  });

  describe('sendErrorReport', () => {
    it('should send error report successfully', async () => {
      const mockReport = {
        summary: 'Weekly error report',
        totalErrors: 15,
        criticalErrors: 3,
        recommendations: ['Fix network timeout']
      };

      vi.mocked(addDoc).mockResolvedValue({ id: 'report1' });

      await sendErrorReport(mockReport);

      expect(addDoc).toHaveBeenCalledWith(
        collection(db, 'errorReports'),
        {
          summary: 'Weekly error report',
          totalErrors: 15,
          criticalErrors: 3,
          recommendations: ['Fix network timeout'],
          timestamp: vi.anything()
        }
      );
    });
  });

  describe('monitorPerformance', () => {
    it('should monitor performance successfully', async () => {
      const mockMetrics = {
        pageLoadTime: 1200,
        apiResponseTime: 300,
        memoryUsage: 150,
        cpuUsage: 25,
        networkRequests: 15
      };

      vi.mocked(addDoc).mockResolvedValue({ id: 'metric1' });

      await monitorPerformance(mockMetrics);

      expect(addDoc).toHaveBeenCalledWith(
        collection(db, 'performanceMetrics'),
        {
          pageLoadTime: 1200,
          apiResponseTime: 300,
          memoryUsage: 150,
          cpuUsage: 25,
          networkRequests: 15,
          timestamp: vi.anything()
        }
      );
    });
  });
});