/**
 * Error Tracking and Performance Monitoring System
 */

class ErrorTracker {
  constructor() {
    this.errors = [];
    this.performanceMetrics = {};
    this.config = {
      maxErrors: 100,
      enablePerformanceMonitoring: true,
      enableUserInteractionTracking: true,
      enableNetworkMonitoring: true,
    };
    this.errorReportingEndpoint = '/api/errors'; // Replace with actual endpoint
    this.performanceEndpoint = '/api/performance'; // Replace with actual endpoint
  }

  // Initialize error tracking
  init(config = {}) {
    this.config = { ...this.config, ...config };

    // Global error handlers
    window.addEventListener('error', this.handleGlobalError.bind(this));
    window.addEventListener(
      'unhandledrejection',
      this.handleUnhandledRejection.bind(this)
    );

    // Performance monitoring
    if (this.config.enablePerformanceMonitoring) {
      this.initPerformanceMonitoring();
    }

    // User interaction tracking
    if (this.config.enableUserInteractionTracking) {
      this.initUserInteractionTracking();
    }

    // Network monitoring
    if (this.config.enableNetworkMonitoring) {
      this.initNetworkMonitoring();
    }

    // Health check monitoring
    this.initHealthChecks();

    console.log('Error tracking initialized');
  }

  // Handle global JavaScript errors
  handleGlobalError(event) {
    const error = {
      type: 'javascript',
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.getCurrentUserId(),
    };

    this.logError(error);
    this.reportError(error);
  }

  // Handle unhandled promise rejections
  handleUnhandledRejection(event) {
    const error = {
      type: 'promise_rejection',
      message: event.reason?.message || event.reason,
      stack: event.reason?.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.getCurrentUserId(),
    };

    this.logError(error);
    this.reportError(error);
  }

  // Log error locally
  logError(error) {
    this.errors.push(error);

    // Keep only the last N errors
    if (this.errors.length > this.config.maxErrors) {
      this.errors.shift();
    }

    console.error('Logged error:', error);
  }

  // Report error to server
  async reportError(error) {
    try {
      const response = await fetch(this.errorReportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(error),
      });

      if (!response.ok) {
        console.warn('Failed to report error to server');
      }
    } catch (err) {
      console.warn('Error reporting failed:', err);
    }
  }

  // Get current user ID (from Firebase auth or local storage)
  getCurrentUserId() {
    try {
      // Check for Firebase user
      if (window.auth?.currentUser?.uid) {
        return window.auth.currentUser.uid;
      }

      // Check for stored user ID
      return localStorage.getItem('userId') || 'anonymous';
    } catch {
      return 'anonymous';
    }
  }

  // Initialize performance monitoring
  initPerformanceMonitoring() {
    // Page load performance
    window.addEventListener('load', () => {
      setTimeout(() => {
        this.collectPerformanceMetrics();
      }, 0);
    });

    // Resource timing
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'resource') {
            this.trackResourceTiming(entry);
          }
        });
      });
      observer.observe({ entryTypes: ['resource'] });
    }
  }

  // Collect performance metrics
  collectPerformanceMetrics() {
    const navigation = performance.getEntriesByType('navigation')[0];

    this.performanceMetrics.pageLoad = {
      domContentLoaded:
        navigation.domContentLoadedEventEnd -
        navigation.domContentLoadedEventStart,
      loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
      firstPaint: this.getFirstPaint(),
      firstContentfulPaint: this.getFirstContentfulPaint(),
      totalTime: navigation.loadEventEnd - navigation.startTime,
      timestamp: new Date().toISOString(),
    };

    this.reportPerformanceMetrics();
  }

  // Get First Paint time
  getFirstPaint() {
    const paintEntries = performance.getEntriesByType('paint');
    const firstPaint = paintEntries.find(
      (entry) => entry.name === 'first-paint'
    );
    return firstPaint ? firstPaint.startTime : 0;
  }

  // Get First Contentful Paint time
  getFirstContentfulPaint() {
    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find(
      (entry) => entry.name === 'first-contentful-paint'
    );
    return fcp ? fcp.startTime : 0;
  }

  // Track resource timing
  trackResourceTiming(entry) {
    const resource = {
      name: entry.name,
      type: this.getResourceType(entry.name),
      duration: entry.duration,
      size: entry.transferSize || 0,
      timestamp: entry.startTime,
    };

    if (!this.performanceMetrics.resources) {
      this.performanceMetrics.resources = [];
    }

    this.performanceMetrics.resources.push(resource);

    // Alert on slow resources
    if (entry.duration > 3000) {
      // 3 seconds
      console.warn(
        `Slow resource detected: ${entry.name} took ${entry.duration}ms`
      );
    }
  }

  // Get resource type from URL
  getResourceType(url) {
    if (url.includes('.css')) return 'stylesheet';
    if (url.includes('.js')) return 'script';
    if (url.includes('.png') || url.includes('.jpg') || url.includes('.svg'))
      return 'image';
    if (url.includes('firebase')) return 'api';
    return 'other';
  }

  // Report performance metrics
  async reportPerformanceMetrics() {
    try {
      const response = await fetch(this.performanceEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metrics: this.performanceMetrics,
          userId: this.getCurrentUserId(),
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        console.warn('Failed to report performance metrics');
      }
    } catch (err) {
      console.warn('Performance reporting failed:', err);
    }
  }

  // Initialize user interaction tracking
  initUserInteractionTracking() {
    let lastInteraction = Date.now();

    ['click', 'scroll', 'keydown', 'touchstart'].forEach((eventType) => {
      document.addEventListener(
        eventType,
        () => {
          lastInteraction = Date.now();
        },
        { passive: true }
      );
    });

    // Track interaction patterns
    setInterval(() => {
      const timeSinceLastInteraction = Date.now() - lastInteraction;
      if (timeSinceLastInteraction > 30000) {
        // 30 seconds
        this.trackUserEvent('idle_detected', {
          duration: timeSinceLastInteraction,
        });
      }
    }, 10000);
  }

  // Initialize network monitoring
  initNetworkMonitoring() {
    // Monitor online/offline status
    window.addEventListener('online', () => {
      this.trackUserEvent('network_connected');
    });

    window.addEventListener('offline', () => {
      this.trackUserEvent('network_disconnected');
    });

    // Monitor connection quality if available
    if (navigator.connection) {
      navigator.connection.addEventListener('change', () => {
        this.trackUserEvent('connection_changed', {
          effectiveType: navigator.connection.effectiveType,
          downlink: navigator.connection.downlink,
          rtt: navigator.connection.rtt,
        });
      });
    }
  }

  // Track custom user events
  trackUserEvent(eventName, data = {}) {
    const event = {
      type: 'user_event',
      name: eventName,
      data,
      timestamp: new Date().toISOString(),
      userId: this.getCurrentUserId(),
      url: window.location.href,
    };

    this.logError(event); // Reuse error logging for events
  }

  // Initialize health checks
  initHealthChecks() {
    // Check Firebase connectivity
    setInterval(() => {
      this.checkFirebaseHealth();
    }, 30000); // Every 30 seconds

    // Check memory usage
    setInterval(() => {
      this.checkMemoryUsage();
    }, 60000); // Every minute
  }

  // Check Firebase health
  async checkFirebaseHealth() {
    try {
      if (window.db) {
        // Simple connectivity check
        const testDoc = await window.db
          .collection('_health')
          .doc('check')
          .get();
        this.trackUserEvent('firebase_health_check', { status: 'healthy' });
      }
    } catch (error) {
      this.trackUserEvent('firebase_health_check', {
        status: 'unhealthy',
        error: error.message,
      });
    }
  }

  // Check memory usage
  checkMemoryUsage() {
    if ('memory' in performance) {
      const memory = performance.memory;
      const memoryInfo = {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
        usagePercent: (
          (memory.usedJSHeapSize / memory.jsHeapSizeLimit) *
          100
        ).toFixed(2),
      };

      if (memoryInfo.usagePercent > 80) {
        this.logError({
          type: 'memory_warning',
          ...memoryInfo,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  // Create error report
  createErrorReport() {
    return {
      errors: this.errors,
      performanceMetrics: this.performanceMetrics,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      userId: this.getCurrentUserId(),
    };
  }

  // Get error summary
  getErrorSummary() {
    const errorCounts = {};
    const recentErrors = this.errors.slice(-10); // Last 10 errors

    this.errors.forEach((error) => {
      const key = `${error.type}:${error.message.split(':')[0]}`;
      errorCounts[key] = (errorCounts[key] || 0) + 1;
    });

    return {
      totalErrors: this.errors.length,
      recentErrors,
      errorCounts,
      performanceMetrics: this.performanceMetrics,
    };
  }

  // Clear error logs
  clearErrors() {
    this.errors = [];
    this.performanceMetrics = {};
  }
}

// Performance monitoring utilities
class PerformanceMonitor {
  // Measure function execution time
  static async measureFunction(fn, functionName) {
    const start = performance.now();
    try {
      const result = await fn();
      const end = performance.now();
      console.log(`${functionName} took ${(end - start).toFixed(2)}ms`);
      return result;
    } catch (error) {
      const end = performance.now();
      console.error(
        `${functionName} failed after ${(end - start).toFixed(2)}ms:`,
        error
      );
      throw error;
    }
  }

  // Mark performance points
  static mark(name) {
    if ('performance' in window && 'mark' in performance) {
      performance.mark(name);
    }
  }

  // Measure between two marks
  static measure(name, startMark, endMark) {
    if ('performance' in window && 'measure' in performance) {
      performance.measure(name, startMark, endMark);
      const entries = performance.getEntriesByName(name, 'measure');
      return entries.length > 0 ? entries[entries.length - 1].duration : 0;
    }
    return 0;
  }

  // Create performance beacon for analytics
  static createBeacon(data, endpoint = '/api/beacon') {
    if ('navigator' in window && 'sendBeacon' in navigator) {
      navigator.sendBeacon(endpoint, JSON.stringify(data));
    }
  }
}

// Export instances
export const errorTracker = new ErrorTracker();
export const performanceMonitor = PerformanceMonitor;

// Auto-initialize error tracking
if (typeof window !== 'undefined') {
  errorTracker.init();
}
